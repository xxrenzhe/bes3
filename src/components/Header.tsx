import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X, User, Bell } from 'lucide-react';
import { categories } from '../data/categories';
import { SITE_CONFIG, ROUTES } from '../config/constants';
import { POPULAR_SEARCHES, SEARCH_CONFIG, SEARCH_VARIANTS } from '../config/searchConfig';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      return;
    }

    setIsSearching(true);
    
    try {
      const cleanQuery = searchQuery.trim().toLowerCase();
      navigate(`${ROUTES.search}?q=${encodeURIComponent(cleanQuery)}`);
      setSearchQuery('');
      setShowSuggestions(false);
    } catch (error) {
      console.error('Search navigation failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCategoryClick = (categorySlug: string) => {
    setIsMenuOpen(false);
    setActiveDropdown(null);
  };

  const handleSubcategoryClick = (categorySlug: string, subcategory: string) => {
    setActiveDropdown(null);
    setIsMenuOpen(false);
    navigate(`${ROUTES.search}?q=${encodeURIComponent(subcategory.toLowerCase())}&category=${categorySlug}`);
  };

  const handleNewsletterClick = () => {
    navigate(`${ROUTES.contact}?subject=newsletter`);
  };

  const handleSignInClick = () => {
    navigate(`${ROUTES.contact}?subject=account`);
  };

  // 生成搜索建议
  const getSearchSuggestions = (query: string) => {
    if (!query || query.length < SEARCH_CONFIG.minQueryLength) return [];
    
    return POPULAR_SEARCHES.filter(suggestion => 
      suggestion.label.toLowerCase().includes(query.toLowerCase()) ||
      suggestion.query.toLowerCase().includes(query.toLowerCase())
    ).slice(0, SEARCH_CONFIG.maxSuggestions);
  };

  const suggestions = getSearchSuggestions(searchQuery);

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      {/* Top bar */}
      <div className="bg-gray-900 text-white text-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between items-center">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <span className="hidden md:block">🏆 {SITE_CONFIG.tagline}</span>
            <span className="md:hidden text-xs">🏆 Best Tech {SITE_CONFIG.year}</span>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button 
              onClick={handleNewsletterClick}
              className="hover:text-red-400 transition-colors flex items-center space-x-1 text-xs sm:text-sm"
              aria-label="Subscribe to newsletter"
            >
              <Bell size={12} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Subscribe</span>
            </button>
            <button 
              onClick={handleSignInClick}
              className="flex items-center space-x-1 hover:text-red-400 transition-colors text-xs sm:text-sm"
              aria-label="Sign in to account"
            >
              <User size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to={ROUTES.home} className="flex items-center">
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: SITE_CONFIG.colors.primary }}>
                {SITE_CONFIG.shortName}
              </h1>
              <div className="hidden lg:block ml-8">
                <span className="text-xs text-gray-500 font-medium">
                  BEST TECH REVIEWS {SITE_CONFIG.year}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {categories.map((category) => (
              <div
                key={category.id}
                className="relative"
                onMouseEnter={() => setActiveDropdown(category.slug)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  to={ROUTES.category(category.slug)}
                  onClick={() => handleCategoryClick(category.slug)}
                  className="text-gray-700 hover:text-red-600 font-medium transition-colors py-2 flex items-center space-x-1"
                >
                  <span>{category.name}</span>
                  {category.subcategories && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </Link>
                {activeDropdown === category.slug && category.subcategories && (
                  <div className="absolute top-full left-0 bg-white shadow-lg rounded-md py-2 min-w-48 border z-50">
                    {category.subcategories.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => handleSubcategoryClick(category.slug, sub)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Search and Menu */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Desktop Search */}
            <div className="hidden md:block relative">
              <form onSubmit={handleSearch} className="flex items-center bg-gray-100 rounded-full px-3 sm:px-4 py-2">
                <Search size={16} className="sm:w-5 sm:h-5 text-gray-500 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder={`Search ${SITE_CONFIG.shortName} ${SITE_CONFIG.year}...`}
                  className="bg-transparent outline-none text-sm w-24 sm:w-32 lg:w-48"
                  disabled={isSearching}
                  aria-label="Search articles and reviews"
                />
                {isSearching && (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin ml-2"></div>
                )}
              </form>
              
              {/* Search Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-md py-2 mt-1 border z-50">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSearchQuery(suggestion.query);
                        setShowSuggestions(false);
                        navigate(`${ROUTES.search}?q=${encodeURIComponent(suggestion.query.toLowerCase())}`);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Search size={14} className="inline mr-2 text-gray-400" />
                      {suggestion.label}
                      {suggestion.trending && (
                        <span className="ml-2 text-xs bg-red-100 text-red-600 px-1 rounded">Trending</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Mobile Search Button */}
            <button 
              className="md:hidden p-2 text-gray-700 hover:text-red-600 transition-colors"
              onClick={() => navigate(ROUTES.search)}
              aria-label="Open search page"
            >
              <Search size={18} />
            </button>
            
            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 text-gray-700 hover:text-red-600 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden bg-white border-t">
            <div className="py-4 space-y-1 max-h-96 overflow-y-auto">
              {categories.map((category) => (
                <div key={category.id}>
                  <Link
                    to={ROUTES.category(category.slug)}
                    className="block px-4 py-3 text-gray-700 hover:text-red-600 hover:bg-red-50 transition-colors font-medium text-base"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {category.name}
                  </Link>
                  {category.subcategories && (
                    <div className="pl-6 space-y-1">
                      {category.subcategories.map((sub) => (
                        <button
                          key={sub}
                          onClick={() => {
                            handleSubcategoryClick(category.slug, sub);
                            setIsMenuOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-600 hover:text-red-600 transition-colors"
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="border-t pt-4 mt-4">
                <Link
                  to={ROUTES.about}
                  className="block px-4 py-3 text-gray-700 hover:text-red-600 hover:bg-red-50 transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  About
                </Link>
                <Link
                  to={ROUTES.contact}
                  className="block px-4 py-3 text-gray-700 hover:text-red-600 hover:bg-red-50 transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Contact
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;