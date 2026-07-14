import type { NewsItem } from "../services/news/NewsProvider";
import type { FavoriteCategory } from "./categories";
import { composeCaption, createCaptionBlocks, type CaptionBlock } from "./composer";
export type { FavoriteCategory } from "./categories";
export type { CaptionBlock } from "./composer";

export type DraftStatus = "下書き" | "完成" | "投稿済み" | "保留";
export type SlideLayout="standard"|"headline"|"quote"|"minimal";
export interface PostSlide { id:string; order:number; template:string; headline:string; body:string; layout?:SlideLayout; }
export interface PostDraft {
  id:string; news:NewsItem; comment:string; style:string; tone:string; headline:string; caption:string;
  hashtags:string[]; sourceNote:string; status:DraftStatus; scheduledDate:string; publishedDate?:string;
  createdAt:string; updatedAt:string; slides:PostSlide[]; captionBlocks?:CaptionBlock[];
}
export interface InterestProfile { purpose:string; categories:string[]; keywords:Record<string,string[]>; excludedKeywords:string[]; preferredStyles:string[]; favoriteCategories:FavoriteCategory[]; }

export const categories = ["広島東洋カープ","プロ野球","女子プロレス","女子駅伝","女子バスケットボール","ラグビー","サッカー","AI","アプリ開発","教育","高校受験"];
export const styles = ["一言紹介","ニュース解説","私の考え","比較","ランキング","選手評価","オーダー予想","戦力分析","データカード","コラム","今日の論点","振り返り"];
export const tones = ["ファン目線・落ち着いた解説","落ち着いた解説","ファン目線","少し辛口","雑談風","短く簡潔","熱量高め"];
export const themes = [
  ["スポーツ赤系","theme-red"],["プロレス紫系","theme-purple"],["駅伝青系","theme-blue"],["ラグビー緑系","theme-green"],
  ["AIダーク系","theme-dark"],["教育ネイビー系","theme-navy"],["モノクロ論評","theme-mono"],["明るいカード型","theme-light"],
] as const;
export const slideLayouts:[[string,SlideLayout],[string,SlideLayout],[string,SlideLayout],[string,SlideLayout]]=[["標準","standard"],["見出し重視","headline"],["コメント引用","quote"],["シンプル","minimal"]];

export function suggestStyle(category:string, title:string) {
  if (category.includes("駅伝")) return "オーダー予想";
  if (category.includes("プロレス")) return "選手評価";
  if (title.includes("加入") || title.includes("選出")) return "比較";
  if (title.includes("若手") || title.includes("一軍")) return "戦力分析";
  if (title.includes("結果")) return "今日の論点";
  return "私の考え";
}

export function suggestTheme(category:string) {
  if (category.includes("プロレス")) return "theme-purple";
  if (category.includes("駅伝")) return "theme-blue";
  if (category.includes("ラグビー")) return "theme-green";
  if (category.includes("AI") || category.includes("アプリ")) return "theme-dark";
  if (category.includes("教育") || category.includes("受験")) return "theme-navy";
  return "theme-red";
}

export function generateDraft(news:NewsItem, comment:string, style:string, tone:string, slideCount:number, template:string): PostDraft {
  const cleanComment = comment.trim();
  const headline = news.title.replace(/[、。]/g," ").slice(0,34);
  const sourceNote = `${news.sourceName}の発表・報道を受けての個人的な感想です。`;
  const hashtags = [`#${news.category.replace(/\s/g,"")}`, "#ニュース解説", "#今日の論点"];
  const captionBlocks=createCaptionBlocks(news,cleanComment,headline,sourceNote,hashtags);
  const caption=composeCaption(captionBlocks);
  const base = [
    {headline, body:`TODAY'S TOPIC\n${news.category}`},
    {headline:"今日のニュース", body:news.summary.slice(0,110)},
    {headline:"私の考え", body:cleanComment.slice(0,120)},
    {headline:style, body:`注目ポイント\n${news.keywords.slice(0,3).join(" ・ ")}`},
    {headline:"あなたはどう思う？", body:"気になったポイントを\nコメントで教えてください。"},
  ];
  const now = new Date().toISOString();
  return { id:`draft-${Date.now()}`, news, comment:cleanComment, style, tone, headline, caption, captionBlocks, hashtags, sourceNote, status:"下書き", scheduledDate:new Date().toISOString().slice(0,10), createdAt:now, updatedAt:now, slides:base.slice(0,slideCount).map((s,i)=>({id:`slide-${i}`,order:i+1,template,layout:i===0?"headline":i===2?"quote":"standard",...s})) };
}
