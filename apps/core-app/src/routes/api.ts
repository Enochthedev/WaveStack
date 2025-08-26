import { FastifyPluginAsync } from "fastify";

// module routes (keep their internal prefixes clean)
import queueRoutes from "@modules/queue/routes";
import cmsRoutes from "@modules/cms/routes";
import publisherRoutes from "@modules/publisher/routes";
import trendsRoutes from "@modules/trends/routes";
import analyticsRoutes from "@modules/analytics/routes";
import authRoutes from "@auth/routes";

export const apiRoutes: FastifyPluginAsync = async (app) => {
  // health first (for gateway probes)
  app.get("/health", async () => ({ status: "ok" }));

  // mount modules under their own subpaths
  app.register(queueRoutes,      { prefix: "/queue" });
  app.register(cmsRoutes,        { prefix: "/cms" });
  app.register(publisherRoutes,  { prefix: "/publisher" });
  app.register(trendsRoutes,     { prefix: "/trends" });
  app.register(analyticsRoutes,  { prefix: "/analytics" });
  app.register(authRoutes,       { prefix: "/auth" });
};

export default apiRoutes;