import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Spiral Talk",description:"Fale. Organize. Continue."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
