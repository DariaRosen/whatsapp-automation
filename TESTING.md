# How to Test the WhatsApp Webhook & Receive Messages

Meta’s servers must be able to reach your webhook. `localhost` is not reachable from the internet, so you need a **public URL** (tunnel or deployed app).

---

## Option A: Test locally with ngrok (recommended for development)

### 1. Install ngrok

- Download from [ngrok.com](https://ngrok.com) or run: `npm install -g ngrok`

### 2. Start your app and ngrok

```bash
# Terminal 1: run your app
npm run dev
```

```bash
# Terminal 2: expose port 3000
ngrok http 3000
```

Copy the **HTTPS** URL ngrok shows (e.g. `https://abc123.ngrok.io`). Your webhook URL will be:

**`https://YOUR-NGROK-URL.ngrok.io/api/whatsapp/webhook`**

### 3. Fix your `.env.local`

- **WHATSAPP_VERIFY_TOKEN** = A short secret **you choose** (e.g. `webicon_whatsapp_token`). You will type this same value in Meta’s webhook form.
- Do **not** put your long Meta access token here. If you have an access token, use a different variable (e.g. `WHATSAPP_ACCESS_TOKEN`) for sending messages later.

Example `.env.local`:

```env
# Short string you choose; same value goes in Meta webhook configuration
WHATSAPP_VERIFY_TOKEN=webicon_whatsapp_token
```

### 4. Configure the webhook in Meta

1. Go to [developers.facebook.com](https://developers.facebook.com) → your app → **WhatsApp** → **Configuration**.
2. Under **Webhook**, click **Edit**.
3. **Callback URL:** `https://YOUR-NGROK-URL.ngrok.io/api/whatsapp/webhook`
4. **Verify token:** exactly the same as `WHATSAPP_VERIFY_TOKEN` (e.g. `webicon_whatsapp_token`).
5. Click **Verify and save** (Meta will send a GET request; your route will return the challenge and verification will succeed).
6. Click **Manage** and subscribe to **messages** (and any other fields you need).

### 5. Receive a message

- Use the **WhatsApp** → **API Setup** test number, or connect your own number.
- Send a message **to** that WhatsApp Business number from your personal WhatsApp.
- Meta will POST the event to your webhook. You’ll see:
  - In the terminal where `npm run dev` is running: the logged payload and “New message from: …”, “Message text: …”.
  - Response from your API: `{ "status": "received" }`.

**Note:** Each time you restart ngrok (free tier), the URL changes — update the callback URL in Meta to the new ngrok URL.

---

## Option B: Deploy to Vercel

1. Push your code to GitHub and import the repo in [Vercel](https://vercel.com).
2. In the Vercel project, add **Environment variable**: `WHATSAPP_VERIFY_TOKEN` = your chosen verify token (e.g. `webicon_whatsapp_token`).
3. Deploy. Your webhook URL will be: **`https://YOUR-PROJECT.vercel.app/api/whatsapp/webhook`**
4. In Meta → WhatsApp → Configuration → Webhook, set:
   - **Callback URL:** `https://YOUR-PROJECT.vercel.app/api/whatsapp/webhook`
   - **Verify token:** same as `WHATSAPP_VERIFY_TOKEN`
5. Verify and save, then subscribe to **messages**.
6. Send a message to your WhatsApp Business number; check **Vercel → Project → Logs** (or **Functions**) to see the webhook logs.

---

## Quick checklist

| Step | What to do |
|------|------------|
| 1 | Public URL (ngrok or Vercel) |
| 2 | `WHATSAPP_VERIFY_TOKEN` in `.env.local` / Vercel = short secret you choose |
| 3 | Meta webhook: Callback URL = `https://.../api/whatsapp/webhook`, Verify token = same as above |
| 4 | Subscribe to “messages” in webhook subscription |
| 5 | Send a WhatsApp message to your Business number → see logs in terminal or Vercel |
