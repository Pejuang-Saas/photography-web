'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminBookings } from '@/lib/admin-queries';
import { useCrmUnread } from '@/lib/crm-queries';
import type { AdminUser } from '@/lib/admin-auth';
import {
  LayoutDashboard,
  CalendarDays,
  FileCheck2,
  Receipt,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Settings2,
  Images,
  FolderKanban,
  Megaphone,
  HelpCircle,
  MessageSquareQuote,
  PanelsTopLeft,
  CreditCard,
  MessageSquare,
  Store,
  Mail,
  MessagesSquare,
  LayoutTemplate,
  FolderOpen,
  PackageOpen,
  PlusCircle,
  Tags,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type NavLeaf = {
  title: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: number | null;
  badgeColor?: string;
};

type NavGroup = {
  title: string;
  icon: LucideIcon;
  children: NavLeaf[];
};

type NavEntry = NavLeaf | NavGroup;

const isGroup = (entry: NavEntry): entry is NavGroup => 'children' in entry;

function isActive(pathname: string, item: NavLeaf) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const itemClass = (active: boolean, sub = false) =>
  cn(
    'group relative flex items-center justify-between rounded-lg px-3 font-medium transition-colors duration-150',
    sub ? 'py-1.5 text-[12.5px]' : 'py-2 text-[13px]',
    active
      ? 'bg-amber-500/10 font-semibold text-zinc-900 before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-amber-500 dark:bg-amber-500/10 dark:text-white'
      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/70 dark:hover:text-zinc-200',
  );

const iconClass = (active: boolean, sub = false) =>
  cn(
    sub ? 'size-3.5' : 'size-4',
    'shrink-0 transition-colors',
    active
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300',
  );

function NavLink({
  item,
  pathname,
  sub = false,
}: {
  item: NavLeaf;
  pathname: string;
  sub?: boolean;
}) {
  const active = isActive(pathname, item);
  const Icon = item.icon;

  return (
    <Link href={item.href} className={itemClass(active, sub)}>
      <div className="flex min-w-0 items-center gap-3">
        <Icon className={iconClass(active, sub)} />
        <span className="truncate">{item.title}</span>
      </div>
      {item.badge !== null && item.badge !== undefined && (
        <span
          className={cn(
            'flex h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-mono font-extrabold',
            item.badgeColor || 'bg-amber-500 text-zinc-950',
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function NavSubmenu({ group, pathname }: { group: NavGroup; pathname: string }) {
  const hasActiveChild = group.children.some((child) => isActive(pathname, child));
  // Follows the current route until the user toggles it by hand.
  const [override, setOverride] = useState<boolean | null>(null);
  const open = override ?? hasActiveChild;
  const Icon = group.icon;

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOverride(!open)}
        className={cn(
          itemClass(false),
          'w-full',
          hasActiveChild && 'text-zinc-900 dark:text-white',
        )}
      >
        <div className="flex items-center gap-3">
          <Icon
            className={cn(
              'size-4 shrink-0',
              hasActiveChild ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400',
            )}
          />
          <span>{group.title}</span>
        </div>
        <ChevronDown
          className={cn('size-3.5 text-zinc-400 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="mt-0.5 ml-[1.15rem] space-y-0.5 border-l border-zinc-200 pl-2 dark:border-zinc-800">
          {group.children.map((child) => (
            <NavLink key={child.href} item={child} pathname={pathname} sub />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminSidebar({
  user,
  mobile = false,
}: {
  user: AdminUser;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const bookings = useAdminBookings();

  const crmUnread = useCrmUnread().data?.total ?? 0;

  const pendingCount = (bookings.data ?? []).filter(
    (b) => b.status === 'PENDING_VERIFICATION',
  ).length;

  const sections: { label: string; entries: NavEntry[] }[] = [
    {
      label: 'Operasional',
      entries: [
        { title: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
        {
          title: 'Reservasi & Verifikasi',
          href: '/admin/bookings',
          icon: FileCheck2,
          badge: pendingCount > 0 ? pendingCount : null,
          badgeColor: 'bg-amber-500 text-zinc-950',
        },
        { title: 'Kalender Jadwal', href: '/admin/calendar', icon: CalendarDays },
        { title: 'Invoice & Pembayaran', href: '/admin/invoices', icon: Receipt },
      ],
    },
    {
      label: 'Klien',
      entries: [
        {
          title: 'Mini CRM',
          href: '/admin/crm',
          icon: MessagesSquare,
          badge: crmUnread > 0 ? crmUnread : null,
          badgeColor: 'bg-emerald-500 text-white',
        },
        { title: 'Galeri Klien', href: '/admin/galleries', icon: FolderOpen },
      ],
    },
    {
      label: 'Pengelolaan',
      entries: [
        {
          title: 'Paket & Layanan',
          icon: Layers,
          children: [
            { title: 'Kategori Paket', href: '/admin/packages/categories', icon: Tags },
            // The other two live below /admin/packages, so this one must match exactly.
            { title: 'Paket', href: '/admin/packages', icon: PackageOpen, exact: true },
            { title: 'Add-on', href: '/admin/packages/add-ons', icon: PlusCircle },
          ],
        },
        // Integration features from other specs (WAHA / template builder / SMTP) add their pages here.
        {
          title: 'Pengaturan & Integrasi',
          icon: Settings2,
          children: [
            { title: 'Profil Studio', href: '/admin/settings/profil-studio', icon: Store },
            { title: 'Otomasi WhatsApp', href: '/admin/settings/whatsapp', icon: MessageSquare },
            { title: 'Notifikasi Email', href: '/admin/settings/email', icon: Mail },
            {
              title: 'Metode Pembayaran',
              href: '/admin/settings/metode-pembayaran',
              icon: CreditCard,
            },
          ],
        },
      ],
    },
    {
      label: 'Konten Website',
      entries: [
        {
          title: 'CMS',
          icon: PanelsTopLeft,
          children: [
            { title: 'Konten Halaman', href: '/admin/cms/landing', icon: LayoutTemplate },
            { title: 'Gallery', href: '/admin/cms/gallery', icon: Images },
            { title: 'Kategori Gallery', href: '/admin/cms/categories', icon: FolderKanban },
            { title: 'Marquee', href: '/admin/cms/marquee', icon: Megaphone },
            { title: 'FAQ', href: '/admin/cms/faq', icon: HelpCircle },
            { title: 'Testimonial', href: '/admin/cms/testimonials', icon: MessageSquareQuote },
          ],
        },
      ],
    },
  ];

  const renderEntries = (entries: NavEntry[]) =>
    entries.map((entry) =>
      isGroup(entry) ? (
        <NavSubmenu key={entry.title} group={entry} pathname={pathname} />
      ) : (
        <NavLink key={entry.href} item={entry} pathname={pathname} />
      ),
    );

  return (
    <aside
      className={cn(
        'w-60 flex-col border-r border-zinc-200/80 bg-white shadow-[1px_0_0_rgba(15,23,42,0.02)] transition-colors duration-150 dark:border-[#293548] dark:bg-[#121923]',
        mobile ? 'flex min-h-full' : 'fixed inset-y-0 left-0 z-30 hidden lg:flex',
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 px-4">
        <Link href="/admin" className="flex items-center gap-2.5 group">
          <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500 text-zinc-950 font-extrabold text-xs shadow-sm shadow-amber-500/20 group-hover:scale-105 transition-transform">
            K
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-tight text-zinc-900 dark:text-white">
              Kayastory
            </span>
            <Badge className="h-4.5 px-1.5 text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              Studio
            </Badge>
          </div>
        </Link>

        <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      {/* Navigation Links */}
      <div className="flex-1 space-y-6 overflow-y-auto px-2.5 py-5">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
              {section.label}
            </div>
            <nav className="space-y-0.5">{renderEntries(section.entries)}</nav>
          </div>
        ))}
      </div>

      {/* Footer Profile & Website Link */}
      <div className="border-t border-zinc-200/80 dark:border-zinc-800/80 p-3 space-y-2">
        <Link
          href="/"
          target="_blank"
          className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <ArrowUpRight className="size-3.5 text-amber-500" />
            Buka Web Publik
          </span>
          <span className="font-mono text-[10px] text-zinc-400">kayastory.id ↗</span>
        </Link>

        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/60 p-2.5 shadow-2xs">
          <Avatar className="size-7 border border-amber-500/30">
            <AvatarImage src={user.image ?? undefined} />
            <AvatarFallback className="bg-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-300">
              {user.name?.slice(0, 2).toUpperCase() ?? 'KS'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-xs font-bold text-zinc-900 dark:text-white">
              {user.name ?? user.email}
            </span>
            <span className="truncate text-[10px] text-zinc-500">Administrator Studio</span>
          </div>
          <ShieldCheck className="size-3.5 text-amber-500 shrink-0" />
        </div>
      </div>
    </aside>
  );
}
