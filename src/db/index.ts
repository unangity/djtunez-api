import admin from "firebase-admin";
import Auth from "./auth.operations";
import "dotenv/config";

const databaseURL =
  process.env.NODE_ENV === "production"
    ? `https://${process.env.GOOGLE_CLOUD_PROJECT}-default-rtdb.firebaseio.com`
    : process.env.FIREBASE_DATABASE_URL ||
      `http://127.0.0.1:9000/?ns=${process.env.GOOGLE_CLOUD_PROJECT || "djtunez"}-default-rtdb`;

try {
  admin.initializeApp({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    storageBucket:
      process.env.NODE_ENV === "production"
        ? `${process.env.GOOGLE_CLOUD_PROJECT}.appspot.com`
        : "127.0.0.1:9199",
    databaseURL,
  });
  console.log("Firebase connection has been initialized");
} catch (error: any) {
  if (!/already exists/u.test(error.message)) {
    console.error("Firebase admin initialization error", error.stack);
  }
}

export default class DB {
  private _auth;
  constructor() {
    this._auth = admin.auth();
  }

  get auth() {
    return new Auth(this._auth);
  }

  get rtdb() {
    return admin.database()
  }
}
