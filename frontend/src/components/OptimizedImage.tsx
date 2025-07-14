import React, { useState, useCallback, memo } from 'react';
import { useIntersectionObserver } from '../hooks/usePerformance';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  placeholder?: string;
  webpSrc?: string;
  avifSrc?: string;
  sizes?: string;
  srcSet?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  loading = 'lazy',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuiqreOBv+i+vOOBvuS4reKApjwvdGV4dD4KPC9zdmc+',
  webpSrc,
  avifSrc,
  sizes,
  srcSet,
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(loading === 'eager');

  // インターセクション オブザーバーを使用した遅延読み込み
  const [imgRef, isInView] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px'
  });

  // 画像の読み込み状態管理
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  // 遅延読み込みの判定
  React.useEffect(() => {
    if (loading === 'lazy' && isInView && !shouldLoad) {
      setShouldLoad(true);
    }
  }, [isInView, loading, shouldLoad]);

  // 次世代フォーマット対応のsource要素生成
  const renderSources = () => {
    const sources = [];
    
    if (avifSrc) {
      sources.push(
        <source
          key="avif"
          srcSet={avifSrc}
          type="image/avif"
          sizes={sizes}
        />
      );
    }
    
    if (webpSrc) {
      sources.push(
        <source
          key="webp"
          srcSet={webpSrc}
          type="image/webp"
          sizes={sizes}
        />
      );
    }
    
    return sources;
  };

  // エラー時のフォールバック画像
  const errorPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1IiBzdHJva2U9IiNkZGQiIHN0cm9rZS13aWR0aD0iMiIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7nlLvlg4/jgpLloqPovbzjgafjgY3jgb7jgZvjgpM8L3RleHQ+Cjwvc3ZnPg==';

  const imgClassName = [
    'optimized-image',
    className,
    isLoaded ? 'loaded' : 'loading',
    hasError ? 'error' : ''
  ].filter(Boolean).join(' ');

  return (
    <div 
      ref={imgRef as React.RefObject<HTMLDivElement>}
      className="optimized-image-container"
      style={{ 
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {shouldLoad ? (
        <>
          {/* プレースホルダー画像 */}
          {!isLoaded && !hasError && (
            <img
              src={placeholder}
              alt=""
              className="image-placeholder"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'blur(2px)',
                transition: 'opacity 0.3s ease'
              }}
              aria-hidden="true"
            />
          )}

          {/* メイン画像 */}
          {avifSrc || webpSrc ? (
            <picture>
              {renderSources()}
              <img
                src={hasError ? errorPlaceholder : src}
                alt={alt}
                className={imgClassName}
                width={width}
                height={height}
                loading={loading}
                srcSet={srcSet}
                sizes={sizes}
                onLoad={handleLoad}
                onError={handleError}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: isLoaded ? 1 : 0,
                  transition: 'opacity 0.3s ease'
                }}
              />
            </picture>
          ) : (
            <img
              src={hasError ? errorPlaceholder : src}
              alt={alt}
              className={imgClassName}
              width={width}
              height={height}
              loading={loading}
              srcSet={srcSet}
              sizes={sizes}
              onLoad={handleLoad}
              onError={handleError}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: isLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease'
              }}
            />
          )}

          {/* ロード中インジケーター */}
          {!isLoaded && !hasError && (
            <div 
              className="image-loading-indicator"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#666',
                fontSize: '12px'
              }}
            >
              読み込み中...
            </div>
          )}
        </>
      ) : (
        /* 遅延読み込み前のプレースホルダー */
        <img
          src={placeholder}
          alt=""
          className="image-placeholder"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default memo(OptimizedImage);