'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Tv2,Search,Radio,ShieldCheck,Globe2,ArrowUpRight,RefreshCw} from 'lucide-react';
import {AuthStatus} from './auth-status';
type Country='CA'|'US'|'BOTH';
type GameState='pre'|'in'|'post';
type Gender='men'|'women';
type Game={id:string;name:string;sport:string;league:string;startsAt:string;channels:string[];channelsByCountry?:{CA:string[];US:string[]};state?:GameState;stateDetail?:string;awayScore?:number;homeScore?:number;scoreText?:string;gender?:Gender;source:string;sourceUrl:string};
const sports=['All','Hockey','Basketball','Football','Baseball','Soccer','Cricket','Golf','Racing','MMA'];
const featuredLeagues=[{label:'Premier League',league:'Premier League',sport:'Soccer'},{label:'Champions League',league:'Champions League',sport:'Soccer'},{label:'UFC',league:'UFC',sport:'MMA'},{label:'PGA Tour',league:'PGA Tour',sport:'Golf'},{label:'College Hockey · Men',league:"NCAA Men's Hockey",sport:'Hockey'},{label:'College Basketball · Men',league:"NCAA Men",sport:'Basketball'},{label:'WNBA',league:'WNBA',sport:'Basketball'},{label:'PWHL',league:'PWHL',sport:'Hockey'}];
const dateToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
// Not the date (today is always the sensible default) -- just the filter
// choices a daily visitor keeps re-picking on every single visit, which
// was the single highest-leverage retention gap a UX review found here:
// a signed-in subscriber got the exact same blank-slate defaults as a
// first-time stranger, every time.
const PREFS_KEY='vela-filter-prefs';
type GenderFilter='both'|'men'|'women';
type SavedPrefs={country?:Country;sport?:string;league?:string;genderFilter?:GenderFilter};
function loadSavedPrefs():SavedPrefs{
 try{
   const raw=window.localStorage.getItem(PREFS_KEY);
   return raw?JSON.parse(raw):{};
 }catch{return {}}
}
export default function Home(){
 const [country,setCountry]=useState<Country>('BOTH'),[date,setDate]=useState(dateToday),[sport,setSport]=useState('All'),[league,setLeague]=useState('All'),[query,setQuery]=useState(''),[genderFilter,setGenderFilter]=useState<GenderFilter>('both');
 const [games,setGames]=useState<Game[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[partial,setPartial]=useState(false);
 // Hydrate from localStorage after mount, not in a lazy useState
 // initializer -- this is a client component but still gets an initial
 // server-rendered pass, where window/localStorage don't exist.
 useEffect(()=>{
   const saved=loadSavedPrefs();
   if(saved.country)setCountry(saved.country);
   if(saved.sport)setSport(saved.sport);
   if(saved.league)setLeague(saved.league);
   if(saved.genderFilter)setGenderFilter(saved.genderFilter);
 },[]);
 useEffect(()=>{
   try{window.localStorage.setItem(PREFS_KEY,JSON.stringify({country,sport,league,genderFilter}))}catch{/* private-browsing or blocked storage -- just don't persist, never crash the page over it */}
 },[country,sport,league,genderFilter]);
 // `force` bypasses this route's own ISR-style response cache (the route
 // sets `revalidate=900`) via a cache-busting query param -- used only by
 // the manual pull-to-refresh gesture below, never the normal country/
 // date-driven effect, so the common case still benefits from caching.
 const loadGames=useCallback((signal?:AbortSignal,force?:boolean)=>{
   setError('');
   const url='/api/broadcasts?country='+country+'&date='+date+(force?'&_refresh='+Date.now():'');
   return fetch(url,{signal}).then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error||'Schedules unavailable');return j;}).then(j=>{setGames(j.games||[]);setPartial(!!j.partial)}).catch(e=>{if(e.name!=='AbortError')setError(e.message)});
 },[country,date]);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setGames([]);
 loadGames(controller.signal).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
 return ()=>controller.abort()},[loadGames]);
 // Pull-to-refresh: this app deliberately keeps <body> fixed/non-scrolling
 // (see the "single viewport app shell" rule in globals.css) so the
 // browser's own native pull-to-refresh never had anything to trigger it
 // -- there's no scrollable body to overscroll. Implemented here directly
 // on .catalog, the element that actually scrolls, using a real
 // non-passive touchmove listener (not a JSX prop, which React attaches
 // passively and can't preventDefault from) so the page doesn't also
 // fight it with its own native rubber-banding.
 const catalogRef=useRef<HTMLElement>(null);
 const [pullDistance,setPullDistance]=useState(0);
 const [refreshing,setRefreshing]=useState(false);
 // Mirrors `pullDistance` for onTouchEnd to read synchronously -- state
 // alone would be stale inside these closures without re-running the
 // whole effect (and re-attaching listeners) on every pixel of movement.
 const pullDistanceRef=useRef(0);
 const PULL_TRIGGER_PX=70;
 useEffect(()=>{
   const el=catalogRef.current;
   if(!el)return;
   let startY:number|null=null;
   function onTouchStart(e:TouchEvent){
     if(el!.scrollTop<=0)startY=e.touches[0].clientY;
   }
   function onTouchMove(e:TouchEvent){
     if(startY===null)return;
     const delta=e.touches[0].clientY-startY;
     if(delta<=0){startY=null;pullDistanceRef.current=0;setPullDistance(0);return;} // scrolling back up, not pulling down
     e.preventDefault(); // only while genuinely pulling down from the top -- never blocks ordinary scrolling
     const damped=Math.min(delta*0.5,120); // same spirit as a native pull-to-refresh rubber band
     pullDistanceRef.current=damped;
     setPullDistance(damped);
   }
   function onTouchEnd(){
     if(startY===null)return;
     if(pullDistanceRef.current>=PULL_TRIGGER_PX){
       setRefreshing(true);
       loadGames(undefined,true).finally(()=>setRefreshing(false));
     }
     startY=null;
     pullDistanceRef.current=0;
     setPullDistance(0);
   }
   el.addEventListener('touchstart',onTouchStart,{passive:true});
   el.addEventListener('touchmove',onTouchMove,{passive:false});
   el.addEventListener('touchend',onTouchEnd);
   return ()=>{
     el.removeEventListener('touchstart',onTouchStart);
     el.removeEventListener('touchmove',onTouchMove);
     el.removeEventListener('touchend',onTouchEnd);
   };
 },[loadGames]);
 const leagueOptions=['All',...Array.from(new Set([...featuredLeagues.filter(l=>sport==='All'||l.sport===sport).map(l=>l.league),...games.filter(g=>sport==='All'||g.sport===sport).map(g=>g.league)]))];
 // Live games lead the list regardless of start time — that's the one
 // thing a visitor opening this right now actually wants to see first.
 // Within each state, upcoming games sort soonest-first and finished
 // games sort most-recently-finished-first (both already true of
 // ascending/descending startsAt since "post" games are all in the past
 // for today's date and "pre" games are all in the future).
 const stateOrder:Record<GameState,number>={in:0,pre:1,post:2};
 const filtered=useMemo(()=>games.filter(g=>(league==='All'||g.league===league)&&(sport==='All'||g.sport===sport)&&(genderFilter==='both'||g.gender===genderFilter)&&(g.name+' '+g.channels.join(' ')).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>{const d=stateOrder[a.state||'pre']-stateOrder[b.state||'pre'];if(d)return d;return a.state==='post'?b.startsAt.localeCompare(a.startsAt):a.startsAt.localeCompare(b.startsAt)}),[games,sport,league,genderFilter,query]);
 const liveCount=useMemo(()=>games.filter(g=>g.state==='in').length,[games]);
 return <main><header className="header"><a className="brand" href="/"><span className="brandicon"><Tv2 size={22}/></span><span>VELA</span></a><span className="headerRight"><span className="signal"><Radio size={15}/> VELA · LIVE GUIDE</span><AuthStatus /></span></header>
 <section className="hero"><div className="eyebrow"><span className="dot"/> FIND YOUR GAME. FIND YOUR CHANNEL.</div><h1>Big moments.<br/><em>One place to find them.</em></h1><p>VELA (formerly Go See TV) helps you find live sports and entertainment to watch from the comfort of home. Choose a sport and date to see reported broadcast networks in Canada and the United States.</p><div className="countries" role="group" aria-label="Viewing country"><button className={country==='BOTH'?'selected':''} onClick={()=>setCountry('BOTH')}>🇨🇦 🇺🇸 USA & Canada</button><button className={country==='CA'?'selected':''} onClick={()=>setCountry('CA')}>🇨🇦 Canada</button><button className={country==='US'?'selected':''} onClick={()=>setCountry('US')}>🇺🇸 United States</button></div></section>
 <section className="catalog" ref={catalogRef}><div className="pullIndicator" style={{height:refreshing?48:pullDistance,opacity:refreshing?1:Math.min(pullDistance/70,1)}}><RefreshCw size={20} className={refreshing?'spin':''}/></div><div className="sectionHead"><div><div className="kicker"><Globe2 size={14}/> DAILY SPORTS TV GUIDE</div><h2>What's on today<span className="accent">.</span></h2>{liveCount>0&&<p className="liveNow"><span className="liveDot"/> {liveCount} live right now</p>}</div><label className="dateControl">Choose date <input aria-label="Schedule date" type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
 <div className="featuredLeagues" aria-label="Featured leagues">{featuredLeagues.map(item=><button key={item.league} type="button" className={league===item.league?"selected":""} onClick={()=>{setSport(item.sport);setLeague(item.league)}}>{item.label}</button>)}</div>
 <div className="controls"><label className="search"><Search size={18}/><input aria-label="Search games or channels" placeholder="Search teams or channels..." value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="filters">{sports.map(s=><button key={s} className={sport===s?'active':''} onClick={()=>{setSport(s);setLeague('All')}}>{s}</button>)}</div><div className="genderFilter" role="group" aria-label="Filter by gender"><button className={genderFilter==='both'?'active':''} onClick={()=>setGenderFilter('both')}>All</button><button className={genderFilter==='men'?'active':''} onClick={()=>setGenderFilter('men')}>Men's</button><button className={genderFilter==='women'?'active':''} onClick={()=>setGenderFilter('women')}>Women's</button></div><label className="dateControl">League <select aria-label="League" value={league} onChange={e=>setLeague(e.target.value)}>{leagueOptions.map(l=><option key={l} value={l}>{l}</option>)}</select></label></div>
 {partial&&!loading&&<p className="feedNotice">Some schedule sources are temporarily unavailable; results may be incomplete.</p>}
 {loading?<div className="empty"><RefreshCw size={25}/><h3>Loading today's games…</h3></div>:error?<div className="empty"><h3>Schedules temporarily unavailable</h3><p>{error}</p></div>:filtered.length?<div className="results">{filtered.map(g=><article className={g.state==='in'?'event eventLive':'event'} key={g.id}><span className="eventTag">{g.state==='in'&&<span className="liveBadge"><span className="liveDot"/> LIVE</span>}{g.league==='MLB'?'Baseball':g.sport} · {g.league}</span><h3>{g.name}</h3>{g.awayScore!==undefined&&g.homeScore!==undefined&&<p className="scoreLine">{g.awayScore} – {g.homeScore}</p>}{g.scoreText&&<p className="scoreTextLine">{g.scoreText}</p>}<p>{g.state==='in'&&g.stateDetail?g.stateDetail:new Date(g.startsAt).toLocaleString(country==='CA'?'en-CA':'en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Toronto'})+' ET'}</p><p className="channelLabel">TV channels / services</p>{g.channels.length?<div className="channelList">{country==='BOTH'?<>{(['CA','US'] as const).map(region=><div key={region}><p className="channelLabel">{region==='CA'?'🇨🇦 Canada':'🇺🇸 United States'}</p>{g.channelsByCountry?.[region]?.length?<div className="channelList">{g.channelsByCountry[region].map(c=><span className="channelChip" key={region+c}>{c}</span>)}</div>:<p className="channelUnknown">No channel provided for {region==='CA'?'Canada':'the US'} by this feed</p>}</div>)}</>:g.channels.map(c=><span className="channelChip" key={c}>{c}</span>)}</div>:<p className="channelUnknown">Channel not supplied for {country==='CA'?'Canada':country==='US'?'the US':'either country'} by this feed</p>}<div className="options"><a href={g.sourceUrl} target="_blank" rel="noopener noreferrer">Check {g.source} <ArrowUpRight size={14}/></a></div><small>Broadcast rights may vary by region and subscription.</small></article>)}</div>:<div className="empty"><div className="emptyIcon"><Tv2 size={28}/></div><h3>No {league!=='All'?league+' games':sport==='All'?'games':sport.toLowerCase()+' games'} found for {date}</h3><p>Try another date or league. Some competitions are seasonal or have incomplete source coverage. We won't invent games or network assignments.</p><div className="trust"><ShieldCheck size={17}/> Schedules are sourced from NHL, ESPN, and (cricket only) Cricbuzz.</div></div>}
 <p className="feedNotice">For college hockey, college basketball, WNBA and PWHL, a channel is shown only when the schedule feed actually lists one for the selected country. For PWHL, consult the <a href="https://www.thepwhl.com/en/where-to-watch" target="_blank" rel="noopener noreferrer" style={{textDecoration:'underline'}}>official where-to-watch guide</a> for region-specific coverage. Channel data comes from sports schedule feeds, not direct verification with every TV network. An absent channel does not mean the game is unavailable. Regional restrictions may apply. Cricket listings (live and finished matches only, today only) come from Cricbuzz's public match tracker, which does not publish TV/streaming channel information at all — check the broadcaster directly for where to watch.</p>
 </section><footer><div className="footerbrand">VELA</div><span>Live moments deserve the right screen.</span><span>© {new Date().getFullYear()} VELA (formerly Go See TV). Independent guide.</span><a href="/privacy" style={{textDecoration:'underline'}}>Privacy</a><a href="/nhl" style={{textDecoration:'underline'}}>What channel is my team on tonight?</a><a href="/nhl-streaming-cost" style={{textDecoration:'underline'}}>What NHL streaming actually costs this season</a><a href="https://frontend-go-see-events.vercel.app/" style={{textDecoration:'underline'}}>Also from BEAU: ORBI — find live events</a></footer></main>
}