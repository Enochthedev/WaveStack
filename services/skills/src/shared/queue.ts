import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env";
import { logger } from "./logger";
import { db } from "./db";
import { SkillExecutor } from "../engine/executor";
import { SkillDefinition } from "../engine/types";

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}

// ── Queue ────────────────────────────────────────────────────────────────────

export const SKILL_EXEC_QUEUE = "skill-execution";

let queue: Queue | null = null;

export function getSkillQueue(): Queue {
  if (!queue) {
    queue = new Queue(SKILL_EXEC_QUEUE, { connection: getRedisConnection() });
  }
  return queue;
}

export interface SkillJobData {
  executionId: string;
  definition: SkillDefinition;
  input: Record<string, any>;
  outputMapping?: Record<string, any>;
}

/** Enqueue a skill execution job. Returns the BullMQ job ID. */
export async function enqueueExecution(data: SkillJobData): Promise<string> {
  const job = await getSkillQueue().add("execute", data, {
    attempts: 1,
    removeOnComplete: 1000,
    removeOnFail: 500,
  });
  return job.id!;
}

// ── Worker ───────────────────────────────────────────────────────────────────

// Track in-flight AbortControllers so cancellation can interrupt running MCP calls
const abortControllers = new Map<string, AbortController>();

export function getAbortController(executionId: string): AbortController | undefined {
  return abortControllers.get(executionId);
}

export function cancelExecution(executionId: string): boolean {
  const ac = abortControllers.get(executionId);
  if (ac) {
    ac.abort();
    abortControllers.delete(executionId);
    return true;
  }
  return false;
}

export function startWorker(): Worker {
  const worker = new Worker<SkillJobData>(
    SKILL_EXEC_QUEUE,
    async (job: Job<SkillJobData>) => {
      const { executionId, definition, input, outputMapping } = job.data;
      const ac = new AbortController();
      abortControllers.set(executionId, ac);

      const executor = new SkillExecutor();
      const start = Date.now();

      try {
        const result = await executor.execute(definition, input, {
          signal: ac.signal,
          outputMapping,
        });

        await db.skillExecution.update({
          where: { id: executionId },
          data: {
            status: result.status,
            output: result.output || {},
            stepResults: result.results as any,
            durationMs: Date.now() - start,
          },
        });
      } catch (err: any) {
        const isCancelled = ac.signal.aborted;
        await db.skillExecution.update({
          where: { id: executionId },
          data: {
            status: isCancelled ? "cancelled" : "failed",
            output: { error: isCancelled ? "Cancelled" : err.message },
            durationMs: Date.now() - start,
          },
        });
      } finally {
        abortControllers.delete(executionId);
      }
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "Skill execution job failed");
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Skill execution job completed");
  });

  logger.info("Skill execution worker started");
  return worker;
}
