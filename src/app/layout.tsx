import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'VitalFix — Core Web Vitals for Developers',
  description: 'Production-ready code snippets, interactive audit checklists, and developer tools to fix LCP, INP, and CLS. Ship faster websites today.',
  keywords: 'Core Web Vitals, LCP, INP, CLS, performance, web optimization, developer tools',
  openGraph: {
    title: 'VitalFix — Fix Your Core Web Vitals',
    description: 'Free code snippets, audit checklists, and interactive tools for developers.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('vitalfix-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
