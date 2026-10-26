// TheSportsDB free API currently caps Schedule TV responses at ONE listing per request.\n// This route cannot deliver comprehensive national listings without a licensed feed.\nimport { NextResponse } from 'next/server';
export const revalidate = 1800;
type Raw = Record<string, unknown>;
const value = (o:Raw,...keys:string[]) => keys.map(k=>o[k]).find(v=>typeof v==='string'&&v.trim()) as string|undefined;
export async function GET(request:Request){
 const country = new URL(request.url).searchParams.get('country') === 'US' ? 'US':'CA';
 const today=new Date();
 const days=Array.from({length:7},(_,i)=>{const d=new Date(today);d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10)});
 try {
  const results=await Promise.all(days.map(async date=>{
   const url=new URL('https://www.thesportsdb.com/api/v1/json/123/eventstv.php');
   url.searchParams.set('d',date);
   const response=await fetch(url,{next:{revalidate:1800},signal:AbortSignal.timeout(9000)});
   if(!response.ok)throw new Error('Feed unavailable');
   const payload:unknown=await response.json();
   if(!payload||typeof payload!=='object')return [];
   const record=payload as Record<string,unknown>;
   const rows=record.tvevents ?? record.events ?? record.eventstv ?? record.tv;
   return Array.isArray(rows)?rows.filter((r):r is Raw=>r!==null&&typeof r==='object'):[];
  }));
  const accepted = new Set(country==='CA'?['canada','ca']:['united states','united states of america','usa','us']);
  const seen=new Set<string>();
  const events=results.flat().flatMap(row=>{
   const broadcastCountry=value(row,'strCountry','strTVCountry','strChannelCountry','country');
   if(!broadcastCountry||!accepted.has(broadcastCountry.trim().toLowerCase()))return [];
   const name=value(row,'strEvent','strEventName','strMatch','strFilename');
   const channel=value(row,'strChannel','strTVChannel','strTVStation');
   const date=value(row,'dateEvent','dateEventLocal');
   if(!name||!channel||!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return [];
   const time=value(row,'strTime','timeEvent')||'00:00:00';
   const timestamp=value(row,'strTimeStamp','strTimestamp');
   const iso=new Date(timestamp ? timestamp.replace(' ','T').replace(/(?<!Z)$/,'Z') : date+'T'+time.replace(/Z$/,'')+'Z');
   if(Number.isNaN(iso.getTime()))return [];
   const id=value(row,'idEvent','idTV','id')||name+'-'+date+'-'+channel;
   const key=id+'-'+channel;if(seen.has(key))return [];seen.add(key);
   const rawUrl=value(row,'strWebsite','strChannelWebsite','strURL');
   let link='https://www.thesportsdb.com/';
   if(rawUrl){try{const u=new URL(rawUrl.startsWith('http')?rawUrl:'https://'+rawUrl);if(['https:','http:'].includes(u.protocol))link=u.toString()}catch{}}
   return [{id:key,name,category:value(row,'strSport')||'Sports',startsAt:iso.toISOString(),channel,source:'TheSportsDB',sourceUrl:'https://www.thesportsdb.com/',url:link,country}];
  }).filter(e=>new Date(e.startsAt).getTime()>=Date.now()-7200000).sort((a,b)=>a.startsAt.localeCompare(b.startsAt)).slice(0,100);

  // ESPN public scoreboard data supplements the severely capped free TV feed.
  // Broadcast markets are preserved: US listings are NOT represented as Canadian rights.
  const leagues=[['hockey','nhl','Hockey'],['basketball','nba','Basketball'],['football','nfl','Football'],['baseball','mlb','Baseball'],['soccer','usa.1','Soccer']];
  const scoreboard=await Promise.allSettled(leagues.map(async ([sport,league,label])=>{
   const url='https://site.api.espn.com/apis/site/v2/sports/'+sport+'/'+league+'/scoreboard?dates='+days[0].replaceAll('-','')+'-'+days[6].replaceAll('-','')+'&limit=200';
   const r=await fetch(url,{next:{revalidate:1800},signal:AbortSignal.timeout(9000)});
   if(!r.ok)return [];
   const json=await r.json() as {events?:Array<{id?:string;name?:string;date?:string;competitions?:Array<{broadcasts?:Array<{names?:string[];market?:string;type?:{shortName?:string}}>;geoBroadcasts?:Array<{market?:{type?:string};media?:{shortName?:string}}>}>}>};
   return (json.events||[]).flatMap(event=>{
    const comp=event.competitions?.[0];if(!event.id||!event.name||!event.date||!comp)return [];
    const names=new Set<string>();
    for(const b of comp.broadcasts||[]){if(country==='US'&&b.market==='national')for(const name of b.names||[])names.add(name);}
    // ESPN does not establish Canadian rights; only explicitly Canadian geo-markets qualify.
    for(const b of comp.geoBroadcasts||[]){const market=(b.market?.type||'').toLowerCase();if(country==='CA'&&market==='canada'&&b.media?.shortName)names.add(b.media.shortName);if(country==='US'&&market==='national'&&b.media?.shortName)names.add(b.media.shortName);}
    return [...names].map(channel=>({id:'espn-'+event.id+'-'+channel,name:event.name!,category:label,startsAt:event.date!,channel,source:'ESPN schedule',sourceUrl:'https://www.espn.com/',url:'https://www.espn.com/',country}));
   });
  }));
  const supplemental=scoreboard.flatMap(r=>r.status==='fulfilled'?r.value:[]);
  const combined=[...events,...supplemental].filter(e=>new Date(e.startsAt).getTime()>=Date.now()-7200000).sort((a,b)=>a.startsAt.localeCompare(b.startsAt)).slice(0,200);
  return NextResponse.json({events:combined,source:'TheSportsDB',country,updatedAt:new Date().toISOString(),notice:'Third-party community listings; verify with broadcaster before purchase.'},{headers:{'Cache-Control':'public, s-maxage=1800, stale-while-revalidate=3600'}});
 }catch{
  return NextResponse.json({events:[],source:'TheSportsDB',country,error:'Live listings temporarily unavailable. Please try again later.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
