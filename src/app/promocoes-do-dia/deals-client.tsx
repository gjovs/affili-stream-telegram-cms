'use client';

import { useState, useMemo } from 'react';
import { Search, X, Sparkles, Filter as FilterIcon } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { FilterSidebar } from '@/components/filter-sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Product } from '@prisma/client';

interface DealsClientProps {
  products: Product[];
  stores: string[];
  categories: string[];
}

export function DealsClient({ products, stores, categories }: DealsClientProps) {
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (selectedStore && product.storeName !== selectedStore) return false;
      if (selectedCategory && product.category !== selectedCategory) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = product.title.toLowerCase().includes(query);
        const matchesStore = product.storeName.toLowerCase().includes(query);
        const matchesCoupon = product.couponCode?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesStore && !matchesCoupon) return false;
      }
      return true;
    });
  }, [products, selectedStore, selectedCategory, searchQuery]);

  const clearFilters = () => {
    setSelectedStore(null);
    setSelectedCategory(null);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedStore || selectedCategory || searchQuery;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-pink-50/30">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-pink-500" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">
              <span className="text-pink-500">Promocoes</span>{' '}
              <span className="text-blue-500">do Dia</span>
            </h1>
          </div>
          <p className="text-gray-600 ml-13">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'oferta encontrada' : 'ofertas encontradas'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por produto, loja ou cupom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-12 h-14 text-base rounded-2xl border-2 border-gray-200 focus:border-pink-400 focus:ring-pink-400 shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Filter Toggle */}
        <div className="lg:hidden mb-4">
          <Button
            variant="outline"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="border-pink-200 text-pink-600 hover:bg-pink-50"
          >
            <FilterIcon className="h-4 w-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-2 w-5 h-5 bg-pink-500 text-white text-xs rounded-full flex items-center justify-center">
                !
              </span>
            )}
          </Button>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-pink-600 border-pink-300 hover:bg-pink-50 rounded-full"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar filtros
            </Button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Desktop */}
          <aside className={`lg:w-64 shrink-0 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-24">
              <FilterSidebar
                stores={stores}
                categories={categories}
                selectedStore={selectedStore}
                selectedCategory={selectedCategory}
                onStoreChange={setSelectedStore}
                onCategoryChange={setSelectedCategory}
              />
            </div>
          </aside>

          {/* Products Grid */}
          <main className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-10 w-10 text-pink-400" />
                </div>
                <p className="text-gray-700 text-lg font-medium mb-2">
                  Nenhuma promocao encontrada
                </p>
                <p className="text-gray-500 text-sm mb-6">
                  Tente ajustar os filtros ou buscar por outro termo.
                </p>
                {hasActiveFilters && (
                  <Button
                    onClick={clearFilters}
                    className="bg-pink-500 hover:bg-pink-600 text-white rounded-full"
                  >
                    Limpar todos os filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
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
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
