import fastify from "fastify";
import { env } from "./config/env";
import { logger } from "./shared/logger";
import { connectRedis, disconnectRedis } from "./shared/redis";
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

async function start() {
  try {
    await connectRedis();
    await server.listen({ port: env.PORT, host: "0.0.0.0" });
    logger.info(`🚀 Skills Service running on http://0.0.0.0:${env.PORT}`);
  } catch (err) {
    logger.fatal({ err }, "Failed to start server");
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Gracefully shutting down...");
  await server.close();
  await disconnectRedis();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Gracefully shutting down...");
  await server.close();
  await disconnectRedis();
  process.exit(0);
});

start();
