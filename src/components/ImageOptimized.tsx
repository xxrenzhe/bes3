import React, { useState, useCallback } from 'react';
import { getCategoryImage, validateImageUrl, generateImageUrl } from '../config/imageConfig';

interface ImageOptimizedProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  category?: string;
  onLoad?: () => void;
  onError?: () => void;
}

// 生成优化的图片URL
const getOptimizedSrc = (originalSrc: string, width?: number, height?: number): string => {
  if (originalSrc.includes('pexels.com')) {
    const baseUrl = originalSrc.split('?')[0];
    const params = new URLSearchParams();
    params.set('auto', 'compress');
    params.set('cs', 'tinysrgb');
    
    if (width) {
      params.set('w', width.toString());
    }
    if (height) {
      params.set('h', height.toString());
    }
    
    return `${baseUrl}?${params.toString()}`;
  }
  return originalSrc;
};

const ImageOptimized: React.FC<ImageOptimizedProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  loading = 'lazy',
  priority = false,
  category,
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(() => {
    // 验证初始URL，如果无效则使用分类默认图片
    if (!validateImageUrl(src)) {
      return getCategoryImage(category || 'tech');
    }
    return getOptimizedSrc(src, width, height);
  });

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    // 如果原图片加载失败，尝试使用分类默认图片
    if (!hasError && category) {
      const fallbackSrc = getCategoryImage(category);
      if (fallbackSrc !== currentSrc) {
        setCurrentSrc(fallbackSrc);
        return;
      }
    }
    
    setHasError(true);
    onError?.();
  }, [onError, hasError, category, currentSrc]);

  if (hasError) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <div className="text-gray-400 text-sm text-center p-4">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Image not available
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* 加载占位符 */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-400 rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* 实际图片 */}
      <img
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : loading}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } w-full h-full object-cover`}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
      />
    </div>
  );
};

export default ImageOptimized;