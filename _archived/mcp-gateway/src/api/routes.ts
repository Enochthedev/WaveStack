import { FastifyInstance } from "fastify";
import catalogRoutes from "./catalog";
import serversRoutes from "./servers";
import toolsRoutes from "./tools";
import permissionsRoutes from "./permissions";
import analyticsRoutes from "./analytics";

export default async function routes(app: FastifyInstance) {
  app.register(catalogRoutes, { prefix: "/api/v1/catalog" });
  app.register(serversRoutes, { prefix: "/api/v1/servers" });
  app.register(toolsRoutes, { prefix: "/api/v1/tools" });
  app.register(permissionsRoutes, { prefix: "/api/v1/permissions" });
  app.register(analyticsRoutes, { prefix: "/api/v1/analytics" });
}
