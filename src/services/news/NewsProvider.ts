export type NewsStatus = "candidate" | "saved" | "ignored";

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  articleUrl: string;
  sourceUrl: string;
  feedUrl: string;
  originalUrl: string;
  isArticleUrl: boolean;
  redirectCount: number;
  publishedAt: string;
  category: string;
  categoryId?: string;
  keywords: string[];
  relevanceScore: number;
  status: NewsStatus;
}

export interface NewsProvider {
  readonly name: string;
  getLatest(): Promise<NewsItem[]>;
}
