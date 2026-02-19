import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/db';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Grid3X3, Tag } from 'lucide-react';

interface CategoryPageProps {
  params: Promise<{
    category: string;
  }>;
}

// Mapping for category display names and SEO
const categoryDisplayNames: Record<string, string> = {
  'eletronicos': 'Eletronicos',
  'moda': 'Moda e Acessorios',
  'casa': 'Casa e Decoracao',
  'beleza': 'Beleza e Saude',
  'esportes': 'Esportes e Lazer',
  'games': 'Games e Consoles',
  'livros': 'Livros',
  'brinquedos': 'Brinquedos',
  'automotivo': 'Automotivo',
  'alimentos': 'Alimentos e Bebidas',
  'pet': 'Pet Shop',
  'informatica': 'Informatica',
  'celulares': 'Celulares e Smartphones',
  'tv': 'TV e Video',
  'audio': 'Audio e Som',
  'outros': 'Outros',
};

function getCategoryDisplayName(slug: string): string {
  return categoryDisplayNames[slug.toLowerCase()] || 
    slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
}

async function getProductsByCategory(categorySlug: string) {
  // Search for products matching the category (case-insensitive)
  const products = await prisma.product.findMany({
    where: {
      category: {
        contains: categorySlug,
        mode: 'insensitive',
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return products;
}

async function getAllCategories() {
  const products = await prisma.product.findMany({
    select: { category: true },
    where: {
      category: { not: null },
    },
  });

  const categories = Array.from(
    new Set(products.map(p => p.category).filter((c): c is string => c !== null))
  ).sort();

  return categories;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const displayName = getCategoryDisplayName(decodeURIComponent(category));
  
  return {
    title: `Ofertas de ${displayName} | Promocoes e Descontos | Captei Ofertas`,
    description: `Encontre as melhores ofertas e promocoes de ${displayName} com desconto. Cupons exclusivos Amazon, Shopee, Magalu e mais lojas!`,
    keywords: [
      displayName,
      'promocoes',
      'ofertas',
      'desconto',
      'cupom',
      category,
    ],
    openGraph: {
      title: `Ofertas de ${displayName} | Captei Ofertas`,
      description: `As melhores promocoes de ${displayName} em um so lugar!`,
      type: 'website',
      url: `https://capteiofertas.com.br/ofertas/${category}`,
    },
    alternates: {
      canonical: `https://capteiofertas.com.br/ofertas/${category}`,
    },
  };
}

export async function generateStaticParams() {
  const categories = await getAllCategories();
  
  return categories.map((category) => ({
    category: encodeURIComponent(category.toLowerCase()),
  }));
}

export const revalidate = 60; // ISR: Revalidate every 60 seconds

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const decodedCategory = decodeURIComponent(category);
  const displayName = getCategoryDisplayName(decodedCategory);
  
  const products = await getProductsByCategory(decodedCategory);
  const allCategories = await getAllCategories();

  if (products.length === 0) {
    // Show empty state instead of 404
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-pink-50/30">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-pink-500 to-blue-500 h-1" />
      
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-pink-600 transition-colors">Inicio</Link>
          <span>/</span>
          <Link href="/promocoes-do-dia" className="hover:text-pink-600 transition-colors">Promocoes</Link>
          <span>/</span>
          <span className="text-gray-700">{displayName}</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-lg">
              <Grid3X3 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Ofertas de {displayName}
              </h1>
              <p className="text-gray-500 mt-1">
                {products.length} {products.length === 1 ? 'oferta encontrada' : 'ofertas encontradas'}
              </p>
            </div>
          </div>
          
          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 mt-6">
            <Link href="/promocoes-do-dia">
              <Badge 
                variant="outline" 
                className="px-3 py-1.5 cursor-pointer hover:bg-pink-50 hover:border-pink-300 transition-colors"
              >
                Todas
              </Badge>
            </Link>
            {allCategories.map((cat) => (
              <Link 
                key={cat} 
                href={`/ofertas/${encodeURIComponent(cat.toLowerCase())}`}
              >
                <Badge 
                  variant={cat.toLowerCase() === decodedCategory.toLowerCase() ? 'default' : 'outline'}
                  className={`px-3 py-1.5 cursor-pointer transition-colors ${
                    cat.toLowerCase() === decodedCategory.toLowerCase()
                      ? 'bg-pink-500 hover:bg-pink-600'
                      : 'hover:bg-pink-50 hover:border-pink-300'
                  }`}
                >
                  {getCategoryDisplayName(cat)}
                </Badge>
              </Link>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => {
              const discount = product.originalPrice
                ? calculateDiscount(product.originalPrice, product.price)
                : 0;
              
              return (
                <Link
                  key={product.id}
                  href={`/oferta/${product.id}`}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all group"
                >
                  <div className="relative aspect-square bg-gray-100">
                    <Image
                      src={product.image}
                      alt={product.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                    {discount > 0 && (
                      <Badge className="absolute top-3 right-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-bold">
                        -{discount}%
                      </Badge>
                    )}
                    <Badge 
                      variant="secondary" 
                      className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-gray-700"
                    >
                      {product.storeName}
                    </Badge>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm md:text-base font-medium text-gray-800 line-clamp-2 min-h-[2.5rem] group-hover:text-pink-600 transition-colors">
                      {product.title}
                    </h3>
                    <div className="mt-2">
                      {product.originalPrice && product.originalPrice > product.price && (
                        <p className="text-xs text-gray-400 line-through">
                          {formatPrice(product.originalPrice)}
                        </p>
                      )}
                      <p className="text-lg md:text-xl font-bold text-green-600">
                        {formatPrice(product.price)}
                      </p>
                    </div>
                    {product.couponCode && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-yellow-700">
                        <Tag className="h-3 w-3" />
                        <span>Cupom disponivel</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Tag className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Nenhuma oferta encontrada
            </h2>
            <p className="text-gray-500 mb-6">
              Ainda nao temos ofertas nesta categoria. Confira outras categorias!
            </p>
            <Link href="/promocoes-do-dia">
              <Button className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-full">
                Ver Todas as Promocoes
              </Button>
            </Link>
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
  );
}
