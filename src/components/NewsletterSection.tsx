import React, { useState } from 'react';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { SITE_CONFIG, SUCCESS_MESSAGES, ERROR_MESSAGES, LOADING_MESSAGES } from '../config/constants';

const NewsletterSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError(ERROR_MESSAGES.validation.required);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(ERROR_MESSAGES.validation.email);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSubscribed(true);
      setEmail('');
      setTimeout(() => setIsSubscribed(false), 5000);
    } catch (err) {
      setError('Failed to subscribe. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  return (
    <section className="bg-gradient-to-r from-red-600 to-red-700 text-white py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="flex justify-center mb-4 sm:mb-6">
          <Mail size={40} className="sm:w-12 sm:h-12 text-red-200" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
          Stay Ahead with {SITE_CONFIG.shortName} in {SITE_CONFIG.year}
        </h2>
        <p className="text-lg sm:text-xl text-red-100 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
          Get the latest tech reviews, expert buying guides, AI insights, and exclusive {SITE_CONFIG.year} deals delivered to your inbox weekly.
        </p>
        
        {isSubscribed ? (
          <div className="flex items-center justify-center space-x-2 text-green-200">
            <CheckCircle size={20} className="sm:w-6 sm:h-6" />
            <span className="text-base sm:text-lg font-medium">{SUCCESS_MESSAGES.newsletter}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:space-x-4">
              <div className="flex-1">
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder={`Enter your email for ${SITE_CONFIG.year} updates`}
                  className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 text-sm sm:text-base"
                  required
                  disabled={isLoading}
                  aria-label="Email address for newsletter subscription"
                />
                {error && (
                  <div className="flex items-center space-x-1 text-red-200 text-sm mt-2">
                    <AlertCircle size={14} />
                    <span>{error}</span>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="bg-white text-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px] text-sm sm:text-base"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Subscribe'
                )}
              </button>
            </div>
            <p className="text-red-200 text-xs sm:text-sm mt-3">
              Join millions of tech enthusiasts. Get {SITE_CONFIG.year} insights first. Unsubscribe anytime.
            </p>
          </form>
        )}
      </div>
    </section>
  );
};

export default NewsletterSection;