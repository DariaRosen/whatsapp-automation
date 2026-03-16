/**
 * WhatsApp Cloud API Webhook
 * Endpoint: /api/whatsapp/webhook
 *
 * Webhook verification (GET):
 * When you register your webhook URL in Meta Developer Console, Meta sends a GET request
 * with hub.mode, hub.verify_token, and hub.challenge. We must return the challenge value
 * only if our verify token matches — this proves we own the endpoint and completes verification.
 */

import { getDb } from "../../../../lib/mongodb";

/** WhatsApp group JID suffix; messages with context.from ending in this are from groups. */
const GROUP_JID_SUFFIX = "@g.us";

/**
 * Returns true if the message was sent in a group (we ignore group messages and only store customer 1:1).
 */
function isGroupMessage(message) {
  const contextFrom = message.context?.from;
  if (!contextFrom || typeof contextFrom !== "string") return false;
  return contextFrom.endsWith(GROUP_JID_SUFFIX);
}

/**
 * GET handler — Webhook verification by Meta
 * Meta calls this when you set or update the webhook URL in the app dashboard.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  // Only respond with the challenge if the token matches and mode is "subscribe"
  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

/**
 * POST handler — Incoming WhatsApp events (messages, delivery/read updates)
 * Meta sends all webhook events here. We parse the payload and log message details.
 */
export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({ status: "error", message: "Invalid JSON" }, { status: 400 });
  }

  // Log the entire payload for debugging (shows in Vercel Logs → Messages for this POST request)
  console.log("[WhatsApp] Incoming webhook event (POST)");
  console.log("[WhatsApp] Full payload:", JSON.stringify(body, null, 2));

  // Safely traverse the webhook payload structure
  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const messages = value?.messages;

  // Handle cases where there is no messages array (e.g. delivery/read receipts, status updates)
  if (!messages || !Array.isArray(messages)) {
    return Response.json({ status: "received" });
  }

  const db = await getDb();
  const collectionName = "messages";

  for (const message of messages) {
    // Skip group messages; save only direct customer messages
    if (isGroupMessage(message)) {
      console.log("[WhatsApp] Skipping group message (not stored)");
      continue;
    }

    const phone = message.from;
    const type = message.type ?? "text";
    const text = message.text?.body ?? "";
    const timestamp = message.timestamp;
    const messageId = message.id;

    console.log("[WhatsApp] New message from:", phone);
    console.log("[WhatsApp] Message text:", text);
    if (timestamp != null) {
      console.log("[WhatsApp] Timestamp:", timestamp);
    }

    if (db) {
      try {
        await db.collection(collectionName).insertOne({
          from: phone,
          type,
          text,
          timestamp: timestamp ?? null,
          messageId: messageId ?? null,
          receivedAt: new Date(),
        });
        console.log("[WhatsApp] Message saved to MongoDB");
      } catch (err) {
        console.error("[WhatsApp] MongoDB save error:", err.message);
      }
    }
  }

  return Response.json({ status: "received" });
}
