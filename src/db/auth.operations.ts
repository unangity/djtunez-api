import { auth, auth as firebaseAuth } from "firebase-admin";
import { UserIdentifier } from "firebase-admin/lib/auth/identifier";

export default class Auth {
  private _auth;

  constructor(auth: firebaseAuth.Auth) {
    this._auth = auth;
  }

  async verifyToken(token: string) {
    const decodedToken = await this._auth.verifyIdToken(token);
    return decodedToken;
  }

  async clearPasswordChangeFlag(uid: string) {
    const user = await this._auth.getUser(uid);
    const currentClaims = user.customClaims || {};
    await this._auth.setCustomUserClaims(uid, { ...currentClaims, needsPasswordChange: false });
    return { success: true };
  }

  async getUser(id: string) {
    const user = await this._auth.getUser(id);
    return user;
  }

  async getUsers(identifiers: UserIdentifier[]) {
    const users = await this._auth.getUsers(identifiers);
    // TODO: Get user from supabase
    return users;
  }

  async deleteUser(userID: string) {
    return this._auth.deleteUser(userID);
  }

  /**
   * Stamp role: 'dj' as a custom claim on a Firebase Auth user.
   * Merges with any existing claims so other flags (e.g. needsPasswordChange)
   * are preserved.
   */
  async setDJRole(uid: string) {
    const user = await this._auth.getUser(uid);
    const existing = user.customClaims ?? {};
    await this._auth.setCustomUserClaims(uid, { ...existing, role: 'dj' });
  }

}
