"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

interface ImageCarouselProps {
  images: string[];
  onImageFail?: () => void;
}

export function ImageCarousel({ images, onImageFail }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [useProxy, setUseProxy] = useState(false);

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

  const next = () => { setHasError(false); setUseProxy(false); setCurrentIndex((i) => (i + 1) % images.length); };
  const prev = () => { setHasError(false); setUseProxy(false); setCurrentIndex((i) => (i - 1 + images.length) % images.length); };

  const currentImageUrl = useProxy 
    ? "/api/proxy-image?url=" + encodeURIComponent(images[currentIndex])
    : images[currentIndex];

  const handleImageError = () => {
    if (!useProxy) {
      setUseProxy(true); // Try proxy first
    } else {
      // Proxy also failed. If there are other images, try the next one automatically.
      if (images.length > 1) {
        // We need a way to avoid infinite loops if all images are dead.
        // Let's just set an error state for this specific index.
      }
      setHasError(true); 
    }
  };

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
          src={currentImageUrl} 
          alt="Produit" 
          className="carousel-img" 
          referrerPolicy="no-referrer" 
          onError={handleImageError}
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




