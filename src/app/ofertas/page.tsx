import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Grid3X3, ArrowRight, Tag, ShoppingBag, Laptop, Shirt, Home, Heart, Dumbbell, Gamepad, Book, Car, Utensils, PawPrint } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Categorias de Ofertas | Captei Ofertas',
  description: 'Explore todas as categorias de ofertas e promocoes. Eletronicos, Moda, Casa, Beleza, Games e muito mais com os melhores descontos!',
  openGraph: {
    title: 'Categorias de Ofertas | Captei Ofertas',
    description: 'Explore todas as categorias de ofertas e promocoes com os melhores descontos!',
    type: 'website',
    url: 'https://capteiofertas.com.br/ofertas',
  },
  alternates: {
    canonical: 'https://capteiofertas.com.br/ofertas',
  },
};

// Icons for categories
const categoryIcons: Record<string, React.ReactNode> = {
  'eletronicos': <Laptop className="h-8 w-8" />,
  'moda': <Shirt className="h-8 w-8" />,
  'casa': <Home className="h-8 w-8" />,
  'beleza': <Heart className="h-8 w-8" />,
  'esportes': <Dumbbell className="h-8 w-8" />,
  'games': <Gamepad className="h-8 w-8" />,
  'livros': <Book className="h-8 w-8" />,
  'brinquedos': <ShoppingBag className="h-8 w-8" />,
  'automotivo': <Car className="h-8 w-8" />,
  'alimentos': <Utensils className="h-8 w-8" />,
  'pet': <PawPrint className="h-8 w-8" />,
  'informatica': <Laptop className="h-8 w-8" />,
  'celulares': <ShoppingBag className="h-8 w-8" />,
};

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
};

async function getCategoriesWithCount() {
  const products = await prisma.product.findMany({
    select: { category: true },
    where: {
      category: { not: null },
    },
  });

  const categoryCount: Record<string, number> = {};
  products.forEach((p) => {
    if (p.category) {
      const cat = p.category.toLowerCase();
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    }
  });

  return Object.entries(categoryCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export const revalidate = 60;

export default async function OfertasPage() {
  const categories = await getCategoriesWithCount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-pink-50/30">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-pink-500 to-blue-500 h-1" />
      
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-pink-600 transition-colors">Inicio</Link>
          <span>/</span>
          <span className="text-gray-700">Categorias</span>
        </nav>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl shadow-lg mb-6">
            <Grid3X3 className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Categorias de Ofertas
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore nossas categorias e encontre as melhores ofertas para voce
          </p>
        </div>

        {/* Categories Grid */}
        {categories.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {categories.map((category) => {
              const displayName = categoryDisplayNames[category.name] || 
                category.name.charAt(0).toUpperCase() + category.name.slice(1);
              const icon = categoryIcons[category.name] || <Tag className="h-8 w-8" />;
              
              return (
                <Link
                  key={category.name}
                  href={`/ofertas/${encodeURIComponent(category.name)}`}
                  className="bg-white rounded-2xl shadow-md p-6 hover:shadow-xl transition-all group text-center"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:from-pink-200 group-hover:to-blue-200 transition-colors">
                    <span className="text-pink-600">{icon}</span>
                  </div>
                  <h2 className="font-semibold text-gray-800 group-hover:text-pink-600 transition-colors mb-1">
                    {displayName}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {category.count} {category.count === 1 ? 'oferta' : 'ofertas'}
                  </p>
                  <div className="mt-3 flex items-center justify-center text-pink-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Ver ofertas
                    <ArrowRight className="h-4 w-4 ml-1" />
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
              Nenhuma categoria disponivel
            </h2>
            <p className="text-gray-500 mb-6">
              As categorias aparecerao conforme novos produtos forem adicionados.
            </p>
            <Link href="/promocoes-do-dia">
              <Button className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-full">
                Ver Todas as Promocoes
              </Button>
            </Link>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-12 bg-gradient-to-r from-pink-500 to-blue-500 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">
            Nao encontrou o que procurava?
          </h2>
          <p className="text-pink-100 mb-6">
            Confira todas as nossas promocoes em uma unica pagina
          </p>
          <Link href="/promocoes-do-dia">
            <Button 
              variant="secondary" 
              className="bg-white text-pink-600 hover:bg-gray-100 rounded-full font-semibold"
            >
              Ver Todas as Promocoes
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
