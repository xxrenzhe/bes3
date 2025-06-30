import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, Phone, MapPin, Send, MessageCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { SITE_CONFIG, ROUTES, FORM_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES, LOADING_MESSAGES } from '../config/constants';
import SEOHead from '../components/SEOHead';

const ContactPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const subject = searchParams.get('subject');
    if (subject) {
      setFormData(prev => ({ ...prev, subject }));
    }
  }, [searchParams]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = ERROR_MESSAGES.validation.required;
    } else if (formData.name.trim().length < FORM_CONFIG.validation.minNameLength) {
      newErrors.name = ERROR_MESSAGES.validation.minLength(FORM_CONFIG.validation.minNameLength);
    }

    if (!formData.email.trim()) {
      newErrors.email = ERROR_MESSAGES.validation.required;
    } else if (!FORM_CONFIG.validation.email.test(formData.email)) {
      newErrors.email = ERROR_MESSAGES.validation.email;
    }

    if (!formData.subject) {
      newErrors.subject = ERROR_MESSAGES.validation.required;
    }

    if (!formData.message.trim()) {
      newErrors.message = ERROR_MESSAGES.validation.required;
    } else if (formData.message.trim().length < FORM_CONFIG.validation.minMessageLength) {
      newErrors.message = ERROR_MESSAGES.validation.minLength(FORM_CONFIG.validation.minMessageLength);
    } else if (formData.message.trim().length > FORM_CONFIG.validation.maxMessageLength) {
      newErrors.message = ERROR_MESSAGES.validation.maxLength(FORM_CONFIG.validation.maxMessageLength);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
      
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } catch (err) {
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <>
      <SEOHead 
        title={`Contact ${SITE_CONFIG.shortName} - Get in Touch with Our Tech Experts | ${SITE_CONFIG.name}`}
        description={`Contact ${SITE_CONFIG.shortName} for tech review requests, partnerships, press inquiries, or general questions. Get expert advice from our technology review team.`}
        keywords={[`contact ${SITE_CONFIG.shortName}`, 'tech review requests', 'press inquiries', 'partnership opportunities', 'tech support']}
        canonicalUrl={`${SITE_CONFIG.url}${ROUTES.contact}`}
      />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact {SITE_CONFIG.shortName}</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Have a question, suggestion, or want to collaborate? We'd love to hear from you.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center space-x-2 mb-6">
              <MessageCircle className="text-red-600" size={24} />
              <h2 className="text-2xl font-bold text-gray-900">Send us a message</h2>
            </div>

            {submitStatus === 'success' && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 text-green-800">
                <CheckCircle size={20} />
                <span>{SUCCESS_MESSAGES.contactForm}</span>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-800">
                <AlertCircle size={20} />
                <span>Failed to send message. Please try again or email us directly at {SITE_CONFIG.contact.email}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 ${
                      errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                  />
                  {errors.name && (
                    <p id="name-error" className="text-red-600 text-sm mt-1">{errors.name}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 ${
                      errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                  />
                  {errors.email && (
                    <p id="email-error" className="text-red-600 text-sm mt-1">{errors.email}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 ${
                    errors.subject ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  aria-describedby={errors.subject ? 'subject-error' : undefined}
                >
                  <option value="">Select a subject</option>
                  {FORM_CONFIG.subjects.map((subject) => (
                    <option key={subject.value} value={subject.value}>
                      {subject.label}
                    </option>
                  ))}
                </select>
                {errors.subject && (
                  <p id="subject-error" className="text-red-600 text-sm mt-1">{errors.subject}</p>
                )}
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  disabled={isSubmitting}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-vertical disabled:opacity-50 ${
                    errors.message ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Tell us how we can help you..."
                  aria-describedby={errors.message ? 'message-error' : undefined}
                />
                {errors.message && (
                  <p id="message-error" className="text-red-600 text-sm mt-1">{errors.message}</p>
                )}
                <p className="text-gray-500 text-sm mt-1">
                  {formData.message.length}/{FORM_CONFIG.validation.maxMessageLength} characters 
                  (minimum {FORM_CONFIG.validation.minMessageLength} required)
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{LOADING_MESSAGES.sending}</span>
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            {/* Contact Details */}
            <div className="bg-gray-50 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="text-red-600" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <a href={`mailto:${SITE_CONFIG.contact.email}`} className="text-gray-600 hover:text-red-600 transition-colors">
                      {SITE_CONFIG.contact.email}
                    </a>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="text-red-600" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">Phone</p>
                    <a href={`tel:${SITE_CONFIG.contact.phoneNumber}`} className="text-gray-600 hover:text-red-600 transition-colors">
                      {SITE_CONFIG.contact.phone}
                    </a>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="text-red-600" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">Address</p>
                    <p className="text-gray-600">{SITE_CONFIG.contact.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Editorial Guidelines */}
            <div className="bg-blue-50 rounded-lg p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">For PR & Marketing Teams</h3>
              <p className="text-gray-700 mb-4">
                We welcome product review opportunities and press releases. Please note:
              </p>
              <ul className="text-gray-700 space-y-2 text-sm">
                <li>• We maintain editorial independence in all reviews</li>
                <li>• Review products are tested objectively</li>
                <li>• We don't guarantee positive coverage</li>
                <li>• Allow 2-3 weeks for review completion</li>
                <li>• Include detailed product specifications and availability</li>
              </ul>
            </div>

            {/* FAQ */}
            <div className="bg-green-50 rounded-lg p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Answers</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">Response Time</p>
                  <p className="text-gray-600">We typically respond within 24-48 hours</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Review Requests</p>
                  <p className="text-gray-600">Send product info and availability to {SITE_CONFIG.contact.email}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Technical Issues</p>
                  <p className="text-gray-600">Include browser, device, and error details</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Partnership Inquiries</p>
                  <p className="text-gray-600">Business partnerships and collaboration opportunities welcome</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactPage;