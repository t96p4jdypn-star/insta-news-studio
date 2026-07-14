export type CaptionBlockKind="headline"|"summary"|"opinion"|"point"|"question"|"source"|"hashtags";
export interface CaptionBlock { id:string; kind:CaptionBlockKind; label:string; body:string; enabled:boolean; order:number; }

interface CaptionSource { title:string; summary:string; sourceName:string; category:string; keywords:string[]; }

export function createCaptionBlocks(news:CaptionSource,comment:string,headline:string,sourceNote:string,hashtags:string[]):CaptionBlock[]{
  return [
    {id:"headline",kind:"headline",label:"見出し",body:`【${headline}】`,enabled:true,order:0},
    {id:"summary",kind:"summary",label:"ニュース概要",body:news.summary,enabled:true,order:1},
    {id:"opinion",kind:"opinion",label:"私の考え",body:`私が注目したのは、${comment.trim()}という点です。`,enabled:true,order:2},
    {id:"point",kind:"point",label:"注目ポイント",body:`注目ポイント：${news.keywords.slice(0,3).join("・")||news.category}`,enabled:true,order:3},
    {id:"question",kind:"question",label:"問いかけ",body:"みなさんは、どこに注目しましたか？",enabled:true,order:4},
    {id:"source",kind:"source",label:"出典",body:`出典：${news.sourceName}\n${sourceNote}`,enabled:true,order:5},
    {id:"hashtags",kind:"hashtags",label:"ハッシュタグ",body:hashtags.join(" "),enabled:true,order:6},
  ];
}

export function composeCaption(blocks:CaptionBlock[]):string {
  return [...blocks].filter(block=>block.enabled&&block.body.trim()).sort((a,b)=>a.order-b.order).map(block=>block.body.trim()).join("\n\n");
}

export function reorderCaptionBlocks(blocks:CaptionBlock[],id:string,direction:-1|1):CaptionBlock[]{
  const ordered=[...blocks].sort((a,b)=>a.order-b.order),index=ordered.findIndex(block=>block.id===id),target=index+direction;
  if(index<0||target<0||target>=ordered.length)return ordered;
  [ordered[index],ordered[target]]=[ordered[target],ordered[index]];
  return ordered.map((block,order)=>({...block,order}));
}

export function polishText(value:string):string {
  return value.replace(/[ \t]+/g," ").replace(/ *\n */g,"\n").replace(/\n{3,}/g,"\n\n").replace(/([。！？])([^\n])/g,"$1\n$2").replace(/\n[ \t]+/g,"\n").trim();
}

export function polishCaptionBlocks(blocks:CaptionBlock[]):CaptionBlock[]{
  return blocks.map(block=>({...block,body:polishText(block.body)}));
}

export function shortenCaptionBlocks(blocks:CaptionBlock[]):CaptionBlock[]{
  const limits:Record<CaptionBlockKind,number>={headline:42,summary:100,opinion:120,point:70,question:60,source:140,hashtags:160};
  return blocks.map(block=>({...block,body:shortenText(block.body,limits[block.kind])}));
}

export function shortenText(value:string,maxLength:number):string {
  const clean=value.trim(); if(clean.length<=maxLength)return clean;
  const sentence=clean.slice(0,maxLength).replace(/[、,][^、,。！？]*$/,"").replace(/[。！？]?$/,"");
  return `${sentence||clean.slice(0,maxLength-1)}…`;
}
