export type UserRole = 'super_admin' | 'admin' | 'user';

/** A user as returned by `/users` and as a loaded relation on other entities. */
export interface User {
  id: number;
  name: string;
  email: string;
  department: string | null;
  designation: string | null;
  role: UserRole;
  mustChangePassword: boolean;
  isActive: boolean;
}

/** Employee-facing endpoints trim staff relations to `{ id, name }`. */
export type UserRef = Pick<User, 'id' | 'name'>;

/** The user returned by login, refresh, `/auth/profile` and password change (`{ user }`). */
export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department: string | null;
  designation: string | null;
  mustChangePassword: boolean;
}
