import { useEffect, useState } from 'react'

/** Retain the visible image until its replacement loads; at most two visible layers. */
export function CrossfadeImage({ src, alt = '', className = '', priority = false }: {
  src: string; alt?: string; className?: string; priority?: boolean
}) {
  const [images, setImages] = useState({ requested: src, visible: src, previous: '' })
  if (images.requested !== src) {
    setImages({ requested: src, visible: images.visible, previous: '' })
  }
  useEffect(() => {
    if (!images.previous) return
    const timer = setTimeout(() => setImages((current) => ({ ...current, previous: '' })), 360)
    return () => clearTimeout(timer)
  }, [images.previous, images.visible])
  const pending = images.requested !== images.visible
  const layers = [images.previous, images.visible, pending ? images.requested : ''].filter(Boolean)
  return <span className={`crossfade-image ${className}`}>
    {layers.map((source) => {
      const waiting = pending && source === images.requested
      const leaving = source === images.previous
      return <img key={source} src={source} alt={leaving || waiting ? '' : alt}
        aria-hidden={leaving || waiting || !alt ? true : undefined}
        fetchPriority={priority ? 'high' : undefined}
        className={waiting ? 'image-waiting' : leaving ? 'image-leaving' : images.previous ? 'image-entering' : ''}
        onLoad={waiting ? () => setImages((current) => current.requested === source
          ? { requested: source, visible: source, previous: current.visible } : current) : undefined} />
    })}
  </span>
}
