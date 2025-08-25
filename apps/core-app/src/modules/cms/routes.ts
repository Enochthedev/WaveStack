import { FastifyInstance } from "fastify";
export default async function routes(app: FastifyInstance) {
  app.get("/v1/projects", async () => ([]));
}
