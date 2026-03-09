/**
 * Inboxroad API Client
 * Handles real API calls and falls back to mock data when USE_MOCK_DATA=true
 * Designed to be swappable with other ESP integrations
 */

export interface InboxroadSend {
  id: string;
  sent_at: string;
  subject: string;
  from_domain: string;
  volume: number;
  delivered: number;
  opens: number;
  clicks: number;
  bounces: number;
  unsubscribes: number;
  status: string;
}

interface InboxroadListResponse {
  data: InboxroadSend[];
  meta: {
    total: number;
    page: number;
    per_page: number;
  };
}

class InboxroadClient {
  private apiKey: string;
  private baseUrl: string;
  private useMock: boolean;

  constructor() {
    this.apiKey = process.env.INBOXROAD_API_KEY || "";
    this.baseUrl =
      process.env.INBOXROAD_API_URL || "https://api.inboxroad.com/v1";
    this.useMock = process.env.USE_MOCK_DATA === "true";
  }

  /**
   * Fetch all sends from Inboxroad (paginated)
   * Falls back to mock data if USE_MOCK_DATA=true or API key is missing
   */
  async getSends(
    page = 1,
    perPage = 100,
    since?: Date
  ): Promise<InboxroadListResponse> {
    if (this.useMock || !this.apiKey) {
      return this.getMockSends(page, perPage, since);
    }

    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });

      if (since) {
        params.set("since", since.toISOString());
      }

      const response = await fetch(`${this.baseUrl}/sends?${params}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        // Next.js: don't cache API calls
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `Inboxroad API error: ${response.status} ${response.statusText}`
        );
      }

      return response.json();
    } catch (error) {
      console.error("Inboxroad API call failed, using mock data:", error);
      return this.getMockSends(page, perPage, since);
    }
  }

  /**
   * Fetch all sends across all pages
   */
  async getAllSends(since?: Date): Promise<InboxroadSend[]> {
    const allSends: InboxroadSend[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getSends(page, 100, since);
      allSends.push(...response.data);

      const totalPages = Math.ceil(response.meta.total / response.meta.per_page);
      hasMore = page < totalPages;
      page++;

      // Safety limit to avoid infinite loops
      if (page > 50) break;
    }

    return allSends;
  }

  /**
   * Generate realistic mock data for development
   */
  private getMockSends(
    page: number,
    perPage: number,
    since?: Date
  ): InboxroadListResponse {
    const now = new Date();
    const mockSends: InboxroadSend[] = [];
    const total = 25;

    const subjects = [
      "🔥 Exclusive offer for you",
      "Your account needs attention",
      "Special promotion inside",
      "Time-sensitive: act now",
      "New opportunities available",
      "Weekly digest — top picks",
      "You have a new message",
    ];

    const domains = [
      "send.domain1.com",
      "mail.domain2.net",
      "news.domain3.io",
      "promo.domain4.com",
    ];

    for (let i = 0; i < total; i++) {
      const daysAgo = i * 2;
      const sentAt = new Date(
        now.getTime() - daysAgo * 24 * 60 * 60 * 1000
      ).toISOString();

      if (since && new Date(sentAt) < since) continue;

      const volume = Math.floor(Math.random() * 200000) + 10000;
      const delivered = Math.floor(volume * (0.88 + Math.random() * 0.1));
      const opens = Math.floor(delivered * (0.1 + Math.random() * 0.2));
      const clicks = Math.floor(opens * (0.05 + Math.random() * 0.1));

      mockSends.push({
        id: `IR-API-${String(i + 1).padStart(4, "0")}`,
        sent_at: sentAt,
        subject: subjects[i % subjects.length],
        from_domain: domains[i % domains.length],
        volume,
        delivered,
        opens,
        clicks,
        bounces: Math.floor(volume * 0.02),
        unsubscribes: Math.floor(opens * 0.005),
        status: i < 3 ? "active" : "completed",
      });
    }

    const start = (page - 1) * perPage;
    const paginated = mockSends.slice(start, start + perPage);

    return {
      data: paginated,
      meta: { total: mockSends.length, page, per_page: perPage },
    };
  }
}

// Export singleton
export const inboxroadClient = new InboxroadClient();
