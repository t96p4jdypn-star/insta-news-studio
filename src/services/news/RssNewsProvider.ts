import type { NewsItem, NewsProvider } from "./NewsProvider";

/** 正式に利用可能なRSSをサーバー側で取得する実装へ差し替えるための境界。 */
export class RssNewsProvider implements NewsProvider {
  readonly name = "RSS（未接続）";
  async getLatest(): Promise<NewsItem[]> { return []; }
}
