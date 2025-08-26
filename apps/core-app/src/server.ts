import Fastify from "fastify";
import { loggerConfig } from "@shared/logger";
import apiRoutes from "@routes/api";            // <— central api router
import "@modules/publisher/worker";             // boot worker side-effects

const app = Fastify({ logger: loggerConfig });

// everything lives under /api now
app.register(apiRoutes, { prefix: "/api" });


const port = Number(process.env.PORT || 3000);
app
  .listen({ port, host: "0.0.0.0" })
  .catch((err) => { app.log.error(err); process.exit(1); });

export type AppInstance = typeof app;