'use client';

import Link from 'next/link';

import { IconChip } from '@/components/ui/icon-chip';
import { cn } from '@/lib/cn';
import { findNavItem, type NavItem } from './nav';

type SidebarNavProps = {
  items: NavItem[];
  pathname: string;
  collapsed?: boolean;
  /** Called after a link is clicked (closes the mobile drawer). */
  onNavigate?: () => void;
};

function groupBySection(items: NavItem[]) {
  const sections: { name: string; items: NavItem[] }[] = [];
  for (const item of items) {
    const section = sections.find((entry) => entry.name === item.section);
    if (section) section.items.push(item);
    else sections.push({ name: item.section, items: [item] });
  }
  return sections;
}

export function SidebarNav({ items, pathname, collapsed = false, onNavigate }: SidebarNavProps) {
  const active = findNavItem(pathname, items);

  return (
    <nav aria-label="Main" className="flex flex-col gap-1 px-3 py-2">
      {groupBySection(items).map((section, index) => (
        <div key={section.name}>
          {collapsed ? (
            index > 0 && <div className="mx-2 my-2 h-px bg-border" aria-hidden="true" />
          ) : (
            <p className="px-2 pt-4 pb-1.5 text-xs font-medium text-muted">{section.name}</p>
          )}
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const current = item === active;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={current ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'relative flex items-center gap-3 rounded-md p-1.5 text-sm font-medium transition-colors',
                      collapsed && 'justify-center',
                      current
                        ? 'bg-primary/10 text-primary before:absolute before:top-1.5 before:bottom-1.5 before:-left-3 before:w-1 before:rounded-r-full before:bg-primary'
                        : 'text-muted hover:bg-surface-muted hover:text-foreground',
                    )}
                  >
                    <IconChip icon={item.icon} tone={item.tone} size="sm" />
                    {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
