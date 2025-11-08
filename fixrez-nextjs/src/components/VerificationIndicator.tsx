'use client';

import { useRouter } from 'next/navigation';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VerificationIndicator() {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg px-3 py-2">
      <ShieldAlert className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <span className="text-sm text-yellow-800 dark:text-yellow-300">
        Account not verified
      </span>
      <Button
        onClick={() => router.push('/verify')}
        variant="outline"
        size="sm"
        className="ml-2 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/30"
      >
        Verify Now
      </Button>
    </div>
  );
}