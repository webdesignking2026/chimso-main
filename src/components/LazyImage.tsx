import { useState, useEffect, useRef, memo } from 'react';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

type Props = {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  onClick?: () => void;
  style?: React.CSSProperties;
};

/**
 * Lazy-loaded image with blur-up placeholder.
 * Uses IntersectionObserver to defer loading until visible,
 * and fades in once loaded.
 */
function LazyImageBase({ src, alt, width = '100%', height = '100%', borderRadius = 0, onClick, style }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      ref={ref}
      onClick={onClick}
      sx={{
        width,
        height,
        borderRadius,
        overflow: 'hidden',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {!loaded && (
        <Skeleton
          variant="rectangular"
          sx={{ position: 'absolute', inset: 0, borderRadius: 0 }}
        />
      )}
      {inView && (
        <Box
          component="img"
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: loaded ? 'block' : 'none',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}
    </Box>
  );
}

const LazyImage = memo(LazyImageBase);
export default LazyImage;
