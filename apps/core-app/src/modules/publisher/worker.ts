import { startWorker } from "@shared/queue";
import { prisma } from "@shared/db";
import { logger } from "@shared/logger";

startWorker(async ({ queueItemId, platform }) => {
  const log = logger.child({ queueItemId, platform, worker: "publisher" });

  const qi = await prisma.queueItem.findUnique({
    where: { id: queueItemId },
    include: { asset: true },
  });
  if (!qi) {
    log.warn("QueueItem not found, skipping");
    return;
  }

  const already = await prisma.post.findFirst({ where: { queueItemId, platform } });
  if (already) {
    log.info({ postId: already.id }, "Post already exists, skipping duplicate");
    return already;
  }

  try {
    // TODO: call platform adapter (YouTube/IG/X). For now, fake success.
    const url = `https://${platform}.com/post/${queueItemId}`;

    const post = await prisma.post.create({
      data: {
        orgId: qi.orgId,
        queueItemId,
        platform,
        externalId: `${platform}_${Date.now()}`,
        url,
        publishedAt: new Date(),
      },
    });

    await prisma.queueItem.update({
      where: { id: qi.id },
      data: { outbox: { push: { type: "post.published", platform, url } }, status: "published" },
    });

    log.info({ postId: post.id }, "Post published successfully");
    return post;
  } catch (err) {
    log.error({ err }, "Failed to publish post");

    // Mark the queue item as failed so it can be retried or reviewed
    await prisma.queueItem
      .update({
        where: { id: qi.id },
        data: {
          status: "failed",
          failedAt: new Date(),
          failureReason: err instanceof Error ? err.message : "Unknown error",
        },
      })
      .catch((updateErr) => {
        log.error({ err: updateErr }, "Failed to update queue item status");
      });

    // Re-throw so BullMQ can apply its retry strategy
    throw err;
  }
});
