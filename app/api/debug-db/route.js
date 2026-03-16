/**
 * GET /api/debug-db — Check why MongoDB might be empty.
 * Returns env and connection status (no secrets). Remove or restrict in production.
 */

import { getDb } from "../../../lib/mongodb";

export async function GET() {
  const mongoUrlSet = !!(process.env.MONGO_URL || process.env.MONGODB_URI);
  const dbNameSet = !!process.env.DB_NAME;
  const dbNameUsed = process.env.DB_NAME || "(default from connection string)";

  if (!mongoUrlSet) {
    return Response.json({
      ok: false,
      mongoUrlSet: false,
      dbNameSet,
      dbNameUsed,
      connection: "skipped",
      message: "Set MONGO_URL (or MONGODB_URI) in Vercel Environment Variables, then redeploy.",
    });
  }

  try {
    const db = await getDb();
    if (!db) {
      return Response.json({
        ok: false,
        mongoUrlSet: true,
        dbNameSet,
        dbNameUsed,
        connection: "failed",
        message: "getDb() returned null. Check MONGO_URL is valid.",
      });
    }

    await db.command({ ping: 1 });
    const collections = await db.listCollections().toArray();
    const messageCount = await db.collection("messages").countDocuments();

    return Response.json({
      ok: true,
      mongoUrlSet: true,
      dbNameSet,
      dbNameUsed,
      connection: "ok",
      collections: collections.map((c) => c.name),
      messagesInCollection: messageCount,
    });
  } catch (err) {
    return Response.json({
      ok: false,
      mongoUrlSet: true,
      dbNameSet,
      dbNameUsed,
      connection: "failed",
      error: err.message,
      code: err.code || "",
      message:
        "Connection or permission error. Check Atlas: IP allowlist (0.0.0.0/0 for Vercel), user has read/write, DB name matches DB_NAME.",
    });
  }
}
