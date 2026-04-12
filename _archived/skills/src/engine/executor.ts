import { logger } from "../shared/logger";
import { SkillDefinition, SkillStepResult } from "./types";
import { env } from "../config/env";

export interface ExecuteOptions {
  signal?: AbortSignal;
  outputMapping?: Record<string, any>;
}

export class SkillExecutor {
  private readonly gatewayUrl: string;

  constructor() {
    this.gatewayUrl = env.MCP_GATEWAY_URL;
  }

  /**
   * Resolve template strings like "{{stepName.fieldName}}" from context.
   */
  private evaluateArg(arg: any, context: Record<string, any>): any {
    if (typeof arg === "string" && arg.startsWith("{{") && arg.endsWith("}}")) {
      const path = arg.slice(2, -2).trim();
      const parts = path.split(".");
      let current: any = context;
      for (const p of parts) {
        if (current === undefined || current === null) return null;
        current = current[p];
      }
      return current;
    }
    if (Array.isArray(arg)) {
      return arg.map((a) => this.evaluateArg(a, context));
    }
    if (typeof arg === "object" && arg !== null) {
      const result: Record<string, any> = {};
      for (const [k, v] of Object.entries(arg)) {
        result[k] = this.evaluateArg(v, context);
      }
      return result;
    }
    return arg;
  }

  private async executeMcpCall(
    serverName: string,
    toolName: string,
    args: Record<string, any>,
    signal?: AbortSignal,
  ): Promise<any> {
    const url = `${this.gatewayUrl}/mcp/servers/${serverName}/tools/${toolName}/call`;
    logger.debug({ serverName, toolName, args }, "Calling MCP Gateway");

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ arguments: args }),
      signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`MCP Gateway error (${res.status}): ${errorText}`);
    }

    return res.json();
  }

  /**
   * Apply output mapping to select specific fields from the execution context.
   * outputMapping is a record like: { "clip_url": "create_clip.url", "caption": "generate_caption.text" }
   */
  private applyOutputMapping(
    context: Record<string, any>,
    mapping: Record<string, any>,
  ): Record<string, any> {
    const output: Record<string, any> = {};
    for (const [key, path] of Object.entries(mapping)) {
      if (typeof path === "string") {
        output[key] = this.evaluateArg(`{{${path}}}`, context);
      } else {
        output[key] = path;
      }
    }
    return output;
  }

  public async execute(
    definition: SkillDefinition,
    initialInput: Record<string, any>,
    options: ExecuteOptions = {},
  ): Promise<{ status: "completed" | "failed"; results: SkillStepResult[]; output?: any }> {
    const { signal, outputMapping } = options;
    const results: SkillStepResult[] = [];
    const context: Record<string, any> = { input: initialInput };

    for (const step of definition.steps) {
      // Check for cancellation before each step
      if (signal?.aborted) {
        return { status: "failed", results, output: { error: "Cancelled" } };
      }

      const start = Date.now();
      try {
        logger.info(`Executing step: ${step.name}`);

        const args = this.evaluateArg(step.arguments, context);
        const stepOutput = await this.executeMcpCall(step.serverName, step.toolName, args, signal);

        context[step.name] = stepOutput;

        results.push({
          stepName: step.name,
          status: "success",
          output: stepOutput,
          durationMs: Date.now() - start,
        });
      } catch (err: any) {
        if (signal?.aborted) {
          results.push({
            stepName: step.name,
            status: "error",
            error: "Cancelled",
            durationMs: Date.now() - start,
          });
          return { status: "failed", results, output: { error: "Cancelled" } };
        }

        logger.error({ err, step: step.name }, "Skill execution failed at step");
        results.push({
          stepName: step.name,
          status: "error",
          error: err.message || "Unknown error",
          durationMs: Date.now() - start,
        });

        return { status: "failed", results, output: null };
      }
    }

    // Build final output
    let finalOutput: any;
    if (outputMapping && Object.keys(outputMapping).length > 0) {
      finalOutput = this.applyOutputMapping(context, outputMapping);
    } else {
      // Default: output from the last step
      finalOutput = results.length > 0 ? results[results.length - 1].output : null;
    }

    return { status: "completed", results, output: finalOutput };
  }
}
