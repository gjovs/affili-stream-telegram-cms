import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, ArrowRight, Calendar } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Blog | Captei Ofertas',
  description: 'Dicas, guias e novidades sobre promocoes, cupons e como economizar nas suas compras online.',
};

export const revalidate = 300;

async function getPosts() {
  const posts = await prisma.post.findMany({
    where: {
      published: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return posts;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-blue-500" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">
              <span className="text-pink-500">Blog</span>{' '}
              <span className="text-blue-500">Captei</span>
            </h1>
          </div>
          <p className="text-gray-600 ml-13">
            Dicas e novidades sobre promocoes e economia
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-10 w-10 text-blue-400" />
            </div>
            <p className="text-gray-700 text-lg font-medium mb-2">
              Nenhum post publicado ainda
            </p>
            <p className="text-gray-500 text-sm">
              Volte em breve para conferir nossas dicas!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer h-full border-0 shadow-md bg-white group rounded-2xl overflow-hidden">
                  {/* Card Header with gradient */}
                  <div className="h-2 bg-gradient-to-r from-pink-500 to-blue-500" />
                  
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                      <Calendar className="h-3 w-3" />
                      {formatDate(post.createdAt)}
                    </div>
                    <CardTitle className="text-xl group-hover:text-pink-600 transition-colors line-clamp-2">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                      {post.content.substring(0, 150)}...
                    </p>
                    <div className="flex items-center text-pink-500 text-sm font-medium group-hover:text-pink-600 transition-colors">
                      Ler mais
                      <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
