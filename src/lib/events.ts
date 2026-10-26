export type Country = 'US' | 'CA';
export type ViewingOption = {country:Country;service:string;channel?:string;url:string;access:'Free'|'Subscription'|'Pay-per-view';verifiedAt:string;sourceUrl:string};
export type LiveEvent = {id:string;name:string;category:string;startsAt:string;description:string;options:ViewingOption[]};
export const events:LiveEvent[] = [];
// Intentionally no fabricated broadcasts. Add records only when rights and dates are source-verified.
// Future: replace this module with a licensed guide feed / Supabase query.
