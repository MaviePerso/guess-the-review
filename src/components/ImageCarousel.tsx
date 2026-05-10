"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImageCarouselProps {
  images: string[];
}

export function ImageCarousel({ images }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const next = () => setCurrentIndex((i) => (i + 1) % images.length);
  const prev = () => setCurrentIndex((i) => (i - 1 + images.length) % images.length);

  return (
    <div className="carousel-container">
      {images.length > 1 && (
        <button className="carousel-btn left" onClick={prev}>
          <ChevronLeft size={24} />
        </button>
      )}
      
      <img 
        src={images[currentIndex]} 
        alt="Produit" 
        className="carousel-img" 
        referrerPolicy="no-referrer" 
      />

      {images.length > 1 && (
        <button className="carousel-btn right" onClick={next}>
          <ChevronRight size={24} />
        </button>
      )}

      {images.length > 1 && (
        <div style={{ position: "absolute", bottom: "-20px", display: "flex", gap: "5px" }}>
          {images.map((_, idx) => (
            <div 
              key={idx} 
              style={{
                width: "8px", 
                height: "8px", 
                borderRadius: "50%", 
                background: idx === currentIndex ? "var(--primary)" : "#d1d5db"
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
