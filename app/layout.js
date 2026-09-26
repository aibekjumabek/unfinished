import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata = {
  title: 'Unfinished — room to become',
  description: 'A quiet place for ideas you’re not ready to finish.',
};
export const viewport = { themeColor: '#ffffff' };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}<Analytics /></body></html>;
}
