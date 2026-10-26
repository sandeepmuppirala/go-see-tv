export const revalidate=900;
type Country='CA'|'US';
type Game={id:string;name:string;sport:string;league:string;startsAt:string;channels:string[];channelStatus:'listed'|'unavailable';source:string;sourceUrl:string};
type NHLGame={id:number;startTimeUTC:string;awayTeam?:{placeName?:{default?:string};commonName?:{default?:string};abbrev?:string};homeTeam?:{placeName?:{default?:string};commonName?:{default?:string};abbrev?:string};tvBroadcasts?:{countryCode?:string;network?:string}[]};
const nhlName=(t:NHLGame['homeTeam'])=>[t?.placeName?.default,t?.commonName?.default].filter(Boolean).join(' ')||t?.abbrev||'TBD';
async function nhl(date:string,country:Country):Promise<Game[]>{
 const r=await fetch('https://api-web.nhle.com/v1/schedule/'+date,{next:{revalidate:900},signal:AbortSignal.timeout(9000)});
 if(!r.ok)throw Error('NHL schedule unavailable');
 const data=await r.json() as {gameWeek?:{date:string;games?:NHLGame[]}[]};
 const games=data.gameWeek?.find(w=>w.date===date)?.games||[];
 return games.map(g=>{
 const channels=[...new Set((g.tvBroadcasts||[]).filter(b=>b.countryCode===country&&b.network).map(b=>b.network!))];
 return {id:'nhl-'+g.id,name:nhlName(g.awayTeam)+' vs '+nhlName(g.homeTeam),sport:'Hockey',league:'NHL',startsAt:g.startTimeUTC,channels,channelStatus:channels.length?'listed':'unavailable',source:'NHL',sourceUrl:'https://www.nhl.com/schedule'};
 });
}
const leagues=[
 {sport:'Basketball',league:'NBA',path:'basketball/nba'},
 {sport:'Basketball',league:'WNBA',path:'basketball/wnba'},
 {sport:'Basketball',league:'NCAA Men',path:'basketball/mens-college-basketball'},
 {sport:'Basketball',league:'NCAA Women',path:'basketball/womens-college-basketball'},
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
 const data=await r.json() as {events?:{id?:string;name?:string;date?:string;competitions?:{broadcasts?:{market?:string;names?:string[]}[];geoBroadcasts?:{market?:{type?:string;name?:string};media?:{shortName?:string;name?:string}}[]}[]}[]};
 return (data.events||[]).filter(e=>e.id&&e.name&&e.date).map(e=>{
 const competition=e.competitions?.[0];const channels=new Set<string>();

 // ESPN broadcast markets may be tagged national, local, or omitted.
 // Only assign US listings to US; Canadian rights require an explicit Canadian market.
 const normalize=(s?:string)=>s?.trim().toLowerCase()||'';
 const usMarket=(s?:string)=>['national','local','regional','us','usa','united states'].includes(normalize(s));
 const caMarket=(s?:string)=>['ca','can','canada','canadian'].includes(normalize(s));
 for(const b of competition?.broadcasts||[]){
   if(country==='US'&&usMarket(b.market))for(const n of b.names||[])if(n.trim())channels.add(n.trim());
   if(country==='CA'&&caMarket(b.market))for(const n of b.names||[])if(n.trim())channels.add(n.trim());
 }
 for(const b of competition?.geoBroadcasts||[]){
   const market=b.market?.type||b.market?.name;
   const channel=b.media?.shortName||b.media?.name;
   if(channel&&((country==='US'&&usMarket(market))||(country==='CA'&&caMarket(market))))channels.add(channel.trim());
 }

 return {id:'espn-'+l.path+'-'+e.id,name:e.name!,sport:l.sport,league:l.league,startsAt:e.date!,channels:[...channels],channelStatus:channels.size?'listed' as const:'unavailable' as const,source:'ESPN',sourceUrl:'https://www.espn.com/'};
 });
 }));
 return results.flatMap(r=>r.status==='fulfilled'?r.value:[]);
}
export async function GET(request:Request){
 const params=new URL(request.url).searchParams;
 const country:Country=params.get('country')==='US'?'US':'CA';
 const date=params.get('date')||new Date().toISOString().slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date)))return Response.json({error:'Invalid date'},{status:400});
 const settled=await Promise.allSettled([nhl(date,country),espn(date,country)]);
 const games=settled.flatMap(r=>r.status==='fulfilled'?r.value:[]).sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
 const errors=settled.map((r,i)=>r.status==='rejected'?(i===0?'NHL':'ESPN'):null).filter(Boolean);
 return Response.json({country,date,games,updatedAt:new Date().toISOString(),partial:errors.length>0,unavailableSources:errors,notice:'Network listings reflect source data and may be incomplete or region-restricted. Verify with broadcaster.'},{status:errors.length===2?503:200,headers:{'Cache-Control':'public, s-maxage=900, stale-while-revalidate=900'}});
}
