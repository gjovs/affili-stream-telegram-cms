import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

const BASE_URL = 'https://capteiofertas.com.br';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/promocoes-do-dia`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/ofertas`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ];

  // Product pages
  const products = await prisma.product.findMany({
    select: {
      id: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${BASE_URL}/oferta/${product.id}`,
    lastModified: product.updatedAt,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  // Category pages
  const categories = await prisma.product.findMany({
    select: {
      category: true,
    },
    where: {
      category: { not: null },
    },
    distinct: ['category'],
  });

  const categoryPages: MetadataRoute.Sitemap = categories
    .filter((c) => c.category)
    .map((c) => ({
      url: `${BASE_URL}/ofertas/${encodeURIComponent(c.category!.toLowerCase())}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));

  // Blog pages
  const posts = await prisma.post.findMany({
    select: {
      slug: true,
      updatedAt: true,
    },
    where: {
      published: true,
    },
  });

  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...productPages, ...categoryPages, ...blogPages];
}
