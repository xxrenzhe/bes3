import React from 'react';
import { Award, Users, Target, Shield, FileText, Lock, Scale } from 'lucide-react';
import { TEAM_MEMBERS } from '../config/teamMembers';
import { SITE_CONFIG, ROUTES } from '../config/constants';
import SEOHead from '../components/SEOHead';

const AboutPage: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <SEOHead 
        title={`About ${SITE_CONFIG.shortName} - Your Trusted Tech Review Source ${SITE_CONFIG.year} | ${SITE_CONFIG.name}`}
        description={`Learn about ${SITE_CONFIG.shortName}'s mission to provide unbiased tech reviews and expert analysis in ${SITE_CONFIG.year}. Meet our editorial team and discover our commitment to helping you make informed tech decisions.`}
        keywords={[`about ${SITE_CONFIG.shortName}`, `tech review team ${SITE_CONFIG.year}`, 'editorial policy', 'unbiased reviews', `tech journalism ${SITE_CONFIG.year}`]}
        canonicalUrl={`${SITE_CONFIG.url}${ROUTES.about}`}
      />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">About {SITE_CONFIG.shortName}</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Your trusted source for the best tech reviews, expert analysis, and unbiased buying guides in {SITE_CONFIG.year}. 
            We help millions make smarter technology decisions every day in an AI-driven world.
          </p>
        </div>

        {/* Mission & Values */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="text-center">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="text-red-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Our Mission {SITE_CONFIG.year}</h3>
            <p className="text-gray-600">
              To provide honest, comprehensive reviews that help consumers navigate the rapidly evolving tech landscape of {SITE_CONFIG.year}.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="text-blue-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Unbiased Reviews</h3>
            <p className="text-gray-600">
              Our editorial independence ensures reviews are based solely on product merit and user value, not corporate influence.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="text-green-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Expert Testing</h3>
            <p className="text-gray-600">
              Rigorous testing methodology and real-world usage scenarios ensure accurate assessments of {SITE_CONFIG.year}'s latest tech.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="text-purple-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Community First</h3>
            <p className="text-gray-600">
              We serve our readers' interests, providing the information they need to make smart choices in {SITE_CONFIG.year}'s tech ecosystem.
            </p>
          </div>
        </div>

        {/* Our Story */}
        <div className="bg-gray-50 rounded-2xl p-8 mb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Our Story</h2>
            <div className="prose prose-lg max-w-none text-gray-700">
              <p className="mb-6">
                {SITE_CONFIG.shortName} was founded in {SITE_CONFIG.foundingYear} with a simple mission: to cut through the marketing noise and provide 
                honest, comprehensive technology reviews that actually help people make better purchasing decisions in our rapidly evolving digital world.
              </p>
              <p className="mb-6">
                In {SITE_CONFIG.year}, as AI transforms every aspect of technology, we maintain strict editorial independence. 
                Our reviews are based on extensive hands-on testing, real-world usage, and objective analysis 
                of features, performance, and value in the context of emerging technologies.
              </p>
              <p>
                Today, millions of readers trust {SITE_CONFIG.shortName} for unbiased reviews, expert buying guides, and 
                the latest technology news. We're committed to maintaining the highest standards of 
                journalism while helping our community navigate the exciting and complex world of {SITE_CONFIG.year} technology.
              </p>
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="mb-16" id="team">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Meet Our {SITE_CONFIG.year} Team</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {TEAM_MEMBERS.map((member) => (
              <div key={member.name} className="text-center">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h3>
                <p className="text-red-600 font-medium mb-2">{member.role}</p>
                <p className="text-gray-600 text-sm mb-3">{member.bio}</p>
                <div className="text-xs text-gray-500">
                  <p className="font-medium">{member.experience} experience</p>
                  <p className="mt-1">{member.expertise.slice(0, 2).join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editorial Guidelines */}
        <div className="bg-blue-50 rounded-2xl p-8 mb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Editorial Guidelines {SITE_CONFIG.year}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="text-blue-600" size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Independence</h3>
                <p className="text-gray-700 text-sm">
                  We maintain complete editorial independence. Our reviews are never influenced by advertisers, 
                  manufacturers, or commercial relationships in {SITE_CONFIG.year}'s competitive landscape.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="text-green-600" size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Testing Standards</h3>
                <p className="text-gray-700 text-sm">
                  Every product undergoes rigorous testing using standardized methodologies and real-world 
                  usage scenarios to ensure accurate, reliable assessments of {SITE_CONFIG.year}'s latest innovations.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="text-purple-600" size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Transparency</h3>
                <p className="text-gray-700 text-sm">
                  We clearly disclose our testing methods, potential conflicts of interest, and any 
                  commercial relationships that might affect our coverage of {SITE_CONFIG.year} technology trends.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Policies */}
        <div className="bg-gray-50 rounded-2xl p-8 mb-16" id="privacy">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Legal & Privacy Information</h2>
            
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="text-gray-600" size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Privacy Policy</h3>
                <p className="text-gray-700 text-sm mb-4">
                  We respect your privacy and are committed to protecting your personal information in {SITE_CONFIG.year}'s digital landscape.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Scale className="text-gray-600" size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Terms of Service</h3>
                <p className="text-gray-700 text-sm mb-4">
                  Our terms govern your use of {SITE_CONFIG.name} and our services in {SITE_CONFIG.year}.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="text-gray-600" size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Cookie Policy</h3>
                <p className="text-gray-700 text-sm mb-4">
                  Learn how we use cookies to improve your browsing experience in {SITE_CONFIG.year}.
                </p>
              </div>
            </div>

            {/* Privacy Policy Content */}
            <div className="bg-white rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Lock className="text-gray-600 mr-2" size={20} />
                Privacy Policy Summary (Updated {SITE_CONFIG.year})
              </h3>
              <div className="text-gray-700 space-y-3 text-sm">
                <p><strong>Information We Collect:</strong> We collect information you provide directly (email for newsletters), usage data (pages visited, time spent), and technical data (IP address, browser type) to improve our services and provide personalized {SITE_CONFIG.year} tech recommendations.</p>
                <p><strong>How We Use Information:</strong> We use your information to provide our services, send newsletters (with your consent), analyze website usage, improve user experience, and provide relevant {SITE_CONFIG.year} tech insights. We never sell personal information to third parties.</p>
                <p><strong>Data Protection:</strong> We implement industry-standard security measures including encryption and secure servers to protect your data. We retain information only as long as necessary for legitimate business purposes or legal requirements.</p>
                <p><strong>Your Rights:</strong> You can access, update, or delete your personal information. You can unsubscribe from newsletters at any time. Contact us at {SITE_CONFIG.contact.email} for data-related requests.</p>
                <p><strong>Cookies:</strong> We use essential cookies for website functionality and analytics cookies (with your consent) to understand how visitors use our site. You can control cookie preferences in your browser settings.</p>
                <p><strong>{SITE_CONFIG.year} Updates:</strong> This policy was last updated in January {SITE_CONFIG.year} to reflect current privacy practices and regulations.</p>
              </div>
            </div>

            {/* Terms of Service Content */}
            <div className="bg-white rounded-lg p-6 mb-6" id="terms">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Scale className="text-gray-600 mr-2" size={20} />
                Terms of Service Summary (Updated {SITE_CONFIG.year})
              </h3>
              <div className="text-gray-700 space-y-3 text-sm">
                <p><strong>Acceptance of Terms:</strong> By using {SITE_CONFIG.name}, you agree to these terms effective as of January {SITE_CONFIG.year}. If you don't agree, please don't use our services.</p>
                <p><strong>Use of Content:</strong> Our content is for personal, non-commercial use. You may share articles with proper attribution but cannot republish without permission. All content is protected by copyright and updated for {SITE_CONFIG.year} relevance.</p>
                <p><strong>User Conduct:</strong> Users must not engage in harmful activities, spam, or attempts to compromise website security. We reserve the right to terminate access for violations.</p>
                <p><strong>Disclaimers:</strong> Our reviews and recommendations are opinions based on testing current as of {SITE_CONFIG.year}. We're not liable for purchasing decisions. Product availability and pricing may change.</p>
                <p><strong>Affiliate Links:</strong> Some links may be affiliate links, clearly disclosed. This doesn't affect our editorial independence or review integrity in our {SITE_CONFIG.year} coverage.</p>
                <p><strong>Changes to Terms:</strong> We may update these terms occasionally to reflect {SITE_CONFIG.year} changes. Continued use constitutes acceptance of updated terms.</p>
              </div>
            </div>

            {/* Cookie Policy Content */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <FileText className="text-gray-600 mr-2" size={20} />
                Cookie Policy Summary (Updated {SITE_CONFIG.year})
              </h3>
              <div className="text-gray-700 space-y-3 text-sm">
                <p><strong>What Are Cookies:</strong> Cookies are small text files stored on your device that help websites remember your preferences and improve functionality in {SITE_CONFIG.year}'s web environment.</p>
                <p><strong>Essential Cookies:</strong> These are necessary for basic website functionality, including security, navigation, and form submissions. These cannot be disabled.</p>
                <p><strong>Analytics Cookies:</strong> We use Google Analytics to understand how visitors use our site. This helps us improve content and user experience for {SITE_CONFIG.year} tech coverage. You can opt out in your browser settings.</p>
                <p><strong>Preference Cookies:</strong> These remember your choices (like newsletter preferences) to provide a personalized experience tailored to {SITE_CONFIG.year} tech interests.</p>
                <p><strong>Managing Cookies:</strong> You can control cookies through your browser settings. Disabling certain cookies may affect website functionality.</p>
                <p><strong>Third-Party Cookies:</strong> Some cookies are set by third-party services we use (like analytics). These are governed by their respective privacy policies updated for {SITE_CONFIG.year}.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-red-600 text-white rounded-2xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-8">Trusted by Millions in {SITE_CONFIG.year}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold mb-2">3.2M+</div>
              <div className="text-red-200">Monthly Readers</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">1500+</div>
              <div className="text-red-200">Products Reviewed</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">75+</div>
              <div className="text-red-200">Expert Contributors</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AboutPage;