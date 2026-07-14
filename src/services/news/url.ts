import type { NewsItem } from "./NewsProvider";

const trackingKeys=new Set(["fbclid","gclid","dclid","mc_cid","mc_eid","ref","referrer","source","igshid"]);

export function normalizeNewsUrl(value:string|undefined|null):string {
  if(!value)return "";
  try{
    const url=new URL(value);
    if(!["http:","https:"].includes(url.protocol))return "";
    url.hash="";
    for(const key of [...url.searchParams.keys()]){
      if(key.toLowerCase().startsWith("utm_")||trackingKeys.has(key.toLowerCase()))url.searchParams.delete(key);
    }
    url.searchParams.sort();
    url.pathname=url.pathname.replace(/\/{2,}/g,"/");
    if(url.pathname.length>1)url.pathname=url.pathname.replace(/\/+$/,"");
    return url.toString();
  }catch{return "";}
}

export function isLikelyArticleUrl(value:string|undefined|null):boolean {
  const normalized=normalizeNewsUrl(value); if(!normalized)return false;
  const url=new URL(normalized); const segments=url.pathname.split("/").filter(Boolean).map(x=>x.toLowerCase());
  if(!segments.length)return false;
  const path=segments.join("/");
  if(/(^|\/)(rss|feed)(\/|$)/.test(path)||/\.(rss|xml)$/.test(path))return false;
  const listingRoots=new Set(["search","category","categories","topic","topics","news","articles","index.html","home"]);
  if(segments.length===1&&listingRoots.has(segments[0]))return false;
  if(["search","category","categories","topic","topics"].includes(segments[0])&&segments.length<=2)return false;
  if((url.searchParams.has("q")||url.searchParams.has("s")||url.searchParams.has("query"))&&segments.length<=1)return false;
  return true;
}

export function getPreferredArticleUrl(news:Pick<NewsItem,"articleUrl"|"originalUrl"|"isArticleUrl">):string {
  const article=normalizeNewsUrl(news.articleUrl);
  if(article&&news.isArticleUrl!==false&&isLikelyArticleUrl(article))return article;
  const original=normalizeNewsUrl(news.originalUrl);
  return original&&isLikelyArticleUrl(original)?original:"";
}

export function normalizeNewsItem(news:NewsItem):NewsItem {
  const articleUrl=normalizeNewsUrl(news.articleUrl||news.originalUrl||news.sourceUrl);
  const sourceUrl=normalizeNewsUrl(news.sourceUrl);
  const originalUrl=normalizeNewsUrl(news.originalUrl||news.articleUrl||news.sourceUrl);
  return {...news,articleUrl,sourceUrl,feedUrl:normalizeNewsUrl(news.feedUrl),originalUrl,isArticleUrl:news.isArticleUrl??isLikelyArticleUrl(articleUrl),redirectCount:Number.isFinite(news.redirectCount)?news.redirectCount:0};
}

type FetchLike=(input:string,init?:RequestInit)=>Promise<Response>;
export async function resolveArticleUrl(originalUrl:string,fetcher:FetchLike=fetch,maxRedirects=5):Promise<{articleUrl:string;redirectCount:number;isArticleUrl:boolean}>{
  let current=normalizeNewsUrl(originalUrl),redirectCount=0;
  if(!current)return {articleUrl:"",redirectCount,isArticleUrl:false};
  while(redirectCount<maxRedirects){
    try{
      const response=await fetcher(current,{method:"HEAD",redirect:"manual"});
      if(response.status<300||response.status>=400)break;
      const location=response.headers.get("location"); if(!location)break;
      current=normalizeNewsUrl(new URL(location,current).toString()); redirectCount++;
    }catch{break;}
  }
  return {articleUrl:current,redirectCount,isArticleUrl:isLikelyArticleUrl(current)};
}
