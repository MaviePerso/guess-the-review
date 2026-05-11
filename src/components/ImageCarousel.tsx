"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

interface ImageCarouselProps {
  images: string[];
}

export function ImageCarousel({ images }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="carousel-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-card)", height: "300px" }}>
        <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
          <ImageOff size={48} style={{ marginBottom: "10px" }} />
          <p>Image non disponible</p>
        </div>
      </div>
    );
  }

  const next = () => { setHasError(false); setCurrentIndex((i) => (i + 1) % images.length); };
  const prev = () => { setHasError(false); setCurrentIndex((i) => (i - 1 + images.length) % images.length); };

  return (
    <div className="carousel-container">
      {images.length > 1 && (
        <button className="carousel-btn left" onClick={prev}>
          <ChevronLeft size={24} />
        </button>
      )}
      
      {hasError ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-card)", height: "300px", width: "100%", borderRadius: "12px" }}>
          <ImageOff size={48} style={{ marginBottom: "10px", color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Image corrompue</p>
        </div>
      ) : (
        <img 
          src={images[currentIndex]} 
          alt="Produit" 
          className="carousel-img" 
          referrerPolicy="no-referrer" 
          onError={() => setHasError(true)}
        />
      )}

      {images.length > 1 && (
        <button className="carousel-btn right" onClick={next}>
          <ChevronRight size={24} />
        </button>
      )}

      {images.length > 1 && (
        <div style={{ position: "absolute", bottom: "-20px", display: "flex", gap: "5px", left: "50%", transform: "translateX(-50%)" }}>
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
