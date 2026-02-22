import { auth, auth as firebaseAuth } from "firebase-admin";
import { AuthenticatedUser } from "../constants";
import { Role } from "../constants";
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

  async register(
    authenticatedUser: AuthenticatedUser,
    email: string,
    password: string,
    role: Role = Role.staff
  ) {
    const roleAllowed: { [key: string]: Role[] } = {
      admin: [Role.manager, Role.staff],
      manager: [Role.staff],
    };

    if (!roleAllowed[authenticatedUser.role]?.includes(role)) {
      return { success: false, data: "Unauthorized" };
    }
    const userRecord = await this._auth.createUser({ email, password });
    if (userRecord) {
      await this._auth.setCustomUserClaims(userRecord.uid, {
        role: role,
        needsPasswordChange: true,
      });
      return { success: true, data: userRecord.uid };
    }
    return { success: false, data: "User registration failed" };
  }
}
