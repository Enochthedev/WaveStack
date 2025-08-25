import { Queue, Worker, QueueEvents } from "bullmq";
const connection = { url: process.env.REDIS_URL! };
export const publishQueue = new Queue("publish", { connection });
export const publishEvents = new QueueEvents("publish", { connection });
export const startWorker = (handler: (data:any)=>Promise<any>) =>
  new Worker("publish", async job => handler(job.data), { connection, concurrency: 8 });
