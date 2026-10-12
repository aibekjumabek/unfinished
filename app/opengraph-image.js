import { ImageResponse } from 'next/og';
import { logoPath } from './logo';

export const alt = 'TinyIdeas — A place for ideas you’re not ready to finish.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#ffead1', color: '#131111', padding: '80px', fontFamily: 'sans-serif' }}>
      <svg width="88" height="72" viewBox="0 0 100 81.64">
        <path fillRule="evenodd" d={logoPath} fill="#131111" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 70 }}>
        <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: '-4px', lineHeight: 1.1 }}>TinyIdeas</div>
        <div style={{ fontSize: 32, color: '#5e5a5a', marginTop: 22 }}>A place for ideas you’re not ready to finish.</div>
      </div>
      <div style={{ display: 'flex', marginTop: 'auto', paddingTop: 24, borderTop: '1px solid #dac5b3', color: '#5e5a5a', fontSize: 20 }}>TinyIdeas from Tiny Dot Labs</div>
    </div>,
    size,
  );
}
