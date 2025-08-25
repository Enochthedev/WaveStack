import Fastify from "fastify";
import { loggerConfig } from "@shared/logger";
import queueRoutes from "@modules/queue/routes";
import cmsRoutes from "@modules/cms/routes";
import publisherRoutes from "@modules/publisher/routes";
import trendsRoutes from "@modules/trends/routes";
import analyticsRoutes from "@modules/analytics/routes";
import "@modules/publisher/worker"; // start worker

const app = Fastify({ 
  logger: loggerConfig
});

app.register(queueRoutes);
app.register(cmsRoutes);
app.register(publisherRoutes);
app.register(trendsRoutes);
app.register(analyticsRoutes);


app.listen({ port: Number(process.env.PORT || 3000), host: "0.0.0.0" })
  .catch((e: unknown) => { app.log.error(e); process.exit(1); });