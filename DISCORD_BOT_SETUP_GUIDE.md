# Discord Bot Setup Guide

## Overview
Complete implementation of Discord bot setup flow for event creators. The bot must be added to the creator's server to verify participant membership.

## How It Works

### Architecture
```
Creator's Flow:
1. Connect Discord account (OAuth)
2. Select their server from list
3. Add verification bot to their server
4. Bot verifies membership when participants complete tasks

Participant's Flow:
1. Connect Discord account (OAuth)
2. Join creator's Discord server
3. Click "Confirm" on task
4. Bot checks if participant is in creator's server
5. Task marked complete if verified
```

### Why This Design?

**❌ Wrong Approach**: Bot in your server
- Can't access other servers' member lists
- No way to verify participants

**✅ Correct Approach**: Bot in creator's server
- Bot can check member list of that specific server
- Verifies if participant (by Discord user ID) is a member
- Works for any number of events/servers

## Implementation

### 1. Event Creation Form

**Discord Setup Section** (only shows if Discord task is added):

**Step 1: Connect Discord**
- Button: "Connect Discord"
- OAuth flow → Returns to same page
- Shows ✓ when connected

**Step 2: Select Server**
- Dropdown of user's servers (admin/owner only)
- Filters to servers where user has permissions
- Stores selected guild ID and name

**Step 3: Add Bot to Server**
- Shows bot invite link
- Opens in new tab
- After adding, user clicks "Verify Bot Added"
- Backend checks if bot is in guild
- Shows ✓ when verified

**Form Submission**:
- Disabled until all 3 steps complete
- Shows warning if incomplete
- Stores guild ID in Discord task config

### 2. API Endpoints

#### `/api/auth/discord/status` (GET)
Returns user's Discord connection status and guilds.

**Response**:
```json
{
  "connected": true,
  "guilds": [
    {
      "id": "123456789",
      "name": "My Server",
      "owner": true,
      "permissions": "2147483647"
    }
  ]
}
```

**Filters**:
- Only guilds where user is owner OR has ADMINISTRATOR/MANAGE_GUILD permissions
- Ensures user can add bot to server

#### `/api/auth/discord/verify-bot` (POST)
Checks if bot is in specified guild.

**Request**:
```json
{
  "guildId": "123456789"
}
```

**Response**:
```json
{
  "botInGuild": true
}
```

**How It Works**:
- Uses bot token to call Discord API
- `GET /guilds/{guild_id}` with bot auth
- 404 = bot not in guild
- 200 = bot is in guild

### 3. Bot Invite URL

**Format**:
```
https://discord.com/oauth2/authorize?client_id=BOT_CLIENT_ID&permissions=268437504&scope=bot
```

**Permissions** (268437504):
- View Channels
- Read Messages/View Channels
- Read Message History
- View Server Members (required for verification)

**Scopes**:
- `bot` - Adds bot to server

### 4. Discord Task Config

When event is created with Discord task, store:
```json
{
  "type": "discord",
  "config": {
    "action": "join",
    "serverId": "123456789",
    "serverName": "My Server",
    "inviteUrl": "https://discord.gg/abc123" // optional
  }
}
```

### 5. Participant Verification

When participant clicks "Confirm":

1. **Check Connection**:
   - Does participant have Discord connected?
   - If not, show "Connect Discord" button

2. **Verify Membership**:
   ```typescript
   // Using bot token
   GET /guilds/{guild_id}/members/{user_id}
   ```
   - 200 = User is member ✓
   - 404 = User not in server ✗

3. **Mark Complete**:
   - If verified, save to `task_submissions`
   - Show ✓ Done badge

## Environment Variables

```env
# Discord OAuth (for user connections)
DISCORD_CLIENT_ID=your_oauth_client_id
DISCORD_CLIENT_SECRET=your_oauth_client_secret

# Discord Bot (for verification)
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_BOT_CLIENT_ID=your_bot_client_id
```

## Setting Up Discord Bot

### 1. Create Discord Application
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it (e.g., "Event Launchpad Verifier")

### 2. Create Bot
1. Go to "Bot" tab
2. Click "Add Bot"
3. Copy bot token → `DISCORD_BOT_TOKEN`
4. Enable "Server Members Intent" (required!)
5. Enable "Message Content Intent" (optional)

### 3. Get Client IDs
1. Go to "OAuth2" → "General"
2. Copy "Client ID" → `DISCORD_CLIENT_ID` (for OAuth)
3. Copy "Client ID" → `DISCORD_BOT_CLIENT_ID` (for bot invite)

### 4. Configure OAuth2
1. Go to "OAuth2" → "General"
2. Add redirect URI: `https://yourdomain.com/api/auth/discord/callback`
3. For local dev: `http://localhost:5173/api/auth/discord/callback`

### 5. Bot Permissions
Required permissions for bot:
- ✅ View Channels
- ✅ Read Messages/View Channels  
- ✅ Read Message History
- ✅ View Server Members (CRITICAL)

Permission integer: `268437504`

## User Experience

### Creator Experience
```
1. Creating event with Discord task
2. Form shows: "🤖 Discord Bot Setup Required"
3. Step 1: Connect Discord → OAuth → ✓
4. Step 2: Select "My Gaming Server" → ✓
5. Step 3: Click "Add Bot to Server"
   - Opens Discord
   - Shows: "Add Event Launchpad Verifier to My Gaming Server?"
   - Clicks "Authorize"
   - Returns to form
   - Clicks "Verify Bot Added" → ✓
6. "Create Event" button now enabled
7. Submits event
```

### Participant Experience
```
1. Joins event
2. Sees Discord task: "Join My Gaming Server"
3. Not connected → Shows "Connect Discord"
4. Clicks connect → OAuth → Returns
5. Now shows "Confirm" button
6. Clicks Confirm → Verifying...
7. Backend checks: Is user in guild 123456789?
8. If yes → ✓ Done
9. If no → Error: "Please join the server first"
```

## Security Considerations

### Bot Token Security
- ✅ Store in environment variable
- ✅ Never expose to client
- ✅ Use server-side only
- ✅ Rotate if compromised

### OAuth Security
- ✅ State parameter for CSRF
- ✅ HttpOnly cookies
- ✅ Validate redirect URIs
- ✅ Check token expiration

### Permission Validation
- ✅ Only show admin/owner guilds
- ✅ Verify bot has required permissions
- ✅ Check user can actually add bot

## Troubleshooting

### "Bot not found in server"
**Causes**:
- Bot wasn't actually added
- Wrong guild ID selected
- Bot was removed after adding

**Solutions**:
- Re-add bot using invite link
- Verify correct server selected
- Check bot is still in server

### "Failed to fetch guilds"
**Causes**:
- Discord token expired
- Invalid OAuth token
- Discord API down

**Solutions**:
- Reconnect Discord account
- Check token expiration
- Retry after delay

### "Participant verification failed"
**Causes**:
- Participant not in server
- Participant left server
- Bot removed from server
- Bot missing permissions

**Solutions**:
- Participant joins server
- Creator re-adds bot
- Check bot has "View Server Members" permission

## Testing Checklist

### Creator Setup
- [ ] Connect Discord account
- [ ] See list of owned/admin servers
- [ ] Select server from dropdown
- [ ] Click bot invite link
- [ ] Add bot to server
- [ ] Verify bot added successfully
- [ ] Create event button enabled
- [ ] Event created with guild ID

### Participant Verification
- [ ] See Discord task
- [ ] Connect Discord (if not connected)
- [ ] Join creator's server
- [ ] Click Confirm
- [ ] Verification succeeds
- [ ] Task marked complete
- [ ] Try without joining → Fails

### Edge Cases
- [ ] Creator has no servers → Show message
- [ ] Token expired → Prompt reconnect
- [ ] Bot removed → Show error
- [ ] Multiple Discord tasks → Each has own guild

## Future Enhancements

1. **Role Verification**: Check if user has specific role
2. **Activity Verification**: Check message count, join date
3. **Auto-Invite**: Generate server invite for participants
4. **Batch Verification**: Verify all participants at once
5. **Webhook Integration**: Real-time verification via webhooks
6. **Multi-Server**: Support multiple Discord servers per event
