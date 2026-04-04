export function normalizeEditorialHtml(contentHtml: string) {
  return contentHtml.replace(/<h1(\s|>)/gi, '<h2$1').replace(/<\/h1>/gi, '</h2>')
}
