// Returns true if the currently rendered HTML is Turbo preview
export function isPreview() {
  return document.documentElement.hasAttribute('data-turbo-preview')
}
