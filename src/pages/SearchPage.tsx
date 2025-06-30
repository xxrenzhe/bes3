import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, TrendingUp, AlertCircle } from 'lucide-react';
import { articles } from '../data/articles';
import { categories } from '../data/categories';
import { POPULAR_SEARCHES, SEARCH_CONFIG, SEARCH_VARIANTS } from '../config/searchConfig';
import { SITE_CONFIG, ROUTES } from '../config/constants';
import ArticleCard from '../components/ArticleCard';
import SEOHead from '../components/SEOHead';

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [searchResults, setSearchResults] = useState(articles);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const query = searchParams.get('q');
    const category = searchParams.get('category');
    
    if (query) {
      setSearchQuery(query);
      setHasSearched(true);
    }
    if (category) {
      setSelectedCategory(category);
    }
    
    performSearch(query || '', category || 'all');
  }, [searchParams]);

  // 生成搜索变体
  const generateSearchVariants = (query: string): string[] => {
    const variants = [];
    
    // 添加直接变体
    if (SEARCH_VARIANTS[query]) {
      variants.push(...SEARCH_VARIANTS[query]);
    }

    // 添加部分匹配变体
    Object.keys(SEARCH_VARIANTS).forEach(key => {
      if (key.includes(query) || query.includes(key)) {
        variants.push(key, ...SEARCH_VARIANTS[key]);
      }
    });

    return [...new Set(variants)];
  };

  const performSearch = (query: string, category: string) => {
    setIsLoading(true);
    
    try {
      const queryLower = query.toLowerCase().trim();
      let filtered = [...articles];

      if (queryLower) {
        filtered = filtered.map(article => {
          let relevanceScore = 0;
          const titleLower = article.title.toLowerCase();
          const excerptLower = article.excerpt.toLowerCase();
          const categoryLower = article.category.toLowerCase();
          const authorLower = article.author.name.toLowerCase();
          const keywordsLower = article.keywords?.map(k => k.toLowerCase()) || [];
          
          // 精确匹配得分最高
          if (titleLower === queryLower) relevanceScore += 100;
          if (excerptLower === queryLower) relevanceScore += 80;
          
          // 标题包含完整查询词组
          if (titleLower.includes(queryLower)) relevanceScore += 50;
          
          // 摘要包含完整查询词组
          if (excerptLower.includes(queryLower)) relevanceScore += 30;
          
          // 类别匹配
          if (categoryLower.includes(queryLower)) relevanceScore += 25;
          
          // 关键词匹配
          keywordsLower.forEach(keyword => {
            if (keyword === queryLower) relevanceScore += 40;
            if (keyword.includes(queryLower)) relevanceScore += 20;
          });
          
          // 作者匹配
          if (authorLower.includes(queryLower)) relevanceScore += 15;
          
          // 分词搜索
          const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
          queryWords.forEach(word => {
            if (titleLower.includes(word)) relevanceScore += 15;
            if (excerptLower.includes(word)) relevanceScore += 10;
            if (categoryLower.includes(word)) relevanceScore += 8;
            keywordsLower.forEach(keyword => {
              if (keyword.includes(word)) relevanceScore += 12;
            });
          });
          
          // 模糊匹配
          const searchVariants = generateSearchVariants(queryLower);
          searchVariants.forEach(variant => {
            if (titleLower.includes(variant)) relevanceScore += 10;
            if (excerptLower.includes(variant)) relevanceScore += 8;
            keywordsLower.forEach(keyword => {
              if (keyword.includes(variant)) relevanceScore += 6;
            });
          });
          
          return { ...article, relevanceScore };
        });

        filtered = filtered.filter(article => article.relevanceScore > SEARCH_CONFIG.scoreThreshold);
      }

      // 按类别过滤
      if (category !== 'all') {
        const categoryName = categories.find(cat => cat.slug === category)?.name || category;
        filtered = filtered.filter(article =>
          article.category.toLowerCase() === category.toLowerCase() ||
          article.category.toLowerCase() === categoryName.toLowerCase()
        );
      }

      // 智能排序
      filtered.sort((a, b) => {
        if (queryLower && a.relevanceScore !== undefined && b.relevanceScore !== undefined) {
          if (a.relevanceScore !== b.relevanceScore) {
            return b.relevanceScore - a.relevanceScore;
          }
        }
        
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });

      setTimeout(() => {
        setSearchResults(filtered);
        setIsLoading(false);
      }, SEARCH_CONFIG.debounceDelay);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim() && selectedCategory === 'all') {
      return;
    }
    
    setHasSearched(true);
    updateSearchParams();
  };

  const updateSearchParams = () => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    setSearchParams(params);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setHasSearched(true);
    setTimeout(() => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (category !== 'all') params.set('category', category);
      setSearchParams(params);
    }, 0);
  };

  const handleQuickSearch = (query: string, category?: string) => {
    setSearchQuery(query);
    if (category) setSelectedCategory(category);
    setHasSearched(true);
    setTimeout(() => {
      const params = new URLSearchParams();
      params.set('q', query);
      if (category && category !== 'all') params.set('category', category);
      setSearchParams(params);
    }, 0);
  };

  const searchTitle = searchQuery 
    ? `Search Results for "${searchQuery}" | ${SITE_CONFIG.name}`
    : `Search Tech Reviews and Buying Guides ${SITE_CONFIG.year} | ${SITE_CONFIG.name}`;
  
  const searchDescription = searchQuery
    ? `Search results for "${searchQuery}" on ${SITE_CONFIG.shortName}. Find ${SITE_CONFIG.year} tech reviews, buying guides, and expert analysis.`
    : `Search ${SITE_CONFIG.shortName} for ${SITE_CONFIG.year} tech reviews, buying guides, and expert analysis. Find the best products and make informed decisions.`;

  return (
    <>
      <SEOHead 
        title={searchTitle}
        description={searchDescription}
        keywords={['search', `tech reviews ${SITE_CONFIG.year}`, 'product search', `buying guides ${SITE_CONFIG.year}`, searchQuery].filter(Boolean)}
        canonicalUrl={`${SITE_CONFIG.url}${ROUTES.search}${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`}
      />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Search {SITE_CONFIG.shortName} {SITE_CONFIG.year}</h1>
          
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${SITE_CONFIG.year} tech reviews, guides, AI tools...`}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  aria-label="Search query"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Search'
                )}
              </button>
            </div>
          </form>

          {/* Filters */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center space-x-2">
              <Filter size={20} className="text-gray-600" />
              <span className="font-medium text-gray-900">Filter by category:</span>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Search Suggestions */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-3">
              <TrendingUp size={16} className="text-gray-600" />
              <p className="text-sm font-medium text-gray-900">Popular searches in {SITE_CONFIG.year}:</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
              {POPULAR_SEARCHES.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleQuickSearch(item.query, item.category)}
                  className="bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700 p-3 rounded-lg text-sm font-medium transition-colors text-left"
                  disabled={isLoading}
                >
                  <div className="font-semibold flex items-center">
                    {item.label}
                    {item.trending && <span className="ml-1 text-xs">🔥</span>}
                  </div>
                  <div className="text-xs text-gray-500">{item.count}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search Results */}
        <div className="mb-6">
          <p className="text-gray-600">
            {isLoading ? 'Searching...' : (
              <>
                {hasSearched ? (
                  <>
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                    {searchQuery && ` for "${searchQuery}"`}
                    {selectedCategory !== 'all' && ` in ${categories.find(cat => cat.slug === selectedCategory)?.name || selectedCategory}`}
                  </>
                ) : (
                  `Enter a search term or browse popular ${SITE_CONFIG.year} categories below`
                )}
              </>
            )}
          </p>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-64"></div>
            ))}
          </div>
        ) : searchResults.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {searchResults.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : hasSearched ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <AlertCircle size={64} className="mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No results found</h2>
            <p className="text-gray-600 mb-6">
              Try adjusting your search terms or browse our popular {SITE_CONFIG.year} categories below.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {categories.slice(0, 8).map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.slug)}
                  className="bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <Search size={64} className="mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Start Your {SITE_CONFIG.year} Tech Search</h2>
            <p className="text-gray-600 mb-6">
              Search our extensive library of {SITE_CONFIG.year} tech reviews, buying guides, and expert analysis.
            </p>
          </div>
        )}

        {/* Search Tips */}
        {hasSearched && searchResults.length === 0 && (
          <div className="mt-12 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Search Tips for {SITE_CONFIG.year}</h3>
            <ul className="text-blue-800 space-y-2 text-sm">
              <li>• Try using different keywords or synonyms (e.g., "phone" instead of "smartphone")</li>
              <li>• Use broader terms (e.g., "AI" instead of "artificial intelligence tools")</li>
              <li>• Add "{SITE_CONFIG.year}" to find the latest reviews and guides</li>
              <li>• Check spelling and try removing extra words</li>
              <li>• Browse categories to discover related {SITE_CONFIG.year} content</li>
              <li>• Try popular search terms from the suggestions above</li>
            </ul>
          </div>
        )}
      </div>
    </>
  );
};

export default SearchPage;