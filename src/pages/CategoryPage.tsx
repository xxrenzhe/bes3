import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight, Filter } from 'lucide-react';
import { articles } from '../data/articles';
import { categories } from '../data/categories';
import ArticleCard from '../components/ArticleCard';

const CategoryPage: React.FC = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSubcategory, setSelectedSubcategory] = useState(searchParams.get('sub') || 'all');
  
  const category = categories.find(cat => cat.slug === categorySlug);
  
  // Filter articles by category and subcategory
  const categoryArticles = articles.filter(article => {
    const matchesCategory = article.category.toLowerCase() === category?.name.toLowerCase();
    if (!matchesCategory) return false;
    
    if (selectedSubcategory === 'all') return true;
    
    // For subcategory filtering, we'll match based on article content/title
    // In a real app, articles would have subcategory fields
    return article.title.toLowerCase().includes(selectedSubcategory.toLowerCase()) ||
           article.excerpt.toLowerCase().includes(selectedSubcategory.toLowerCase());
  });

  useEffect(() => {
    const sub = searchParams.get('sub');
    if (sub) {
      setSelectedSubcategory(sub);
    }
  }, [searchParams]);

  const handleSubcategoryChange = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    if (subcategory === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ sub: subcategory });
    }
  };

  if (!category) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Category Not Found</h1>
        <p className="text-gray-600">The category you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
        <a href="/" className="hover:text-red-600 transition-colors">Home</a>
        <ChevronRight size={16} />
        <span className="text-gray-900 font-medium">{category.name}</span>
        {selectedSubcategory !== 'all' && (
          <>
            <ChevronRight size={16} />
            <span className="text-gray-900 font-medium">{selectedSubcategory}</span>
          </>
        )}
      </nav>

      {/* Category Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{category.name}</h1>
        <p className="text-xl text-gray-600 max-w-3xl">
          Discover the best {category.name.toLowerCase()} reviews, buying guides, and expert analysis from Bes3.
        </p>
      </div>

      {/* Subcategories */}
      {category.subcategories && (
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Filter size={20} className="text-gray-600" />
            <span className="font-medium text-gray-900">Filter by topic:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => handleSubcategoryChange('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedSubcategory === 'all' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All {category.name}
            </button>
            {category.subcategories.map((sub) => (
              <button
                key={sub}
                onClick={() => handleSubcategoryChange(sub)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedSubcategory === sub
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Articles Grid */}
      {categoryArticles.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categoryArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No articles found</h2>
          <p className="text-gray-600 mb-6">
            No articles match your current filter. Try selecting a different subcategory.
          </p>
          <button 
            onClick={() => handleSubcategoryChange('all')}
            className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Show All {category.name} Articles
          </button>
        </div>
      )}

      {/* Load More */}
      {categoryArticles.length > 12 && (
        <div className="text-center mt-12">
          <button className="bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors">
            Load More Articles
          </button>
        </div>
      )}
    </div>
  );
};

export default CategoryPage;