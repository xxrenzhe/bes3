import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Youtube, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import { categories } from '../data/categories';
import { SITE_CONFIG, ROUTES } from '../config/constants';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-2">
            <Link to={ROUTES.home}>
              <h3 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4" style={{ color: SITE_CONFIG.colors.primary }}>
                {SITE_CONFIG.shortName}
              </h3>
            </Link>
            <p className="text-gray-300 mb-4 max-w-md text-sm sm:text-base leading-relaxed">
              {SITE_CONFIG.description}
            </p>
            <div className="flex space-x-3 sm:space-x-4 mb-4 sm:mb-6">
              <a href={SITE_CONFIG.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <Facebook size={18} className="sm:w-5 sm:h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              </a>
              <a href={SITE_CONFIG.social.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <Twitter size={18} className="sm:w-5 sm:h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              </a>
              <a href={SITE_CONFIG.social.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <Youtube size={18} className="sm:w-5 sm:h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              </a>
              <a href={SITE_CONFIG.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <Instagram size={18} className="sm:w-5 sm:h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              </a>
              <a href={SITE_CONFIG.social.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <Linkedin size={18} className="sm:w-5 sm:h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              </a>
            </div>
            <div className="space-y-2 text-xs sm:text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <Mail size={14} className="sm:w-4 sm:h-4" />
                <a href={`mailto:${SITE_CONFIG.contact.email}`} className="hover:text-white transition-colors">
                  {SITE_CONFIG.contact.email}
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Phone size={14} className="sm:w-4 sm:h-4" />
                <a href={`tel:${SITE_CONFIG.contact.phoneNumber}`} className="hover:text-white transition-colors">
                  {SITE_CONFIG.contact.phone}
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin size={14} className="sm:w-4 sm:h-4" />
                <span>{SITE_CONFIG.contact.address}</span>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg">Categories</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              {categories.slice(0, 6).map((category) => (
                <li key={category.id}>
                  <Link 
                    to={ROUTES.category(category.slug)} 
                    className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Topics */}
          <div>
            <h4 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg">Popular in {SITE_CONFIG.year}</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li><Link to={`${ROUTES.search}?q=AI+tools+${SITE_CONFIG.year}`} className="text-gray-400 hover:text-white transition-colors">AI Tools {SITE_CONFIG.year}</Link></li>
              <li><Link to={`${ROUTES.search}?q=VPN+${SITE_CONFIG.year}`} className="text-gray-400 hover:text-white transition-colors">Best VPNs {SITE_CONFIG.year}</Link></li>
              <li><Link to={`${ROUTES.search}?q=iPhone+16`} className="text-gray-400 hover:text-white transition-colors">iPhone 16 Series</Link></li>
              <li><Link to={`${ROUTES.search}?q=Samsung+Galaxy+S25`} className="text-gray-400 hover:text-white transition-colors">Galaxy S25</Link></li>
              <li><Link to={`${ROUTES.search}?q=smart+home+${SITE_CONFIG.year}`} className="text-gray-400 hover:text-white transition-colors">Smart Home {SITE_CONFIG.year}</Link></li>
              <li><Link to={`${ROUTES.search}?q=gaming+${SITE_CONFIG.year}`} className="text-gray-400 hover:text-white transition-colors">Gaming Tech {SITE_CONFIG.year}</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg">Company</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li><Link to={ROUTES.about} className="text-gray-400 hover:text-white transition-colors">About {SITE_CONFIG.shortName}</Link></li>
              <li><Link to={ROUTES.contact} className="text-gray-400 hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to={`${ROUTES.about}#privacy`} className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to={`${ROUTES.about}#terms`} className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
            <div className="text-gray-400 text-xs sm:text-sm">
              © {currentYear} {SITE_CONFIG.name}. All rights reserved.
            </div>
            <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4 text-gray-400 text-xs sm:text-sm">
              <span>🏆 Best tech reviews & analysis {SITE_CONFIG.year}</span>
              <span className="hidden sm:inline">•</span>
              <span>Trusted by millions worldwide</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;