# Troubleshooting Guide

## Discord OAuth Error: "500 Failed to connect Discord account"

### Possible Causes

#### 1. Missing Environment Variables ❌

**Check your `.env` file has all three Discord variables:**
```env
DISCORD_CLIENT_ID=1446603176932282450
DISCORD_CLIENT_SECRET=your_secret_here  ← REQUIRED!
DISCORD_BOT_TOKEN=your_bot_token_here
```

**How to get Client Secret:**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications/1446603176932282450)
2. Click on your application
3. Go to **OAuth2** → **General**
4. Click **Reset Secret** (if you don't have it)
5. Copy the secret immediately (you can't see it again!)
6. Add to `.env` file

#### 2. Wrong OAuth Scopes ❌

**Your URL is missing `identify` scope!**

❌ **Wrong** (what you have):
```
https://discord.com/oauth2/authorize?client_id=1446603176932282450&response_type=code&redirect_uri=https%3A%2F%2Fevent-launchpad-nu.vercel.app%2Fapi%2Fauth%2Fdiscord%2Fcallback&scope=guilds+guilds.members.read
```

✅ **Correct** (what you need):
```
https://discord.com/oauth2/authorize?client_id=1446603176932282450&response_type=code&redirect_uri=https%3A%2F%2Fevent-launchpad-nu.vercel.app%2Fapi%2Fauth%2Fdiscord%2Fcallback&scope=identify+guilds+guilds.members.read
```

**The `identify` scope is required to get user's Discord ID!**

#### 3. Database Connection Issue ❌

**Check Supabase configuration:**
```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Verify `social_connections` table exists:**
1. Go to Supabase Dashboard
2. Click **Table Editor**
3. Look for `social_connections` table
4. If missing, run the SQL from `src/lib/db schema`

#### 4. Redirect URI Mismatch ❌

**In Discord Developer Portal:**
1. Go to **OAuth2** → **General**
2. Under **Redirects**, you should have:
   - `http://localhost:5173/api/auth/discord/callback` (for local dev)
   - `https://event-launchpad-nu.vercel.app/api/auth/discord/callback` (for production)

**Make sure the URL matches EXACTLY** (including protocol and port)

---

## How to Debug

### Step 1: Check Server Logs

When you click "Connect Discord" and get the error, check your server console for logs:

```
Exchanging Discord code for token...
Discord OAuth not configured: { hasClientId: true, hasClientSecret: false }
```

This tells you exactly what's missing!

### Step 2: Test Environment Variables

Create a test endpoint to verify your env vars are loaded:

```typescript
// src/routes/api/test/env/+server.ts
import { json } from '@sveltejs/kit';

export async function GET() {
  return json({
    hasDiscordClientId: !!process.env.DISCORD_CLIENT_ID,
    hasDiscordClientSecret: !!process.env.DISCORD_CLIENT_SECRET,
    hasDiscordBotToken: !!process.env.DISCORD_BOT_TOKEN,
    hasTelegramBotToken: !!process.env.TELEGRAM_BOT_TOKEN,
    hasSupabaseUrl: !!process.env.PUBLIC_SUPABASE_URL,
  });
}
```

Visit: `http://localhost:5173/api/test/env`

Expected result:
```json
{
  "hasDiscordClientId": true,
  "hasDiscordClientSecret": true,
  "hasDiscordBotToken": true,
  "hasTelegramBotToken": true,
  "hasSupabaseUrl": true
}
```

### Step 3: Test Discord OAuth Manually

Use this URL (replace with your values):
```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost:5173/api/auth/discord/callback&scope=identify+guilds+guilds.members.read&state=test123
```

After authorizing, Discord will redirect to:
```
http://localhost:5173/api/auth/discord/callback?code=SOME_CODE&state=test123
```

Check your server logs for detailed error messages.

---

## Common Error Messages

### "Discord OAuth is not configured"
**Cause**: Missing `DISCORD_CLIENT_ID` or `DISCORD_CLIENT_SECRET`
**Fix**: Add both to `.env` file and restart server

### "Invalid state parameter"
**Cause**: State cookie expired or CSRF protection triggered
**Fix**: Clear cookies and try again

### "Failed to exchange code for token"
**Cause**: Wrong client secret or redirect URI mismatch
**Fix**: 
1. Verify client secret is correct
2. Check redirect URI matches exactly in Discord portal

### "Failed to fetch user info"
**Cause**: Missing `identify` scope
**Fix**: Add `identify` to the scope parameter in OAuth URL

### "Database error"
**Cause**: `social_connections` table doesn't exist or wrong schema
**Fix**: Run the database schema SQL

---

## Quick Fix Checklist

- [ ] `.env` file exists in project root
- [ ] `DISCORD_CLIENT_ID` is set
- [ ] `DISCORD_CLIENT_SECRET` is set (not the same as Client ID!)
- [ ] `DISCORD_BOT_TOKEN` is set
- [ ] Server restarted after adding env vars
- [ ] OAuth URL includes `identify` scope
- [ ] Redirect URI matches in Discord portal
- [ ] `social_connections` table exists in database
- [ ] Supabase credentials are correct

---

## Still Not Working?

1. **Check the exact error** in server console logs
2. **Test with the URL** from your backend (click "Connect Discord" button, don't use manually generated URL)
3. **Verify all environment variables** are loaded correctly
4. **Check database** has the `social_connections` table
5. **Clear cookies** and try again

If you see specific error messages in the console, they will tell you exactly what's wrong!
