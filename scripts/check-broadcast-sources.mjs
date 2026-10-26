// Public sports-feed contract checks; never print full upstream responses.
const date=process.env.CHECK_DATE||new Date().toISOString().slice(0,10);
const d=date.replaceAll('-','');
const leagues=[['NHL','https://api-web.nhle.com/v1/score/'+date],...[
['NBA','basketball/nba'],['WNBA','basketball/wnba'],['NFL','football/nfl'],
['CFL','football/cfl'],['MLB','baseball/mlb'],['MLS','soccer/usa.1'],
['PWHL','hockey/pwhl'],['NWSL','soccer/usa.nwsl'],['CPL','soccer/can.1']
].map(([name,path])=>[name,'https://site.api.espn.com/apis/site/v2/sports/'+path+'/scoreboard?dates='+d])];
let failures=0;
for(const [league,url] of leagues){
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  const games=league==='NHL'?data.games:data.events;
  if(!Array.isArray(games))throw Error('missing games array');
  const broadcasts=games.filter(g=>league==='NHL'?(g.tvBroadcasts||[]).length:(g.competitions||[]).some(c=>(c.broadcasts||[]).length||(c.geoBroadcasts||[]).length));
  const first=broadcasts[0];
  const markets=league==='NHL'?(first?.tvBroadcasts||[]).map(b=>b.countryCode):
   (first?.competitions||[]).flatMap(c=>[...(c.broadcasts||[]).map(b=>b.market),...(c.geoBroadcasts||[]).map(b=>typeof b.market==='string'?b.market:b.market?.type||b.market?.name)]);
  console.log(JSON.stringify({league,date,http:response.status,games:games.length,withBroadcasts:broadcasts.length,marketExamples:[...new Set(markets.filter(Boolean))].slice(0,10)}));
 }catch(error){failures++;console.error(JSON.stringify({league,date,error:String(error)}))}
}
if(failures)process.exitCode=1;
