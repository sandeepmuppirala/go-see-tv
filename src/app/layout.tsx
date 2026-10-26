import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Go See TV | Find where to watch live',description:'Find verified live event broadcasts in the United States and Canada.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
