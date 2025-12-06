# Discord OAuth Flow - Complete Guide

This document explains the correct Discord OAuth implementation for the Event Launchpad platform.

## Overview

There are **TWO different OAuth flows** in Discord:
1. **User OAuth** - Get user's Discord ID and their servers
2. **Bot Authorization** - Add bot to a specific server

## The Complete Flow (3 Steps)

### **STEP 1: Creator Connects Discord (User OAuth)** ✅

**Purpose**: Get the creator's Discord user ID and list of servers they manage

**OAuth URL**:
```
https://discord.com/api/oauth2/authorize
  ?client_id=YOUR_CLIENT_ID
  &response_type=code
  &redirect_uri=https://yourdomain.com/api/auth/discord/callback
  &scope=identify+guilds+guilds.members.read
  &state=RANDOM_STATE_TOKEN
```

**Scopes Explained**:
- `identify` - Get user's Discord ID, username, avatar
- `guilds` - Get list of servers user is in
- `guilds.members.read` - Read member info (needed for verification later)

**What Happens**:
1. Creator clicks "Connect Discord"
2. Redirected to Discord OAuth page
3. User authorizes your app
4. Discord redirects back with `code`
5. Your backend exchanges `code` for `access_token`
6. Use `access_token` to call:
   - `GET /users/@me` → Get user's Discord ID
   - `GET /users/@me/guilds` → Get list of servers

**What You Store**:
```json
{
  "userId": "your_internal_user_id",
  "discordId": "123456789012345678",
  "discordUsername": "username#1234",
  "discordAvatar": "avatar_hash"
}
```

---

### **STEP 2: Creator Adds Bot to Their Server** ✅

**Purpose**: Add your platform's bot to the creator's selected Discord server

**Bot Authorization URL**:
```
https://discord.com/oauth2/authorize
  ?client_id=YOUR_BOT_CLIENT_ID
  &permissions=268435456
  &scope=bot
  &guild_id=SELECTED_GUILD_ID  ← Pre-select the server
```

**Permissions Explained**:
- `268435456` = Read Members + Read Messages (adjust as needed)

**What Happens**:
1. Creator selects a server from dropdown (from Step 1)
2. Clicks "Add Bot to Server"
3. Opens Discord bot authorization page
4. Server is pre-selected (via `guild_id` parameter)
5. Creator authorizes bot
6. Bot joins the server
7. Creator returns to your app
8. Clicks "Verify Bot Added"
9. Your backend calls Discord API to confirm bot is in server

**What You Store**:
```json
{
  "taskId": "task_123",
  "discordServerId": "987654321098765432",
  "discordServerName": "My Gaming Server",
  "inviteLink": "https://discord.gg/abc123"
}
```

**Backend Verification**:
```typescript
// Check if bot is in the guild
const response = await fetch(
  `https://discord.com/api/v10/guilds/${guildId}`,
  {
    headers: {
      'Authorization': `Bot ${DISCORD_BOT_TOKEN}`
    }
  }
);

if (response.ok) {
  // Bot is in the guild ✓
} else if (response.status === 404) {
  // Bot not in guild ✗
}
```

---

### **STEP 3: Participant Verification** ✅

**Purpose**: Verify that a participant is a member of the Discord server

**What Happens**:
1. Participant completes the task (joins Discord server)
2. Participant clicks "Verify Discord Task"
3. If not connected: Redirect to Discord OAuth (same as Step 1)
4. If connected: Your backend verifies membership

**Backend Verification**:
```typescript
// Check if user is a member of the guild
const response = await fetch(
  `https://discord.com/api/v10/guilds/${guildId}/members/${userDiscordId}`,
  {
    headers: {
      'Authorization': `Bot ${DISCORD_BOT_TOKEN}`
    }
  }
);

if (response.ok) {
  // User is a member ✓
  const member = await response.json();
  // Can also check: joined_at, roles, etc.
} else if (response.status === 404) {
  // User is not a member ✗
}
```

---

## Key Differences

### User OAuth vs Bot Authorization

| Aspect | User OAuth | Bot Authorization |
|--------|-----------|-------------------|
| **Purpose** | Get user info & their servers | Add bot to a server |
| **Client ID** | Your app's client ID | Same client ID |
| **Scope** | `identify guilds` | `bot` |
| **Response Type** | `code` (OAuth flow) | Direct authorization |
| **Redirect URI** | `/api/auth/discord/callback` | No callback needed |
| **Returns** | Access token | Bot joins server |

---

## Implementation Checklist

### Environment Variables
```env
DISCORD_CLIENT_ID=1446603176932282450
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_BOT_TOKEN=your_bot_token
```

### Discord Developer Portal Setup

1. **OAuth2 → General**:
   - ✅ Add redirect URI: `http://localhost:5173/api/auth/discord/callback`
   - ✅ Add redirect URI: `https://yourdomain.com/api/auth/discord/callback`

2. **Bot**:
   - ✅ Enable "Server Members Intent"
   - ✅ Copy bot token

3. **OAuth2 → URL Generator** (for testing):
   - Scopes: `identify`, `guilds`, `guilds.members.read`
   - Generate URL and test

---

## Common Mistakes ❌

### ❌ Wrong: Using Bot Authorization for User OAuth
```
https://discord.com/oauth2/authorize
  ?client_id=YOUR_CLIENT_ID
  &scope=bot  ← Wrong! This adds bot, doesn't get user info
```

### ❌ Wrong: Wrong Redirect URI
```
redirect_uri=https://yourdomain.com/projects/create-event  ← Wrong!
```
**Correct**: `redirect_uri=https://yourdomain.com/api/auth/discord/callback`

### ❌ Wrong: Missing Scopes
```
scope=identify  ← Missing guilds scope!
```
**Correct**: `scope=identify+guilds+guilds.members.read`

### ❌ Wrong: Using User Token for Bot API Calls
```typescript
// Wrong: Using user's access token
headers: { 'Authorization': `Bearer ${userAccessToken}` }
```
**Correct**: Use bot token
```typescript
headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` }
```

---

## Testing the Flow

### 1. Test User OAuth
```bash
# Visit this URL (replace YOUR_CLIENT_ID)
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost:5173/api/auth/discord/callback&scope=identify+guilds+guilds.members.read
```

**Expected Result**:
- See Discord authorization page
- Shows your app name
- Lists permissions: "Access your username and avatar", "Know what servers you're in"
- After authorization, redirects to callback
- Console shows: User's Discord ID and list of guilds

### 2. Test Bot Authorization
```bash
# Visit this URL (replace YOUR_CLIENT_ID and GUILD_ID)
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=268435456&scope=bot&guild_id=GUILD_ID
```

**Expected Result**:
- See Discord bot authorization page
- Server is pre-selected
- Shows permissions: "Read Messages/View Channels", "Read Message History"
- After authorization, bot appears in server member list

### 3. Test Verification
```bash
# Your backend should call
GET https://discord.com/api/v10/guilds/{guildId}/members/{userId}
Authorization: Bot YOUR_BOT_TOKEN
```

**Expected Result**:
- Returns 200 with member data if user is in server
- Returns 404 if user is not in server

---

## Security Best Practices

1. **Always validate state parameter** in OAuth callback
2. **Never expose bot token** in frontend code
3. **Use HTTPS in production** for redirect URIs
4. **Store tokens securely** (encrypted in database)
5. **Implement token refresh** for long-lived sessions
6. **Rate limit API calls** to avoid Discord rate limits

---

## Troubleshooting

### "Invalid OAuth2 redirect_uri"
- Check that redirect URI in code **exactly matches** what's in Discord Developer Portal
- Include protocol (`http://` or `https://`)
- Include port for localhost (`:5173`)

### "Bot not found in server"
- Make sure bot was actually added (check server member list)
- Verify bot token is correct
- Check that bot has "Server Members Intent" enabled

### "Missing Access"
- Bot needs proper permissions in the server
- User needs proper permissions to add bot
- Check that scopes include `guilds.members.read`

---

## Summary

✅ **Step 1**: User OAuth → Get Discord ID + Servers
✅ **Step 2**: Bot Authorization → Add bot to selected server
✅ **Step 3**: Bot API → Verify user membership

This flow ensures:
- You know who the user is (Discord ID)
- Your bot is in the server (can verify members)
- You can check if user joined the server (membership verification)
