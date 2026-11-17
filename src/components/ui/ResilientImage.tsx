import { useEffect, useState, type CSSProperties } from 'react';
import { Package } from 'lucide-react';

const BUNDLED_IMAGE_MODULES = import.meta.glob<string>('../../assets/images/*.{jpg,jpeg,png,webp,svg}', {
  eager: true,
  import: 'default',
});

function resolveResilientImageSrc(src?: string | null): string | null | undefined {
  if (!src) return src;
  const normalized = src.startsWith('/assets/images/') ? `/src${src}` : src;
  if (normalized.startsWith('/src/assets/images/')) {
    const filename = normalized.split('/').pop();
    if (filename) {
      const match = Object.entries(BUNDLED_IMAGE_MODULES).find(([path]) => path.endsWith(`/${filename}`));
      if (match) return match[1];
    }
  }
  return src;
}

interface ResilientImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  loading?: 'lazy' | 'eager';
  style?: CSSProperties;
}

export function ResilientImage({
  src,
  alt,
  className = 'h-full w-full object-contain',
  fallbackClassName = 'flex h-full w-full flex-col items-center justify-center bg-slate-50 text-slate-400 p-3 text-center',
  loading = 'lazy',
  style,
}: ResilientImageProps) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = resolveResilientImageSrc(src);

  useEffect(() => {
    setFailed(false);
  }, [resolvedSrc]);

  if (!resolvedSrc || failed) {
    return (
      <div className={fallbackClassName} role="img" aria-label={alt}>
        <Package className="h-7 w-7 opacity-60" />
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      loading={loading}
      style={style}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
