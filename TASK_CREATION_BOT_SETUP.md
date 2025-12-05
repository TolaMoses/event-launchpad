# Task Creation Bot Setup Guide

## Overview
When creators add Discord or Telegram tasks during event creation, they must now complete bot setup before saving the task. This ensures the verification system works properly.

## Discord Task Creation Flow

### UI Components
When creator checks "Join Discord server":

**Step 1: Connect Discord Account**
- Button: "Connect Discord"
- OAuth flow → Returns to task creation
- Shows ✓ when connected

**Step 2: Select Server**
- Dropdown shows all servers where user is admin/owner
- Creator selects which server participants must join
- Server ID and name stored in task config
- Shows ✓ when selected

**Step 3: Add Bot to Server**
- "Add Bot to Server" button
- Opens Discord authorization in new tab
- Bot gets added with "View Server Members" permission
- Creator returns and clicks "Verify Bot Added"
- Backend checks if bot is in the selected server
- Shows ✓ when verified

**Save Button**
- Disabled until all 3 steps complete
- Warning message if incomplete

### What Gets Stored
```json
{
  "discord": {
    "joinServer": true,
    "serverId": "123456789",
    "serverName": "My Gaming Server",
    "inviteLink": "https://discord.gg/abc123"
  }
}
```

## Telegram Task Creation Flow

### UI Components
When creator checks "Join channel" or "Join group":

**Bot Setup Instructions**
Shows a box with:
- Bot username (fetched from API): `@YourBotUsername`
- Step-by-step instructions:
  1. Open your Telegram channel/group
  2. Go to Settings → Administrators
  3. Click "Add Administrator"
  4. Search for `@YourBotUsername`
  5. Add bot with "View Members" permission

**Channel/Group ID Input**
- Text field for channel ID or @username
- Helper text: "Find your ID using @userinfobot in Telegram"
- Examples: `@yourchannel` or `-1001234567890`

**Verify Bot Button**
- Disabled until channel ID entered
- Clicks "Verify Bot Added"
- Backend checks if bot is in the channel/group
- Shows ✓ when verified

**Save Button**
- Disabled until bot verified
- Warning message if incomplete

### What Gets Stored
```json
{
  "telegram": {
    "joinChannel": true,
    "joinGroup": false,
    "channelId": "@mychannel",
    "channelLink": "https://t.me/mychannel",
    "groupLink": ""
  }
}
```

## API Endpoints

### Discord Bot Verification
**`POST /api/auth/discord/verify-bot`**

Request:
```json
{
  "guildId": "123456789"
}
```

Response:
```json
{
  "botInGuild": true
}
```

**How it works**:
- Uses bot token to call `GET /guilds/{guild_id}`
- 200 = Bot is in guild
- 404 = Bot not in guild
- 403 = Bot doesn't have permissions

### Telegram Bot Verification
**`POST /api/auth/telegram/verify-bot`**

Request:
```json
{
  "chatId": "@mychannel"
}
```

Response:
```json
{
  "botInChat": true,
  "chatInfo": { ... }
}
```

**How it works**:
- Uses bot token to call `POST /getChat`
- Success = Bot can access chat (is member)
- Error 400/403 = Bot not in chat

### Telegram Bot Info
**`GET /api/config/telegram-bot`**

Response:
```json
{
  "username": "@MyVerificationBot"
}
```

**How it works**:
- Calls Telegram API `GET /getMe`
- Returns bot username for display in UI
- Fallback to placeholder if API fails

## Creator Experience

### Discord Task
```
1. Check "Join Discord server"
2. Bot setup box appears
3. Click "Connect Discord" → OAuth → Returns
4. Select server from dropdown: "My Gaming Server"
5. Click "Add Bot to Server" → Discord opens
6. Authorize bot in Discord
7. Return to form
8. Click "Verify Bot Added" → ✓ Success
9. Enter invite link for participants
10. Click "Save Task" (now enabled)
```

### Telegram Task
```
1. Check "Join channel"
2. Bot setup box appears with instructions
3. Open Telegram
4. Go to channel settings
5. Add @YourBotUsername as admin
6. Get channel ID using @userinfobot
7. Return to form
8. Enter channel ID: "@mychannel"
9. Click "Verify Bot Added" → ✓ Success
10. Enter channel link for participants
11. Click "Save Task" (now enabled)
```

## Validation Logic

### Discord
```typescript
discordSetupComplete = 
  !config.discord.joinServer || 
  (discordSetup.connected && 
   discordSetup.selectedGuildId && 
   discordSetup.botAdded)
```

**Translation**: Setup is complete if:
- Discord task is NOT selected, OR
- All 3 steps are done (connected + server selected + bot added)

### Telegram
```typescript
telegramSetupComplete = 
  !(config.telegram.joinChannel || config.telegram.joinGroup) || 
  telegramSetup.botAdded
```

**Translation**: Setup is complete if:
- Neither channel nor group task is selected, OR
- Bot has been verified

### Overall
```typescript
canSave = discordSetupComplete && telegramSetupComplete
```

**Save button** is only enabled when both are complete.

## State Management

### Discord Setup State
```typescript
{
  connected: boolean,           // OAuth connected
  guilds: Array<{              // User's servers
    id: string,
    name: string
  }>,
  selectedGuildId: string,     // Selected server ID
  selectedGuildName: string,   // Selected server name
  botAdded: boolean,           // Bot verified in server
  checking: boolean            // Verification in progress
}
```

### Telegram Setup State
```typescript
{
  botUsername: string,         // @BotUsername from API
  botAdded: boolean,           // Bot verified in chat
  checking: boolean,           // Verification in progress
  channelId: string            // User-entered chat ID
}
```

## Error Handling

### Discord Errors
- **Not connected**: Show "Connect Discord" button
- **No servers**: Show message "No servers found..."
- **Bot not found**: Alert "Bot not found in server. Please make sure you added the bot..."
- **API error**: Alert "Failed to verify bot. Please try again."

### Telegram Errors
- **No channel ID**: Alert "Please enter your channel/group ID or username"
- **Bot not found**: Alert "Bot not found in channel/group. Please make sure you added the bot as admin..."
- **API error**: Alert "Failed to verify bot. Please try again."

## UI/UX Features

### Visual Feedback
- ✓ Checkmarks when steps complete
- Green borders on completed steps
- Numbered step indicators (1, 2, 3)
- Disabled buttons with loading states
- Warning messages for incomplete setup

### Progressive Disclosure
- Step 2 only shows after Step 1 complete
- Step 3 only shows after Step 2 complete
- Bot setup box only shows when task is checked

### Clear Instructions
- Step-by-step numbered lists
- Helper text under inputs
- Links to external tools (@userinfobot)
- Bot username displayed prominently

## Environment Variables

```env
# Discord Bot
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_BOT_CLIENT_ID=your_bot_client_id

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
```

## Testing Checklist

### Discord Task Creation
- [ ] Check "Join Discord server"
- [ ] Bot setup box appears
- [ ] Connect Discord works
- [ ] Server list populates
- [ ] Select server works
- [ ] Bot invite link opens Discord
- [ ] Verify bot detects bot correctly
- [ ] Save button enables after all steps
- [ ] Task config includes serverId and serverName

### Telegram Task Creation
- [ ] Check "Join channel"
- [ ] Bot setup box appears
- [ ] Bot username loads from API
- [ ] Instructions are clear
- [ ] Channel ID input works
- [ ] Verify bot detects bot correctly
- [ ] Save button enables after verification
- [ ] Task config includes channelId

### Error Cases
- [ ] Discord not connected → Shows connect button
- [ ] No Discord servers → Shows message
- [ ] Bot not in server → Shows error
- [ ] Telegram bot not in chat → Shows error
- [ ] Invalid channel ID → Shows error
- [ ] Network error → Shows error

## Benefits

1. **Guaranteed Verification**: Bot is always in place before event goes live
2. **Better UX**: Creator knows exactly what to do
3. **Fewer Errors**: Participants won't fail verification due to missing bot
4. **Clear Feedback**: Visual progress indicators show what's done
5. **Prevents Mistakes**: Can't save task without completing setup

## Migration Notes

**Old Flow** (Event Creation Form):
- Discord setup was in main event form
- Only showed when Discord task added to event

**New Flow** (Task Creation):
- Discord/Telegram setup is in task creation modal
- Shows when creating/editing social tasks
- Must complete before saving individual task

**Why the change**:
- More modular and reusable
- Setup happens at task level, not event level
- Easier to manage multiple social tasks
- Better separation of concerns
