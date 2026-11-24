import path from 'node:path';

export type TestRole = 'admin' | 'employee';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} to run the browser tests (see README).`);
  return value;
}

/** Existing accounts that have already changed their first password. Never commit their passwords. */
export function account(role: TestRole) {
  return role === 'admin'
    ? { email: env('E2E_ADMIN_EMAIL'), password: env('E2E_ADMIN_PASSWORD'), home: '/dashboard' }
    : { email: env('E2E_EMPLOYEE_EMAIL'), password: env('E2E_EMPLOYEE_PASSWORD'), home: '/my-assets' };
}

/** Saved cookies per role (git-ignored). */
export const statePath = (role: TestRole) => path.join(__dirname, '.auth', `${role}.json`);
