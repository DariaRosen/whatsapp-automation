/**
 * MongoDB client for Vercel serverless.
 * Reuses a single connection across invocations to avoid exhausting connections.
 * Uses MONGO_URL (or MONGODB_URI) and DB_NAME. If no URL is set, getDb() returns null.
 */

import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URL || process.env.MONGODB_URI;
const options = {};

let clientPromise = null;

if (uri) {
  if (process.env.NODE_ENV === "development" && global._mongoClientPromise) {
    clientPromise = global._mongoClientPromise;
  } else {
    const client = new MongoClient(uri, options);
    clientPromise = client.connect();
    if (process.env.NODE_ENV === "development") {
      global._mongoClientPromise = clientPromise;
    }
  }
}

/** @returns {Promise<import('mongodb').Db | null>} */
export async function getDb() {
  if (!clientPromise) return null;
  const client = await clientPromise;
  const dbName = process.env.DB_NAME;
  return dbName ? client.db(dbName) : client.db();
}

export default clientPromise;
