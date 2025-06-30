import React, { ReactNode } from 'react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

interface LazySectionProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  threshold?: number;
  rootMargin?: string;
}

const LazySection: React.FC<LazySectionProps> = ({
  children,
  fallback = null,
  className = '',
  threshold = 0.1,
  rootMargin = '100px'
}) => {
  const { elementRef, isIntersecting } = useIntersectionObserver({
    threshold,
    rootMargin,
    triggerOnce: true
  });

  return (
    <section ref={elementRef} className={className}>
      {isIntersecting ? children : fallback}
    </section>
  );
};

export default LazySection;