import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Header from './components/Header';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';

// 懒加载页面组件
const HomePage = lazy(() => import('./pages/HomePage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const ArticlePage = lazy(() => import('./pages/ArticlePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));

function App() {
  const location = useLocation();

  // 页面路由变化时自动滚动到顶部
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  // 预加载下一个可能访问的页面
  useEffect(() => {
    const preloadRoutes = () => {
      // 根据当前路径预加载相关页面
      if (location.pathname === '/') {
        // 首页用户可能访问的页面
        import('./pages/SearchPage');
        import('./pages/CategoryPage');
      } else if (location.pathname.startsWith('/article/')) {
        // 文章页用户可能访问的页面
        import('./pages/CategoryPage');
        import('./pages/SearchPage');
      }
    };

    // 延迟预加载，避免影响当前页面性能
    const timer = setTimeout(preloadRoutes, 1000);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-white">
        <Header />
        <main>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/category/:categorySlug" element={<CategoryPage />} />
              <Route path="/article/:articleSlug" element={<ArticlePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </HelmetProvider>
  );
}

export default App;