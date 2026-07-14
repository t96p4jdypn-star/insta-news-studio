export interface FavoriteCategory {
  id: string;
  displayName: string;
  icon: string;
  searchKeywords: string[];
  excludedKeywords: string[];
  order: number;
  isVisible: boolean;
  description: string;
  initiallyVisible: boolean;
  usageCount: number;
  lastUsedAt?: string;
}

export const FREQUENT_USE_THRESHOLD = 3;

const initialDefinitions: Omit<FavoriteCategory, "order" | "usageCount">[] = [
  { id:"carp", displayName:"広島東洋カープ", icon:"⚾", searchKeywords:["若手起用","二軍","ドラフト","戦力分析","先発投手"], excludedKeywords:["グッズ情報"], isVisible:true, description:"若手起用、編成、戦力分析を中心に追います。", initiallyVisible:true },
  { id:"womens-wrestling", displayName:"女子プロレス", icon:"◆", searchKeywords:["葉月","朱里","スターダム","試合内容","技術"], excludedKeywords:["芸能ゴシップ"], isVisible:true, description:"試合内容、選手評価、タイトル戦を中心に追います。", initiallyVisible:true },
  { id:"womens-ekiden", displayName:"女子駅伝", icon:"↗", searchKeywords:["クイーンズ駅伝","新加入","区間配置","オーダー予想"], excludedKeywords:["単なる試合結果"], isVisible:true, description:"区間配置、新加入、代表選考を中心に追います。", initiallyVisible:true },
  { id:"womens-basketball", displayName:"女子バスケットボール", icon:"◉", searchKeywords:["日本代表","選手選考","ポイントガード","ディフェンス","若手"], excludedKeywords:[], isVisible:true, description:"代表選考と若手選手の成長を中心に追います。", initiallyVisible:true },
  { id:"rugby", displayName:"ラグビー", icon:"◒", searchKeywords:["リーグワン","埼玉ワイルドナイツ","神戸","補強","戦術"], excludedKeywords:[], isVisible:true, description:"リーグワン、補強、戦術を中心に追います。", initiallyVisible:true },
  { id:"ai", displayName:"AI", icon:"✦", searchKeywords:["生成AI","活用","OpenAI","教育"], excludedKeywords:[], isVisible:true, description:"生成AIの活用とサービス動向を追います。", initiallyVisible:true },
  { id:"app-development", displayName:"アプリ開発", icon:"⌘", searchKeywords:["PWA","Webアプリ","アクセシビリティ","開発"], excludedKeywords:[], isVisible:true, description:"Webアプリとプロダクト開発の実践情報を追います。", initiallyVisible:true },
  { id:"education", displayName:"教育", icon:"▤", searchKeywords:["教育","高校受験","授業","学習"], excludedKeywords:[], isVisible:true, description:"教育、授業づくり、高校受験の情報を追います。", initiallyVisible:true },
];

export function createInitialFavoriteCategories(): FavoriteCategory[] {
  return initialDefinitions.map((category,order)=>({ ...category, order, usageCount:0, searchKeywords:[...category.searchKeywords], excludedKeywords:[...category.excludedKeywords] }));
}

export function normalizeFavoriteCategories(value:unknown, legacyCategories:string[]=[], legacyKeywords:Record<string,string[]>={}): FavoriteCategory[] {
  if(Array.isArray(value)&&value.length){
    return value.map((raw,index)=>{
      const source=(raw&&typeof raw==="object"?raw:{}) as Partial<FavoriteCategory>;
      const displayName=String(source.displayName??legacyCategories[index]??`ジャンル${index+1}`);
      return {
        id:String(source.id??`category-${index}-${displayName}`), displayName, icon:String(source.icon??"●"),
        searchKeywords:Array.isArray(source.searchKeywords)?source.searchKeywords.map(String):[...(legacyKeywords[displayName]??[])],
        excludedKeywords:Array.isArray(source.excludedKeywords)?source.excludedKeywords.map(String):[], order:Number.isFinite(source.order)?Number(source.order):index,
        isVisible:source.isVisible!==false, description:String(source.description??""), initiallyVisible:source.initiallyVisible!==false,
        usageCount:Number.isFinite(source.usageCount)?Math.max(0,Number(source.usageCount)):0,
        ...(source.lastUsedAt?{lastUsedAt:String(source.lastUsedAt)}:{}),
      };
    }).sort((a,b)=>a.order-b.order).map((category,order)=>({...category,order}));
  }
  const initial=createInitialFavoriteCategories();
  for(const name of legacyCategories){
    const found=initial.find(category=>category.displayName===name);
    if(found){ found.searchKeywords=[...new Set([...(legacyKeywords[name]??[]),...found.searchKeywords])]; continue; }
    initial.push({ id:`legacy-${initial.length}-${name}`, displayName:name, icon:"●", searchKeywords:[...(legacyKeywords[name]??[])], excludedKeywords:[], order:initial.length, isVisible:true, description:"以前の設定から引き継いだジャンルです。", initiallyVisible:true, usageCount:0 });
  }
  return initial.map((category,order)=>({...category,order}));
}

export function reorderFavoriteCategories(items:FavoriteCategory[], activeId:string, targetId:string):FavoriteCategory[]{
  const from=items.findIndex(item=>item.id===activeId),to=items.findIndex(item=>item.id===targetId);
  if(from<0||to<0||from===to)return items;
  const next=[...items]; const [moved]=next.splice(from,1); next.splice(to,0,moved);
  return next.map((item,order)=>({...item,order}));
}

export function createFavoriteCategory(order:number,id=`custom-${Date.now()}`):FavoriteCategory {
  return {id,displayName:"新しいジャンル",icon:"●",searchKeywords:[],excludedKeywords:[],order,isVisible:true,description:"",initiallyVisible:false,usageCount:0};
}

export function deleteFavoriteCategory(items:FavoriteCategory[],id:string):FavoriteCategory[]{
  return items.filter(item=>item.id!==id).map((item,order)=>({...item,order}));
}

export function recordCategoryUsage(items:FavoriteCategory[], displayName:string, usedAt=new Date().toISOString()):FavoriteCategory[]{
  const found=items.find(item=>item.displayName===displayName);
  if(!found)return [...items,{id:`observed-${Date.now()}`,displayName,icon:"●",searchKeywords:[displayName],excludedKeywords:[],order:items.length,isVisible:false,description:"ニュース利用履歴から追加されたジャンルです。",initiallyVisible:false,usageCount:1,lastUsedAt:usedAt}];
  return items.map(item=>item.id===found.id?{...item,usageCount:item.usageCount+1,lastUsedAt:usedAt}:item);
}

export function isFrequentCategory(category:FavoriteCategory){ return category.usageCount>=FREQUENT_USE_THRESHOLD; }
