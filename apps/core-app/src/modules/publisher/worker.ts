import { startWorker } from "@shared/queue";
import { prisma } from "@shared/db";

startWorker(async ({ queueItemId, platform }) => {
  const qi = await prisma.queueItem.findUnique({ where: { id: queueItemId }, include: { asset: true }});
  if (!qi) throw new Error("QueueItem not found");

  const already = await prisma.post.findFirst({ where: { queueItemId, platform }});
  if (already) return already;

  // TODO: call platform adapter (YouTube/IG/X). For now, fake success.
  const url = `https://${platform}.com/post/${queueItemId}`;

  const post = await prisma.post.create({
    data: {
      orgId: qi.orgId,
      queueItemId,
      platform,
      externalId: `${platform}_${Date.now()}`,
      url,
      publishedAt: new Date()
    }
  });

  // append to outbox
  await prisma.queueItem.update({
    where: { id: qi.id },
    data: { outbox: { push: { type: "post.published", platform, url } }, status: "published" }
  });

  return post;
});
