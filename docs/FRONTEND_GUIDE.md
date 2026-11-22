# Frontend guide

How the IT Asset Management frontend is built, and the rules every page follows so the whole app looks and behaves as one product. Read this before you add or rewrite a page.

Stack: Next.js 16.4 App Router with `cacheComponents`, React 19, Tailwind 4, TypeScript, `lucide-react` icons. Next 16 differs from older versions: read `node_modules/next/dist/docs/` for anything not covered here.

## 1. Design audit (old UI) and what replaces it

| # | Problem in the old pages | Fix in the new system |
|---|---|---|
| 1 | **Dark mode was unreadable**: light-grey cards with grey text on a near-black page, because colours were hard-coded (`#f3f4f6`, `#666`, inline styles) while `body` followed the OS theme. | Every colour is a token in `app/globals.css` with a light and a dark value (`bg-surface`, `text-muted`, …), plus `color-scheme` so native inputs, selects and scrollbars follow. Never use raw colours (`bg-white`, `text-gray-600`, `#…`). |
| 2 | **Buttons used as navigation** ("Main Dashboard / Asset Management / User Management" at the top of each page), different on every page. | One app shell: sidebar with every route grouped by section, breadcrumb in the top bar, active item highlighted. Pages contain no navigation bars or logout buttons. |
| 3 | **3–4 pastel buttons in every table row** (Edit, View history, Assign…), cramped and noisy. | One kebab menu per row (`DataTable` `rowActions`). The primary action of the page is one button in the page header. |
| 4 | **No shell, no identity**: plain `<main>` per page, Arial instead of the loaded Geist font, "Create Next App" title. | `AppShell` (sidebar, top bar, notifications, profile menu), Geist everywhere, title template `"%s · IT Asset Management"`, brand mark and gradient. |
| 5 | **Generic stat cards** with coloured left borders, all identical. | `StatCard`: label, large tabular number, one-line hint, tinted icon chip in its own colour; whole card links to its list. |
| 6 | **Plain tables**: no sorting, client-side search over the whole list, no paging, no loading or empty state. | `DataTable` + `usePagedList`: server paging/sort/search/filters, sticky header, row hover, skeleton rows, empty and error states, pagination footer. |
| 7 | **Inconsistent spacing and type**: mixed inline `style={{}}` and Tailwind, random paddings and sizes. | One spacing scale and type scale (section 4), shared components; no inline styles except computed widths in charts. |
| 8 | **Status colours differed per page** and failed contrast in dark mode. | One mapping for every status (`STATUS_META`), the same in badges and charts, AA contrast in both modes. |
| 9 | **Weak feedback**: `alert()`-style red text, no success feedback, no focus handling in dialogs. | Toasts for results, inline field errors, native modal `<dialog>` with focus trap, Esc and focus return. |

## 2. Design direction

Calm, dense, colourful where it carries meaning. An internal tool people use all day: information first, one confident accent, colour for status and orientation.

- **Accent:** indigo-violet `primary` (`#5b4cdb` light / `#a399ff` dark) for primary buttons, active nav item, links, focus rings, selected states.
- **Brand gradient:** `from-brand-deep via-brand to-brand-blue` (fixed in both modes, white text on top). Use only for the sign-in hero and the brand mark; the dashboard header uses a soft tint of it (`from-primary/12 via-info/6`).
- **Neutrals:** cool slate; the canvas (`bg-background`) is slightly darker than panels (`bg-surface`), so panels separate without shadows.
- **Type:** Geist Sans for everything, Geist Mono only for machine identifiers (asset tag, serial, ticket number) via `IdTag`. Numbers in tables and stats use `tabular-nums`.
- **Depth:** panels are flat with a 1px `border-border`; only floating things (menus, popovers, dialogs, toasts) get `shadow-overlay`.
- **Radius by hierarchy:** controls `rounded-md` (6px), panels `rounded-lg` (10px), dialogs and banners `rounded-xl` (14px), badges `rounded-full`.
- **Motion:** only in response to an action (dialog/drawer open, toast in). `prefers-reduced-motion` is respected globally.

## 3. Folder structure

```text
app/
  layout.tsx              root: Geist fonts, metadata + title template, <ToastProvider>
  globals.css             design tokens (light + dark), base styles
  (auth)/                 no shell; brand panel + form column (layout.tsx)
    login/                page.tsx (server, metadata) + login-form.tsx (client)
    change-password/      page.tsx + change-password-form.tsx
  (admin)/                layout.tsx = <AppShell area="admin">
    page.tsx              /            assets            (old page, to rewrite)
    dashboard/            /dashboard   reference page: page.tsx + dashboard-view.tsx
    users/, users/[id]/history/, assets/[id]/history/, asset-requests/   (old pages, to rewrite)
    returns/, maintenance/, tickets/, reports/, activity-logs/          (placeholders)
  (employee)/             layout.tsx = <AppShell area="employee">
    my-assets/, my-requests/  (old pages)   my-returns/, support/  (placeholders)
  (shared)/               layout.tsx = <AppShell area="shared"> (both roles)
    notifications/        (placeholder)
components/
  ui/                     design system (see section 6); import from '@/components/ui'
  shell/                  app-shell, sidebar, top-bar, notifications-bell, profile-menu,
                          nav.ts (ALL routes), current-user (useCurrentUser), brand, placeholder-page
lib/
  api/index.ts            apiFetch, api.get/post/patch/delete, getPage, ApiError, logout, roles
  hooks/                  useApi, usePagedList
  config.ts               API_URL (from NEXT_PUBLIC_API_URL)
  format.ts               formatDate, formatDateTime, timeAgo, formatMoney
  cn.ts                   class-name join
types/                    one file per entity, re-exported from '@/types'
proxy.ts                  optimistic route protection by the `session` cookie
```

Feature-specific components live next to their page (e.g. `app/(admin)/maintenance/complete-dialog.tsx`) or in `features/<name>/` when several pages share them. Do not put feature code in `components/ui`.

## 4. Visual rules

**Page layout.** The shell gives `<main>` (max width 1280px, padding `px-4 sm:px-6 lg:px-8`, `py-6 lg:py-8`). A page is a vertical stack: `<div className="flex flex-col gap-6">` → `PageHeader` → optional stat row → content (table or cards). Never render your own `<main>`, header bar, nav or logout button.

**Spacing scale** (Tailwind units): `gap-6` between page sections · `gap-4` between cards in a grid and between form fields · `p-5` inside cards · `gap-2` between buttons and filters · `gap-1.5` label→control. Grids: stats `grid gap-4 sm:grid-cols-2 xl:grid-cols-4`; two-panel rows `grid gap-6 lg:grid-cols-5` with `lg:col-span-3` / `lg:col-span-2`.

**Type scale.** Page title `text-2xl font-semibold tracking-tight` (only via `PageHeader`) · card/dialog title `text-base font-semibold` · body and table text `text-sm` · secondary text `text-sm text-muted` · captions `text-xs text-muted` · stat values `text-3xl font-semibold tabular-nums`. Sentence case everywhere; no ALL-CAPS labels.

**Buttons.**

| Variant | Use for |
|---|---|
| `primary` | The one main action of a page, dialog or form ("Add asset", "Save changes"). Max one per view. |
| `secondary` | Other actions next to it ("Cancel", "Export CSV", "View assets"). |
| `ghost` | Low-emphasis and icon buttons in toolbars, menus, the shell. |
| `danger` | The confirm button of a destructive action (inside `ConfirmDialog`). |
| `danger-ghost` | A destructive action shown inline (rare; prefer a menu item with `tone: 'danger'`). |

Sizes: `md` (h-9) default, `sm` (h-8) in dense toolbars, `icon` / `icon-sm` for icon-only (always with `aria-label`). Links that look like buttons: `<Link className={buttonClasses('secondary')}>`. Name actions with a verb + object ("Retire asset"), and reuse the same words in the toast ("Asset retired").

**Tables.** Always `DataTable` with server paging. Columns: identity first (tag via `IdTag` + name with a muted second line), status as `StatusBadge`, dates via `formatDate`, numbers `align: 'right'`. Hide secondary columns on small screens with `hideBelow`. Row actions go in `rowActions` (kebab menu): edit, view details/history, then a separator and destructive items with `tone: 'danger'`. Disable items the API would refuse (`disabled: true`) rather than hiding them, when the reason is useful.

**Filters.** In the table toolbar: the search box (built in, debounced) then `Select`s with `aria-label` and an "All …" first option, `className="w-44"`. Filters change the query, not the loaded rows.

**Forms.** Every control inside `Field` (label, `required` asterisk, `hint`, `error`). Two-column grid on `sm+` (`grid gap-4 sm:grid-cols-2`, long fields `sm:col-span-2`). Show the API's validation message (`errorMessage(err)`) in a `role="alert"` box at the top of the form or under the field it belongs to. Submit button shows `loading`.

**Dialogs.** `Dialog` for create/edit forms (`footer` holds Cancel + primary submit with `form="<form id>"`), `ConfirmDialog` before destructive or irreversible actions. Errors from a dialog's request are shown inside the dialog; the success toast after it closes.

**Status colours** (one language everywhere: badges, chart segments, legend dots):

| Tone | Token | Statuses |
|---|---|---|
| Green | `success` | available, approved, completed, resolved, good |
| Blue | `info` | assigned, in_progress, priority medium |
| Amber | `warning` | pending, maintenance, waiting_for_employee, needs_maintenance, priority high |
| Red | `danger` | retired, rejected, damaged, priority urgent |
| Slate | `neutral` | closed, priority low |
| Violet | `primary` | open (new ticket) |
| Pink | `pink` | reopened |

Use `<StatusBadge status={…} />` / `<PriorityBadge priority={…} />`; for charts read the tone from `STATUS_META[status].tone` and use `SOLID[tone]` / `STROKE[tone]` from `components/ui/tone.ts`.

**Icon chips.** `IconChip` = tinted square + saturated icon. Each nav section has its own tone (Overview violet, Inventory blue, Service teal, People pink, Insights amber); reuse the section's tone for that feature's empty states and stat cards so colour helps orientation.

**Empty, loading, error.** Loading: skeletons shaped like the content (`Skeleton`, `StatCard loading`, DataTable does its own). Empty: `EmptyState` saying what is empty and the one action that fixes it. Error: `EmptyState tone="danger"` with the API message and a "Try again" button (`reload`).

## 5. Adding a page

1. **Route:** create `app/(admin)/<route>/page.tsx` (or `(employee)` / `(shared)`). The group's layout gives it the shell.
2. **Nav:** add an entry to `NAV_ITEMS` in `components/shell/nav.ts` (label, href, icon, audience, section, tone). It shows in the sidebar and breadcrumb automatically.
3. **Proxy:** add the path prefix to `ADMIN_ROUTES`, `EMPLOYEE_ROUTES` or `SHARED_ROUTES` in `proxy.ts`. A route in no list is not protected by the proxy.
4. **Server page + client view** (so the page can export `metadata`; client components cannot):

```tsx
// app/(admin)/maintenance/page.tsx
import type { Metadata } from 'next';
import { MaintenanceView } from './maintenance-view';

export const metadata: Metadata = { title: 'Maintenance' }; // → "Maintenance · IT Asset Management"
export default function MaintenancePage() {
  return <MaintenanceView />;
}
```

```tsx
// app/(admin)/maintenance/maintenance-view.tsx
'use client';
import { CheckCheck, Eye } from 'lucide-react';
import { DataTable, IdTag, PageHeader, Select, StatusBadge, type Column } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { usePagedList } from '@/lib/hooks';
import type { Maintenance, MaintenanceStatus } from '@/types';

const columns: Column<Maintenance>[] = [
  { key: 'asset', header: 'Asset', cell: (m) => <IdTag>{m.asset.assetTag}</IdTag> },
  { key: 'type', header: 'Type', cell: (m) => m.maintenanceType },
  { key: 'status', header: 'Status', sortKey: 'status', cell: (m) => <StatusBadge status={m.status} /> },
  { key: 'start', header: 'Started', sortKey: 'startDate', hideBelow: 'md', cell: (m) => formatDate(m.startDate) },
];

export function MaintenanceView() {
  const list = usePagedList<Maintenance, { status: MaintenanceStatus | '' }>('/maintenance', { sort: 'createdAt' });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Maintenance" description="Repairs and inspections, open and completed." />
      <DataTable
        {...list.tableProps}
        label="Maintenance records"
        columns={columns}
        rowKey={(m) => m.id}
        searchPlaceholder="Search asset or problem…"
        filters={
          <Select aria-label="Status" className="w-44" value={list.filters.status ?? ''}
            onChange={(e) => list.setFilter('status', e.target.value as MaintenanceStatus | '')}>
            <option value="">All statuses</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </Select>
        }
        rowActionsLabel={(m) => `Actions for ${m.asset.assetTag}`}
        rowActions={(m) => [
          { label: 'View details', icon: Eye, onSelect: () => {/* open dialog */} },
          m.status === 'in_progress' && { label: 'Complete', icon: CheckCheck, onSelect: () => {/* … */} },
        ]}
        empty={{ title: 'No maintenance records', description: 'Records appear when an asset is sent for repair.' }}
      />
    </div>
  );
}
```

5. Delete the placeholder (`PlaceholderPage`) when your page lands. Rewriting an old page: keep its URL, drop its own header/nav/logout/profile fetch/role redirect (the shell and proxy do that), use the components and hooks below.

## 6. Shared code: what to use

**API** (`@/lib/api`). Never write API URLs with a host, never call `fetch` directly, never store anything in `sessionStorage`/`localStorage` (the session is HttpOnly cookies).

| Export | Use |
|---|---|
| `api.get<T>(path, query?)`, `api.post<T>(path, body?)`, `api.patch<T>(path, body?)`, `api.delete<T>(path)` | Typed JSON calls; resolve with the body, throw `ApiError` on non-2xx. `query` skips empty values. |
| `getPage<T>(path, query)` | One page `{ data, total, page, limit, totalPages }`. |
| `ApiError` (`status`, `message: string`, `code?`), `errorMessage(err, fallback?)` | Show `errorMessage(err)` to users; validation arrays are already joined. |
| `apiFetch(path, init)` | Low level (returns `Response`); handles cookies, one refresh + retry on 401 (single-flight, Web Lock across tabs), 401 → `/login?expired=1&next=…`, 403 `PASSWORD_CHANGE_REQUIRED` → `/change-password`. |
| `logout()`, `homePathFor(role)`, `isAdminRole(role)`, `ROLE_LABELS` | Session helpers. To sign out from UI use `signOut()` from `@/components/shell` (full reload). |

**Hooks** (`@/lib/hooks`).

- `useApi<T>(path | null, query?)` → `{ data, error, loading, reload, setData }`. Refetches when the URL changes; `null` waits. A 401 never shows as an error (the browser is already going to /login).
- `usePagedList<T, Filters>(path, { limit?, sort?, order?, filters? })` → `rows, total, totalPages, page, limit, sort, order, search, filters, loading, error, reload, setData, setPage, setLimit, setSort, setSearch, setFilter(key, value), setFilters` and `tableProps` to spread into `DataTable`. Limit/sort/search/filter changes go back to page 1. After a mutation call `list.reload()`.

**Current user** (`@/components/shell`): `const { user, isAdmin, reload } = useCurrentUser();` Loaded once by the shell; pages render only after it exists, so never fetch `/auth/profile` in a page.

**Toasts:** `const toast = useToast(); toast.success('Asset retired'); toast.error('Could not retire the asset', errorMessage(err)); toast.info(…)`.

**Components** (`@/components/ui`): `Button` (`variant`, `size`, `loading`) · `buttonClasses()` · `Field` (`label`, `hint`, `error`, `required`) · `Input` (`icon`) · `Select` (native; `className` sizes the wrapper) · `Textarea` · `Dialog` (`open`, `onClose`, `title`, `description`, `footer`, `size`) · `ConfirmDialog` (`onConfirm`, `confirmLabel`, `tone`, `loading`) · `DataTable` (section 4) · `Menu` (`label`, `items`, `trigger?`, `header?`) · `Popover` · `Badge` (`tone`, `dot`) · `StatusBadge` · `PriorityBadge` · `IdTag` · `Card` (`title`, `description`, `actions`, `bodyClassName`) · `StatCard` (`label`, `value`, `icon`, `tone`, `hint`, `href`, `loading`) · `IconChip` · `EmptyState` (`icon`, `tone`, `title`, `description`, `action`) · `Skeleton` · `PageHeader` (`title`, `description`, `actions`, `back`) · tone maps `SOFT`/`SOLID`/`STROKE`. Notification icons per type: `NOTIFICATION_META`; notification links: `notificationHref(n, role)`.

**Types** (`@/types`): one definition per entity: `User`, `UserRef`, `SessionUser`, `UserRole`, `Asset`, `AssetStatus`, `AssignmentHistory`, `AssetRequest`, `RequestStatus`, `AssetReturn`, `ReturnCondition`, `Maintenance`, `MaintenanceStatus`, `SupportTicket`, `TicketMessage`, `TicketStatus`, `TicketPriority`, `Notification`, `NotificationType`, `ActivityLog`, `DashboardStatistics`, `Page<T>`, `SortOrder`. Never redeclare an entity type in a page; extend the shared one if the API changed.

## 7. Next 16 gotchas (read once)

- **Proxy, not middleware:** `proxy.ts` at the root, `export function proxy(request)`. It only reads the `session` cookie (role) and is a UX shortcut, not security; the API decides. `/login?expired=1` drops a stale `session` cookie.
- **Metadata only in server files.** A `'use client'` page cannot export `metadata`: use the server `page.tsx` + client view pattern.
- **Hooks that read the URL need `<Suspense>`** with `cacheComponents`: `useParams()`, `useSearchParams()` and `usePathname()` on `[id]` routes fail the build otherwise. Wrap the client view: `<Suspense fallback={<Skeleton …/>}><View /></Suspense>`. Prefer `params` in the server page and pass the id as a prop.
- **Activity keeps hidden routes mounted** (up to 3): state survives navigation, effects re-run when you come back (lists refetch). Close transient UI on hide (the shared `Popover`/`Dialog` already do). After sign-in changes (logout, password change) use a full load (`window.location.assign`), as `signOut()` does.
- **Instant-navigation validation** is limited to segments that opt in (`experimental.instantInsights.validationLevel: 'manual-warning'` in `next.config.ts`), because signed-in pages render only after the browser loaded the user. Don't add `export const instant = true` to shell pages.
- **Dialogs and menus are native**: `<dialog>.showModal()` (inert page, Esc, focus return) and the Popover API (top layer, light dismiss). A modal dialog makes the rest of the page inert, including toasts: show a dialog's errors inside it.
- **Dev only:** don't run `next build` while `next dev` is running on Windows (EPERM renames in `.next`).

## 8. Conventions checklist

- No hard-coded API hosts or URLs outside `lib/config.ts`; paths like `'/assets'` go through `api`/`usePagedList`.
- No `any`; types from `@/types`.
- No `sessionStorage`/`localStorage` for data or auth.
- No raw colours or inline styles (except computed chart widths); only tokens.
- Accessible: every control has a label (`Field` or `aria-label`), icon-only buttons have `aria-label`, focus is visible (global ring), status is never colour-only (badges carry text).
- Works at 360px: tables scroll horizontally inside their panel, toolbars wrap, dialogs fit the screen.
