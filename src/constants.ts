enum Role {
  user = "user",
  dj = "dj",
}
export interface AuthenticatedUser {
  uid: string;
  email?: string | null;
  name?: string | null;
  role: Role;
  needsPasswordChange?: boolean;
}

export { Role };