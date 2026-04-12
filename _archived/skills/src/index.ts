import fastify from "fastify";
import { env } from "./config/env";
import { logger } from "./shared/logger";
import { getRedisConnection, startWorker } from "./shared/queue";
import routes from "./api/routes";

const server = fastify({
  logger: logger as any,
});

server.register(routes);

server.setErrorHandler((error, request, reply) => {
  if (error instanceof Error && error.name === "ZodError") {
    return reply.status(400).send({ error: "Validation Error", details: (error as any).issues });
  }
  request.log.error(error);
  return reply.status(500).send({ error: "Internal Server Error" });
});

let worker: ReturnType<typeof startWorker> | null = null;

async function start() {
  try {
    // Connect ioredis (used by BullMQ)
    const redis = getRedisConnection();
    await redis.ping();
    logger.info("Redis connected");

    // Start the BullMQ skill execution worker
    worker = startWorker();

    await server.listen({ port: env.PORT, host: "0.0.0.0" });
    logger.info(`Skills Service running on http://0.0.0.0:${env.PORT}`);
  } catch (err) {
    logger.fatal({ err }, "Failed to start server");
    process.exit(1);
  }
}

async function shutdown() {
  logger.info("Gracefully shutting down...");
  if (worker) await worker.close();
  await server.close();
  const redis = getRedisConnection();
  redis.disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start();
