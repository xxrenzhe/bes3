import React from 'react';
import { TrendingUp } from 'lucide-react';
import { articles } from '../data/articles';
import ArticleCard from './ArticleCard';

const TrendingSection: React.FC = () => {
  // Get trending articles - mix of recent and popular categories
  const trendingArticles = [
    ...articles.filter(article => article.category === 'AI').slice(0, 2),
    ...articles.filter(article => article.category === 'Tech').slice(0, 2),
    ...articles.filter(article => article.category === 'News').slice(0, 2),
    ...articles.filter(article => article.category === 'Entertainment').slice(0, 1),
    ...articles.filter(article => article.category === 'Home').slice(0, 1)
  ].slice(0, 8);

  return (
    <section className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center space-x-2 mb-8">
          <TrendingUp className="text-red-600" size={24} />
          <h2 className="text-2xl font-bold text-gray-900">Trending Now</h2>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {trendingArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingSection;