import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-pink-50/30">
      <div className="container mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-pink-500 animate-pulse" />
            </div>
            <Skeleton className="h-10 w-64 rounded-lg" />
          </div>
          <Skeleton className="h-5 w-40 ml-13 rounded-lg" />
        </div>

        {/* Search Skeleton */}
        <div className="mb-6">
          <Skeleton className="h-14 max-w-xl rounded-2xl" />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Skeleton */}
          <aside className="lg:w-64 shrink-0 hidden lg:block">
            <div className="bg-white rounded-2xl shadow-md p-5 space-y-6">
              <Skeleton className="h-6 w-24 rounded-lg" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-6 w-28 rounded-lg" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </aside>

          {/* Products Grid Skeleton */}
          <main className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl shadow-md overflow-hidden">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-5 space-y-4">
                    <Skeleton className="h-5 w-full rounded-lg" />
                    <Skeleton className="h-5 w-3/4 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20 rounded-lg" />
                      <Skeleton className="h-8 w-28 rounded-lg" />
                    </div>
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
