import { McpManager } from './manager';
import { McpCache } from './cache';
import { db } from '../shared/db';
import { logger } from '../shared/logger';

export class McpRouter {
  /**
   * Routes a tool call to the appropriate connected MCP server.
   */
  static async callTool(
    serverId: string,
    toolName: string,
    input: any,
    callerId: string,
    callerType: string
  ): Promise<any> {
    const startTime = Date.now();
    let status = 'error';
    let output: any = null;
    let cached = false;

    // Check permissions
    const tool = await db.mcpTool.findUnique({
      where: { serverId_name: { serverId, name: toolName } },
      include: { permissions: true },
    });

    if (!tool) {
      throw new Error(`Tool ${toolName} not found on server ${serverId}`);
    }

    if (!tool.isEnabled) {
      throw new Error(`Tool ${toolName} is currently disabled`);
    }

    // Agent permission check
    const hasPermission = tool.permissions.some(
      (p) => (p.agentType === '*' || p.agentType === callerType) && p.allowed
    );
    if (!hasPermission) {
      throw new Error(`Caller ${callerType} does not have permission to execute ${toolName}`);
    }

    try {
      // Check Cache
      const cachedResult = await McpCache.get(serverId, toolName, input);
      if (cachedResult) {
        status = 'success';
        output = cachedResult;
        cached = true;
        logger.info({ serverId, toolName, cached }, 'Tool call answered from cache');
        return output;
      }

      // Live Execution
      const conn = McpManager.getConnection(serverId);
      if (!conn || conn.status !== 'connected') {
        throw new Error(`Server ${serverId} is not connected`);
      }

      logger.info({ serverId, toolName }, 'Executing live tool call');
      const response = await conn.client.callTool({
        name: toolName,
        arguments: input,
      });

      output = response.content;
      status = 'success';

      // Set Cache
      await McpCache.set(serverId, toolName, input, output);

      return output;
    } catch (err: any) {
      logger.error(err, 'Tool execution failed');
      output = { error: err.message || 'Unknown error' };
      status = 'error';
      throw err;
    } finally {
      const durationMs = Date.now() - startTime;
      
      // Log usage asynchronously
      db.mcpToolUsage.create({
        data: {
          toolId: tool.id,
          callerId,
          callerType,
          input,
          output,
          durationMs,
          status,
          cached,
        },
      }).catch((e) => logger.error(e, 'Failed to log tool usage'));
    }
  }
}
