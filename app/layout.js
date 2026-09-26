import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const deploymentHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;

export const metadata = {
  metadataBase: new URL(deploymentHost ? `https://${deploymentHost}` : 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    siteName: 'Unfinished',
    title: 'Unfinished',
    description: 'A place for ideas you’re not ready to finish.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unfinished',
    description: 'A place for ideas you’re not ready to finish.',
  },
  title: 'Unfinished — room to become',
  description: 'A quiet place for ideas you’re not ready to finish.',
};
export const viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#ffffff' }, { media: '(prefers-color-scheme: dark)', color: '#0f1115' }],
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}<Analytics /></body></html>;
}
