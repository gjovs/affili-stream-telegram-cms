'use client';

import { useState } from 'react';
import { Menu, Tag, BookOpen, Home, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const navLinks = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/promocoes-do-dia', label: 'Promocoes do Dia', icon: Tag },
  { href: '/blog', label: 'Blog', icon: BookOpen },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden hover:bg-pink-50">
          <Menu className="h-6 w-6 text-gray-700" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px] bg-white">
        <SheetHeader>
          <SheetTitle className="text-left">
            <div className="flex items-center gap-2">
              <div className="relative w-10 h-10">
                <Image
                  src="/captei-logo.jpg"
                  alt="Captei Ofertas"
                  fill
                  className="object-contain rounded-full"
                />
              </div>
              <div>
                <span className="text-lg font-bold text-pink-500">CAPTEI</span>
                <span className="text-lg font-bold text-blue-500 ml-1">OFERTAS</span>
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-8">
          <ul className="space-y-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-gradient-to-r hover:from-pink-50 hover:to-blue-50 hover:text-pink-600 transition-all font-medium"
                  >
                    <Icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Promo Badge */}
        <div className="mt-8 mx-4 p-4 bg-gradient-to-r from-pink-50 to-blue-50 rounded-2xl border border-pink-100">
          <div className="flex items-center gap-2 text-pink-600 mb-2">
            <Sparkles className="h-5 w-5" />
            <span className="font-semibold">Dica do dia!</span>
          </div>
          <p className="text-sm text-gray-600">
            Ative as notificacoes para nao perder as melhores ofertas!
          </p>
        </div>
        
        <div className="absolute bottom-8 left-6 right-6">
          <p className="text-xs text-gray-400 text-center">
            As melhores ofertas em um so lugar
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
