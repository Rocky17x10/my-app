'use client';

import { EllipsisVertical, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';

import { cn } from '@/lib/cn';
import { buttonClasses } from './button';

/** Spread these on the trigger <button>. */
export type PopoverTriggerProps = {
  ref: Ref<HTMLButtonElement>;
  type: 'button';
  popoverTarget: string;
  'aria-expanded': boolean;
  'aria-controls': string;
  'aria-haspopup': 'menu' | 'dialog';
};

export type PopoverProps = {
  trigger: (props: PopoverTriggerProps) => ReactNode;
  /** Content, or a function that gets `close()`. */
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Accessible name of the panel. */
  label: string;
  role?: 'menu' | 'dialog';
  align?: 'start' | 'end';
  /** Width class, e.g. `w-56` or `w-80`. */
  width?: string;
  /** Selector of the element to focus when opening. */
  initialFocus?: string;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

/**
 * Floating panel on the native Popover API: top layer (never clipped by a table's overflow),
 * light dismiss on outside click, Esc closes and returns focus to the trigger.
 * Placed under the trigger, or above it when there is no room; closes on scroll.
 */
export function Popover({
  trigger,
  children,
  label,
  role = 'dialog',
  align = 'end',
  width = 'w-56',
  initialFocus,
  onOpenChange,
  className,
}: PopoverProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // By id, not ref: `close` is handed to render functions (React Compiler forbids refs there).
  const close = useCallback(() => {
    const panel = document.getElementById(id);
    if (panel?.matches(':popover-open')) panel.hidePopover();
  }, [id]);

  useEffect(() => {
    if (!open) return;
    const onScroll = (event: Event) => {
      if (!panelRef.current?.contains(event.target as Node)) close();
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  // Transient UI: close when Activity hides the page (cacheComponents keeps hidden routes mounted).
  useLayoutEffect(() => close, [close]);

  function place() {
    const anchor = triggerRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const rect = anchor.getBoundingClientRect();
    const gap = 6;
    const margin = 8;
    const below = window.innerHeight - rect.bottom - gap - margin;
    const above = rect.top - gap - margin;
    const up = below < 240 && above > below;
    Object.assign(panel.style, {
      top: up ? 'auto' : `${rect.bottom + gap}px`,
      bottom: up ? `${window.innerHeight - rect.top + gap}px` : 'auto',
      left: align === 'start' ? `${Math.max(margin, rect.left)}px` : 'auto',
      right: align === 'end' ? `${Math.max(margin, window.innerWidth - rect.right)}px` : 'auto',
      maxHeight: `${up ? above : below}px`,
    });
  }

  return (
    <>
      {trigger({
        ref: triggerRef,
        type: 'button',
        popoverTarget: id,
        'aria-expanded': open,
        'aria-controls': id,
        'aria-haspopup': role,
      })}
      <div
        id={id}
        ref={panelRef}
        popover="auto"
        role={role}
        aria-label={label}
        onBeforeToggle={(event) => {
          if (event.newState === 'open') place();
        }}
        onToggle={(event) => {
          const isOpen = event.newState === 'open';
          setOpen(isOpen);
          onOpenChange?.(isOpen);
          if (isOpen && initialFocus) panelRef.current?.querySelector<HTMLElement>(initialFocus)?.focus();
        }}
        className={cn(
          'fixed max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg border border-border bg-surface p-1 text-foreground shadow-overlay',
          width,
          className,
        )}
      >
        {typeof children === 'function' ? children(close) : children}
      </div>
    </>
  );
}

export type MenuItem = {
  label: string;
  icon?: LucideIcon;
  /** Either an action… */
  onSelect?: () => void;
  /** …or a link. */
  href?: string;
  tone?: 'danger';
  disabled?: boolean;
};

export type MenuProps = {
  /** Accessible name, e.g. "Actions for LAP-0042". Also the tooltip of the default trigger. */
  label: string;
  /** `'separator'` draws a line; falsy entries are skipped, so items can be conditional. */
  items: (MenuItem | 'separator' | false | null | undefined)[];
  align?: 'start' | 'end';
  /** Custom trigger; defaults to a kebab icon button. */
  trigger?: (props: PopoverTriggerProps) => ReactNode;
  /** Non-interactive content above the items (e.g. the signed-in user). */
  header?: ReactNode;
  width?: string;
};

const ITEM_SELECTOR = '[role="menuitem"]:not([aria-disabled="true"])';

function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
  if (items.length === 0) return;
  const index = items.indexOf(document.activeElement as HTMLElement);
  const next: Record<string, number> = {
    ArrowDown: (index + 1) % items.length,
    ArrowUp: (index - 1 + items.length) % items.length,
    Home: 0,
    End: items.length - 1,
  };
  if (event.key in next) {
    event.preventDefault();
    items[next[event.key]].focus();
  }
}

/** Action menu (row actions, profile menu). Arrow keys, Home/End, Esc, type-free. */
export function Menu({ label, items, align = 'end', trigger, header, width = 'w-52' }: MenuProps) {
  const entries = items.filter((item): item is MenuItem | 'separator' => Boolean(item));
  return (
    <Popover
      role="menu"
      label={label}
      align={align}
      width={width}
      initialFocus={ITEM_SELECTOR}
      trigger={
        trigger ??
        ((props) => (
          <button {...props} aria-label={label} title={label} className={buttonClasses('ghost', 'icon-sm')}>
            <EllipsisVertical aria-hidden="true" />
          </button>
        ))
      }
    >
      {(close) => (
        <div onKeyDown={moveFocus}>
          {header}
          {entries.map((item, index) => {
            if (item === 'separator') {
              return <div key={`sep-${index}`} role="separator" className="my-1 h-px bg-border" />;
            }
            const Icon = item.icon;
            const classes = cn(
              'flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm outline-none',
              'focus-visible:bg-surface-muted hover:bg-surface-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
              item.tone === 'danger' ? 'text-danger' : 'text-foreground',
            );
            const content = (
              <>
                {Icon && (
                  <Icon
                    className={cn('size-4 shrink-0', item.tone === 'danger' ? '' : 'text-muted')}
                    aria-hidden="true"
                  />
                )}
                <span className="truncate">{item.label}</span>
              </>
            );
            if (item.href && !item.disabled) {
              return (
                <Link key={item.label} href={item.href} role="menuitem" className={classes} onClick={close}>
                  {content}
                </Link>
              );
            }
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                aria-disabled={item.disabled || undefined}
                className={classes}
                onClick={() => {
                  if (item.disabled) return;
                  close();
                  item.onSelect?.();
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </Popover>
  );
}
