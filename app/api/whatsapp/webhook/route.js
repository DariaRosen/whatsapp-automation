/**
 * WhatsApp Cloud API Webhook
 * Endpoint: /api/whatsapp/webhook
 *
 * Stores only INCOMING messages (customers → business) as leads.
 * One document per customer (phone), with conversation history.
 * Ignores: group messages, echo/outgoing messages.
 */

import { getDb } from "../../../../lib/mongodb";

const COLLECTION_LEADS = "leads";

/** WhatsApp group JID suffix; messages with context.from ending in this are from groups. */
const GROUP_JID_SUFFIX = "@g.us";

/**
 * Returns true if the message was sent in a group (we ignore group messages).
 */
function isGroupMessage(message) {
  const contextFrom = message.context?.from;
  if (!contextFrom || typeof contextFrom !== "string") return false;
  return contextFrom.endsWith(GROUP_JID_SUFFIX);
}

/**
 * Returns true if the message is an echo (sent BY the business) — do not store.
 */
function isEchoOrOutgoing(message) {
  return message.echo === true;
}

/**
 * Get customer name from webhook value.contacts (matched by wa_id === message.from).
 */
function getCustomerName(value, fromPhone) {
  const contacts = value?.contacts;
  if (!Array.isArray(contacts)) return null;
  const contact = contacts.find((c) => String(c.wa_id) === String(fromPhone));
  return contact?.profile?.name ?? null;
}

/**
 * GET handler — Webhook verification by Meta
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

/**
 * POST handler — Incoming WhatsApp events.
 * Only stores messages sent FROM customers TO the business (one lead per phone, conversation history).
 */
export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({ status: "error", message: "Invalid JSON" }, { status: 400 });
  }

  console.log("[WhatsApp] Incoming webhook event (POST)");

  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const messages = value?.messages;

  if (!messages || !Array.isArray(messages)) {
    return Response.json({ status: "received" });
  }

  const db = await getDb();
  if (!db) {
    console.warn("[WhatsApp] MongoDB not configured. Set MONGO_URL (and DB_NAME) in Vercel env.");
    return Response.json({ status: "received" });
  }

  const collection = db.collection(COLLECTION_LEADS);

  for (const message of messages) {
    if (isGroupMessage(message)) {
      console.log("[WhatsApp] Skipping group message");
      continue;
    }
    if (isEchoOrOutgoing(message)) {
      console.log("[WhatsApp] Skipping echo/outgoing message (sent by business)");
      continue;
    }

    const phone = String(message.from);
    const name = getCustomerName(value, phone) ?? null;
    const text = message.text?.body ?? "";
    const timestamp = message.timestamp ?? null;
    const messageId = message.id ?? null;

    if (!text.trim()) continue;

    console.log("[WhatsApp] Incoming from:", phone, "name:", name || "(none)", "text:", text.slice(0, 50));

    const conversationEntry = {
      text,
      timestamp,
      messageId,
      receivedAt: new Date(),
    };

    try {
      const existing = await collection.findOne({ phone });

      if (!existing) {
        await collection.insertOne({
          phone,
          name,
          firstMessageText: text,
          firstMessageTimestamp: timestamp,
          conversation: [conversationEntry],
          updatedAt: new Date(),
        });
        console.log("[WhatsApp] New lead saved:", phone);
      } else {
        await collection.updateOne(
          { phone },
          {
            $push: { conversation: conversationEntry },
            $set: {
              updatedAt: new Date(),
              ...(name != null && name !== "" && { name }),
            },
          }
        );
        console.log("[WhatsApp] Lead updated, message appended:", phone);
      }
    } catch (err) {
      console.error("[WhatsApp] DB error:", err.message, err.code || "");
    }
  }

  return Response.json({ status: "received" });
}
