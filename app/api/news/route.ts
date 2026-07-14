import { createBingNewsRssUrl, createGoogleNewsRssUrl, deduplicateRssNews, normalizeRssCategories, parseBingNewsRss, parseGoogleNewsRss } from "../../../src/services/news/rss";

export const runtime="edge";

export async function POST(request:Request) {
  try{
    const body=await request.json() as {categories?:unknown};
    const categories=normalizeRssCategories(body.categories);
    if(!categories.length)return Response.json({error:"取得対象のジャンルがありません"},{status:400});
    const results=await Promise.allSettled(categories.map(async category=>{
      const googleUrl=createGoogleNewsRssUrl(category);
      try{
        const response=await fetch(googleUrl,{headers:{accept:"application/rss+xml, application/xml;q=0.9"}});
        if(response.ok){const items=parseGoogleNewsRss(await response.text(),category,googleUrl);if(items.length)return items.slice(0,4);}
      }catch{}
      const bingUrl=createBingNewsRssUrl(category),response=await fetch(bingUrl,{headers:{accept:"application/rss+xml, application/xml;q=0.9"}});
      if(!response.ok)throw new Error(`RSS ${response.status}`);
      return parseBingNewsRss(await response.text(),category,bingUrl).slice(0,4);
    }));
    const items=deduplicateRssNews(results.flatMap(result=>result.status==="fulfilled"?result.value:[]),10);
    if(!items.length)return Response.json({error:"RSSから記事を取得できませんでした"},{status:502});
    return Response.json({items,fetchedAt:new Date().toISOString(),provider:"Public News RSS"},{headers:{"cache-control":"public, max-age=300, s-maxage=600"}});
  }catch{
    return Response.json({error:"ニュース取得処理に失敗しました"},{status:500});
  }
}
