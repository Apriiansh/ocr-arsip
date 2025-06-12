"use client";

import { useState, useEffect, ImgHTMLAttributes } from 'react';

interface SafeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string; // Opsional, jika ingin menampilkan gambar fallback
}

const SafeImage: React.FC<SafeImageProps> = ({ src, alt, className, fallbackSrc, ...props }) => {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!src) {
      setIsLoading(false);
      setCurrentSrc(undefined); 
      return;
    }

    setIsLoading(true);
    const img = new Image();
    img.src = src;

    img.onload = () => {
      setCurrentSrc(src);
      setIsLoading(false);
    };

    img.onerror = () => {
      if (fallbackSrc) {
        const fallbackImg = new Image();
        fallbackImg.src = fallbackSrc;
        fallbackImg.onload = () => {
          setCurrentSrc(fallbackSrc);
          setIsLoading(false);
        };
        fallbackImg.onerror = () => {
          setCurrentSrc(undefined); // Keduanya gagal
          setIsLoading(false);
        };
      } else {
        setCurrentSrc(undefined); // src gagal, tidak ada fallback
        setIsLoading(false);
      }
    };

    return () => { // Cleanup
      img.onload = null;
      img.onerror = null;
    };
  }, [src, fallbackSrc]);

  if (isLoading || !currentSrc) {
    // Selama loading atau jika currentSrc tidak ada (gagal load tanpa fallback), jangan render apa-apa.
    return null;
  }

  return (
    <img
      src={currentSrc} // Hanya render jika currentSrc valid (original atau fallback)
      alt={alt}
      className={className}
      {...props}
    />
  );
};

export default SafeImage;