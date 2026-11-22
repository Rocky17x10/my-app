import { Boxes, Laptop, LifeBuoy, PackagePlus, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Brand } from '@/components/shell/brand';

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Laptop, title: 'Assets and assignments', text: 'See who has which device, and since when.' },
  { icon: PackagePlus, title: 'Requests and returns', text: 'Ask for new equipment or hand it back in a few clicks.' },
  { icon: LifeBuoy, title: 'IT support', text: 'Raise a ticket and follow the conversation with IT.' },
];

/** Sign-in and password pages: brand panel on wide screens, the form on the right. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <aside className="relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden bg-linear-160 from-brand-deep via-brand to-brand-blue p-10 text-white lg:flex xl:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -right-32 size-[28rem] rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.14)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
        />

        <div className="relative flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
            <Boxes className="size-5" aria-hidden="true" />
          </span>
          <span className="text-base font-semibold">IT Asset Management</span>
        </div>

        <div className="relative max-w-md">
          <p className="text-3xl leading-tight font-semibold tracking-tight text-balance xl:text-4xl">
            Every laptop, monitor and licence, accounted for.
          </p>
          <ul className="mt-10 flex flex-col gap-6">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/12 ring-1 ring-white/20">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="block text-sm text-white/75">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/70">Internal tool. Access is managed by your IT team.</p>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm">
          <Brand className="mb-10 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
