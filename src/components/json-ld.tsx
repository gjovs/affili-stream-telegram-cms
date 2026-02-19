export function OrganizationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Captei Ofertas',
    url: 'https://capteiofertas.com.br',
    logo: 'https://capteiofertas.com.br/captei-logo.jpg',
    description: 'Encontre as melhores promocoes, cupons de desconto e ofertas do dia nas maiores lojas do Brasil.',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: 'Portuguese',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function WebsiteJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Captei Ofertas',
    url: 'https://capteiofertas.com.br',
    description: 'As melhores promocoes e cupons de desconto do Brasil',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://capteiofertas.com.br/promocoes-do-dia?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
