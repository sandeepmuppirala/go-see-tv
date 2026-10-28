import { BeauReturnLink } from './beau-return-link';
import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'VELA (formerly Go See TV) | Find where to watch live',description:'VELA, formerly Go See TV. Find live sports and entertainment to watch from home in Canada and the United States.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><BeauReturnLink />{children}</body></html>}
