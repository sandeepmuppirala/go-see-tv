import {test,expect} from '@playwright/test';
const sample={country:'BOTH',date:'2026-10-26',games:[
{id:'mlb-1',name:'Brewers at Rays',sport:'Baseball',league:'MLB',startsAt:'2026-10-27T00:00:00Z',channels:['FOX','Sportsnet'],channelsByCountry:{CA:['Sportsnet'],US:['FOX']},source:'ESPN',sourceUrl:'https://www.espn.com/'},
{id:'nba-1',name:'Raptors at Knicks',sport:'Basketball',league:'NBA',startsAt:'2026-10-27T01:00:00Z',channels:['ESPN'],channelsByCountry:{CA:[],US:['ESPN']},source:'ESPN',sourceUrl:'https://www.espn.com/'}
],partial:false};
test.beforeEach(async ({page})=>{
 await page.route('**/api/broadcasts?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(sample)}));
 await page.goto('/');
});
test('defaults to USA & Canada and labels channels separately',async ({page})=>{
 await expect(page.getByRole('button',{name:/USA & Canada/})).toHaveClass(/selected/);
 await page.getByRole('button',{name:'Baseball'}).click();
 await expect(page.getByText('Brewers at Rays')).toBeVisible();
 await expect(page.getByText('Sportsnet')).toBeVisible();
 await expect(page.getByText('FOX',{exact:true})).toBeVisible();
});
test('US fallback remains visible when Canada has no broadcaster',async ({page})=>{
 await page.getByRole('button',{name:'Basketball'}).click();
 await expect(page.getByText('Raptors at Knicks')).toBeVisible();
 await expect(page.getByText('ESPN',{exact:true})).toBeVisible();
 await expect(page.getByText('No channel provided for Canada by this feed')).toBeVisible();
});
test('country buttons issue correct API request',async ({page})=>{
 const requests:string[]=[];
 page.on('request',r=>{if(r.url().includes('/api/broadcasts?'))requests.push(r.url())});
 await page.getByRole('button',{name:/Canada/,exact:false}).filter({hasNotText:'USA & Canada'}).click();
 await expect.poll(()=>requests.some(u=>u.includes('country=CA'))).toBeTruthy();
 await page.getByRole('button',{name:/United States/}).click();
 await expect.poll(()=>requests.some(u=>u.includes('country=US'))).toBeTruthy();
});
