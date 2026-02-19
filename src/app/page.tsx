import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Tag, Percent, Sparkles, TrendingUp } from 'lucide-react';
import { prisma } from '@/lib/db';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';

export const revalidate = 60;

async function getLatestDeals() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    take: 6,
  });
  return products;
}

export default async function HomePage() {
  const latestDeals = await getLatestDeals();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-white to-blue-50">
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-pink-200 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-blue-200 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-40 right-1/4 w-16 h-16 bg-yellow-200 rounded-full blur-2xl opacity-60" />
        
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            {/* Text Content */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-pink-100 text-pink-600 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                As melhores ofertas do Brasil
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                <span className="text-pink-500">Economize</span> em suas{' '}
                <span className="text-blue-500">compras</span> online
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0">
                Encontre cupons exclusivos, promocoes imperdíveis e descontos nas maiores lojas do Brasil.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/promocoes-do-dia">
                  <Button size="lg" className="bg-pink-500 hover:bg-pink-600 text-white shadow-brand w-full sm:w-auto">
                    Ver Promocoes
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/blog">
                  <Button size="lg" variant="outline" className="border-2 border-blue-500 text-blue-500 hover:bg-blue-50 w-full sm:w-auto">
                    Dicas de Economia
                  </Button>
                </Link>
              </div>
              
              {/* Stats */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-8 mt-10">
                <div className="text-center">
                  <div className="text-3xl font-bold text-pink-500">500+</div>
                  <div className="text-sm text-gray-500">Ofertas ativas</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-500">80%</div>
                  <div className="text-sm text-gray-500">Desconto maximo</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-500">4+</div>
                  <div className="text-sm text-gray-500">Lojas parceiras</div>
                </div>
              </div>
            </div>
            
            {/* Hero Image */}
            <div className="flex-1 relative">
              <div className="relative w-full max-w-md mx-auto lg:max-w-lg">
                {/* Banner background effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-pink-200 to-blue-200 rounded-3xl blur-2xl opacity-40 transform rotate-6" />
                
                {/* Main image */}
                <div className="relative">
                  <Image
                    src="/captei-banner.jpg"
                    alt="Captei Ofertas"
                    width={600}
                    height={400}
                    className="w-full h-auto drop-shadow-2xl"
                    priority
                  />
                </div>
                
                {/* Floating badges */}
                <div className="absolute -top-4 -right-4 bg-white p-3 rounded-2xl shadow-lg animate-float">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Percent className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Ate</div>
                      <div className="font-bold text-green-600">80% OFF</div>
                    </div>
                  </div>
                </div>
                
                <div className="absolute -bottom-4 -left-4 bg-white p-3 rounded-2xl shadow-lg animate-float" style={{ animationDelay: '1s' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                      <Tag className="h-5 w-5 text-pink-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Cupons</div>
                      <div className="font-bold text-pink-600">Exclusivos</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Tag className="h-8 w-8 text-pink-500" />
              </div>
              <h3 className="font-bold text-lg mb-2">Cupons Atualizados</h3>
              <p className="text-gray-600">Codigos de desconto verificados e atualizados diariamente</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="font-bold text-lg mb-2">Melhores Precos</h3>
              <p className="text-gray-600">Comparamos precos para garantir as melhores ofertas</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-yellow-500" />
              </div>
              <h3 className="font-bold text-lg mb-2">Ofertas Exclusivas</h3>
              <p className="text-gray-600">Promocoes especiais que voce nao encontra em outro lugar</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Latest Deals Section */}
      {latestDeals.length > 0 && (
        <section className="py-16 bg-gradient-to-br from-gray-50 to-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold">
                  <span className="text-pink-500">Ultimas</span>{' '}
                  <span className="text-blue-500">Ofertas</span>
                </h2>
                <p className="text-gray-600 mt-2">Confira as promocoes mais recentes</p>
              </div>
              <Link href="/promocoes-do-dia">
                <Button variant="outline" className="hidden md:flex border-pink-500 text-pink-500 hover:bg-pink-50">
                  Ver todas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestDeals.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  title={product.title}
                  image={product.image}
                  price={product.price}
                  originalPrice={product.originalPrice}
                  couponCode={product.couponCode}
                  storeName={product.storeName}
                  affiliateLink={product.affiliateLink}
                  createdAt={product.createdAt}
                />
              ))}
            </div>
            
            <div className="text-center mt-8 md:hidden">
              <Link href="/promocoes-do-dia">
                <Button className="bg-pink-500 hover:bg-pink-600 text-white">
                  Ver todas as ofertas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
      
      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-pink-500 to-blue-500">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Nao perca nenhuma oferta!
          </h2>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
            Acompanhe nossas promocoes diarias e economize em todas as suas compras online.
          </p>
          <Link href="/promocoes-do-dia">
            <Button size="lg" className="bg-white text-pink-500 hover:bg-gray-100 shadow-lg">
              Explorar Ofertas
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
