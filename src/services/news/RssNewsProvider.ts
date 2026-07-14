import type { NewsItem, NewsProvider } from "./NewsProvider";
import { normalizeNewsItem, resolveArticleUrl } from "./url";
import { createGoogleNewsRssUrl, deduplicateRssNews, parseGoogleNewsRss, type RssCategoryRequest } from "./rss";

type FetchLike=(input:string,init?:RequestInit)=>Promise<Response>;

/** 公開RSSをサーバー側で取得する交換可能なプロバイダー。 */
export class RssNewsProvider implements NewsProvider {
  readonly name = "Google News RSS";
  constructor(private readonly categories:RssCategoryRequest[]=[],private readonly fetcher:FetchLike=fetch){}
  async prepareItem(item:NewsItem):Promise<NewsItem> {
    const resolved=await resolveArticleUrl(item.originalUrl||item.articleUrl);
    return normalizeNewsItem({...item,...resolved});
  }
  async getLatest(): Promise<NewsItem[]> {
    const results=await Promise.allSettled(this.categories.map(async category=>{
      const feedUrl=createGoogleNewsRssUrl(category),response=await this.fetcher(feedUrl,{headers:{accept:"application/rss+xml, application/xml;q=0.9"}});
      if(!response.ok)throw new Error(`RSS ${response.status}`);
      return parseGoogleNewsRss(await response.text(),category,feedUrl).slice(0,4);
    }));
    return deduplicateRssNews(results.flatMap(result=>result.status==="fulfilled"?result.value:[]),10).map(normalizeNewsItem);
  }
}
