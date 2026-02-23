import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { createStdioTransport } from './transports/stdio';
import { createSseTransport } from './transports/sse';
import { createHttpTransport } from './transports/http';
import { ActiveConnection, StdioConfig, SseConfig, HttpConfig } from './types';
import { db } from '../shared/db';
import { logger } from '../shared/logger';

export class McpManager {
  private static connections = new Map<string, ActiveConnection>();

  /**
   * Initialize a connection to an MCP server and store it in memory.
   */
  static async connect(serverId: string): Promise<ActiveConnection> {
    if (this.connections.has(serverId)) {
      const conn = this.connections.get(serverId)!;
      if (conn.status === 'connected') return conn;
    }

    const serverData = await db.mcpServer.findUnique({ where: { id: serverId } });
    if (!serverData) throw new Error(`Server ${serverId} not found`);

    logger.info({ serverId, name: serverData.name }, 'Connecting to MCP server');

    let transport: Transport;
    const config = serverData.config as any;

    if (serverData.transport === 'stdio') {
      transport = createStdioTransport(config as StdioConfig);
    } else if (serverData.transport === 'sse') {
      transport = createSseTransport(config as SseConfig);
    } else if (serverData.transport === 'http') {
      transport = createHttpTransport(config as HttpConfig);
    } else {
      throw new Error(`Unsupported transport type: ${serverData.transport}`);
    }

    const client = new Client(
      { name: 'mcp-gateway', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    const connectionInfo: ActiveConnection = {
      serverId,
      client,
      status: 'connecting',
      lastPingAt: new Date(),
    };

    this.connections.set(serverId, connectionInfo);

    try {
      await client.connect(transport);
      connectionInfo.status = 'connected';
      connectionInfo.lastPingAt = new Date();
      logger.info({ serverId }, 'MCP Server connected successfully');

      await db.mcpServer.update({
        where: { id: serverId },
        data: { status: 'connected', lastPingAt: new Date() },
      });

      // Synchronize tools
      await this.syncTools(serverId, client);

      return connectionInfo;
    } catch (err: any) {
      connectionInfo.status = 'error';
      logger.error(err, 'Failed to connect to MCP server');
      await db.mcpServer.update({
        where: { id: serverId },
        data: { status: 'error' },
      });
      throw err;
    }
  }

  static async disconnect(serverId: string): Promise<void> {
    const conn = this.connections.get(serverId);
    if (!conn) return;

    logger.info({ serverId }, 'Disconnecting MCP server');
    try {
      await conn.client.close();
    } catch (err) {
      logger.warn(err, 'Error closing MCP client connection');
    }

    this.connections.delete(serverId);
    await db.mcpServer.update({
      where: { id: serverId },
      data: { status: 'disconnected' },
    });
  }

  static getConnection(serverId: string): ActiveConnection | undefined {
    return this.connections.get(serverId);
  }

  static async syncTools(serverId: string, client: Client): Promise<void> {
    try {
      const response = await client.listTools();
      const tools = response.tools;
      
      logger.info({ serverId, toolCount: tools.length }, 'Syncing tools from server');

      await db.$transaction(async (tx) => {
        // Disable existing tools to mark any that are removed
        await tx.mcpTool.updateMany({
          where: { serverId },
          data: { isEnabled: false },
        });

        // Upsert standard tools
        for (const tool of tools) {
          await tx.mcpTool.upsert({
            where: { serverId_name: { serverId, name: tool.name } },
            update: {
              description: tool.description,
              inputSchema: tool.inputSchema,
              isEnabled: true,
            },
            create: {
              serverId,
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema,
              isEnabled: true,
            },
          });
        }
      });
    } catch (err) {
      logger.error(err, 'Failed to sync tools for server');
    }
  }
}
