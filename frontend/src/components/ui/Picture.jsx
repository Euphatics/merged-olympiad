/**
 * An `<img>` that prefers the WebP sibling of a PNG/JPEG source.
 *
 * `npm run optimize:images` writes `foo.webp` next to `foo.png` for every
 * sizeable image in public/ — around 85% smaller on this project's artwork.
 * Deriving the path here means the hundreds of image references inside
 * `syllabusData.js` did not each have to be rewritten, and a source without a
 * generated WebP still renders correctly via the fallback.
 *
 * SVGs are already vector and pass straight through.
 */
export default function Picture({ src, alt = '', className, loading = 'lazy', fetchPriority, ...rest }) {
  const isRaster = typeof src === 'string' && /\.(png|jpe?g)$/i.test(src);

  const img = (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
      {...rest}
    />
  );

  if (!isRaster) return img;

  const webp = src.replace(/\.(png|jpe?g)$/i, '.webp');

  return (
    <picture>
      <source srcSet={webp} type="image/webp" />
      {img}
    </picture>
  );
}
