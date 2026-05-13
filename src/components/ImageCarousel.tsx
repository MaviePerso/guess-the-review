"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ImageOff, Loader2 } from "lucide-react";

// BestBuy placeholder sizes to reject
const PLACEHOLDER_SIZES = [14867, 3495, 11462];
const PLACEHOLDER_WIDTH = 122; // known BestBuy unavailable image width

interface ImageCarouselProps {
  images: string[];
  onImageFail?: () => void;
  onImageReady?: () => void;
}

async function validateImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.src = "";
      resolve(false); // Timeout = treat as broken
    }, 3500);
    img.onload = () => {
      clearTimeout(timer);
      // Reject if image is too small (placeholder dimensions)
      if (img.naturalWidth <= PLACEHOLDER_WIDTH || img.naturalHeight <= 10) {
        resolve(false);
      } else {
        resolve(true);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    img.src = url.startsWith('http') ? 'https://images.weserv.nl/?url=' + encodeURIComponent(url.replace(/^https?:\/\//, '')) + '&default=error' : url;
  });
}

export function ImageCarousel({ images, onImageFail, onImageReady }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    setStatus("loading");
    setCurrentIndex(0);

    if (!images || images.length === 0) {
      setStatus("error");
      onImageFail?.();
      return;
    }

    let cancelled = false;

    const checkImages = async () => {
      for (const url of images) {
        if (cancelled) return;
        const ok = await validateImage(url);
        if (ok) {
          if (!cancelled) {
            setStatus("ok");
            onImageReady?.();
          }
          return;
        }
      }
      // All images failed
      if (!cancelled) {
        setStatus("error");
        onImageFail?.();
      }
    };

    checkImages();
    return () => { cancelled = true; };
  }, [images]);

  const next = () => setCurrentIndex((i) => (i + 1) % images.length);
  const prev = () => setCurrentIndex((i) => (i - 1 + images.length) % images.length);

  if (status === "loading") {
    return (
      <div className="carousel-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-card)", height: "300px" }}>
        <Loader2 size={40} className="animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (status === "error") {
    return null; // Parent handles the swap, show nothing
  }

  return (
    <div className="carousel-container">
      {images.length > 1 && (
        <button className="carousel-btn left" onClick={prev}>
          <ChevronLeft size={24} />
        </button>
      )}

      <img
        src={images[currentIndex].startsWith('http') ? 'https://images.weserv.nl/?url=' + encodeURIComponent(images[currentIndex].replace(/^https?:\/\//, '')) + '&default=error' : images[currentIndex]}
        alt="Produit"
        className="carousel-img"
        referrerPolicy="no-referrer"
        onError={() => {
          // Fallback if somehow a bad image slips through
          onImageFail?.();
        }}
      />

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
