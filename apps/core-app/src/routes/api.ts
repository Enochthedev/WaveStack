import type { FastifyPluginAsync } from "fastify";
import rateLimit from "@fastify/rate-limit";

// Auth
import authRoutes from "@modules/auth/routes";
import authRegisterRoutes from "@modules/auth/register";
import oauthRoutes from "@modules/auth/oauth";

// Core entities
import usersRoutes from "@modules/users/routes";
import orgsRoutes from "@modules/orgs/routes";
import platformsRoutes from "@modules/platforms/routes";
import assetsRoutes from "@modules/assets/routes";
import streamRoutes from "@modules/stream/routes";

// Agent system
import agentsRoutes from "@modules/agents/routes";
import notificationsRoutes from "@modules/notifications/routes";

// Content / publishing
import queueRoutes from "@modules/queue/routes";
import publisherRoutes from "@modules/publisher/routes";
import cmsRoutes from "@modules/cms/routes";
import clipsRoutes from "@modules/clips/routes";

// Analytics + growth
import analyticsRoutes from "@modules/analytics/routes";
import trendsRoutes from "@modules/trends/routes";

// Moderation + community
import moderationRoutes from "@modules/moderation/routes";
import communityRoutes from "@modules/community/routes";

// Revenue
import revenueRoutes from "@modules/revenue/routes";

// SEO + competitors
import seoRoutes from "@modules/seo/routes";
import competitorsRoutes from "@modules/competitors/routes";

// Automation
import workflowsRoutes from "@modules/workflows/routes";
import skillsRoutes from "@modules/skills/routes";

// Org management
import billingRoutes from "@modules/billing/routes";
import teamRoutes from "@modules/team/routes";

// AI memory + training data
import memoryRoutes from "@modules/memory/routes";

export const apiRoutes: FastifyPluginAsync = async (app) => {
  // Health (for gateway probes + k8s liveness)
  app.get("/health", async () => ({ status: "ok", ts: Date.now() }));
  app.get("/ready", async (_req, reply) => reply.send({ status: "ok" }));

  // Auth — registered under /auth with stricter rate limits (10 req / 15 min)
  app.register(
    async (authScope) => {
      await authScope.register(rateLimit, { max: 10, timeWindow: 15 * 60 * 1000 });
      authScope.register(authRoutes);
      authScope.register(authRegisterRoutes);
    },
    { prefix: "/auth" },
  );

  // Platform OAuth flows (/api/oauth/:platform/connect + /callback)
  app.register(oauthRoutes, { prefix: "/oauth" });

  // All other modules define their own full /v1/... paths — no extra prefix
  app.register(usersRoutes);
  app.register(orgsRoutes);
  app.register(platformsRoutes);
  app.register(assetsRoutes);
  app.register(streamRoutes);

  app.register(agentsRoutes);
  app.register(notificationsRoutes);

  app.register(queueRoutes);
  app.register(publisherRoutes);
  app.register(cmsRoutes);
  app.register(clipsRoutes);

  app.register(analyticsRoutes);
  app.register(trendsRoutes);

  app.register(moderationRoutes);
  app.register(communityRoutes);

  app.register(revenueRoutes);

  app.register(seoRoutes);
  app.register(competitorsRoutes);

  app.register(workflowsRoutes);
  app.register(skillsRoutes);

  app.register(billingRoutes);
  app.register(teamRoutes);
  app.register(memoryRoutes);
};

export default apiRoutes;
