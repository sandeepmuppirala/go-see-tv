export const revalidate=900;
type Country='CA'|'US'|'BOTH';
type Game={id:string;name:string;sport:string;league:string;startsAt:string;channels:string[];channelsByCountry:{CA:string[];US:string[]};channelStatus:'listed'|'unavailable';source:string;sourceUrl:string};
type NHLGame={id:number;startTimeUTC:string;awayTeam?:{placeName?:{default?:string};commonName?:{default?:string};abbrev?:string};homeTeam?:{placeName?:{default?:string};commonName?:{default?:string};abbrev?:string};tvBroadcasts?:{countryCode?:string;network?:string}[]};
const nhlName=(t:NHLGame['homeTeam'])=>[t?.placeName?.default,t?.commonName?.default].filter(Boolean).join(' ')||t?.abbrev||'TBD';
async function nhl(date:string,country:Country):Promise<Game[]>{
 // NHL's score endpoint provides per-game tvBroadcasts; schedule responses can omit them.
 const [scoreResult,scheduleResult]=await Promise.allSettled([
   fetch('https://api-web.nhle.com/v1/score/'+date,{next:{revalidate:900},signal:AbortSignal.timeout(9000)}),
   fetch('https://api-web.nhle.com/v1/schedule/'+date,{next:{revalidate:900},signal:AbortSignal.timeout(9000)})
 ]);
 let scoreGames:NHLGame[]=[];
 if(scoreResult.status==='fulfilled'&&scoreResult.value.ok){
   const data=await scoreResult.value.json() as {games?:NHLGame[]};
   scoreGames=data.games||[];
 }
 let scheduleGames:NHLGame[]=[];
 if(scheduleResult.status==='fulfilled'&&scheduleResult.value.ok){
   const data=await scheduleResult.value.json() as {gameWeek?:{date:string;games?:NHLGame[]}[]};
   scheduleGames=data.gameWeek?.find(w=>w.date===date)?.games||[];
 }
 if(scoreResult.status==='rejected'&&scheduleResult.status==='rejected')throw Error('NHL feeds unavailable');
 if(!scoreGames.length&&!scheduleGames.length&&
   !(scoreResult.status==='fulfilled'&&scoreResult.value.ok)&&
   !(scheduleResult.status==='fulfilled'&&scheduleResult.value.ok))throw Error('NHL feeds unavailable');
 const byId=new Map<number,NHLGame>();
 for(const game of scheduleGames)byId.set(game.id,game);
 for(const game of scoreGames){
   const existing=byId.get(game.id);
   byId.set(game.id,{...existing,...game,tvBroadcasts:game.tvBroadcasts?.length?game.tvBroadcasts:existing?.tvBroadcasts});
 }
 return [...byId.values()].map(g=>{
   const channels=[...new Set((g.tvBroadcasts||[])
     .filter(b=>(country==='BOTH'||b.countryCode?.toUpperCase()===country)&&b.network?.trim())
     .map(b=>b.network!.trim()))];
   const channelsByCountry={CA:[...new Set((g.tvBroadcasts||[]).filter(b=>b.countryCode?.toUpperCase()==='CA'&&b.network?.trim()).map(b=>b.network!.trim()))],US:[...new Set((g.tvBroadcasts||[]).filter(b=>b.countryCode?.toUpperCase()==='US'&&b.network?.trim()).map(b=>b.network!.trim()))]};
   return {channelsByCountry,id:'nhl-'+g.id,name:nhlName(g.awayTeam)+' vs '+nhlName(g.homeTeam),sport:'Hockey',league:'NHL',startsAt:g.startTimeUTC,channels,channelStatus:channels.length?'listed':'unavailable',source:'NHL score/schedule',sourceUrl:'https://www.nhl.com/schedule'};
 });
}
const leagues=[
 {sport:'Basketball',league:'NBA',path:'basketball/nba'},
 {sport:'Basketball',league:'WNBA',path:'basketball/wnba'},
 {sport:'Hockey',league:"NCAA Men's Hockey",path:'hockey/mens-college-hockey'},
 {sport:'Hockey',league:"NCAA Women's Hockey",path:'hockey/womens-college-hockey'},
 {sport:'Basketball',league:"NCAA Men',path:'basketball/mens-college-basketball'},
 {sport:'Basketball',league:"NCAA Women',path:'basketball/womens-college-basketball'},
 {sport:'Football',league:'NFL',path:'football/nfl'},
 {sport:'Football',league:'CFL',path:'football/cfl'},
 {sport:'Football',league:'NCAA Football',path:'football/college-football'},
 {sport:'Baseball',league:'MLB',path:'baseball/mlb'},
 {sport:'Soccer',league:'MLS',path:'soccer/usa.1'},
 {sport:'Soccer',league:'NWSL',path:'soccer/usa.nwsl'},
 {sport:'Soccer',league:'Canadian Premier League',path:'soccer/can.1'},
 {sport:'Soccer',league:'Premier League',path:'soccer/eng.1'},
 {sport:'Soccer',league:'Champions League',path:'soccer/uefa.champions'},
 {sport:'Soccer',league:'Liga MX',path:'soccer/mex.1'},
 {sport:'Hockey',league:'PWHL',path:'hockey/pwhl'},
 {sport:'Racing',league:'Formula 1',path:'racing/f1'}
];
async function espn(date:string,country:Country):Promise<Game[]>{
 const results=await Promise.allSettled(leagues.map(async l=>{
 const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/'+l.path+'/scoreboard?dates='+date.replaceAll('-','')+'&limit=200',{next:{revalidate:900},signal:AbortSignal.timeout(9000)});
 if(!r.ok)throw Error('Scoreboard unavailable');
 const data=await r.json() as {events?:{id?:string;name?:string;date?:string;competitions?:{broadcasts?:{market?:string;names?:string[]}[];geoBroadcasts?:{market?:{type?:string;name?:string}|string;media?:{shortName?:string;name?:string};type?:{shortName?:string}}[]}[]}[]};
 return (data.events||[]).filter(e=>e.id&&e.name&&e.date).map(e=>{
 const competition=e.competitions?.[0];const channelsByCountry={CA:new Set<string>(),US:new Set<string>()};

 // ESPN broadcast markets may be tagged national, local, or omitted.
 // Only assign US listings to US; Canadian rights require an explicit Canadian market.
 const normalize=(s?:string)=>s?.trim().toLowerCase()||'';
 const usMarket=(s?:string)=>['national','local','regional','us','usa','united states'].includes(normalize(s));
 const caMarket=(s?:string)=>['ca','can','canada','canadian'].includes(normalize(s));
 for(const b of competition?.broadcasts||[]){
   if(usMarket(b.market))for(const n of b.names||[])if(n.trim())channelsByCountry.US.add(n.trim());
   if(caMarket(b.market))for(const n of b.names||[])if(n.trim())channelsByCountry.CA.add(n.trim());
 }
 for(const b of competition?.geoBroadcasts||[]){
   const market=typeof b.market==='string'?b.market:b.market?.name||b.market?.type;
   const channel=b.media?.shortName||b.media?.name||b.type?.shortName;
   if(channel&&usMarket(market))channelsByCountry.US.add(channel.trim());
   if(channel&&caMarket(market))channelsByCountry.CA.add(channel.trim());
 }

 const byCountry={CA:[...channelsByCountry.CA],US:[...channelsByCountry.US]};
 const channels=country==='BOTH'?[...new Set([...byCountry.CA,...byCountry.US])]:byCountry[country];
 return {id:'espn-'+l.path+'-'+e.id,name:e.name!,sport:l.sport,league:l.league,startsAt:e.date!,channels,channelsByCountry:byCountry,channelStatus:channels.length?'listed' as const:'unavailable' as const,source:'ESPN',sourceUrl:l.league==='PWHL'?'https://www.thepwhl.com/en/where-to-watch':l.league.includes('College')||l.league.startsWith('NCAA')?'https://www.espn.com/watch/':l.league==='WNBA'?'https://www.wnba.com/schedule':'https://www.espn.com/'};
 });
 }));
 return results.flatMap(r=>r.status==='fulfilled'?r.value:[]);
}
export async function GET(request:Request){
 const params=new URL(request.url).searchParams;
 const country:Country=params.get('country')==='US'?'US':params.get('country')==='CA'?'CA':'BOTH';
 const date=params.get('date')||new Date().toISOString().slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date)))return Response.json({error:'Invalid date'},{status:400});
 const settled=await Promise.allSettled([nhl(date,country),espn(date,country)]);
 const games=settled.flatMap(r=>r.status==='fulfilled'?r.value:[]).sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
 const coverage=Object.values(games.reduce<Record<string,{league:string;games:number;withChannels:number}>>((acc,g)=>{const entry=acc[g.league]||(acc[g.league]={league:g.league,games:0,withChannels:0});entry.games++;if(g.channels.length)entry.withChannels++;return acc;},{})).sort((a,b)=>a.league.localeCompare(b.league));
 const errors=settled.map((r,i)=>r.status==='rejected'?(i===0?'NHL':'ESPN'):null).filter(Boolean);
 return Response.json({country,date,games,coverage,updatedAt:new Date().toISOString(),partial:errors.length>0,unavailableSources:errors,notice:'Network listings reflect source data and may be incomplete or region-restricted. Verify with broadcaster.'},{status:errors.length===2?503:200,headers:{'Cache-Control':'public, s-maxage=900, stale-while-revalidate=900'}});
}
