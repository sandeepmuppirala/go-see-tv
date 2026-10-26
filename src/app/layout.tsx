import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Go See TV | Find where to watch live',description:'Find verified live event broadcasts in the United States and Canada.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><a href="https://beau-self.vercel.app/" aria-label="Back to BEAU" style={{display:'block',position:'relative',zIndex:100,padding:'10px 20px',background:'#101827',color:'#bceaff',fontSize:'14px',fontWeight:600,textDecoration:'none',borderBottom:'1px solid rgba(255,255,255,.15)'}}>← Back to BEAU</a>{children}</body></html>}
