/**
 * WhatsApp Cloud API Webhook
 * Endpoint: /api/whatsapp/webhook
 *
 * Webhook verification (GET):
 * When you register your webhook URL in Meta Developer Console, Meta sends a GET request
 * with hub.mode, hub.verify_token, and hub.challenge. We must return the challenge value
 * only if our verify token matches — this proves we own the endpoint and completes verification.
 */

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

  // Log the entire payload for debugging
  console.log("Incoming WhatsApp webhook event");
  console.log(JSON.stringify(body, null, 2));

  // Safely traverse the webhook payload structure
  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const messages = value?.messages;

  // Handle cases where there is no messages array (e.g. delivery/read receipts, status updates)
  if (!messages || !Array.isArray(messages)) {
    return Response.json({ status: "received" });
  }

  for (const message of messages) {
    const phone = message.from;
    const text = message.text?.body ?? "";
    const timestamp = message.timestamp;

    console.log("New message from:", phone);
    console.log("Message text:", text);
    if (timestamp != null) {
      console.log("Timestamp:", timestamp);
    }
  }

  return Response.json({ status: "received" });
}
