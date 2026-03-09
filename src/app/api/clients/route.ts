import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clients = await prisma.client.findMany({
    include: {
      _count: { select: { sends: true, campaigns: true } },
    },
    orderBy: { name: "asc" },
  });

  // Aggregate metrics per client
  const clientsWithMetrics = await Promise.all(
    clients.map(async (client) => {
      const agg = await prisma.send.aggregate({
        where: { clientId: client.id },
        _sum: {
          volume: true,
          delivered: true,
          opens: true,
          clicks: true,
          leads: true,
        },
      });

      const fin = await prisma.send.aggregate({
        where: { clientId: client.id },
        _sum: { revenue: true, cost: true, profit: true },
      });

      return {
        ...client,
        metrics: {
          totalSends: client._count.sends,
          totalVolume: agg._sum.volume || 0,
          totalLeads: agg._sum.leads || 0,
          totalRevenue: fin._sum.revenue
            ? parseFloat(fin._sum.revenue.toString())
            : 0,
          totalProfit: fin._sum.profit
            ? parseFloat(fin._sum.profit.toString())
            : 0,
        },
      };
    })
  );

  return NextResponse.json(clientsWithMetrics);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  try {
    const client = await prisma.client.create({
      data: {
        name: body.name,
        notes: body.notes || null,
      },
    });
    return NextResponse.json(client, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Client name already exists" }, { status: 400 });
  }
}
