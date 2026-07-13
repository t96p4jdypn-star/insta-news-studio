export type NewsStatus = "candidate" | "saved" | "ignored";

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  category: string;
  keywords: string[];
  relevanceScore: number;
  status: NewsStatus;
}

export interface NewsProvider {
  readonly name: string;
  getLatest(): Promise<NewsItem[]>;
}
