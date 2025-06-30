import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// 预加载关键资源
const preloadCriticalResources = () => {
  // 预加载关键图片
  const criticalImages = [
    'https://images.pexels.com/photos/5380664/pexels-photo-5380664.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1444416/pexels-photo-1444416.jpeg?auto=compress&cs=tinysrgb&w=800'
  ];

  criticalImages.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  });
};

// 延迟加载非关键资源
const loadNonCriticalResources = () => {
  // 延迟加载 Google Analytics 等第三方脚本
  setTimeout(() => {
    // 这里可以添加 Google Analytics 或其他分析工具
  }, 2000);
};

// 性能监控
const measurePerformance = () => {
  if ('performance' in window) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const loadTime = perfData.loadEventEnd - perfData.fetchStart;
        
        if (import.meta.env.DEV) {
          console.log(`页面加载时间: ${loadTime}ms`);
          console.log(`DOM 内容加载时间: ${perfData.domContentLoadedEventEnd - perfData.fetchStart}ms`);
          console.log(`首次内容绘制时间: ${perfData.responseEnd - perfData.fetchStart}ms`);
        }
      }, 0);
    });
  }
};

// 初始化应用
const initApp = () => {
  preloadCriticalResources();
  measurePerformance();
  
  const root = createRoot(document.getElementById('root')!);
  root.render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  );
  
  // 延迟加载非关键资源
  loadNonCriticalResources();
};

// 启动应用
initApp();