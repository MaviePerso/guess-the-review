'use client';

import { useEffect } from 'react';

interface AdBannerProps {
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  style?: React.CSSProperties;
}

export default function AdBanner({ slot, format = 'auto', style }: AdBannerProps) {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div className="ad-container" style={{ margin: '1.5rem 0', textAlign: 'center', minHeight: '90px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', overflow: 'hidden', ...style }}>
      <ins className="adsbygoogle"
           style={{ display: 'block' }}
           data-ad-client="ca-pub-8669837001236314"
           data-ad-slot={slot}
           data-ad-format={format}
           data-full-width-responsive="true"></ins>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Publicité</div>
    </div>
  );
}