export interface ResponsiveImage {
  src: string;
  srcSet: string;
  sizes: string;
}

/** Warm the same responsive resource used by the visible image, once per page.
 * Keep successful images decoded; failed requests can be retried on entry.
 */
export function createImagePreloader(createImage: () => HTMLImageElement) {
  const images = new Map<string, HTMLImageElement>();
  return (assets: Iterable<ResponsiveImage>) => {
    for (const asset of assets) {
      const key = `${asset.srcSet}|${asset.sizes}`;
      if (images.has(key)) continue;
      const image = createImage();
      image.decoding = 'async';
      image.fetchPriority = 'low';
      image.onerror = () => { if (images.get(key) === image) images.delete(key); };
      image.onload = () => { void image.decode().catch(() => {}); };
      images.set(key, image);
      // Set selection hints before src to avoid downloading the fallback too.
      image.sizes = asset.sizes;
      image.srcset = asset.srcSet;
      image.src = asset.src;
    }
  };
}
