export const revalidate = 3600;
type Country = 'CA' | 'US';
const directories: Record<Country, Array<{id:string;name:string;kind:'TV network'|'TV and streaming';url:string;description:string}>> = {
 CA:[
 {id:'tsn',name:'TSN',kind:'TV and streaming',url:'https://www.tsn.ca/live',description:'Canadian sports networks and TSN streaming'},
 {id:'sportsnet',name:'Sportsnet',kind:'TV and streaming',url:'https://watch.sportsnet.ca/schedule/tvlistings',description:'Official Sportsnet TV listings'},
 {id:'ctv',name:'CTV',kind:'TV network',url:'https://www.ctv.ca/schedule',description:'Official CTV programming schedule'},
 {id:'cbc',name:'CBC',kind:'TV and streaming',url:'https://www.cbc.ca/programguide/',description:'CBC programming and live coverage'}
 ],
 US:[
 {id:'cbs',name:'CBS',kind:'TV network',url:'https://www.cbs.com/schedule/',description:'Official CBS television schedule'},
 {id:'abc',name:'ABC',kind:'TV network',url:'https://abc.com/schedule',description:'Official ABC television schedule'},
 {id:'espn',name:'ESPN',kind:'TV and streaming',url:'https://www.espn.com/watch/schedule/_/type/upcoming',description:'Official ESPN network and streaming listings'},
 {id:'fox',name:'FOX',kind:'TV network',url:'https://www.fox.com/schedule/',description:'Official FOX television schedule'}
 ]};
export async function GET(request:Request){
 const country:Country=new URL(request.url).searchParams.get('country')==='US'?'US':'CA';
 return Response.json({country,providers:directories[country],events:[],updatedAt:new Date().toISOString(),notice:'Official broadcaster schedules are linked. Individual event/channel assignments are not verified or reproduced without a permitted data source.'},{headers:{'Cache-Control':'public, s-maxage=3600, stale-while-revalidate=3600'}});
}
