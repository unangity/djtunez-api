import admin from "firebase-admin";
import Auth from "./auth.operations";
import "dotenv/config";

export default class DB {
  private _bucket;
  private _auth;
  constructor() {
    // TODO: No need for serviceKey in production
    try {
      admin.initializeApp({
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
        storageBucket: process.env.NODE_ENV === "production"
          ? `${process.env.GOOGLE_CLOUD_PROJECT}.appspot.com`
          : "127.0.0.1:9199",
      });
      console.log("Firebase connection has been initialized");
    } catch (error: any) {
      if (!/already exists/u.test(error.message)) {
        console.error("Firebase admin initialization error", error.stack);
      }
    }
    this._bucket = admin.storage().bucket();
    this._auth = admin.auth();
  }

  get auth() {
    return new Auth(this._auth);
  }
}
