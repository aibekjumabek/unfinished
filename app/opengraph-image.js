import { ImageResponse } from 'next/og';

export const alt = 'Unfinished — A place for ideas you’re not ready to finish.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#ffead1', color: '#131111', padding: '80px', fontFamily: 'sans-serif' }}>
      <svg width="72" height="72" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="14" fill="#131111" />
        <path d="M18 16h6v18c0 6 2.5 8 8 8s8-2 8-8V16h6v18c0 9-5 14-14 14s-14-5-14-14V16Z" fill="#ffead1" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 70 }}>
        <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: '-4px', lineHeight: 1.1 }}>Unfinished</div>
        <div style={{ fontSize: 32, color: '#5e5a5a', marginTop: 22 }}>A place for ideas you’re not ready to finish.</div>
      </div>
      <div style={{ display: 'flex', marginTop: 'auto', paddingTop: 24, borderTop: '1px solid #dac5b3', color: '#5e5a5a', fontSize: 20 }}>Built by VibeCorp</div>
    </div>,
    size,
  );
}
