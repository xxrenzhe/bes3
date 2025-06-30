# Bes3.com - Best Tech Reviews 2025

> Your trusted source for the best tech reviews, expert analysis, and unbiased buying guides in 2025.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/bes3/tech-reviews)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

## 🚀 Features

- **Modern Tech Stack**: Built with React 18, TypeScript, Vite, and Tailwind CSS
- **SEO Optimized**: Complete SEO setup with meta tags, structured data, and sitemap
- **Performance First**: Optimized for Core Web Vitals and fast loading times
- **Mobile Responsive**: Fully responsive design for all devices
- **PWA Ready**: Progressive Web App with offline support
- **Accessibility**: WCAG 2.1 compliant with proper ARIA labels
- **Image Optimization**: Lazy loading and optimized images from Pexels
- **Search Functionality**: Advanced search with filters and suggestions
- **Content Management**: Organized article system with categories and tags

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer
- **Routing**: React Router DOM v6
- **SEO**: React Helmet Async, Structured Data
- **Icons**: Lucide React
- **Performance**: Lazy loading, Code splitting, PWA
- **Deployment**: Vercel with optimized build configuration

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bes3/tech-reviews.git
   cd tech-reviews
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173
   ```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **One-click deploy**
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/bes3/tech-reviews)

2. **Manual deployment**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel
   ```

3. **Environment Variables**
   Set up the following environment variables in Vercel dashboard:
   - `VITE_SITE_URL`: Your production URL
   - `VITE_GA_TRACKING_ID`: Google Analytics ID (optional)
   - Other variables from `.env.example`

### Build for Production

```bash
# Build the project
npm run build

# Preview the build
npm run preview

# Analyze bundle size
npm run analyze
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ArticleCard.tsx
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── SEOHead.tsx
│   └── ...
├── pages/              # Page components
│   ├── HomePage.tsx
│   ├── ArticlePage.tsx
│   ├── SearchPage.tsx
│   └── ...
├── config/             # Configuration files
│   ├── constants.ts
│   ├── imageConfig.ts
│   └── ...
├── data/               # Static data
│   ├── articles.ts
│   ├── categories.ts
│   └── ...
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
└── styles/             # Global styles
```

## 🎨 Customization

### Adding New Articles

1. **Add article data** in `src/data/articles.ts`:
   ```typescript
   {
     id: 'unique-article-id',
     title: 'Article Title',
     slug: 'article-url-slug',
     excerpt: 'Brief description...',
     imageUrl: 'https://images.pexels.com/...',
     category: 'Tech',
     author: { name: 'Author Name', avatar: '...' },
     publishedAt: '2025-01-08',
     readTime: '10 min',
     keywords: ['keyword1', 'keyword2']
   }
   ```

2. **Add article content** in `src/pages/ArticlePage.tsx` in the `generateArticleContent()` function.

### Adding New Categories

1. **Update categories** in `src/data/categories.ts`
2. **Add category images** in `src/config/imageConfig.ts`
3. **Update navigation** in `src/components/Header.tsx`

### Customizing Design

- **Colors**: Update `src/config/constants.ts` SITE_CONFIG.colors
- **Fonts**: Modify `tailwind.config.js` and CSS imports
- **Layout**: Edit component files in `src/components/`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SITE_URL` | Production site URL | Yes |
| `VITE_GA_TRACKING_ID` | Google Analytics ID | No |
| `VITE_ENABLE_PWA` | Enable PWA features | No |
| `VITE_DEBUG_MODE` | Enable debug logging | No |

### Performance Optimization

- **Image Optimization**: Automatic WebP conversion and lazy loading
- **Code Splitting**: Automatic route-based code splitting
- **Bundle Analysis**: Run `npm run analyze` to check bundle size
- **Caching**: Optimized caching headers for static assets

## 📊 SEO Features

- **Meta Tags**: Dynamic meta tags for each page
- **Structured Data**: JSON-LD structured data for articles
- **Sitemap**: Auto-generated XML sitemap
- **Robots.txt**: SEO-friendly robots.txt
- **Open Graph**: Social media sharing optimization
- **Twitter Cards**: Twitter-specific meta tags

## 🧪 Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📈 Performance

- **Lighthouse Score**: 95+ on all metrics
- **Core Web Vitals**: Optimized for LCP, FID, and CLS
- **Bundle Size**: < 500KB gzipped
- **Load Time**: < 1 second on fast 3G

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: [GitHub Issues](https://github.com/bes3/tech-reviews/issues)
- **Email**: contact@bes3.com

## 🔗 Links

- **Live Site**: [https://bes3.com](https://bes3.com)
- **Documentation**: [GitHub Wiki](https://github.com/bes3/tech-reviews/wiki)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)

---

Made with ❤️ by the Bes3 team. Helping millions make smarter tech decisions in 2025.