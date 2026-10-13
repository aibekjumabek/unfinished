import { Analytics } from '@vercel/analytics/next';
import { Fira_Code, Work_Sans } from 'next/font/google';
import './globals.css';

// vale.rocks' typefaces, bundled at build time so the app makes no font requests at runtime
const sans = Work_Sans({ subsets: ['latin'], variable: '--font-sans' });
const mono = Fira_Code({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://ideas.tinydot.dev'),
  openGraph: {
    type: 'website',
    siteName: 'TinyIdeas',
    title: 'TinyIdeas',
    description: 'A place for ideas you’re not ready to finish.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TinyIdeas',
    description: 'A place for ideas you’re not ready to finish.',
  },
  title: 'TinyIdeas — room to become',
  description: 'A quiet place for ideas you’re not ready to finish.',
};
export const viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#ffead1' }, { media: '(prefers-color-scheme: dark)', color: '#131111' }],
};

export default function RootLayout({ children }) {
  return <html lang="en" className={`${sans.variable} ${mono.variable}`}><body>{children}<Analytics /></body></html>;
}
