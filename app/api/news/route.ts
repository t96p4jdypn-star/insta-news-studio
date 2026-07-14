import { createGoogleNewsRssUrl, deduplicateRssNews, normalizeRssCategories, parseGoogleNewsRss } from "../../../src/services/news/rss";

export const runtime="edge";

export async function POST(request:Request) {
  try{
    const body=await request.json() as {categories?:unknown};
    const categories=normalizeRssCategories(body.categories);
    if(!categories.length)return Response.json({error:"取得対象のジャンルがありません"},{status:400});
    const results=await Promise.allSettled(categories.map(async category=>{
      const feedUrl=createGoogleNewsRssUrl(category);
      const response=await fetch(feedUrl,{headers:{accept:"application/rss+xml, application/xml;q=0.9"}});
      if(!response.ok)throw new Error(`RSS ${response.status}`);
      return parseGoogleNewsRss(await response.text(),category,feedUrl).slice(0,4);
    }));
    const items=deduplicateRssNews(results.flatMap(result=>result.status==="fulfilled"?result.value:[]),10);
    if(!items.length)return Response.json({error:"RSSから記事を取得できませんでした"},{status:502});
    return Response.json({items,fetchedAt:new Date().toISOString(),provider:"Google News RSS"},{headers:{"cache-control":"public, max-age=300, s-maxage=600"}});
  }catch{
    return Response.json({error:"ニュース取得処理に失敗しました"},{status:500});
  }
}
