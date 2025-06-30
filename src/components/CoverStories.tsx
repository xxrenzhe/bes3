import React from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Article } from '../types';
import { ROUTES } from '../config/constants';
import { VERIFIED_IMAGES } from '../config/imageConfig';
import ImageOptimized from './ImageOptimized';

interface CoverStoriesProps {
  articles: Article[];
}

const CoverStories: React.FC<CoverStoriesProps> = ({ articles }) => {
  const handleArticleClick = () => {
    window.scrollTo(0, 0);
  };

  const coverStories = articles.length > 0 ? articles.slice(0, 3) : [
    {
      id: 'ai-obituary-pirates-grief-exploitation-investigation',
      title: 'AI Obituary Pirates Are Exploiting Our Grief. I Tracked One Down',
      slug: 'ai-obituary-pirates-exploit-grief-exclusive-investigation',
      excerpt: 'Deep investigation into AI obituary scammers who exploit people\'s grief for profit, with exclusive tracking of perpetrators.',
      imageUrl: VERIFIED_IMAGES.articles.coverStory1,
      category: 'Cover Story',
      author: {
        name: 'Sarah Chen',
        avatar: VERIFIED_IMAGES.authors.sarahChen
      },
      publishedAt: '2025-01-08',
      readTime: '22 min',
      featured: true
    },
    {
      id: 'future-hyper-connected-entertainment-experience',
      title: 'I Stepped Into the Future of Hyper-Connected Entertainment',
      slug: 'future-hyper-connected-entertainment-experience',
      excerpt: 'Immersive entertainment technology experience reveals the future of connected media consumption.',
      imageUrl: VERIFIED_IMAGES.articles.coverStory2,
      category: 'Cover Story',
      author: {
        name: 'Mike Rodriguez',
        avatar: VERIFIED_IMAGES.authors.mikeRodriguez
      },
      publishedAt: '2025-01-07',
      readTime: '19 min',
      featured: true
    },
    {
      id: 'evs-cold-weather-1000-miles-arctic-test',
      title: 'How Good Are EVs in the Cold? I Drove 1,000 Miles in the Arctic',
      slug: 'evs-cold-weather-1000-miles-arctic-test-results',
      excerpt: 'Extreme weather testing reveals the true performance of electric vehicles in Arctic conditions.',
      imageUrl: VERIFIED_IMAGES.articles.coverStory3,
      category: 'Cover Story',
      author: {
        name: 'Emma Wilson',
        avatar: VERIFIED_IMAGES.authors.emmaWilson
      },
      publishedAt: '2025-01-06',
      readTime: '16 min',
      featured: true
    }
  ];

  return (
    <section className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center space-x-3 mb-6 sm:mb-8">
          <Star className="text-yellow-400 fill-current" size={24} />
          <h2 className="text-2xl sm:text-3xl font-bold">Cover Stories</h2>
          <div className="h-px bg-gradient-to-r from-yellow-400 to-transparent flex-1 ml-4"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {coverStories.map((story, index) => (
            <Link 
              key={story.id} 
              to={ROUTES.article(story.slug)} 
              className="group cursor-pointer block"
              onClick={handleArticleClick}
            >
              <div className="relative overflow-hidden rounded-lg mb-4">
                <ImageOptimized
                  src={story.imageUrl}
                  alt={story.title}
                  category={story.category}
                  className="w-full aspect-video group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute top-3 sm:top-4 left-3 sm:left-4">
                  <span className="bg-yellow-500 text-black px-2 sm:px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                    Cover Story
                  </span>
                </div>
                <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4">
                  <h3 className="text-white font-bold text-base sm:text-lg mb-2 group-hover:text-yellow-200 transition-colors line-clamp-2 leading-tight">
                    {story.title}
                  </h3>
                  <div className="flex items-center space-x-2 sm:space-x-3 text-gray-300 text-xs sm:text-sm">
                    <span className="truncate">{story.author.name}</span>
                    <span>•</span>
                    <span>{story.readTime}</span>
                  </div>
                </div>
              </div>
              <p className="text-gray-300 text-sm line-clamp-2 leading-relaxed">
                {story.excerpt}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CoverStories;