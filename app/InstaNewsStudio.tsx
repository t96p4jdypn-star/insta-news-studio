"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { mockNews } from "../src/services/news/MockNewsProvider";
import type { NewsItem } from "../src/services/news/NewsProvider";
import { generateDraft, styles, suggestStyle, suggestTheme, themes, tones, type InterestProfile, type PostDraft } from "../src/lib/models";
import { createFavoriteCategory, createInitialFavoriteCategories, deleteFavoriteCategory, isFrequentCategory, normalizeFavoriteCategories, recordCategoryUsage, reorderFavoriteCategories, type FavoriteCategory } from "../src/lib/categories";
import { getPreferredArticleUrl, normalizeNewsItem, normalizeNewsUrl } from "../src/services/news/url";

type View = "home" | "editor" | "stock" | "calendar" | "search" | "settings" | "guide";
const PROFILE_KEY = "insta-news-studio-profile-v1";
const DRAFT_KEY = "insta-news-studio-drafts-v1";
const SAVED_KEY = "insta-news-studio-saved-v1";
const initialFavoriteCategories=createInitialFavoriteCategories();
const defaultProfile: InterestProfile = { purpose:"両方", categories:initialFavoriteCategories.map(category=>category.displayName), keywords:Object.fromEntries(initialFavoriteCategories.map(category=>[category.displayName,category.searchKeywords])), excludedKeywords:["芸能ゴシップ","グッズ情報","単なる試合結果"], preferredStyles:["私の考え","ニュース解説"], favoriteCategories:initialFavoriteCategories };
const categoryColors: Record<string,string> = {"広島東洋カープ":"#b72b25","プロ野球":"#bd5436","女子プロレス":"#80418e","女子駅伝":"#2672a0","女子バスケットボール":"#bc6034","ラグビー":"#377c55","サッカー":"#328278","AI":"#334963","アプリ開発":"#536477","教育":"#36578a"};

function safeParse<T>(value:string|null, fallback:T):T { try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
function formatDate(value:string) { return new Intl.DateTimeFormat("ja-JP",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value)); }
function iconFor(category:string) { if(category.includes("カープ")||category.includes("野球"))return "⚾"; if(category.includes("プロレス"))return "◆"; if(category.includes("駅伝"))return "↗"; if(category.includes("ラグビー"))return "◒"; if(category.includes("AI")||category.includes("アプリ"))return "✦"; return "●"; }
function favoriteForNews(categories:FavoriteCategory[],news:NewsItem){return categories.find(category=>category.id===news.categoryId||category.displayName===news.category);}
async function copyToClipboard(value:string){if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);return;}const area=document.createElement("textarea");area.value=value;area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();}
function syncProfileCategories(profile:InterestProfile,favoriteCategories:FavoriteCategory[]):InterestProfile { return {...profile,favoriteCategories,categories:favoriteCategories.filter(category=>category.isVisible).map(category=>category.displayName),keywords:Object.fromEntries(favoriteCategories.map(category=>[category.displayName,category.searchKeywords]))}; }
function normalizeProfile(profile:Partial<InterestProfile>|null):InterestProfile { if(!profile)return defaultProfile; const favoriteCategories=normalizeFavoriteCategories(profile.favoriteCategories,profile.categories??[],profile.keywords??{}); return syncProfileCategories({...defaultProfile,...profile,favoriteCategories},favoriteCategories); }

export default function InstaNewsStudio() {
  const [ready,setReady]=useState(false);
  const [showOnboarding,setShowOnboarding]=useState(false);
  const [profile,setProfile]=useState<InterestProfile>(defaultProfile);
  const [view,setView]=useState<View>("home");
  const [filter,setFilter]=useState("すべて");
  const [newsItems,setNewsItems]=useState(()=>mockNews.map(normalizeNewsItem));
  const [saved,setSaved]=useState<string[]>([]);
  const [drafts,setDrafts]=useState<PostDraft[]>([]);
  const [selectedNews,setSelectedNews]=useState<NewsItem|null>(null);
  const [activeDraft,setActiveDraft]=useState<PostDraft|null>(null);
  const [toast,setToast]=useState("");
  const [query,setQuery]=useState("");

  /* eslint-disable react-hooks/set-state-in-effect -- Device-local data is available only after client mount. */
  useEffect(()=>{
    const storedProfile=safeParse<Partial<InterestProfile>|null>(localStorage.getItem(PROFILE_KEY),null);
    const nextProfile=normalizeProfile(storedProfile);
    setProfile(nextProfile);
    if(storedProfile)localStorage.setItem(PROFILE_KEY,JSON.stringify(nextProfile));
    setShowOnboarding(!storedProfile);
    setDrafts(safeParse<PostDraft[]>(localStorage.getItem(DRAFT_KEY),[]).map(draft=>({...draft,news:normalizeNewsItem(draft.news)})));
    setSaved(safeParse<string[]>(localStorage.getItem(SAVED_KEY),[]));
    setReady(true);
    if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>undefined);
  },[]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(()=>{ if(!ready)return; localStorage.setItem(DRAFT_KEY,JSON.stringify(drafts)); },[drafts,ready]);
  useEffect(()=>{ if(!ready)return; localStorage.setItem(SAVED_KEY,JSON.stringify(saved)); },[saved,ready]);
  useEffect(()=>{ if(!toast)return; const id=setTimeout(()=>setToast(""),2600); return()=>clearTimeout(id); },[toast]);

  const persistProfile=(next:InterestProfile)=>{setProfile(next);localStorage.setItem(PROFILE_KEY,JSON.stringify(next));};
  const openEditor=(news:NewsItem)=>{ const normalized=normalizeNewsItem(news); setSelectedNews(normalized); setActiveDraft(null); setView("editor"); const next=syncProfileCategories(profile,recordCategoryUsage(profile.favoriteCategories,normalized.category));persistProfile(next); window.scrollTo({top:0}); };
  const saveForLater=(id:string)=>{ setSaved(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]); setToast(saved.includes(id)?"あとで読むから外しました":"あとで読むに保存しました"); };
  const updateDraft=(next:PostDraft)=>{ setActiveDraft(next); setDrafts(prev=>[next,...prev.filter(d=>d.id!==next.id)]); };
  const nav=(next:View)=>{ setView(next); window.scrollTo({top:0,behavior:"smooth"}); };
  const visibleNews=useMemo(()=>newsItems.filter(news=>{const category=profile.favoriteCategories.find(item=>item.id===news.categoryId||item.displayName===news.category);return news.status!=="ignored"&&(!category||category.isVisible)&&(filter==="すべて"||category?.id===filter);}),[newsItems,filter,profile.favoriteCategories]);
  const searchResults=useMemo(()=>{const q=query.trim().toLowerCase(); if(!q)return drafts; return drafts.filter(d=>[d.news.category,d.news.title,d.caption,d.comment,d.status].join(" ").toLowerCase().includes(q));},[query,drafts]);

  if(!ready) return <main className="app-shell" aria-busy="true" />;
  return <div className="app-shell">
    <header className="topbar">
      <button className="brand ghost" onClick={()=>nav("home")} aria-label="ホームへ">
        <span className="brand-mark">N</span><span>Insta News Studio<small>ニュースから今日の投稿をつくる</small></span>
      </button>
      <span className="mode-pill">● モックモード</span>
    </header>
    <div className="workspace">
      <aside className="sidebar" aria-label="メインメニュー">
        <p className="nav-label">STUDIO</p>
        <NavButton icon="⌂" label="今日のおすすめ" active={view==="home"} onClick={()=>nav("home")} count={visibleNews.length}/>
        <NavButton icon="✎" label="作成中" active={view==="editor"} onClick={()=>activeDraft||selectedNews?nav("editor"):openEditor(mockNews[0])}/>
        <NavButton icon="▣" label="投稿ストック" active={view==="stock"} onClick={()=>nav("stock")}/>
        <NavButton icon="□" label="カレンダー" active={view==="calendar"} onClick={()=>nav("calendar")}/>
        <NavButton icon="⌕" label="検索" active={view==="search"} onClick={()=>nav("search")}/>
        <p className="nav-label" style={{marginTop:24}}>PREFERENCES</p>
        <NavButton icon="⚙" label="設定" active={view==="settings"} onClick={()=>nav("settings")}/>
        <NavButton icon="?" label="投稿ガイド" active={view==="guide"} onClick={()=>nav("guide")}/>
        <div className="sidebar-tip"><strong>1日1本を、気軽に。</strong>今日使えそうな候補が{visibleNews.length}件あります。焦らず、自分の言葉をひとつ足しましょう。</div>
      </aside>
      <main className="main">
        {view==="home"&&<Home news={visibleNews} filter={filter} setFilter={setFilter} saved={saved} openEditor={openEditor} saveForLater={saveForLater} setNewsItems={setNewsItems} drafts={drafts} categories={profile.favoriteCategories} onAddRecommendation={id=>{const next=syncProfileCategories(profile,profile.favoriteCategories.map(category=>category.id===id?{...category,initiallyVisible:true,isVisible:true}:category));persistProfile(next);setToast("おすすめジャンルへ追加しました");}} onToast={setToast}/>}
        {view==="editor"&&<Editor key={`${selectedNews?.id??activeDraft?.news.id??"default"}-${activeDraft?.id??"new"}`} news={selectedNews ?? activeDraft?.news ?? mockNews[0]} existing={activeDraft} onSave={updateDraft} onToast={setToast}/>}
        {view==="stock"&&<Stock drafts={drafts} onOpen={d=>{setActiveDraft(d);setSelectedNews(d.news);nav("editor");}} onStatus={d=>updateDraft(d)} emptyAction={()=>openEditor(mockNews[0])}/>}
        {view==="calendar"&&<Calendar drafts={drafts}/>}
        {view==="search"&&<Search drafts={searchResults} query={query} setQuery={setQuery} onOpen={d=>{setActiveDraft(d);setSelectedNews(d.news);nav("editor");}}/>}
        {view==="settings"&&<Settings profile={profile} setProfile={persistProfile} onOnboarding={()=>setShowOnboarding(true)} onToast={setToast}/>}
        {view==="guide"&&<Guide/>}
      </main>
    </div>
    <nav className="mobile-nav" aria-label="モバイルメニュー">
      <MobileNav icon="⌂" label="ホーム" active={view==="home"} onClick={()=>nav("home")}/><MobileNav icon="✎" label="つくる" active={view==="editor"} onClick={()=>selectedNews?nav("editor"):openEditor(mockNews[0])}/><MobileNav icon="▣" label="ストック" active={view==="stock"} onClick={()=>nav("stock")}/><MobileNav icon="□" label="予定" active={view==="calendar"} onClick={()=>nav("calendar")}/><MobileNav icon="⚙" label="設定" active={view==="settings"} onClick={()=>nav("settings")}/>
    </nav>
    {showOnboarding&&<Onboarding initial={profile} onDone={p=>{persistProfile(p);setShowOnboarding(false);setToast("興味設定を保存しました");}}/>}
    {toast&&<div className="toast" role="status">✓ {toast}</div>}
  </div>;
}

function NavButton({icon,label,active,onClick,count}:{icon:string;label:string;active:boolean;onClick:()=>void;count?:number}) { return <button className={`nav-btn ${active?"active":""}`} onClick={onClick}><span className="nav-icon">{icon}</span>{label}{count!==undefined&&<span className="nav-count">{count}</span>}</button>; }
function MobileNav({icon,label,active,onClick}:{icon:string;label:string;active:boolean;onClick:()=>void}) { return <button className={active?"active":""} onClick={onClick}><span>{icon}</span>{label}</button>; }

function NewsLinks({news,onToast}:{news:NewsItem;onToast:(message:string)=>void}){
  const articleUrl=getPreferredArticleUrl(news),sourceUrl=normalizeNewsUrl(news.sourceUrl),fallbackUrl=normalizeNewsUrl(news.originalUrl||news.articleUrl||news.sourceUrl);
  const copyLink=async()=>{const value=articleUrl||fallbackUrl||sourceUrl;if(!value){onToast("コピーできるURLがありません");return;}await copyToClipboard(value);onToast(articleUrl?"記事リンクをコピーしました":"取得時URLをコピーしました");};
  const copyTitle=async()=>{await copyToClipboard(news.title);onToast("検索用タイトルをコピーしました");};
  return <div className="news-link-block">
    <div className="news-links">
      {articleUrl?<a className="article-read" href={articleUrl} target="_blank" rel="noopener noreferrer">この記事を読む ↗</a>:<span className="article-unavailable">記事リンク未確認</span>}
      {sourceUrl&&<a href={sourceUrl} target="_blank" rel="noopener noreferrer">配信元を見る ↗</a>}
      <button type="button" onClick={copyLink}>リンクをコピー</button>
      <button type="button" onClick={copyTitle}>タイトルをコピー</button>
    </div>
    {!articleUrl&&<div className="link-fallback" role="note"><strong>記事本文への直接リンクを確認できません</strong><span>{news.sourceName} ・ {formatDate(news.publishedAt)}</span><p>{news.summary}</p>{fallbackUrl&&<code>{fallbackUrl}</code>}<small>タイトルをコピーしてSafariなどで検索できます。</small></div>}
  </div>;
}

function Home({news,filter,setFilter,saved,openEditor,saveForLater,setNewsItems,drafts,categories,onAddRecommendation,onToast}:{news:NewsItem[];filter:string;setFilter:(s:string)=>void;saved:string[];openEditor:(n:NewsItem)=>void;saveForLater:(id:string)=>void;setNewsItems:React.Dispatch<React.SetStateAction<NewsItem[]>>;drafts:PostDraft[];categories:FavoriteCategory[];onAddRecommendation:(id:string)=>void;onToast:(s:string)=>void}) {
  const filters=categories.filter(category=>category.isVisible&&category.initiallyVisible).sort((a,b)=>a.order-b.order);
  const frequent=categories.filter(category=>isFrequentCategory(category)&&!category.initiallyVisible);
  const today=new Date().toLocaleDateString("ja-JP",{month:"long",day:"numeric",weekday:"long"});
  return <>
    <section className="hero"><div><span className="eyebrow">{today}</span><h1>今日のおすすめ</h1><p>あなたの興味に合わせて、投稿につながりそうなニュースを選びました。</p></div><button className="primary" onClick={()=>openEditor(news[0]??mockNews[0])}>＋ 投稿をつくる</button></section>
    <div className="stats"><div className="stat"><strong>{news.length}</strong><span>おすすめ候補</span></div><div className="stat"><strong>{saved.length}</strong><span>あとで読む</span></div><div className="stat"><strong>{drafts.filter(d=>d.status!=="投稿済み").length}</strong><span>作成途中</span></div><div className="stat"><strong>{drafts.filter(d=>d.status==="投稿済み").length}</strong><span>投稿済み</span></div></div>
    {news.filter(n=>n.category.includes("カープ")).length>=3&&<div className="status-note">最近カープの候補が多めです。女子プロレスやAIの候補も表示しています。</div>}
    {frequent.length>0&&<div className="frequent-note"><div><strong>最近よく利用しています</strong><p>{frequent.map(category=>`${category.icon} ${category.displayName}（${category.usageCount}回）`).join("、")}</p></div>{frequent.map(category=><button className="secondary" key={category.id} onClick={()=>onAddRecommendation(category.id)}>おすすめへ追加</button>)}</div>}
    <div className="section-head"><div><h2>投稿候補</h2><p>★が多いほど、登録キーワードとの一致が多いニュースです。</p></div></div>
    <div className="filter-row" style={{marginBottom:15}}><button className={`chip ${filter==="すべて"?"active":""}`} onClick={()=>setFilter("すべて")}>すべて</button>{filters.map(category=><button key={category.id} className={`chip ${filter===category.id?"active":""}`} onClick={()=>setFilter(category.id)}>{category.icon} {category.displayName}</button>)}</div>
    <div className="news-grid">{news.map(item=><article className="news-card" key={item.id} data-testid={`news-${item.id}`}>
      <div className="card-top"><span className="category" style={{background:categoryColors[item.category]??"#4b6d5c"}}>{favoriteForNews(categories,item)?.icon??iconFor(item.category)}　{favoriteForNews(categories,item)?.displayName??item.category}</span><span className="time">{formatDate(item.publishedAt)}</span></div>
      <h3>{item.title}</h3><p className="summary">{item.summary}</p>
      <div className="meta"><span>{item.sourceName}</span><span>・</span><span className="stars" aria-label={`興味度${item.relevanceScore}`}>{"★".repeat(item.relevanceScore)}{"☆".repeat(5-item.relevanceScore)}</span></div>
      <div className="card-actions"><button className="primary" onClick={()=>openEditor(item)}>投稿候補にする</button><button className="secondary" aria-label={`${item.title}をあとで読む`} onClick={()=>saveForLater(item.id)}>{saved.includes(item.id)?"✓":"♡"}</button></div>
      <NewsLinks news={item} onToast={onToast}/><button className="ghost ignore-link" onClick={()=>setNewsItems(prev=>prev.map(n=>n.id===item.id?{...n,status:"ignored"}:n))}>興味なし</button>
    </article>)}{news.length===0&&<div className="empty">この条件のニュースはありません。別のジャンルを選んでください。</div>}</div>
  </>;
}

function Editor({news,existing,onSave,onToast}:{news:NewsItem;existing:PostDraft|null;onSave:(d:PostDraft)=>void;onToast:(s:string)=>void}) {
  const [comment,setComment]=useState(existing?.comment??"");
  const [style,setStyle]=useState(existing?.style??suggestStyle(news.category,news.title));
  const [tone,setTone]=useState(existing?.tone??tones[0]);
  const [slideCount,setSlideCount]=useState(existing?.slides.length??5);
  const [template,setTemplate]=useState(existing?.slides[0]?.template??suggestTheme(news.category));
  const [draft,setDraft]=useState<PostDraft|null>(existing);
  const [activeSlide,setActiveSlide]=useState(0);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const make=()=>{ if(!comment.trim()){onToast("コメントをひとこと入力してください");return;} const next=generateDraft(news,comment,style,tone,slideCount,template); setDraft(next);setActiveSlide(0);onSave(next);onToast("投稿素材を生成しました"); };
  const updateCaption=(caption:string)=>{ if(!draft)return; const next={...draft,caption,updatedAt:new Date().toISOString()};setDraft(next);onSave(next); };
  const copy=async()=>{ if(!draft)return; await navigator.clipboard.writeText(draft.caption);onToast("キャプションをコピーしました"); };
  const markComplete=()=>{if(!draft)return;const next={...draft,status:"完成" as const,updatedAt:new Date().toISOString()};setDraft(next);onSave(next);onToast("完成として保存しました");};
  const download=()=>{if(!draft)return; const slide=draft.slides[activeSlide]; drawSlide(canvasRef.current,slide,news.sourceName); const a=document.createElement("a");a.download=`insta-news-${activeSlide+1}.png`;a.href=canvasRef.current!.toDataURL("image/png");a.click();onToast(`${activeSlide+1}枚目をPNG保存しました`);};
  const slide=draft?.slides[activeSlide];
  return <>
    <div className="progress-steps"><b className="done">1</b>ニュース<span className="progress-line"/><b className={draft?"done":"current"}>2</b>コメント<span className="progress-line"/><b className={draft?"current":""}>3</b>生成<span className="progress-line"/><b>4</b>投稿</div>
    <section className="hero"><div><span className="eyebrow">CREATE A POST</span><h1>投稿をつくる</h1><p>ニュースの事実に、あなた自身の短い視点を足します。</p></div></section>
    <div className="editor-layout">
      <div className="panel">
        <div className="source-box"><span className="category" style={{background:categoryColors[news.category]??"#4b6d5c"}}>{news.category}</span><h3>{news.title}</h3><p>{news.summary}</p><NewsLinks news={news} onToast={onToast}/></div>
        <div className="field"><label htmlFor="comment">あなたのコメント <span style={{color:"#b34122"}}>必須</span></label><textarea id="comment" value={comment} onChange={e=>setComment(e.target.value)} placeholder="例：もっと早く一軍で使うべきだった。今後の起用にも注目したい。" aria-describedby="comment-help"/><small id="comment-help" style={{color:"#7b827c"}}>短文で大丈夫です。スマートフォンの音声入力も使えます。</small>
          <div className="hint-questions">{["何が面白かったですか","賛成ですか、反対ですか","今後どうなると思いますか","誰に注目していますか"].map(q=><button key={q} onClick={()=>setComment(c=>c+(c?" ":"")+q.replace("ですか","だと思う理由は…"))}>{q}</button>)}</div></div>
        <div className="field"><span className="label">投稿スタイル <small style={{color:"#e4633c"}}>おすすめ：{suggestStyle(news.category,news.title)}</small></span><div className="option-grid">{styles.slice(0,8).map(s=><button className={`option ${style===s?"selected":""}`} key={s} onClick={()=>setStyle(s)}>{s}</button>)}</div></div>
        <div className="field"><label htmlFor="tone">文体</label><select id="tone" value={tone} onChange={e=>setTone(e.target.value)}>{tones.map(t=><option key={t}>{t}</option>)}</select></div>
        <div className="field"><label htmlFor="slides">画像の枚数：{slideCount}枚</label><input id="slides" type="range" min="1" max="5" value={slideCount} onChange={e=>setSlideCount(Number(e.target.value))}/></div>
        <div className="field"><span className="label">デザインテンプレート</span><div className="option-grid">{themes.map(([name,value])=><button key={value} className={`option ${template===value?"selected":""}`} onClick={()=>setTemplate(value)}><span style={{display:"inline-block",width:10,height:10,borderRadius:99,background:value.includes("red")?"#d33":value.includes("purple")?"#80418e":value.includes("blue")?"#2672a0":value.includes("green")?"#377c55":"#34495e",marginRight:7}}/>{name}</button>)}</div></div>
        <div className="generate-row"><button className="primary" data-testid="generate-post" onClick={make}>{draft?"内容を再生成":"投稿素材を生成する"} ✦</button>{draft&&<button className="secondary" onClick={markComplete}>下書きを保存</button>}</div>
      </div>
      <div className="preview-wrap">
        {!draft||!slide?<div className="panel empty" style={{minHeight:420,display:"grid",placeItems:"center"}}><div><div style={{fontSize:44,marginBottom:10}}>✦</div><strong>ここに投稿画像ができます</strong><p>コメントを入力して「投稿素材を生成する」を押してください。</p></div></div>:<>
          <div className="slide-shell"><div className={`canvas-card ${slide.template}`} data-testid="slide-preview"><span className="slide-num">INSTA NEWS STUDIO — {String(activeSlide+1).padStart(2,"0")}</span><h2 className="slide-title">{slide.headline}</h2><div className="slide-body">{slide.body}</div><span className="slide-source">出典：{news.sourceName} ｜ 個人的な感想を含みます</span></div><div className="slide-nav">{draft.slides.map((s,i)=><button key={s.id} aria-label={`${i+1}枚目を表示`} className={`slide-dot ${activeSlide===i?"active":""}`} onClick={()=>setActiveSlide(i)}/>)}</div></div>
          <canvas ref={canvasRef} width="1080" height="1080" hidden aria-hidden="true"/>
          <div className="preview-actions"><button className="primary" data-testid="download-png" onClick={download}>↓ この画像を保存</button><button className="secondary" data-testid="copy-caption" onClick={copy}>□ 本文をコピー</button></div>
          <div className="caption-box"><div className="section-head" style={{margin:"0 0 10px"}}><div><h2 style={{fontSize:14}}>投稿キャプション</h2><p>事実と意見を分け、出典を記載しています。</p></div></div><textarea value={draft.caption} onChange={e=>updateCaption(e.target.value)} aria-label="投稿キャプション"/><button className="primary" style={{width:"100%"}} onClick={markComplete}>内容を確認して完成にする</button></div>
        </>}
      </div>
    </div>
  </>;
}

function drawSlide(canvas:HTMLCanvasElement|null,slide:PostDraft["slides"][number],source:string) {
  if(!canvas)return; const ctx=canvas.getContext("2d"); if(!ctx)return;
  const palettes:Record<string,[string,string,string]>={"theme-red":["#9f1d1d","#ee5d3c","#fff"],"theme-purple":["#351b59","#a24bb2","#fff"],"theme-blue":["#0a3f75","#2597bb","#fff"],"theme-green":["#164d34","#59a557","#fff"],"theme-dark":["#10151c","#27425c","#fff"],"theme-navy":["#142847","#345887","#fff"],"theme-mono":["#171717","#595959","#fff"],"theme-light":["#fffaf0","#f1e2ce","#183c31"]};
  const [a,b,text]=palettes[slide.template]??palettes["theme-red"]; const grad=ctx.createLinearGradient(0,0,1080,1080);grad.addColorStop(0,a);grad.addColorStop(1,b);ctx.fillStyle=grad;ctx.fillRect(0,0,1080,1080);ctx.strokeStyle="rgba(255,255,255,.25)";ctx.lineWidth=3;ctx.beginPath();ctx.arc(970,90,350,0,Math.PI*2);ctx.stroke();ctx.fillStyle=text;ctx.font="800 26px system-ui";ctx.fillText(`INSTA NEWS STUDIO — ${String(slide.order).padStart(2,"0")}`,92,105);drawWrapped(ctx,slide.headline,92,365,880,86,4,text,"bold");drawWrapped(ctx,slide.body,92,735,850,38,4,text,"normal");ctx.globalAlpha=.7;ctx.font="500 22px system-ui";ctx.fillText(`出典：${source} ｜ 個人的な感想を含みます`,92,980);ctx.globalAlpha=1;ctx.fillStyle=text;ctx.fillRect(92,1012,280,14);
}
function drawWrapped(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,maxWidth:number,lineHeight:number,maxLines:number,color:string,weight:string){ctx.fillStyle=color;ctx.font=`${weight} ${lineHeight*.78}px system-ui`;const chars=[...text];let line="",row=0;for(let i=0;i<chars.length;i++){const test=line+chars[i];if(ctx.measureText(test).width>maxWidth||chars[i]==="\n"){ctx.fillText(line,x,y+row*lineHeight);line=chars[i]==="\n"?"":chars[i];row++;if(row>=maxLines-1){line+=chars.slice(i+1).join("");break;}}else line=test;}while(ctx.measureText(line).width>maxWidth&&line.length>1)line=line.slice(0,-2)+"…";ctx.fillText(line,x,y+row*lineHeight);}

function Stock({drafts,onOpen,onStatus,emptyAction}:{drafts:PostDraft[];onOpen:(d:PostDraft)=>void;onStatus:(d:PostDraft)=>void;emptyAction:()=>void}) { return <><section className="hero"><div><span className="eyebrow">POST LIBRARY</span><h1>投稿ストック</h1><p>下書き、完成、投稿済みの素材をまとめて確認できます。</p></div></section>{drafts.length===0?<div className="empty"><h2>まだ投稿素材がありません</h2><p>ニュースをひとつ選び、あなたのコメントを添えてみましょう。</p><button className="primary" onClick={emptyAction}>最初の投稿をつくる</button></div>:<div className="stock-list">{drafts.map(d=><article className="stock-row" key={d.id}><div className="stock-thumb">{iconFor(d.news.category)}</div><div><h3>{d.headline}</h3><p>{d.news.category} ・ {new Date(d.createdAt).toLocaleDateString("ja-JP")} ・ {d.slides.length}枚</p></div><div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}><span className="status-badge">{d.status}</span><button className="secondary" onClick={()=>onOpen(d)}>編集</button>{d.status!=="投稿済み"&&<button className="primary" data-testid="mark-published" onClick={()=>onStatus({...d,status:"投稿済み",publishedDate:new Date().toISOString().slice(0,10),updatedAt:new Date().toISOString()})}>投稿済みにする</button>}</div></article>)}</div>}</>; }

function Calendar({drafts}:{drafts:PostDraft[]}) { const now=new Date(); const year=now.getFullYear(),month=now.getMonth();const first=new Date(year,month,1).getDay();const days=new Date(year,month+1,0).getDate();const cells=Array.from({length:first+days},(_,i)=>i<first?null:i-first+1);return <><section className="hero"><div><span className="eyebrow">POST CALENDAR</span><h1>{year}年{month+1}月</h1><p>1日1本は目標です。無理のないペースで続けられます。</p></div></section><div className="calendar"><div className="calendar-head">{"日月火水木金土".split("").map(x=><div key={x}>{x}</div>)}</div><div className="calendar-grid">{cells.map((day,i)=><div key={i} className={`day ${day===now.getDate()?"today":""}`}>{day&&<><strong>{day}</strong>{drafts.filter(d=>{const date=d.publishedDate??d.scheduledDate;const x=new Date(date+"T00:00:00");return x.getFullYear()===year&&x.getMonth()===month&&x.getDate()===day;}).slice(0,2).map(d=><span key={d.id} className={`event ${d.status==="投稿済み"?"published":""}`}>{d.status==="投稿済み"?"✓ ":"● "}{d.news.category}</span>)}</>}</div>)}</div></div></>; }

function Search({drafts,query,setQuery,onOpen}:{drafts:PostDraft[];query:string;setQuery:(s:string)=>void;onOpen:(d:PostDraft)=>void}) {return <><section className="hero"><div><span className="eyebrow">SEARCH ARCHIVE</span><h1>以前の投稿を探す</h1><p>選手名、チーム、ジャンル、コメント、状態から検索できます。</p></div></section><input className="search-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="例：若手、女子プロレス、投稿済み" aria-label="投稿を検索"/><div className="section-head"><div><h2>{query?`「${query}」の検索結果`:"すべての投稿"}</h2><p>{drafts.length}件見つかりました</p></div></div><div className="stock-list">{drafts.map(d=><button key={d.id} className="stock-row" onClick={()=>onOpen(d)} style={{textAlign:"left"}}><div className="stock-thumb">{iconFor(d.news.category)}</div><div><h3>{d.headline}</h3><p>{d.comment}</p></div><span className="status-badge">{d.status}</span></button>)}{drafts.length===0&&<div className="empty">一致する投稿はありません。</div>}</div></>;}

function Guide(){const steps=["Instagramを開く","画面下または上部の「＋」を押す","「投稿」を選ぶ","保存した画像を選ぶ","複数画像なら「複数選択」を押す","「次へ」を押す","キャプション欄を長押しする","「貼り付け」を押す","名前・数字・出典を確認する","最後に「シェア」を押す"];return <><section className="hero"><div><span className="eyebrow">BEGINNER GUIDE</span><h1>Instagramへの投稿手順</h1><p>最後の「シェア」は、内容を確認してからご自身で押してください。</p></div></section><div className="editor-layout"><div className="panel"><h2>画像と本文を用意する</h2><ol style={{paddingLeft:24,lineHeight:2.2}}>{steps.map((s,i)=><li key={s}><strong>{s}</strong>{i===3&&<small style={{display:"block",color:"#737b75"}}>画像は通常「写真」または「最近の項目」にあります。</small>}</li>)}</ol></div><div className="panel"><h2>投稿前チェック</h2>{["画像は正しい","名前や数字は正しい","誤字がない","ニュース出典を確認した","投稿して問題ない"].map(x=><label key={x} style={{display:"flex",gap:10,alignItems:"center",minHeight:48,borderBottom:"1px solid #ecece6"}}><input type="checkbox"/> {x}</label>)}<div className="status-note" style={{marginTop:20}}>ニュース写真や記事本文は転用せず、このアプリで作った文字・図形中心の画像を使います。</div><a className="primary" style={{width:"100%",textDecoration:"none"}} href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagramを開く ↗</a></div></div></>;}

function Settings({profile,setProfile,onOnboarding,onToast}:{profile:InterestProfile;setProfile:(p:InterestProfile)=>void;onOnboarding:()=>void;onToast:(s:string)=>void}) {
  const [excluded,setExcluded]=useState(profile.excludedKeywords.join("、"));
  const exportData=()=>{const blob=new Blob([JSON.stringify({profile,drafts:safeParse(localStorage.getItem(DRAFT_KEY),[])},null,2)],{type:"application/json"});const a=document.createElement("a");a.download="insta-news-studio-export.json";a.href=URL.createObjectURL(blob);a.click();URL.revokeObjectURL(a.href);onToast("データを書き出しました");};
  const updateCategories=(next:FavoriteCategory[])=>setProfile(syncProfileCategories(profile,next));
  return <><section className="hero"><div><span className="eyebrow">PREFERENCES</span><h1>設定</h1><p>興味、文体、データ、接続状況を管理します。</p></div></section><div className="settings-grid">
    <div className="setting-card category-manager-card"><CategoryManager categories={profile.favoriteCategories} onChange={updateCategories} onToast={onToast}/></div>
    <div className="setting-card"><h3>全体の除外キーワード</h3><p>全ジャンルで候補に出したくない内容を「、」で区切ります。</p><input className="search-input" value={excluded} onChange={e=>setExcluded(e.target.value)}/><button className="primary" style={{marginTop:9}} onClick={()=>{setProfile({...profile,excludedKeywords:excluded.split("、").map(x=>x.trim()).filter(Boolean)});onToast("除外キーワードを保存しました");}}>保存</button></div>
    <div className="setting-card"><h3>API接続状況</h3><p><strong style={{color:"#a84b28"}}>モックモード</strong><br/>ニュースAPI・AI APIは未接続です。すべての主要機能は固定ルールで動作します。</p></div><div className="setting-card"><h3>データのエクスポート</h3><p>興味設定、ジャンル管理、利用回数、投稿素材をJSON形式で保存します。</p><button className="secondary" onClick={exportData}>データを書き出す</button></div><div className="setting-card"><h3>画像利用のルール</h3><p>アップロードする画像は、自分で撮影したもの、または使用許可を得たものに限ります。</p><label style={{fontSize:11}}><input type="checkbox"/> この画像利用ルールを確認しました</label></div><div className="setting-card"><h3>初心者向け案内</h3><p>初回設定やInstagram投稿手順はいつでも再表示できます。</p><button className="secondary" onClick={onOnboarding}>初回案内を表示</button></div>
  </div></>;
}

function CategoryManager({categories,onChange,onToast}:{categories:FavoriteCategory[];onChange:(categories:FavoriteCategory[])=>void;onToast:(message:string)=>void}){
  const [draggingId,setDraggingId]=useState<string|null>(null);const touchTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const ordered=[...categories].sort((a,b)=>a.order-b.order);
  const update=(id:string,patch:Partial<FavoriteCategory>)=>onChange(ordered.map(category=>category.id===id?{...category,...patch}:category));
  const move=(id:string,direction:-1|1)=>{const index=ordered.findIndex(category=>category.id===id),target=ordered[index+direction];if(target)onChange(reorderFavoriteCategories(ordered,id,target.id));};
  const reorder=(activeId:string,targetId:string)=>{const next=reorderFavoriteCategories(ordered,activeId,targetId);if(next!==ordered)onChange(next);};
  const add=()=>{onChange([...ordered,createFavoriteCategory(ordered.length)]);onToast("新しいジャンルを追加しました");};
  const remove=(category:FavoriteCategory)=>{if(!window.confirm(`「${category.displayName}」を削除しますか？`))return;onChange(deleteFavoriteCategory(ordered,category.id));onToast("ジャンルを削除しました");};
  const reset=()=>{if(!window.confirm("おすすめジャンルを初期8ジャンルへ戻しますか？ 利用回数と追加ジャンルもリセットされます。"))return;onChange(createInitialFavoriteCategories());onToast("初期8ジャンルへ戻しました");};
  const clearTouch=()=>{if(touchTimer.current)clearTimeout(touchTimer.current);touchTimer.current=null;setDraggingId(null);};
  return <section aria-labelledby="category-manager-title"><div className="category-manager-title"><div><h3 id="category-manager-title">おすすめジャンル管理</h3><p>ドラッグで並び替えできます。スマートフォンでは左のハンドルを長押ししてください。変更は自動保存されます。</p></div><div className="manager-actions"><button className="secondary" onClick={add}>＋ ジャンル追加</button><button className="danger" onClick={reset}>初期8ジャンルへ戻す</button></div></div>
    <div className="category-list" data-testid="category-manager">{ordered.map((category,index)=><article key={category.id} data-category-id={category.id} className={`category-editor ${draggingId===category.id?"dragging":""}`} onDragOver={event=>event.preventDefault()} onDrop={()=>{if(draggingId)reorder(draggingId,category.id);setDraggingId(null);}}>
      <div className="category-editor-head"><button type="button" draggable className="drag-handle" aria-label={`${category.displayName}を並び替え`} onDragStart={()=>setDraggingId(category.id)} onDragEnd={()=>setDraggingId(null)} onClick={event=>event.preventDefault()} onTouchStart={()=>{touchTimer.current=setTimeout(()=>{setDraggingId(category.id);onToast("そのまま上下へ動かしてください");},450);}} onTouchMove={event=>{if(!draggingId)return;event.preventDefault();const touch=event.touches[0];const target=(document.elementFromPoint(touch.clientX,touch.clientY) as HTMLElement|null)?.closest<HTMLElement>("[data-category-id]")?.dataset.categoryId;if(target&&target!==draggingId)reorder(draggingId,target);}} onTouchEnd={clearTouch} onTouchCancel={clearTouch}>☰</button><span className="category-icon-preview">{category.icon}</span><div><strong>{category.displayName}</strong><small>{category.usageCount}回利用{category.lastUsedAt?` ・ 最終 ${new Date(category.lastUsedAt).toLocaleDateString("ja-JP")}`:""}</small></div><label className="switch-label"><input type="checkbox" checked={category.isVisible} onChange={event=>update(category.id,{isVisible:event.target.checked})}/> 表示</label><button className="mini-button" disabled={index===0} onClick={()=>move(category.id,-1)} aria-label="一つ上へ">↑</button><button className="mini-button" disabled={index===ordered.length-1} onClick={()=>move(category.id,1)} aria-label="一つ下へ">↓</button></div>
      <div className="category-fields"><label>表示名<input value={category.displayName} onChange={event=>update(category.id,{displayName:event.target.value})}/></label><label>アイコン<input value={category.icon} maxLength={4} onChange={event=>update(category.id,{icon:event.target.value})}/></label><label className="wide-field">説明<textarea value={category.description} onChange={event=>update(category.id,{description:event.target.value})}/></label><label className="check-field"><input type="checkbox" checked={category.initiallyVisible} onChange={event=>update(category.id,{initiallyVisible:event.target.checked})}/> ホームのおすすめフィルターへ初期表示</label><TagEditor label="検索キーワード" values={category.searchKeywords} onChange={values=>update(category.id,{searchKeywords:values})}/><TagEditor label="除外キーワード" values={category.excludedKeywords} onChange={values=>update(category.id,{excludedKeywords:values})}/><button className="danger delete-category" onClick={()=>remove(category)}>このジャンルを削除</button></div>
    </article>)}</div>
  </section>;
}

function TagEditor({label,values,onChange}:{label:string;values:string[];onChange:(values:string[])=>void}){
  const [value,setValue]=useState("");const add=()=>{const next=value.trim();if(!next||values.includes(next))return;onChange([...values,next]);setValue("");};
  return <div className="tag-editor wide-field"><span className="label">{label}</span><div className="tag-list">{values.map(item=><button type="button" key={item} onClick={()=>onChange(values.filter(value=>value!==item))} aria-label={`${item}を削除`}>{item} ×</button>)}</div><div className="tag-add"><input value={value} onChange={event=>setValue(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();add();}}} placeholder={`${label}を追加`}/><button type="button" className="secondary" onClick={add}>追加</button></div></div>;
}

function Onboarding({initial,onDone}:{initial:InterestProfile;onDone:(p:InterestProfile)=>void}) {const [purpose,setPurpose]=useState(initial.purpose);const [selected,setSelected]=useState(initial.categories);const choices=initial.favoriteCategories;const toggle=(c:string)=>setSelected(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c]);const finish=()=>{const favoriteCategories=choices.map(category=>({...category,isVisible:selected.includes(category.displayName)}));onDone(syncProfileCategories({...initial,purpose},favoriteCategories));};return <div className="onboarding" role="dialog" aria-modal="true" aria-labelledby="welcome-title"><div className="onboard-card"><span className="eyebrow">WELCOME TO YOUR STUDIO</span><h1 id="welcome-title">あなたの興味を<br/>少しだけ教えてください。</h1><p>ニュース候補の並び順に使います。あとから設定でいつでも変更できます。</p><div className="field"><span className="label">1. いちばん近い利用目的</span><div className="purpose">{["ニュース収集が中心","投稿作成が中心","両方"].map(p=><button className={purpose===p?"selected":""} onClick={()=>setPurpose(p)} key={p}>{p}</button>)}</div></div><div className="field"><span className="label">2. 興味のあるジャンル（複数選択できます）</span><div className="interest-cloud">{choices.map(category=><button key={category.id} className={selected.includes(category.displayName)?"selected":""} onClick={()=>toggle(category.displayName)}>{category.icon} {category.displayName}</button>)}</div></div><div className="onboard-footer"><small>選択中：{selected.length}ジャンル</small><button className="primary" data-testid="finish-onboarding" disabled={!selected.length} onClick={finish}>おすすめを見る →</button></div></div></div>;}
