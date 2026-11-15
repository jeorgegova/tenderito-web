import { useEffect, useState } from 'react';

export interface ResponsiveInfo {
  width: number;
  height: number;
  isSmall: boolean;
  isCompact: boolean;
  isMedium: boolean;
  isLarge: boolean;
  isTablet: boolean;
  maxContentWidth: number;
  scale: (size: number, factor?: number) => number;
  horizontalPadding: number;
  tabletContainerStyle: (customMaxWidth?: number) => React.CSSProperties;
}

export function useResponsive(): ResponsiveInfo {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 390,
    height: typeof window !== 'undefined' ? window.innerHeight : 844,
  });

  useEffect(() => {
    function handleResize() {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { width, height } = dimensions;

  const isSmall = width < 360;
  const isCompact = width < 380;
  const isMedium = width >= 380 && width < 420;
  const isLarge = width >= 420 && width < 768;
  const isTablet = width >= 768;

  const maxContentWidth = isTablet ? 680 : width;

  const scale = (size: number, factor: number = 0.5): number => {
    if (isSmall) {
      return Math.round(size - size * 0.12 * factor);
    }
    if (isTablet) {
      return Math.round(size + size * 0.1 * factor);
    }
    return size;
  };

  const horizontalPadding = isSmall ? 12 : isCompact ? 16 : isTablet ? 28 : 20;

  const tabletContainerStyle = (customMaxWidth?: number): React.CSSProperties => {
    if (!isTablet) return {};
    return {
      maxWidth: customMaxWidth || maxContentWidth,
      width: '100%',
      alignSelf: 'center',
      marginLeft: 'auto',
      marginRight: 'auto',
    };
  };

  return {
    width,
    height,
    isSmall,
    isCompact,
    isMedium,
    isLarge,
    isTablet,
    maxContentWidth,
    scale,
    horizontalPadding,
    tabletContainerStyle,
  };
}
