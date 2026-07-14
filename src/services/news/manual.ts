import type { NewsItem } from "./NewsProvider";
import { isLikelyArticleUrl, normalizeNewsUrl } from "./url.ts";

export interface ManualNewsInput { title:string; summary:string; sourceName:string; articleUrl:string; category:string; categoryId?:string; }

export function createManualNewsItem(input:ManualNewsInput,now=new Date()):NewsItem {
  const articleUrl=normalizeNewsUrl(input.articleUrl);
  if(!input.title.trim())throw new Error("記事タイトルを入力してください");
  if(!articleUrl)throw new Error("https://から始まる記事URLを入力してください");
  if(!isLikelyArticleUrl(articleUrl))throw new Error("トップページではなく、記事本文のURLを入力してください");
  const origin=new URL(articleUrl).origin;
  return {id:`manual-${now.getTime()}`,title:input.title.trim(),summary:input.summary.trim()||"要約は未入力です。元記事を確認してからコメントを追加してください。",sourceName:input.sourceName.trim()||new URL(articleUrl).hostname,articleUrl,sourceUrl:origin,feedUrl:"",originalUrl:articleUrl,isArticleUrl:true,redirectCount:0,publishedAt:now.toISOString(),category:input.category,categoryId:input.categoryId,keywords:input.title.split(/[\s、。・]/).filter(word=>word.length>=2).slice(0,6),relevanceScore:4,status:"candidate"};
}
