import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function ArticleJsonLd({ post }: { post: Post }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.content.substring(0, 160),
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      '@type': 'Organization',
      name: 'Captei Ofertas',
      url: 'https://capteiofertas.com.br',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Captei Ofertas',
      logo: {
        '@type': 'ImageObject',
        url: 'https://capteiofertas.com.br/captei-logo.jpg',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://capteiofertas.com.br/blog/${post.slug}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  
  const post = await prisma.post.findUnique({
    where: { slug },
  });

  if (!post) {
    return {
      title: 'Post nao encontrado',
    };
  }

  return {
    title: `${post.title} | Blog Captei Ofertas`,
    description: post.content.substring(0, 160),
    openGraph: {
      title: post.title,
      description: post.content.substring(0, 160),
      type: 'article',
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      url: `https://capteiofertas.com.br/blog/${post.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.content.substring(0, 160),
    },
    alternates: {
      canonical: `https://capteiofertas.com.br/blog/${post.slug}`,
    },
  };
}

export async function generateStaticParams() {
  const posts = await prisma.post.findMany({
    where: {
      published: true,
    },
    select: {
      slug: true,
    },
  });

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function estimateReadTime(content: string) {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return minutes;
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  
  const post = await prisma.post.findUnique({
    where: { slug },
  });

  if (!post || !post.published) {
    notFound();
  }

  const readTime = estimateReadTime(post.content);

  return (
    <>
      <ArticleJsonLd post={post} />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-pink-500 to-blue-500 h-1" />
        
        <article className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-pink-600 transition-colors">Inicio</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-pink-600 transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-gray-700 truncate max-w-[200px]">{post.title}</span>
          </nav>
          
          {/* Back Button */}
          <Link href="/blog">
            <Button variant="ghost" className="mb-6 text-gray-600 hover:text-pink-600 hover:bg-pink-50 -ml-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Blog
            </Button>
          </Link>
          
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Article Header */}
            <div className="bg-gradient-to-br from-pink-50 to-blue-50 p-8 md:p-12">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                {post.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-pink-500" />
                  <time dateTime={post.createdAt.toISOString()}>{formatDate(post.createdAt)}</time>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span>{readTime} min de leitura</span>
                </div>
              </div>
            </div>

            {/* Article Content */}
            <div className="p-8 md:p-12">
              <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-pink-600 prose-a:no-underline hover:prose-a:underline">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed text-lg">
                  {post.content}
                </div>
              </div>
            </div>
            
            {/* Article Footer */}
            <div className="border-t border-gray-100 p-8 md:p-12 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-gray-600 text-sm">
                  Gostou do conteudo? Confira nossas ofertas!
                </p>
                <Link href="/promocoes-do-dia">
                  <Button className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-full">
                    Ver Promocoes
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}
