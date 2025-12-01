# OAuth & Social Verification Implementation Guide

## Overview
Complete OAuth flow implementation for Twitter, Discord, and Telegram with account linking, verification, rate limiting, and retry logic.

## Database Schema

### Social Connections Table
```sql
CREATE TABLE social_connections (
    id              uuid PRIMARY KEY,
    user_id         uuid REFERENCES users(id),
    platform        text NOT NULL,              -- 'twitter', 'discord', 'telegram'
    platform_user_id text NOT NULL,             -- User ID on platform
    username        text,                       -- Username/handle
    access_token    text,                       -- Encrypted OAuth token
    refresh_token   text,                       -- Encrypted refresh token
    token_expires_at timestamptz,               -- Token expiration
    metadata        jsonb,                      -- Platform-specific data
    connected_at    timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX social_connections_user_platform_unique
    ON social_connections(user_id, platform);
```

## OAuth Flow

### 1. Twitter OAuth 2.0 (PKCE)
**Connect Endpoint**: `/api/auth/twitter/connect`
- Generates state and code_verifier for PKCE
- Stores in httpOnly cookies
- Redirects to Twitter authorization

**Callback Endpoint**: `/api/auth/twitter/callback`
- Exchanges code for access token
- Fetches user info from Twitter API
- Stores connection in database
- Redirects back to original page

**Required Environment Variables**:
```env
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret
```

**Scopes**: `tweet.read users.read follows.read like.read`

### 2. Discord OAuth 2.0
**Connect Endpoint**: `/api/auth/discord/connect`
- Generates state for CSRF protection
- Redirects to Discord authorization

**Callback Endpoint**: `/api/auth/discord/callback`
- Exchanges code for access token
- Fetches user info from Discord API
- Stores connection in database

**Required Environment Variables**:
```env
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
```

**Scopes**: `identify guilds guilds.members.read`

### 3. Telegram Login Widget
**Callback Endpoint**: `/api/auth/telegram/callback`
- Verifies data authenticity using HMAC-SHA256
- Checks auth timestamp (max 24 hours old)
- Stores connection in database

**Required Environment Variables**:
```env
TELEGRAM_BOT_TOKEN=your_bot_token
```

## Task Verification System

### Rate Limiting
- **Implementation**: In-memory store with automatic cleanup
- **Default**: 10 verifications per minute per user
- **Location**: `src/lib/server/rateLimit.ts`

```typescript
checkRateLimit(key, { maxRequests: 10, windowMs: 60000 })
```

### Retry Logic
- **Exponential backoff**: 1s, 2s, 4s delays
- **Max retries**: 3 attempts
- **Handles**: Network errors, API timeouts

```typescript
retryWithBackoff(async () => verifyAction(), 3, 1000)
```

### Twitter Verification
**Endpoint**: `/api/tasks/verify-twitter`

**Supported Actions**:
1. **Follow**: Checks if user follows target account
   - API: `GET /2/users/:id/following/:target_id`
2. **Like**: Checks if user liked specific tweet
   - API: `GET /2/users/:id/liked_tweets`
3. **Retweet**: Checks if user retweeted specific tweet
   - API: `GET /2/tweets/:id/retweeted_by`
4. **Quote**: Checks if user quote-tweeted specific tweet
   - API: `GET /2/users/:id/tweets` (with referenced_tweets)

**Flow**:
1. Check rate limit
2. Get user's Twitter connection from DB
3. Verify token not expired
4. Call appropriate verification function with retry logic
5. Return success/failure

### Discord Verification
**Endpoint**: `/api/tasks/verify-discord`

**Verification**: Checks server membership
- API: `GET /guilds/:guild_id/members/:user_id`

**Bot Setup Required**:
- Create bot at discord.com/developers
- Add bot to server with "View Server Members" permission
- Store bot token in environment

### Telegram Verification
**Endpoint**: `/api/tasks/verify-telegram`

**Verification**: Checks channel membership
- API: `POST /bot:token/getChatMember`

**Bot Setup Required**:
- Create bot via @BotFather
- Add bot to channel as admin
- Store bot token in environment

## Task Components

### TwitterTask.svelte
**States**:
1. **Loading**: Checking connection status
2. **Not Connected**: Shows "Connect Twitter" button
3. **Connected**: Shows "Confirm" button
4. **Verifying**: Shows "Verifying..." (disabled)
5. **Completed**: Read-only with ✓ badge

**Features**:
- Auto-checks connection on mount
- Redirects to OAuth flow if not connected
- Returns to same page after connection
- Shows error messages for failed verification

### DiscordTask.svelte
Same pattern as Twitter with Discord-specific styling

### TelegramTask.svelte
Same pattern with Telegram-specific styling

## User Flow

### First Time (Not Connected)
1. User joins event
2. Sees task with "Connect Twitter" button
3. Clicks connect → OAuth flow
4. Returns to event page (now connected)
5. Clicks "Confirm" → Verification
6. Task marked complete with ✓

### Subsequent Times (Already Connected)
1. User joins event
2. Sees task with "Confirm" button (no connection needed)
3. Clicks confirm → Verification
4. Task marked complete

## Event Creation - Discord Bot Setup

When creator selects Discord task:
1. Show bot invite link
2. Require bot to be added to server
3. Verify bot has proper permissions
4. Store server ID in task config

**Bot Permissions Needed**:
- View Server Members
- Read Messages/View Channels

## Environment Variables Summary

```env
# Twitter OAuth
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

# Discord OAuth
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# Discord Bot (for verification)
DISCORD_BOT_TOKEN=

# Telegram Bot
TELEGRAM_BOT_TOKEN=
```

## Security Features

1. **CSRF Protection**: State parameter in OAuth flows
2. **PKCE**: Code challenge/verifier for Twitter
3. **Token Encryption**: Store encrypted tokens in DB
4. **HttpOnly Cookies**: OAuth state stored securely
5. **Rate Limiting**: Prevent abuse
6. **Token Expiration**: Check and refresh expired tokens
7. **HMAC Verification**: Telegram data authenticity

## Error Handling

### Common Errors
- `401 Unauthorized`: User not logged in
- `400 Bad Request`: Missing/invalid parameters
- `429 Rate Limit`: Too many requests
- `401 Token Expired`: Need to reconnect account
- `400 Not Connected`: Social account not linked
- `400 Verification Failed`: Task not completed

### Retry Scenarios
- Network timeouts
- API rate limits (Twitter/Discord)
- Temporary API failures

## Testing

### Development Mode
Set environment variable:
```env
NODE_ENV=development
```

This enables:
- Non-secure cookies (for localhost)
- Detailed error logging
- Mock verification (optional)

### Production Checklist
- [ ] All environment variables set
- [ ] OAuth redirect URIs configured in platform dashboards
- [ ] Tokens encrypted in database
- [ ] Rate limiting enabled
- [ ] Error tracking configured
- [ ] Bot permissions verified

## API Rate Limits

### Twitter API v2
- **Free tier**: 500,000 tweets/month
- **Basic**: $100/month
- Consider caching verification results

### Discord API
- **Global**: 50 requests/second
- **Per route**: Varies by endpoint
- Use retry-after headers

### Telegram Bot API
- **Global**: 30 messages/second
- **Per chat**: 1 message/second
- No strict rate limits for getChatMember

## Future Enhancements

1. **Token Refresh**: Auto-refresh expired tokens
2. **Webhook Verification**: Real-time verification via webhooks
3. **Batch Verification**: Verify multiple tasks at once
4. **Caching**: Cache verification results (5-10 minutes)
5. **Analytics**: Track verification success rates
6. **Multi-account**: Allow multiple social accounts per platform
