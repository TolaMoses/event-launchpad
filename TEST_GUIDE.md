# 🧪 Testing Guide - Updated Endpoints

## Quick Start

```bash
# Ensure dependencies are installed
npm install

# Start dev server
npm run dev
```

---

## 1. Test Predictions Endpoint

### Valid Request
```bash
POST http://localhost:5173/api/predictions
Content-Type: application/json

{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "prediction": {
    "home_score": 2,
    "away_score": 1
  }
}
```

**Expected**: `201 Created` (first time) or `200 OK` (update)

### Invalid Request (Test Validation)
```bash
POST http://localhost:5173/api/predictions
Content-Type: application/json

{
  "taskId": "not-a-uuid",
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "prediction": {
    "home_score": 2,
    "away_score": 1
  }
}
```

**Expected**: `422 Unprocessable Entity` with validation error

### Test Rate Limiting
```bash
# Run this 11 times rapidly
for i in {1..11}; do
  curl -X POST http://localhost:5173/api/predictions \
    -H "Content-Type: application/json" \
    -d '{"taskId":"550e8400-e29b-41d4-a716-446655440000","eventId":"550e8400-e29b-41d4-a716-446655440001","prediction":{"home_score":2,"away_score":1}}'
done
```

**Expected**: First 10 succeed, 11th gets `429 Too Many Requests`

---

## 2. Test Twitter Verification

### Valid Request
```bash
POST http://localhost:5173/api/tasks/verify-twitter
Content-Type: application/json

{
  "taskId": "550e8400-e29b-41d4-a716-446655440002",
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "action": "follow",
  "targetUsername": "example_user"
}
```

**Expected**: 
- If Twitter not connected: `400 Bad Request`
- If connected: Verification attempt

### Test Idempotency
```bash
# Send same request twice within 60 seconds
POST http://localhost:5173/api/tasks/verify-twitter
# (same body as above)
```

**Expected**: Second request gets `409 Conflict` (verification already in progress)

---

## 3. Test Wallet Authentication

### Step 1: Get Nonce
```bash
POST http://localhost:5173/api/auth/nonce
Content-Type: application/json

{
  "walletAddress": "0x1234567890123456789012345678901234567890"
}
```

**Expected**: `200 OK`
```json
{
  "message": "Sign this message to authenticate with your wallet:\n\nNonce: abc123...\nTimestamp: 2024-01-20T..."
}
```

### Step 2: Verify Signature
```bash
POST http://localhost:5173/api/auth/verify
Content-Type: application/json

{
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "signature": "0xsigned_message_here"
}
```

**Expected**: `200 OK` with session cookies set

### Test Nonce Expiration
```bash
# 1. Get nonce
POST /api/auth/nonce
Body: { "walletAddress": "0x..." }

# 2. Wait 6 minutes

# 3. Try to verify
POST /api/auth/verify
Body: { "walletAddress": "0x...", "signature": "..." }
```

**Expected**: `401 Unauthorized` (nonce expired)

### Test Nonce One-Time Use
```bash
# 1. Get nonce
POST /api/auth/nonce

# 2. Verify (first time)
POST /api/auth/verify

# 3. Try to verify again with same signature
POST /api/auth/verify (same signature)
```

**Expected**: Second verification fails (nonce already consumed)

---

## 4. Test Event Creation

### Valid Request
```bash
POST http://localhost:5173/api/events
Content-Type: application/json

{
  "title": "Test Event",
  "description": "This is a test event description that is long enough",
  "start_time": "2024-06-01T00:00:00Z",
  "end_time": "2024-06-30T23:59:59Z",
  "num_winners": 10,
  "assets": {
    "logo": {
      "path": "events/test-logo.png",
      "publicUrl": "https://example.com/test-logo.png"
    }
  },
  "reward_types": [
    {
      "type": "tokens",
      "prize_pool": "1000",
      "distribution_type": "equal"
    }
  ],
  "tasks": [
    {
      "id": "task1",
      "type": "social",
      "title": "Follow us",
      "points": 10,
      "config": {}
    }
  ]
}
```

**Expected**: `201 Created` with event ID

### Test Rate Limiting
```bash
# Create 6 events rapidly
for i in {1..6}; do
  curl -X POST http://localhost:5173/api/events \
    -H "Content-Type: application/json" \
    -d '{"title":"Event '$i'","description":"Test description","start_time":"2024-06-01T00:00:00Z","end_time":"2024-06-30T23:59:59Z","reward_types":[{"type":"tokens","prize_pool":"1000"}],"tasks":[{"id":"t1","type":"social","title":"Test","points":10,"config":{}}],"assets":{"logo":{"path":"test.png","publicUrl":"https://example.com/test.png"}}}'
done
```

**Expected**: First 5 succeed, 6th gets `429 Too Many Requests`

### Invalid Request (Missing Required Fields)
```bash
POST http://localhost:5173/api/events
Content-Type: application/json

{
  "title": "Test",
  "description": "Test"
}
```

**Expected**: `422 Unprocessable Entity` (missing required fields)

---

## 5. Test Task Registry Fix

### Browser Console Test
```javascript
// Open create-event page
// Open browser console and type:
console.log(Object.keys(window.taskRegistry || {}));

// Then open event detail page
// Check console again:
console.log(Object.keys(window.taskRegistry || {}));

// Should see SAME task types on both pages now!
```

### Expected Task Types
Both pages should now show:
- twitter
- social
- discord
- telegram
- quiz
- puzzle
- content_submission
- content
- scoreline_prediction
- scoreline
- code_entry
- referral
- participation
- game
- irl

---

## 🔍 Debugging

### Check Redis Connection
```javascript
// In browser console or test endpoint
fetch('/api/predictions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    taskId: crypto.randomUUID(),
    eventId: crypto.randomUUID(),
    prediction: { home_score: 2, away_score: 1 }
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);

// If Redis is working: Success or rate limit
// If Redis is broken: Server error
```

### Check Rate Limits (Upstash Dashboard)
1. Go to https://console.upstash.com
2. Select your Redis instance
3. Check "Metrics" tab
4. See commands count

### Check Browser Network Tab
1. Open DevTools → Network
2. Make API request
3. Check response:
   - Status code
   - Response body
   - Headers

---

## ✅ Success Criteria

### For Each Endpoint:

**Valid Request** → ✅ Works normally  
**Invalid Data** → ❌ 422 validation error  
**Rapid Requests** → ❌ 429 rate limited  
**No Auth** → ❌ 401 unauthorized  

### For Wallet Auth:

**Flow Works** → ✅ Nonce → Sign → Verify → Session  
**Nonce Expires** → ❌ Can't use after 5 min  
**Nonce Reuse** → ❌ Can't use same nonce twice  

### For Task Registry:

**Consistent** → ✅ Same tasks on all pages  
**No Errors** → ✅ No console errors  
**Components Load** → ✅ Task builders work  

---

## 📊 Test Results Template

```markdown
## Test Results

Date: ______
Tester: ______

### Predictions Endpoint
- [ ] Valid request works
- [ ] Invalid data returns 422
- [ ] Rate limiting works (429 on 11th request)
- [ ] Updates work (200 on second submission)

### Twitter Verification
- [ ] Valid request works
- [ ] Idempotency guard works (409 on duplicate)
- [ ] Rate limiting works
- [ ] Error handling works

### Wallet Auth
- [ ] Nonce generation works
- [ ] Signature verification works
- [ ] Nonce expires after 5 minutes
- [ ] Nonce can't be reused
- [ ] Rate limiting works

### Event Creation
- [ ] Valid event creation works
- [ ] reward_types field is used
- [ ] Rate limiting works (429 on 6th request)
- [ ] Validation works

### Task Registry
- [ ] Same tasks on create-event page
- [ ] Same tasks on event detail page
- [ ] No console errors
- [ ] Task components load correctly

### Overall
- [ ] Redis connection works
- [ ] No crashes or errors
- [ ] Error messages are helpful
- [ ] Ready for production
```

---

## 🚀 Ready to Deploy?

Checklist:
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Redis usage is low (<10k commands/day)
- [ ] Rate limits are appropriate
- [ ] Error messages are user-friendly

**If all checked → SHIP IT! 🚢**
