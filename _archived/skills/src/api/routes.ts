import { FastifyInstance } from "fastify";
import { skillsRoutes } from "./skills";
import { versionsRoutes } from "./versions";
import { marketplaceRoutes } from "./marketplace";
import { executionsRoutes, executeSkillRoutes } from "./executions";

export default async function routes(fastify: FastifyInstance) {
  fastify.get("/health", async () => ({ status: "ok", service: "skills" }));

  // Skills
  fastify.register(skillsRoutes, { prefix: "/api/v1/skills" });
  fastify.register(versionsRoutes, { prefix: "/api/v1/skills" });
  fastify.register(executeSkillRoutes, { prefix: "/api/v1/skills" });

  // Executions (listing/checking status/canceling)
  fastify.register(executionsRoutes, { prefix: "/api/v1/executions" });

  // Marketplace
  fastify.register(marketplaceRoutes, { prefix: "/api/v1/marketplace" });
}
