import type { NewsItem, NewsProvider } from "./NewsProvider";
import { normalizeNewsItem, resolveArticleUrl } from "./url";

/** 正式に利用可能なRSSをサーバー側で取得する実装へ差し替えるための境界。 */
export class RssNewsProvider implements NewsProvider {
  readonly name = "RSS（未接続）";
  async prepareItem(item:NewsItem):Promise<NewsItem> {
    const resolved=await resolveArticleUrl(item.originalUrl||item.articleUrl);
    return normalizeNewsItem({...item,...resolved});
  }
  async getLatest(): Promise<NewsItem[]> { return []; }
}
