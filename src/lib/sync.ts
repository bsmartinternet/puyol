/**
 * Sync Service
 * Handles importing sends from Inboxroad (or any source) into the DB.
 * Calculates derived metrics. Prevents duplicates. Logs results.
 */

import { prisma } from "./prisma";
import { inboxroadClient, InboxroadSend } from "./inboxroad";
import { SyncStatus } from "@prisma/client";

export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  itemsNew: number;
  itemsUpdated: number;
  error?: string;
  durationMs: number;
}

/**
 * Calculate derived metrics from raw send data
 */
function calculateMetrics(send: {
  delivered: number;
  opens: number;
  clicks: number;
  revenue: number;
}) {
  const openRate =
    send.delivered > 0
      ? parseFloat((send.opens / send.delivered).toFixed(4))
      : 0;

  const ctr =
    send.opens > 0
      ? parseFloat((send.clicks / send.opens).toFixed(4))
      : 0;

  const erpm =
    send.delivered > 0
      ? parseFloat(((send.revenue / send.delivered) * 1000).toFixed(2))
      : 0;

  return { openRate, ctr, erpm };
}

/**
 * Map Inboxroad API response to our DB schema
 */
function mapInboxroadSend(send: InboxroadSend) {
  const delivered = send.delivered || 0;
  const opens = send.opens || 0;
  const clicks = send.clicks || 0;
  const { openRate, ctr } = calculateMetrics({
    delivered,
    opens,
    clicks,
    revenue: 0, // Revenue set manually
  });

  return {
    externalId: send.id,
    source: "inboxroad",
    sentAt: new Date(send.sent_at),
    subject: send.subject || null,
    fromDomain: send.from_domain || null,
    esp: "Inboxroad",
    volume: send.volume || 0,
    delivered,
    opens,
    clicks,
    bounces: send.bounces || 0,
    unsubscribes: send.unsubscribes || 0,
    openRate,
    ctr,
    rawData: send as object,
  };
}

/**
 * Main sync function - fetches from source and upserts into DB
 */
export async function syncInboxroad(
  options: { fullSync?: boolean } = {}
): Promise<SyncResult> {
  const startedAt = new Date();
  let syncLogId: string | null = null;

  try {
    // Create running sync log
    const log = await prisma.syncLog.create({
      data: {
        source: "inboxroad",
        status: SyncStatus.RUNNING,
        startedAt,
      },
    });
    syncLogId = log.id;

    // Determine since date for incremental sync
    let since: Date | undefined;
    if (!options.fullSync) {
      const lastSuccess = await prisma.syncLog.findFirst({
        where: { source: "inboxroad", status: SyncStatus.SUCCESS },
        orderBy: { finishedAt: "desc" },
      });
      if (lastSuccess?.finishedAt) {
        // Go back 1 hour to catch any stragglers
        since = new Date(lastSuccess.finishedAt.getTime() - 60 * 60 * 1000);
      }
    }

    // Fetch from Inboxroad
    const sends = await inboxroadClient.getAllSends(since);

    let itemsNew = 0;
    let itemsUpdated = 0;

    // Upsert each send
    for (const send of sends) {
      const mapped = mapInboxroadSend(send);

      const existing = await prisma.send.findUnique({
        where: { externalId: mapped.externalId },
      });

      if (existing) {
        // Only update fields from the source — don't overwrite manual fields
        await prisma.send.update({
          where: { externalId: mapped.externalId },
          data: {
            sentAt: mapped.sentAt,
            subject: mapped.subject,
            fromDomain: mapped.fromDomain,
            volume: mapped.volume,
            delivered: mapped.delivered,
            opens: mapped.opens,
            clicks: mapped.clicks,
            bounces: mapped.bounces,
            unsubscribes: mapped.unsubscribes,
            openRate: mapped.openRate,
            ctr: mapped.ctr,
            rawData: mapped.rawData,
          },
        });
        itemsUpdated++;
      } else {
        await prisma.send.create({ data: mapped });
        itemsNew++;
      }
    }

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();

    // Update sync log to success
    await prisma.syncLog.update({
      where: { id: syncLogId },
      data: {
        status: SyncStatus.SUCCESS,
        itemsSynced: sends.length,
        itemsNew,
        itemsUpdated,
        finishedAt,
      },
    });

    return {
      success: true,
      itemsSynced: sends.length,
      itemsNew,
      itemsUpdated,
      durationMs,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    if (syncLogId) {
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: SyncStatus.ERROR,
          error: errorMsg,
          finishedAt: new Date(),
        },
      });
    }

    return {
      success: false,
      itemsSynced: 0,
      itemsNew: 0,
      itemsUpdated: 0,
      error: errorMsg,
      durationMs: new Date().getTime() - startedAt.getTime(),
    };
  }
}

/**
 * Recalculate all derived metrics (run after manual data entry)
 */
export async function recalculateMetrics() {
  const sends = await prisma.send.findMany({
    select: {
      id: true,
      delivered: true,
      opens: true,
      clicks: true,
      revenue: true,
    },
  });

  for (const send of sends) {
    const metrics = calculateMetrics({
      delivered: send.delivered,
      opens: send.opens,
      clicks: send.clicks,
      revenue: parseFloat(send.revenue.toString()),
    });

    await prisma.send.update({
      where: { id: send.id },
      data: metrics,
    });
  }

  return sends.length;
}
