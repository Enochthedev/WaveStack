import { logger } from "../shared/logger";
import { SkillDefinition, SkillStepResult } from "./types";
import { env } from "../config/env";

export class SkillExecutor {
  private readonly gatewayUrl: string;

  constructor() {
    this.gatewayUrl = env.MCP_GATEWAY_URL;
  }

  /**
   * Evaluates an argument by resolving json-path references if any.
   * Format: "{{stepName.fieldName}}"
   * This is a simplified evaluator for the purpose of chaining.
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

  private async executeMcpCall(serverName: string, toolName: string, args: Record<string, any>): Promise<any> {
    const url = `${this.gatewayUrl}/mcp/servers/${serverName}/tools/${toolName}/call`;
    logger.debug({ serverName, toolName, args }, "Calling MCP Gateway");
    
    // Using fetch directly as this is Node.js 18+ (Node 20)
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ arguments: args }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`MCP Gateway error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    return data;
  }

  public async execute(definition: SkillDefinition, initialInput: Record<string, any>): Promise<{ status: "completed" | "failed"; results: SkillStepResult[]; output?: any }> {
    const results: SkillStepResult[] = [];
    const context: Record<string, any> = { input: initialInput };

    for (const step of definition.steps) {
      const start = Date.now();
      try {
        logger.info(`Executing step: ${step.name}`);
        
        // Evaluate dynamic arguments
        const args = this.evaluateArg(step.arguments, context);
        
        // Make call to MCP Gateway
        const stepOutput = await this.executeMcpCall(step.serverName, step.toolName, args);
        
        // Save to context for future steps
        context[step.name] = stepOutput;
        
        results.push({
          stepName: step.name,
          status: "success",
          output: stepOutput,
          durationMs: Date.now() - start,
        });
      } catch (err: any) {
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

    return { 
      status: "completed", 
      results,
      // The final output is just the output of the last successful step
      output: results.length > 0 ? results[results.length - 1].output : null
    };
  }
}
