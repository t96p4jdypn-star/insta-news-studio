import type { NewsItem } from "./NewsProvider.ts";

export interface RssCategoryRequest {
  id: string;
  name: string;
  keywords: string[];
  excludedKeywords?: string[];
}

const entityMap:Record<string,string>={amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" "};

function decodeXml(value:string):string {
  return value.replace(/^<!\[CDATA\[|\]\]>$/g,"").replace(/&#(x?[0-9a-f]+);|&([a-z]+);/gi,(_match,numeric,named)=>{
    if(numeric){const radix=String(numeric).toLowerCase().startsWith("x")?16:10;const number=parseInt(String(numeric).replace(/^x/i,""),radix);return Number.isFinite(number)?String.fromCodePoint(number):"";}
    return entityMap[String(named).toLowerCase()]??"";
  }).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
}

function tag(block:string,name:string):string {
  return decodeXml(block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,"i"))?.[1]??"");
}

function source(block:string):{name:string;url:string} {
  const match=block.match(/<source(?:\s+url=["']([^"']+)["'])?[^>]*>([\s\S]*?)<\/source>/i);
  return {name:decodeXml(match?.[2]??"")||"配信元不明",url:decodeXml(match?.[1]??"")};
}

function stableId(value:string):string {
  let hash=2166136261;
  for(let index=0;index<value.length;index++){hash^=value.charCodeAt(index);hash=Math.imul(hash,16777619);}
  return (hash>>>0).toString(36);
}

export function createGoogleNewsRssUrl(category:RssCategoryRequest):string {
  const terms=[category.name,...category.keywords].map(value=>value.trim()).filter(Boolean).slice(0,6);
  const exclusions=(category.excludedKeywords??[]).map(value=>value.trim()).filter(Boolean).slice(0,4).map(value=>`-${value}`);
  const query=[terms.length?`(${terms.join(" OR ")})`:category.name,...exclusions].join(" ");
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ja&gl=JP&ceid=JP:ja`;
}

export function parseGoogleNewsRss(xml:string,category:RssCategoryRequest,feedUrl=createGoogleNewsRssUrl(category)):NewsItem[] {
  const items=xml.match(/<item\b[\s\S]*?<\/item>/gi)??[];
  return items.flatMap((block,index)=>{
    const sourceInfo=source(block),originalTitle=tag(block,"title"),link=tag(block,"link");
    if(!originalTitle||!/^https?:\/\//i.test(link))return [];
    const suffix=` - ${sourceInfo.name}`;
    const title=originalTitle.endsWith(suffix)?originalTitle.slice(0,-suffix.length).trim():originalTitle;
    const excluded=(category.excludedKeywords??[]).some(word=>word&&title.toLowerCase().includes(word.toLowerCase()));
    if(excluded)return [];
    const published=tag(block,"pubDate"),publishedAt=Number.isNaN(Date.parse(published))?new Date().toISOString():new Date(published).toISOString();
    return [{
      id:`rss-${category.id}-${stableId(`${link}-${index}`)}`,
      title,
      summary:`「${title}」について配信された記事です。詳しい内容は元記事で確認してください。`,
      sourceName:sourceInfo.name,
      articleUrl:link,
      sourceUrl:sourceInfo.url,
      feedUrl,
      originalUrl:link,
      isArticleUrl:true,
      redirectCount:0,
      publishedAt,
      category:category.name,
      categoryId:category.id,
      keywords:category.keywords.filter(keyword=>title.toLowerCase().includes(keyword.toLowerCase())),
      relevanceScore:Math.min(5,Math.max(3,3+category.keywords.filter(keyword=>title.toLowerCase().includes(keyword.toLowerCase())).length)),
      status:"candidate" as const,
    }];
  });
}

export function normalizeRssCategories(value:unknown):RssCategoryRequest[] {
  if(!Array.isArray(value))return [];
  return value.slice(0,8).flatMap((item,index)=>{
    if(!item||typeof item!=="object")return [];
    const record=item as Record<string,unknown>;
    const name=typeof record.name==="string"?record.name.trim().slice(0,50):"";
    if(!name)return [];
    const strings=(input:unknown,limit:number)=>Array.isArray(input)?input.filter((entry):entry is string=>typeof entry==="string").map(entry=>entry.trim().slice(0,50)).filter(Boolean).slice(0,limit):[];
    return [{id:typeof record.id==="string"&&record.id.trim()?record.id.trim().slice(0,80):`category-${index}`,name,keywords:strings(record.keywords,8),excludedKeywords:strings(record.excludedKeywords,6)}];
  });
}

export function deduplicateRssNews(items:NewsItem[],limit=10):NewsItem[] {
  const seen=new Set<string>();
  return [...items].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).filter(item=>{
    const key=item.title.toLowerCase().replace(/[\s　\p{P}\p{S}]/gu,"").slice(0,48);
    if(!key||seen.has(key))return false;seen.add(key);return true;
  }).slice(0,limit);
}
