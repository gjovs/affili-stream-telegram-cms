'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Filter, Store, FolderOpen } from 'lucide-react';

interface FilterSidebarProps {
  stores: string[];
  categories: string[];
  selectedStore: string | null;
  selectedCategory: string | null;
  onStoreChange: (store: string | null) => void;
  onCategoryChange: (category: string | null) => void;
}

export function FilterSidebar({
  stores,
  categories,
  selectedStore,
  selectedCategory,
  onStoreChange,
  onCategoryChange,
}: FilterSidebarProps) {
  return (
    <Card className="border-0 shadow-md bg-white rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-pink-50 to-blue-50 border-b border-gray-100">
        <CardTitle className="flex items-center gap-2 text-gray-800">
          <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
            <Filter className="h-4 w-4 text-pink-500" />
          </div>
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-6">
        {/* Store Filter */}
        <div>
          <h3 className="font-semibold mb-3 text-sm text-gray-700 flex items-center gap-2">
            <Store className="h-4 w-4 text-blue-500" />
            Lojas
          </h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onStoreChange(null)}
              className={`text-left px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedStore === null
                  ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-pink-50 hover:text-pink-600'
              }`}
            >
              Todas as lojas
            </button>
            {stores.map((store) => (
              <button
                key={store}
                onClick={() => onStoreChange(store)}
                className={`text-left px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedStore === store
                    ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-pink-50 hover:text-pink-600'
                }`}
              >
                {store}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 text-sm text-gray-700 flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-blue-500" />
              Categorias
            </h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onCategoryChange(null)}
                className={`text-left px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedCategory === null
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                Todas as categorias
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => onCategoryChange(category)}
                  className={`text-left px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
