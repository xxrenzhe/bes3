'use client'

import { useState } from 'react'
import Image from 'next/image'

export function ProductImageGallery({
  images,
  title
}: {
  images: string[]
  title: string
}) {
  const safeImages = Array.from(new Set(images.filter(Boolean)))
  const [activeImage, setActiveImage] = useState(safeImages[0] || null)

  if (!activeImage) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#e5eeff,#dfe9fa)] shadow-panel">
        <div className="bg-grid absolute inset-0" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#e5eeff,#dfe9fa)] shadow-panel">
        <Image
          src={activeImage}
          alt={title}
          fill
          sizes="(max-width: 1024px) 100vw, 40vw"
          className="object-cover"
        />
      </div>
      {safeImages.length > 1 ? (
        <div className="grid grid-cols-4 gap-3">
          {safeImages.slice(0, 4).map((image, index) => {
            const isActive = image === activeImage
            return (
              <button
                key={image}
                type="button"
                onClick={() => setActiveImage(image)}
                className={`relative aspect-square overflow-hidden rounded-[1.25rem] border transition-all ${
                  isActive ? 'border-primary shadow-[0_0_0_3px_rgba(16,185,129,0.15)]' : 'border-border/70 hover:border-primary/40'
                }`}
                aria-label={`View ${title} image ${index + 1}`}
              >
                <Image
                  src={image}
                  alt={`${title} view ${index + 1}`}
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
