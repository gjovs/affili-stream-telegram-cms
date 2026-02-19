import { formatPrice } from '@/lib/utils';

interface Product {
  id: string;
  title: string;
  image: string;
  price: number;
  originalPrice: number | null;
  storeName: string;
  affiliateLink: string;
  category: string | null;
}

interface ProductJsonLdProps {
  product: Product;
}

export function ProductJsonLd({ product }: ProductJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.image,
    description: `${product.title} disponivel na ${product.storeName} por ${formatPrice(product.price)}`,
    brand: {
      '@type': 'Brand',
      name: product.storeName,
    },
    offers: {
      '@type': 'Offer',
      url: `https://capteiofertas.com.br/oferta/${product.id}`,
      priceCurrency: 'BRL',
      price: product.price.toFixed(2),
      priceValidUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: product.storeName,
      },
    },
    aggregateRating: undefined, // We don't have ratings yet
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
