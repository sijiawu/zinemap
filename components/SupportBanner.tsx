'use client';

import Link from 'next/link';

export default function SupportBanner() {
  return (
    <div className="sticky top-0 z-50 w-full bg-amber-50 border-b border-amber-200">
      <div className="flex items-center justify-center px-4 py-2">
        <p className="text-sm text-amber-900 text-center">
          💛 Love ZineMap? You can help{' '}
          <Link 
            href="/support-zinemap" 
            className="underline hover:no-underline font-medium"
          >
            keep it running →
          </Link>
        </p>
      </div>
    </div>
  );
}
