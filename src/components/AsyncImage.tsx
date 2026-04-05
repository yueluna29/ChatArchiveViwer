import React, { useState, useEffect } from 'react';
import { getImage } from '../lib/db';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '../App';

interface AsyncImageProps {
  imageId: string;
  className?: string;
  alt?: string;
}

export default function AsyncImage({ imageId, className, alt }: AsyncImageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!imageId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    
    getImage(imageId)
      .then(base64 => {
        console.log(`[AsyncImage] 请求imageId: ${imageId} → 找到数据: ${!!base64}`);
        if (isMounted && base64) {
          setSrc(base64);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [imageId]);

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center bg-slate-100 text-slate-400 animate-pulse", className)}>
        <ImageIcon size={24} className="opacity-50" />
      </div>
    );
  }

  if (!src) {
    return (
      <div className={cn("flex flex-col items-center justify-center bg-slate-100 text-slate-400 gap-1 p-2", className)}>
        <ImageIcon size={20} />
        <span className="text-[8px] font-medium text-center break-all opacity-60">{imageId}</span>
      </div>
    );
  }

  return <img src={src} alt={alt || "Image"} className={className} referrerPolicy="no-referrer" />;
}
