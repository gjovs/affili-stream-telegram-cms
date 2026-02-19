import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { MobileMenu } from '@/components/mobile-menu';
import { OrganizationJsonLd, WebsiteJsonLd } from '@/components/json-ld';
import { GoogleAnalytics } from '@/components/google-analytics';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Captei Ofertas - Promocoes e Cupons de Desconto',
  description: 'Encontre as melhores promocoes, cupons de desconto e ofertas do dia nas maiores lojas do Brasil.',
  keywords: ['promocoes', 'cupons', 'desconto', 'ofertas', 'amazon', 'shopee', 'magalu'],
  authors: [{ name: 'Captei Ofertas' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://capteiofertas.com.br'),
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://capteiofertas.com.br',
    siteName: 'Captei Ofertas',
    title: 'Captei Ofertas - Promocoes e Cupons de Desconto',
    description: 'Encontre as melhores promocoes, cupons de desconto e ofertas do dia.',
    images: ['/captei-banner.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Captei Ofertas - Promocoes e Cupons de Desconto',
    description: 'Encontre as melhores promocoes, cupons de desconto e ofertas do dia.',
    images: ['/captei-banner.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://capteiofertas.com.br',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <OrganizationJsonLd />
        <WebsiteJsonLd />
        <GoogleAnalytics />
      </head>
      <body className={inter.className}>
        {/* Header */}
        <header className="bg-white/95 backdrop-blur-md border-b border-pink-100 sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 group">
                <div className="relative w-10 h-10 md:w-12 md:h-12 transition-transform group-hover:scale-105">
                  <Image
                    src="/captei-logo.jpg"
                    alt="Captei Ofertas"
                    fill
                    className="object-contain rounded-full"
                    priority
                  />
                </div>
                <div className="hidden sm:block">
                  <span className="text-xl md:text-2xl font-bold text-pink-500">CAPTEI</span>
                  <span className="text-xl md:text-2xl font-bold text-blue-500 ml-1">OFERTAS</span>
                </div>
              </Link>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:block">
                <ul className="flex items-center gap-1">
                  <li>
                    <Link 
                      href="/promocoes-do-dia" 
                      className="px-4 py-2 rounded-full text-gray-700 hover:text-pink-600 hover:bg-pink-50 font-medium transition-all"
                    >
                      Promocoes do Dia
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/blog" 
                      className="px-4 py-2 rounded-full text-gray-700 hover:text-pink-600 hover:bg-pink-50 font-medium transition-all"
                    >
                      Blog
                    </Link>
                  </li>
                </ul>
              </nav>
              
              {/* Mobile Navigation */}
              <MobileMenu />
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="min-h-screen">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white mt-16">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Brand */}
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                  <div className="relative w-12 h-12">
                    <Image
                      src="/captei-logo.jpg"
                      alt="Captei Ofertas"
                      fill
                      className="object-contain rounded-full"
                    />
                  </div>
                  <div>
                    <span className="text-xl font-bold text-pink-400">CAPTEI</span>
                    <span className="text-xl font-bold text-blue-400 ml-1">OFERTAS</span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm">
                  As melhores promocoes e cupons de desconto em um so lugar.
                </p>
              </div>
              
              {/* Links */}
              <div className="text-center">
                <h3 className="font-semibold text-white mb-4">Links Rapidos</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/promocoes-do-dia" className="text-gray-400 hover:text-pink-400 transition-colors">
                      Promocoes do Dia
                    </Link>
                  </li>
                  <li>
                    <Link href="/blog" className="text-gray-400 hover:text-pink-400 transition-colors">
                      Blog
                    </Link>
                  </li>
                </ul>
              </div>
              
              {/* Info */}
              <div className="text-center md:text-right">
                <h3 className="font-semibold text-white mb-4">Lojas Parceiras</h3>
                <div className="flex flex-wrap justify-center md:justify-end gap-2">
                  <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-300">Amazon</span>
                  <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-300">Shopee</span>
                  <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-300">Mercado Livre</span>
                  <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-300">Magalu</span>
                </div>
              </div>
            </div>
            
            {/* Bottom */}
            <div className="border-t border-gray-800 mt-8 pt-8 text-center">
              <p className="text-gray-500 text-xs">
                © {new Date().getFullYear()} Captei Ofertas. Todos os direitos reservados.
              </p>
              <p className="text-gray-600 text-xs mt-2">
                Este site pode receber comissoes por compras realizadas atraves dos links de afiliados.
              </p>
            </div>
          </div>
        </footer>
        
        <Toaster />
      </body>
    </html>
  );
}
