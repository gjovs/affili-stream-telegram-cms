'use client';

import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface CopyButtonProps {
  code: string;
}

export function CopyButton({ code }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Button
      onClick={handleCopy}
      variant="outline"
      className="shrink-0 border-yellow-300 hover:bg-yellow-100 rounded-lg px-4"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-green-600" />
          <span className="ml-2 text-green-600">Copiado!</span>
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 text-yellow-700" />
          <span className="ml-2 text-yellow-700">Copiar</span>
        </>
      )}
    </Button>
  );
}
