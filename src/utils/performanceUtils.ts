// 性能优化工具函数

// 防抖函数
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// 节流函数
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// 图片预加载
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

// 批量预加载图片
export const preloadImages = async (urls: string[]): Promise<void> => {
  const promises = urls.map(url => preloadImage(url));
  await Promise.allSettled(promises);
};

// 延迟执行
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// 检查是否为慢网络
export const isSlowConnection = (): boolean => {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    return connection.effectiveType === 'slow-2g' || 
           connection.effectiveType === '2g' ||
           connection.saveData;
  }
  return false;
};

// 获取设备性能等级
export const getDevicePerformance = (): 'high' | 'medium' | 'low' => {
  const memory = (navigator as any).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  
  if (memory >= 8 && cores >= 8) return 'high';
  if (memory >= 4 && cores >= 4) return 'medium';
  return 'low';
};

// 性能监控
export const measurePerformance = (name: string, fn: () => void): void => {
  if ('performance' in window && 'mark' in performance) {
    performance.mark(`${name}-start`);
    fn();
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
  } else {
    fn();
  }
};

// 资源提示
export const addResourceHint = (
  href: string, 
  rel: 'preload' | 'prefetch' | 'preconnect' | 'dns-prefetch',
  as?: string
): void => {
  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  if (as) link.setAttribute('as', as);
  document.head.appendChild(link);
};

// 关键资源预加载
export const preloadCriticalResources = (): void => {
  // 预连接到外部域名
  addResourceHint('https://images.pexels.com', 'preconnect');
  addResourceHint('https://fonts.googleapis.com', 'preconnect');
  
  // 预加载关键CSS
  addResourceHint('/src/index.css', 'preload', 'style');
  
  // 预加载关键字体
  addResourceHint('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', 'preload', 'style');
};

// 代码分割预加载
export const preloadRoute = async (routeImport: () => Promise<any>): Promise<void> => {
  try {
    await routeImport();
  } catch (error) {
    console.warn('Failed to preload route:', error);
  }
};

// 内存清理
export const cleanupMemory = (): void => {
  // 清理不必要的事件监听器
  // 清理定时器
  // 清理缓存
  if ('gc' in window && typeof (window as any).gc === 'function') {
    (window as any).gc();
  }
};

// 性能预算检查
export const checkPerformanceBudget = (): {
  loadTime: number;
  isWithinBudget: boolean;
  recommendations: string[];
} => {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const loadTime = navigation.loadEventEnd - navigation.fetchStart;
  const budget = 1000; // 1秒预算
  
  const recommendations: string[] = [];
  
  if (loadTime > budget) {
    recommendations.push('页面加载时间超过预算');
    
    if (navigation.domContentLoadedEventEnd - navigation.fetchStart > 500) {
      recommendations.push('DOM 内容加载时间过长，考虑减少初始 JavaScript');
    }
    
    if (navigation.responseEnd - navigation.responseStart > 200) {
      recommendations.push('服务器响应时间过长，考虑优化后端性能');
    }
  }
  
  return {
    loadTime,
    isWithinBudget: loadTime <= budget,
    recommendations
  };
};