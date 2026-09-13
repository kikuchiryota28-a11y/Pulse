'use client';

import { useState } from 'react';

interface AsyncMediaProps {
  src: string;
  alt: string;
  width?: number | null;
  height?: number | null;
  className?: string;
  priority?: boolean;
}

export function AsyncMedia({ src, alt, width, height, className = '', priority = false }: AsyncMediaProps) {
  const [loaded, setLoaded] = useState(false);
  const ratio = width && height ? `${width} / ${height}` : '16 / 10';

  return (
    <div className={`relative overflow-hidden bg-[#111114] ${className}`} style={{ aspectRatio: ratio }}>
      {!loaded && <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,#101012_8%,#17171b_18%,#101012_33%)] bg-[length:200%_100%]" />}
      <img
        src={src}
        alt={alt}
        width={width ?? undefined}
        height={height ?? undefined}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
