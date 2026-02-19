'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, Clock, Tag, Sparkles, Eye } from 'lucide-react';
import { formatPrice, calculateDiscount, getTimeElapsed } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface ProductCardProps {
  id: string;
  title: string;
  image: string;
  price: number;
  originalPrice?: number | null;
  couponCode?: string | null;
  storeName: string;
  affiliateLink: string;
  createdAt: Date;
}

export function ProductCard({
  id,
  title,
  image,
  price,
  originalPrice,
  couponCode,
  storeName,
  affiliateLink,
  createdAt,
}: ProductCardProps) {
  const { toast } = useToast();
  const discount = originalPrice ? calculateDiscount(originalPrice, price) : 0;
  const timeElapsed = getTimeElapsed(createdAt);

  const handleCopyCoupon = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (couponCode) {
      try {
        await navigator.clipboard.writeText(couponCode);
        toast({
          title: 'Cupom copiado!',
          description: `Codigo ${couponCode} copiado para area de transferencia.`,
        });
      } catch (error) {
        toast({
          title: 'Erro ao copiar',
          description: 'Nao foi possivel copiar o cupom.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleGetDeal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(affiliateLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <Link href={`/oferta/${id}`}>
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-md bg-white group cursor-pointer">
        <div className="relative">
          {/* Product Image */}
          <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50">
            <Image
              src={image}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            
            {/* View Details Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Eye className="h-4 w-4" />
                Ver Detalhes
              </div>
            </div>
          </div>

          {/* Discount Badge */}
          {discount > 0 && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-bold px-3 py-1.5 text-sm rounded-full shadow-lg">
                -{discount}% OFF
              </Badge>
            </div>
          )}

          {/* Store Badge */}
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-white/95 backdrop-blur-sm text-gray-700 font-medium rounded-full shadow-sm">
              {storeName}
            </Badge>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          {/* Title */}
          <h3 className="font-semibold text-base line-clamp-2 min-h-[3rem] text-gray-800 group-hover:text-pink-600 transition-colors">
            {title}
          </h3>

          {/* Price Section */}
          <div className="space-y-1">
            {originalPrice && originalPrice > price && (
              <p className="text-sm text-gray-400 line-through">
                {formatPrice(originalPrice)}
              </p>
            )}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-600">
                {formatPrice(price)}
              </span>
              {discount > 0 && (
                <span className="text-xs text-pink-500 font-medium bg-pink-50 px-2 py-0.5 rounded-full">
                  Economize {formatPrice(originalPrice! - price)}
                </span>
              )}
            </div>
          </div>

          {/* Coupon Section */}
          {couponCode && (
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-dashed border-yellow-300 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-yellow-700">
                <Tag className="h-4 w-4" />
                <span>Cupom disponivel</span>
                <Sparkles className="h-3 w-3 text-yellow-500" />
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded-lg border border-yellow-200 font-mono text-sm font-bold text-yellow-800 text-center">
                  {couponCode}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyCoupon}
                  className="shrink-0 border-yellow-300 hover:bg-yellow-100 rounded-lg"
                >
                  <Copy className="h-4 w-4 text-yellow-700" />
                </Button>
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={handleGetDeal}
            className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
            size="lg"
          >
            Pegar Promocao
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>

          {/* Timestamp */}
          <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            <span>{timeElapsed}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
