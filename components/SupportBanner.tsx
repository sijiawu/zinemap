'use client';

import Link from 'next/link';
import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SupportBanner() {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-amber-50 border-b border-amber-200">
      <div className="relative flex items-center justify-center px-4 py-2">
        <p className="text-sm text-amber-900 text-center">
          Love ZineMap? You can help{' '}
          <Link 
            href="/support-zinemap" 
            className="underline hover:no-underline font-medium"
          >
            keep it running →
          </Link>
        </p>
        <Button
          onClick={handleDismiss}
          variant="ghost"
          size="sm"
          className="absolute right-4 text-amber-700 hover:text-amber-800 hover:bg-amber-100 h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
