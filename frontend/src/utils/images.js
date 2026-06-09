/**
 * Generate a real food image URL based on the recipe title.
 * Uses loremflickr.com which returns real Flickr photos matching the search term.
 * Free, no API key needed. The `lock` param ensures consistent image per recipe.
 */
export function getFoodImageUrl(title, id) {
  // Normalize: lowercase, remove accents, keep only letters/spaces
  const normalized = title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z\s]/g, '')
    .trim()

  // Take first 2-3 significant words
  const words = normalized.split(/\s+/).filter(w => w.length > 2)
  const query = words.slice(0, 2).join(',')
  const seed = id ? id.replace(/-/g, '').substring(0, 8) : '0'

  return `https://loremflickr.com/400/300/${encodeURIComponent(query)}?lock=${seed}`
}
