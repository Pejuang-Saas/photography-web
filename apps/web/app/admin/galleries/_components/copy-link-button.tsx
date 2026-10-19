'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/** Puts the customer's link on the clipboard, ready to paste into WhatsApp. */
export default function CopyLinkButton({
  link,
  label = 'Salin Link',
  iconOnly = false,
}: {
  link: string;
  label?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Link gallery disalin');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Some browsers refuse without a secure context; show the link so it can be copied by hand.
      window.prompt('Salin link gallery ini:', link);
    }
  }

  const Icon = copied ? Check : Copy;
  return (
    <Button
      variant="outline"
      size={iconOnly ? 'icon-sm' : 'sm'}
      aria-label={iconOnly ? label : undefined}
      onClick={copy}
      className="gap-1.5"
    >
      <Icon className="size-3.5" />
      {!iconOnly && (copied ? 'Tersalin' : label)}
    </Button>
  );
}
