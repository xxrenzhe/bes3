export function getArticlePath(articleType: string, slug: string): string {
  if (articleType === 'comparison') return `/compare/${slug}`
  if (articleType === 'guide') return `/guides/${slug}`
  return `/reviews/${slug}`
}
