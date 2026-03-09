import { PrismaClient, Role, SendStatus, SyncStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Users
  const adminPass = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@mailops.io" },
    update: {},
    create: {
      email: "admin@mailops.io",
      name: "Admin User",
      password: adminPass,
      role: Role.ADMIN,
    },
  });

  const editorPass = await bcrypt.hash("editor123", 12);
  const editor = await prisma.user.upsert({
    where: { email: "editor@mailops.io" },
    update: {},
    create: {
      email: "editor@mailops.io",
      name: "Media Buyer 1",
      password: editorPass,
      role: Role.EDITOR,
    },
  });

  // Clients
  const clients = await Promise.all([
    prisma.client.upsert({
      where: { name: "Acme Corp" },
      update: {},
      create: { name: "Acme Corp", notes: "Main health vertical client" },
    }),
    prisma.client.upsert({
      where: { name: "BetaFinance" },
      update: {},
      create: { name: "BetaFinance", notes: "Finance and crypto client" },
    }),
    prisma.client.upsert({
      where: { name: "GreenLeads" },
      update: {},
      create: { name: "GreenLeads", notes: "Insurance vertical" },
    }),
  ]);

  // Campaigns
  const campaigns = await Promise.all([
    prisma.campaign.create({
      data: {
        name: "Acme Health Q1",
        clientId: clients[0].id,
        vertical: "health",
        geo: "US",
      },
    }),
    prisma.campaign.create({
      data: {
        name: "Acme Weight Loss Summer",
        clientId: clients[0].id,
        vertical: "health",
        geo: "US",
        notes: "Seasonal campaign",
      },
    }),
    prisma.campaign.create({
      data: {
        name: "BetaFinance Crypto Feb",
        clientId: clients[1].id,
        vertical: "finance",
        geo: "UK",
      },
    }),
    prisma.campaign.create({
      data: {
        name: "GreenLeads Insurance Push",
        clientId: clients[2].id,
        vertical: "insurance",
        geo: "US",
      },
    }),
  ]);

  // Generate 60 mock sends spread over 90 days
  const esps = ["Inboxroad", "Mailgun", "SendGrid", "SparkPost"];
  const domains = [
    "news.acmecorp.com",
    "info.betafinance.io",
    "alerts.greenleads.net",
    "daily.acmecorp.com",
    "promo.betafinance.io",
  ];
  const geos = ["US", "UK", "CA", "AU", "DE"];
  const statuses = [
    SendStatus.COMPLETED,
    SendStatus.COMPLETED,
    SendStatus.COMPLETED,
    SendStatus.ACTIVE,
    SendStatus.PAUSED,
  ];

  const subjects = [
    "🔥 Limited offer expires tonight",
    "Your exclusive invite is waiting",
    "Don't miss out — last chance",
    "We have something special for you",
    "Quick update on your account",
    "New opportunity just dropped",
    "You've been selected",
    "Important: action required",
  ];

  const sends = [];
  const now = new Date();

  for (let i = 0; i < 60; i++) {
    const daysAgo = Math.floor(Math.random() * 90);
    const sentAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const volume = Math.floor(Math.random() * 450000) + 50000;
    const deliveredRate = 0.88 + Math.random() * 0.1;
    const delivered = Math.floor(volume * deliveredRate);
    const openRate = 0.1 + Math.random() * 0.25;
    const opens = Math.floor(delivered * openRate);
    const ctr = 0.01 + Math.random() * 0.08;
    const clicks = Math.floor(opens * ctr);
    const leads = Math.floor(clicks * (0.05 + Math.random() * 0.2));
    const revenue = parseFloat((leads * (2 + Math.random() * 8)).toFixed(2));
    const cost = parseFloat((volume * 0.00035).toFixed(2));
    const profit = parseFloat((revenue - cost).toFixed(2));
    const clientIndex = Math.floor(Math.random() * clients.length);
    const relatedCampaigns = campaigns.filter(
      (c) => c.clientId === clients[clientIndex].id
    );
    const campaign =
      relatedCampaigns[Math.floor(Math.random() * relatedCampaigns.length)];

    sends.push({
      externalId: `IR-MOCK-${String(i + 1).padStart(4, "0")}`,
      source: "inboxroad",
      sentAt,
      subject: subjects[Math.floor(Math.random() * subjects.length)],
      fromDomain: domains[Math.floor(Math.random() * domains.length)],
      esp: esps[Math.floor(Math.random() * esps.length)],
      volume,
      delivered,
      opens,
      clicks,
      bounces: Math.floor(volume * (0.01 + Math.random() * 0.05)),
      unsubscribes: Math.floor(opens * 0.005),
      clientId: clients[clientIndex].id,
      campaignId: campaign?.id,
      vertical: campaign?.vertical || "other",
      geo: geos[Math.floor(Math.random() * geos.length)],
      leads,
      revenue,
      cost,
      profit,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      ownerId: Math.random() > 0.5 ? admin.id : editor.id,
      openRate: parseFloat(openRate.toFixed(4)),
      ctr: parseFloat(ctr.toFixed(4)),
      erpm:
        delivered > 0
          ? parseFloat(((revenue / delivered) * 1000).toFixed(2))
          : 0,
      tags: ["mock", i % 3 === 0 ? "high-volume" : "standard"],
      rawData: { source: "seed", generatedAt: new Date().toISOString() },
    });
  }

  for (const send of sends) {
    await prisma.send.upsert({
      where: { externalId: send.externalId },
      update: send,
      create: send,
    });
  }

  // Sync log
  await prisma.syncLog.create({
    data: {
      source: "inboxroad",
      status: SyncStatus.SUCCESS,
      itemsSynced: 60,
      itemsNew: 60,
      itemsUpdated: 0,
      startedAt: new Date(now.getTime() - 5000),
      finishedAt: now,
    },
  });

  console.log(`✅ Seeded:`);
  console.log(`   - 3 users (admin@mailops.io / admin123)`);
  console.log(`   - ${clients.length} clients`);
  console.log(`   - ${campaigns.length} campaigns`);
  console.log(`   - ${sends.length} sends`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
