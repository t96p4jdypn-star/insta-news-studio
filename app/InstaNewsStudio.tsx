"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { mockNews } from "../src/services/news/MockNewsProvider";
import type { NewsItem } from "../src/services/news/NewsProvider";
import { categories, generateDraft, styles, suggestStyle, suggestTheme, themes, tones, type InterestProfile, type PostDraft } from "../src/lib/models";

type View = "home" | "editor" | "stock" | "calendar" | "search" | "settings" | "guide";
const PROFILE_KEY = "insta-news-studio-profile-v1";
const DRAFT_KEY = "insta-news-studio-drafts-v1";
const SAVED_KEY = "insta-news-studio-saved-v1";
const defaultProfile: InterestProfile = { purpose:"両方", categories:["広島東洋カープ","女子プロレス","女子駅伝","女子バスケットボール","ラグビー","AI","アプリ開発","教育"], keywords:{"広島東洋カープ":["若手起用","二軍","ドラフト","戦力分析","先発投手"],"女子プロレス":["葉月","朱里","スターダム","試合内容","技術"],"女子駅伝":["クイーンズ駅伝","新加入","区間配置"],"ラグビー":["リーグワン","埼玉ワイルドナイツ","補強","戦術"]}, excludedKeywords:["芸能ゴシップ","グッズ情報","単なる試合結果"], preferredStyles:["私の考え","ニュース解説"] };
const categoryColors: Record<string,string> = {"広島東洋カープ":"#b72b25","プロ野球":"#bd5436","女子プロレス":"#80418e","女子駅伝":"#2672a0","女子バスケットボール":"#bc6034","ラグビー":"#377c55","サッカー":"#328278","AI":"#334963","アプリ開発":"#536477","教育":"#36578a"};

function safeParse<T>(value:string|null, fallback:T):T { try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
function formatDate(value:string) { return new Intl.DateTimeFormat("ja-JP",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value)); }
function iconFor(category:string) { if(category.includes("カープ")||category.includes("野球"))return "⚾"; if(category.includes("プロレス"))return "◆"; if(category.includes("駅伝"))return "↗"; if(category.includes("ラグビー"))return "◒"; if(category.includes("AI")||category.includes("アプリ"))return "✦"; return "●"; }

export default function InstaNewsStudio() {
  const [ready,setReady]=useState(false);
  const [showOnboarding,setShowOnboarding]=useState(false);
  const [profile,setProfile]=useState<InterestProfile>(defaultProfile);
  const [view,setView]=useState<View>("home");
  const [filter,setFilter]=useState("すべて");
  const [newsItems,setNewsItems]=useState(mockNews);
  const [saved,setSaved]=useState<string[]>([]);
  const [drafts,setDrafts]=useState<PostDraft[]>([]);
  const [selectedNews,setSelectedNews]=useState<NewsItem|null>(null);
  const [activeDraft,setActiveDraft]=useState<PostDraft|null>(null);
  const [toast,setToast]=useState("");
  const [query,setQuery]=useState("");

  /* eslint-disable react-hooks/set-state-in-effect -- Device-local data is available only after client mount. */
  useEffect(()=>{
    const storedProfile=safeParse<InterestProfile|null>(localStorage.getItem(PROFILE_KEY),null);
    setProfile(storedProfile ?? defaultProfile);
    setShowOnboarding(!storedProfile);
    setDrafts(safeParse<PostDraft[]>(localStorage.getItem(DRAFT_KEY),[]));
    setSaved(safeParse<string[]>(localStorage.getItem(SAVED_KEY),[]));
    setReady(true);
    if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>undefined);
  },[]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(()=>{ if(!ready)return; localStorage.setItem(DRAFT_KEY,JSON.stringify(drafts)); },[drafts,ready]);
  useEffect(()=>{ if(!ready)return; localStorage.setItem(SAVED_KEY,JSON.stringify(saved)); },[saved,ready]);
  useEffect(()=>{ if(!toast)return; const id=setTimeout(()=>setToast(""),2600); return()=>clearTimeout(id); },[toast]);

  const openEditor=(news:NewsItem)=>{ setSelectedNews(news); setActiveDraft(null); setView("editor"); window.scrollTo({top:0}); };
  const saveForLater=(id:string)=>{ setSaved(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]); setToast(saved.includes(id)?"あとで読むから外しました":"あとで読むに保存しました"); };
  const updateDraft=(next:PostDraft)=>{ setActiveDraft(next); setDrafts(prev=>[next,...prev.filter(d=>d.id!==next.id)]); };
  const nav=(next:View)=>{ setView(next); window.scrollTo({top:0,behavior:"smooth"}); };
  const visibleNews=useMemo(()=>newsItems.filter(n=>(filter==="すべて"||n.category===filter)&&n.status!=="ignored"),[newsItems,filter]);
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
        {view==="home"&&<Home news={visibleNews} filter={filter} setFilter={setFilter} saved={saved} openEditor={openEditor} saveForLater={saveForLater} setNewsItems={setNewsItems} drafts={drafts}/>}
        {view==="editor"&&<Editor key={`${selectedNews?.id??activeDraft?.news.id??"default"}-${activeDraft?.id??"new"}`} news={selectedNews ?? activeDraft?.news ?? mockNews[0]} existing={activeDraft} onSave={updateDraft} onToast={setToast}/>}
        {view==="stock"&&<Stock drafts={drafts} onOpen={d=>{setActiveDraft(d);setSelectedNews(d.news);nav("editor");}} onStatus={d=>updateDraft(d)} emptyAction={()=>openEditor(mockNews[0])}/>}
        {view==="calendar"&&<Calendar drafts={drafts}/>}
        {view==="search"&&<Search drafts={searchResults} query={query} setQuery={setQuery} onOpen={d=>{setActiveDraft(d);setSelectedNews(d.news);nav("editor");}}/>}
        {view==="settings"&&<Settings profile={profile} setProfile={p=>{setProfile(p);localStorage.setItem(PROFILE_KEY,JSON.stringify(p));setToast("設定を保存しました");}} onOnboarding={()=>setShowOnboarding(true)} onToast={setToast}/>}
        {view==="guide"&&<Guide/>}
      </main>
    </div>
    <nav className="mobile-nav" aria-label="モバイルメニュー">
      <MobileNav icon="⌂" label="ホーム" active={view==="home"} onClick={()=>nav("home")}/><MobileNav icon="✎" label="つくる" active={view==="editor"} onClick={()=>selectedNews?nav("editor"):openEditor(mockNews[0])}/><MobileNav icon="▣" label="ストック" active={view==="stock"} onClick={()=>nav("stock")}/><MobileNav icon="□" label="予定" active={view==="calendar"} onClick={()=>nav("calendar")}/><MobileNav icon="⚙" label="設定" active={view==="settings"} onClick={()=>nav("settings")}/>
    </nav>
    {showOnboarding&&<Onboarding initial={profile} onDone={p=>{setProfile(p);localStorage.setItem(PROFILE_KEY,JSON.stringify(p));setShowOnboarding(false);setToast("興味設定を保存しました");}}/>}
    {toast&&<div className="toast" role="status">✓ {toast}</div>}
  </div>;
}

function NavButton({icon,label,active,onClick,count}:{icon:string;label:string;active:boolean;onClick:()=>void;count?:number}) { return <button className={`nav-btn ${active?"active":""}`} onClick={onClick}><span className="nav-icon">{icon}</span>{label}{count!==undefined&&<span className="nav-count">{count}</span>}</button>; }
function MobileNav({icon,label,active,onClick}:{icon:string;label:string;active:boolean;onClick:()=>void}) { return <button className={active?"active":""} onClick={onClick}><span>{icon}</span>{label}</button>; }

function Home({news,filter,setFilter,saved,openEditor,saveForLater,setNewsItems,drafts}:{news:NewsItem[];filter:string;setFilter:(s:string)=>void;saved:string[];openEditor:(n:NewsItem)=>void;saveForLater:(id:string)=>void;setNewsItems:React.Dispatch<React.SetStateAction<NewsItem[]>>;drafts:PostDraft[]}) {
  const filters=["すべて","広島東洋カープ","女子プロレス","女子駅伝","AI"];
  const today=new Date().toLocaleDateString("ja-JP",{month:"long",day:"numeric",weekday:"long"});
  return <>
    <section className="hero"><div><span className="eyebrow">{today}</span><h1>今日のおすすめ</h1><p>あなたの興味に合わせて、投稿につながりそうなニュースを選びました。</p></div><button className="primary" onClick={()=>openEditor(news[0]??mockNews[0])}>＋ 投稿をつくる</button></section>
    <div className="stats"><div className="stat"><strong>{news.length}</strong><span>おすすめ候補</span></div><div className="stat"><strong>{saved.length}</strong><span>あとで読む</span></div><div className="stat"><strong>{drafts.filter(d=>d.status!=="投稿済み").length}</strong><span>作成途中</span></div><div className="stat"><strong>{drafts.filter(d=>d.status==="投稿済み").length}</strong><span>投稿済み</span></div></div>
    {news.filter(n=>n.category.includes("カープ")).length>=3&&<div className="status-note">最近カープの候補が多めです。女子プロレスやAIの候補も表示しています。</div>}
    <div className="section-head"><div><h2>投稿候補</h2><p>★が多いほど、登録キーワードとの一致が多いニュースです。</p></div></div>
    <div className="filter-row" style={{marginBottom:15}}>{filters.map(f=><button key={f} className={`chip ${filter===f?"active":""}`} onClick={()=>setFilter(f)}>{f}</button>)}</div>
    <div className="news-grid">{news.map(item=><article className="news-card" key={item.id} data-testid={`news-${item.id}`}>
      <div className="card-top"><span className="category" style={{background:categoryColors[item.category]??"#4b6d5c"}}>{iconFor(item.category)}　{item.category}</span><span className="time">{formatDate(item.publishedAt)}</span></div>
      <h3>{item.title}</h3><p className="summary">{item.summary}</p>
      <div className="meta"><span>{item.sourceName}</span><span>・</span><span className="stars" aria-label={`興味度${item.relevanceScore}`}>{"★".repeat(item.relevanceScore)}{"☆".repeat(5-item.relevanceScore)}</span></div>
      <div className="card-actions"><button className="primary" onClick={()=>openEditor(item)}>投稿候補にする</button><button className="secondary" aria-label={`${item.title}をあとで読む`} onClick={()=>saveForLater(item.id)}>{saved.includes(item.id)?"✓":"♡"}</button></div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:9}}><a className="ghost" style={{fontSize:10}} href={item.sourceUrl} target="_blank" rel="noreferrer">元記事を開く ↗</a><button className="ghost" style={{fontSize:10}} onClick={()=>setNewsItems(prev=>prev.map(n=>n.id===item.id?{...n,status:"ignored"}:n))}>興味なし</button></div>
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
        <div className="source-box"><span className="category" style={{background:categoryColors[news.category]??"#4b6d5c"}}>{news.category}</span><h3>{news.title}</h3><p>{news.summary}</p><a className="ghost" style={{fontSize:10,padding:0,marginTop:8}} href={news.sourceUrl} target="_blank" rel="noreferrer">{news.sourceName}で確認する ↗</a></div>
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

function Settings({profile,setProfile,onOnboarding,onToast}:{profile:InterestProfile;setProfile:(p:InterestProfile)=>void;onOnboarding:()=>void;onToast:(s:string)=>void}) {const [excluded,setExcluded]=useState(profile.excludedKeywords.join("、"));const exportData=()=>{const blob=new Blob([JSON.stringify({profile,drafts:safeParse(localStorage.getItem(DRAFT_KEY),[])},null,2)],{type:"application/json"});const a=document.createElement("a");a.download="insta-news-studio-export.json";a.href=URL.createObjectURL(blob);a.click();URL.revokeObjectURL(a.href);onToast("データを書き出しました");};return <><section className="hero"><div><span className="eyebrow">PREFERENCES</span><h1>設定</h1><p>興味、文体、データ、接続状況を管理します。</p></div></section><div className="settings-grid"><div className="setting-card"><h3>興味ジャンル</h3><p>{profile.categories.join("、")}</p><button className="secondary" onClick={onOnboarding}>興味設定をやり直す</button></div><div className="setting-card"><h3>除外キーワード</h3><p>候補に出したくない内容を「、」で区切ります。</p><input className="search-input" value={excluded} onChange={e=>setExcluded(e.target.value)}/><button className="primary" style={{marginTop:9}} onClick={()=>setProfile({...profile,excludedKeywords:excluded.split("、").filter(Boolean)})}>保存</button></div><div className="setting-card"><h3>API接続状況</h3><p><strong style={{color:"#a84b28"}}>モックモード</strong><br/>ニュースAPI・AI APIは未接続です。すべての主要機能は固定ルールで動作します。</p></div><div className="setting-card"><h3>データのエクスポート</h3><p>興味設定と投稿素材をJSON形式で保存します。</p><button className="secondary" onClick={exportData}>データを書き出す</button></div><div className="setting-card"><h3>画像利用のルール</h3><p>アップロードする画像は、自分で撮影したもの、または使用許可を得たものに限ります。</p><label style={{fontSize:11}}><input type="checkbox"/> この画像利用ルールを確認しました</label></div><div className="setting-card"><h3>初心者向け案内</h3><p>初回設定やInstagram投稿手順はいつでも再表示できます。</p><button className="secondary" onClick={onOnboarding}>初回案内を表示</button></div></div></>;}

function Onboarding({initial,onDone}:{initial:InterestProfile;onDone:(p:InterestProfile)=>void}) {const [purpose,setPurpose]=useState(initial.purpose);const [selected,setSelected]=useState(initial.categories);const toggle=(c:string)=>setSelected(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c]);return <div className="onboarding" role="dialog" aria-modal="true" aria-labelledby="welcome-title"><div className="onboard-card"><span className="eyebrow">WELCOME TO YOUR STUDIO</span><h1 id="welcome-title">あなたの興味を<br/>少しだけ教えてください。</h1><p>ニュース候補の並び順に使います。あとから設定でいつでも変更できます。</p><div className="field"><span className="label">1. いちばん近い利用目的</span><div className="purpose">{["ニュース収集が中心","投稿作成が中心","両方"].map(p=><button className={purpose===p?"selected":""} onClick={()=>setPurpose(p)} key={p}>{p}</button>)}</div></div><div className="field"><span className="label">2. 興味のあるジャンル（複数選択できます）</span><div className="interest-cloud">{categories.map(c=><button key={c} className={selected.includes(c)?"selected":""} onClick={()=>toggle(c)}>✓ {c}</button>)}</div></div><div className="onboard-footer"><small>選択中：{selected.length}ジャンル</small><button className="primary" data-testid="finish-onboarding" disabled={!selected.length} onClick={()=>onDone({...initial,purpose,categories:selected})}>おすすめを見る →</button></div></div></div>;}
