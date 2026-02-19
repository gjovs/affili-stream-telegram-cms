import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatPrice, calculateDiscount, getTimeElapsed } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, Clock, Tag, Store, Copy, Sparkles, ShieldCheck } from 'lucide-react';
import { CopyButton } from './copy-button';
import { ProductJsonLd } from './product-json-ld';

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
  });
  return product;
}

async function getRelatedProducts(productId: string, category: string | null, storeName: string) {
  const products = await prisma.product.findMany({
    where: {
      id: { not: productId },
      OR: [
        { category: category || undefined },
        { storeName: storeName },
      ],
    },
    take: 4,
    orderBy: { createdAt: 'desc' },
  });
  return products;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return {
      title: 'Oferta nao encontrada | Captei Ofertas',
    };
  }

  const discount = product.originalPrice 
    ? calculateDiscount(product.originalPrice, product.price) 
    : 0;
  
  const discountText = discount > 0 ? ` com ${discount}% OFF` : '';
  const description = `${product.title}${discountText} por apenas ${formatPrice(product.price)} na ${product.storeName}. Confira esta promocao imperdivel!`;

  return {
    title: `${product.title} | ${formatPrice(product.price)} | Captei Ofertas`,
    description,
    keywords: [
      product.title,
      product.storeName,
      product.category || 'promocao',
      'cupom',
      'desconto',
      'oferta',
    ],
    openGraph: {
      title: `${product.title} - ${formatPrice(product.price)}`,
      description,
      type: 'website',
      images: [product.image],
      url: `https://capteiofertas.com.br/oferta/${product.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.title} - ${formatPrice(product.price)}`,
      description,
      images: [product.image],
    },
    alternates: {
      canonical: `https://capteiofertas.com.br/oferta/${product.id}`,
    },
  };
}

export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    select: { id: true },
    take: 100, // Generate static pages for the most recent 100 products
    orderBy: { createdAt: 'desc' },
  });

  return products.map((product) => ({
    id: product.id,
  }));
}

export const revalidate = 60; // ISR: Revalidate every 60 seconds

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  const discount = product.originalPrice 
    ? calculateDiscount(product.originalPrice, product.price) 
    : 0;
  const relatedProducts = await getRelatedProducts(product.id, product.category, product.storeName);

  return (
    <>
      <ProductJsonLd product={product} />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-pink-50/30">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-pink-500 to-blue-500 h-1" />
        
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-pink-600 transition-colors">Inicio</Link>
            <span>/</span>
            <Link href="/promocoes-do-dia" className="hover:text-pink-600 transition-colors">Promocoes</Link>
            {product.category && (
              <>
                <span>/</span>
                <Link 
                  href={`/ofertas/${encodeURIComponent(product.category.toLowerCase())}`} 
                  className="hover:text-pink-600 transition-colors"
                >
                  {product.category}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-gray-700 truncate max-w-[200px]">{product.title}</span>
          </nav>

          {/* Main Content */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="grid md:grid-cols-2 gap-0">
              {/* Image Section */}
              <div className="relative bg-gradient-to-br from-gray-100 to-gray-50 p-8">
                <div className="relative aspect-square w-full max-w-md mx-auto">
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                </div>
                
                {/* Badges */}
                {discount > 0 && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-gradient-to-r from-pink-500 to-pink-600 text-white font-bold px-4 py-2 text-lg rounded-full shadow-lg">
                      -{discount}% OFF
                    </Badge>
                  </div>
                )}
                
                <div className="absolute top-4 left-4">
                  <Badge variant="secondary" className="bg-white/95 backdrop-blur-sm text-gray-700 font-medium rounded-full shadow-sm px-3 py-1">
                    <Store className="h-3 w-3 mr-1" />
                    {product.storeName}
                  </Badge>
                </div>
              </div>

              {/* Details Section */}
              <div className="p-8 flex flex-col">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                  {product.title}
                </h1>

                {/* Price Section */}
                <div className="mb-6">
                  {product.originalPrice && product.originalPrice > product.price && (
                    <p className="text-lg text-gray-400 line-through mb-1">
                      De: {formatPrice(product.originalPrice)}
                    </p>
                  )}
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-green-600">
                      {formatPrice(product.price)}
                    </span>
                    {discount > 0 && (
                      <span className="text-sm text-pink-600 font-medium bg-pink-50 px-3 py-1 rounded-full">
                        Economize {formatPrice(product.originalPrice! - product.price)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Coupon Section */}
                {product.couponCode && (
                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-dashed border-yellow-300 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-2 text-sm font-medium text-yellow-700 mb-3">
                      <Tag className="h-4 w-4" />
                      <span>Cupom de Desconto Disponivel!</span>
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div className="flex items-center gap-3">
                      <code className="flex-1 bg-white px-4 py-3 rounded-lg border border-yellow-200 font-mono text-lg font-bold text-yellow-800 text-center">
                        {product.couponCode}
                      </code>
                      <CopyButton code={product.couponCode} />
                    </div>
                    <p className="text-xs text-yellow-600 mt-2">
                      Copie e aplique o cupom no checkout para garantir o desconto
                    </p>
                  </div>
                )}

                {/* Trust Badges */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    <span>Loja Oficial</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span>Publicado {getTimeElapsed(product.createdAt)}</span>
                  </div>
                </div>

                {/* CTA Button */}
                <a
                  href={product.affiliateLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-auto"
                >
                  <Button
                    className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all text-lg py-6"
                    size="lg"
                  >
                    Ir para a Loja
                    <ExternalLink className="ml-2 h-5 w-5" />
                  </Button>
                </a>

                <p className="text-xs text-gray-400 text-center mt-3">
                  Voce sera redirecionado para {product.storeName}
                </p>
              </div>
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Ofertas Relacionadas
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {relatedProducts.map((relatedProduct) => {
                  const relatedDiscount = relatedProduct.originalPrice
                    ? calculateDiscount(relatedProduct.originalPrice, relatedProduct.price)
                    : 0;
                  
                  return (
                    <Link
                      key={relatedProduct.id}
                      href={`/oferta/${relatedProduct.id}`}
                      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow group"
                    >
                      <div className="relative aspect-square bg-gray-100">
                        <Image
                          src={relatedProduct.image}
                          alt={relatedProduct.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                        {relatedDiscount > 0 && (
                          <Badge className="absolute top-2 right-2 bg-pink-500 text-white text-xs">
                            -{relatedDiscount}%
                          </Badge>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-pink-600 transition-colors">
                          {relatedProduct.title}
                        </h3>
                        <p className="text-lg font-bold text-green-600 mt-1">
                          {formatPrice(relatedProduct.price)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Back Link */}
          <div className="mt-8">
            <Link href="/promocoes-do-dia">
              <Button variant="ghost" className="text-gray-600 hover:text-pink-600 hover:bg-pink-50">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Ver Todas as Promocoes
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
