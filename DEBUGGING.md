# Why is my MongoDB empty?

Follow these steps to find the cause.

---

## 1. Confirm env vars on Vercel

- **Project** → **Settings** → **Environment Variables**
- You must have:
  - **MONGO_URL** – full connection string (e.g. `mongodb+srv://...` from Atlas → Connect → Node)
  - **DB_NAME** – database name (e.g. `WhatsAppAutomation` or `whatsapp`)
- Apply to **Production** (and Preview if you test preview deployments).
- **Redeploy** after changing env vars (Vercel does not apply them to existing builds).

---

## 2. Check that POST requests are received

- Send a **direct** (1:1) message **to** your WhatsApp Business number from your phone (not in a group).
- In Vercel: **Project** → **Logs** (or **Deployments** → open latest → **Functions**).
- Filter by **POST** and path `/api/whatsapp/webhook`.
- You should see a log line: `[WhatsApp] Incoming webhook event (POST)`.

If you never see that for the message you sent, the webhook is not getting the event (check Meta app, webhook URL, and “messages” subscription).

---

## 3. Interpret the new logs

After the latest deploy you will see one of these:

| Log message | Meaning |
|-------------|--------|
| `[WhatsApp] MongoDB not configured or connection failed...` | `MONGO_URL` is missing, wrong, or connection failed. Fix env and redeploy. |
| `[WhatsApp] Skipping group message (not stored)` | Message was from a group; we do not save those. Send a 1:1 message. |
| `[WhatsApp] MongoDB save error: <message> <code>` | Insert failed (e.g. auth, network, invalid DB name). Use the message/code to fix. |
| `[WhatsApp] Message saved to MongoDB` | Message was written to MongoDB. Check the DB name and collection `messages`. |

---

## 4. Typical causes

- **Env not applied:** Changed MONGO_URL/DB_NAME but did not redeploy.
- **Wrong DB name:** `DB_NAME` must match the database name in Atlas (e.g. `WhatsAppAutomation`).
- **Only group messages:** We only save 1:1 chats; group messages are skipped.
- **No POST requests:** Webhook not subscribed to “messages”, or message was status/delivery, not a user message.
- **Atlas IP / auth:** Ensure Atlas allows Vercel IPs (e.g. “Allow access from anywhere” for testing) and the user in the URI has read/write to that database.

---

## 5. Quick local test (optional)

With `MONGO_URL` and `DB_NAME` in `.env.local`:

```bash
npm run dev
```

Send a 1:1 test message and watch the terminal. You should see either “Message saved to MongoDB” or one of the error/skip messages above.
