import React from 'react';
import LatestNews from '../components/LatestNews';
import HeroSection from '../components/HeroSection';
import TrendingSection from '../components/TrendingSection';
import CategorySection from '../components/CategorySection';
import CoverStories from '../components/CoverStories';
import MoneySection from '../components/MoneySection';
import NewsletterSection from '../components/NewsletterSection';
import LazySection from '../components/LazySection';
import { articles } from '../data/articles';

const HomePage: React.FC = () => {
  // Filter articles by category for different sections
  const newsArticles = articles.filter(article => article.category === 'News');
  const techArticles = articles.filter(article => article.category === 'Tech');
  const aiArticles = articles.filter(article => article.category === 'AI');
  const homeArticles = articles.filter(article => article.category === 'Home');
  const entertainmentArticles = articles.filter(article => article.category === 'Entertainment');
  const wellnessArticles = articles.filter(article => article.category === 'Wellness');
  const coverStoryArticles = articles.filter(article => article.category === 'Cover Story');
  
  // Get latest articles (most recent 8)
  const latestArticles = articles
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 8);

  return (
    <>
      <LatestNews />
      
      <HeroSection />
      <TrendingSection />
      
      {/* Breaking News - 立即加载 */}
      {newsArticles.length > 0 && (
        <div className="bg-red-50">
          <CategorySection 
            title="Breaking News & Analysis" 
            articles={newsArticles.slice(0, 8)}
            categorySlug="news"
          />
        </div>
      )}
      
      {/* Cover Stories - 延迟加载 */}
      <LazySection 
        fallback={
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 h-96 flex items-center justify-center">
            <div className="text-white text-lg">Loading Cover Stories...</div>
          </div>
        }
      >
        <CoverStories articles={coverStoryArticles} />
      </LazySection>
      
      {/* AI & Machine Learning - 延迟加载 */}
      {aiArticles.length > 0 && (
        <LazySection>
          <CategorySection 
            title="AI & Machine Learning" 
            articles={aiArticles.slice(0, 8)}
            categorySlug="ai"
          />
        </LazySection>
      )}
      
      {/* Tech Reviews - 延迟加载 */}
      {techArticles.length > 0 && (
        <LazySection>
          <div className="bg-gray-50">
            <CategorySection 
              title="Tech Reviews & Guides" 
              articles={techArticles.slice(0, 8)}
              categorySlug="tech"
            />
          </div>
        </LazySection>
      )}
      
      {/* Smart Home - 延迟加载 */}
      {homeArticles.length > 0 && (
        <LazySection>
          <CategorySection 
            title="Smart Home & Living" 
            articles={homeArticles.slice(0, 6)}
            categorySlug="home"
          />
        </LazySection>
      )}
      
      {/* Entertainment - 延迟加载 */}
      {entertainmentArticles.length > 0 && (
        <LazySection>
          <div className="bg-purple-50">
            <CategorySection 
              title="Gaming & Entertainment" 
              articles={entertainmentArticles.slice(0, 6)}
              categorySlug="entertainment"
            />
          </div>
        </LazySection>
      )}
      
      {/* Money Section - 延迟加载 */}
      <LazySection>
        <MoneySection />
      </LazySection>
      
      {/* Wellness - 延迟加载 */}
      {wellnessArticles.length > 0 && (
        <LazySection>
          <div className="bg-blue-50">
            <CategorySection 
              title="Health & Wellness Tech" 
              articles={wellnessArticles.slice(0, 6)}
              categorySlug="wellness"
            />
          </div>
        </LazySection>
      )}
      
      {/* Latest Articles - 延迟加载 */}
      <LazySection>
        <CategorySection 
          title="Latest Articles" 
          articles={latestArticles}
          showViewAll={false}
        />
      </LazySection>
      
      {/* Newsletter - 延迟加载 */}
      <LazySection>
        <NewsletterSection />
      </LazySection>
    </>
  );
};

export default HomePage;