import { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
    src: string;
    alt: string;
    className?: string;
    placeholder?: string;
}

export default function LazyImage({ src, alt, className = '', placeholder }: LazyImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        if (!imgRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '50px' }
        );

        observer.observe(imgRef.current);

        return () => observer.disconnect();
    }, []);

    return (
        <div ref={imgRef} className={`relative ${className}`}>
            {!isLoaded && (
                <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
            )}
            {isInView && (
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                    className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                    onLoad={() => setIsLoaded(true)}
                />
            )}
        </div>
    );
}
