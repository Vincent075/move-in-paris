export function getApartmentReference(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h << 5) - h + slug.charCodeAt(i);
    h |= 0;
  }
  const hex = Math.abs(h).toString(16).toUpperCase().padStart(6, "0").slice(0, 6);
  return `MIP-${hex}`;
}
