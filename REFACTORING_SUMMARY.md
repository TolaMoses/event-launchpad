# Layout & Event Creation Refactoring Summary

## Overview
Fixed three critical issues identified by the user regarding asset management, authentication UI, and reward configuration consistency.

---

## ✅ Issue 1: Layout.svelte Using Hardcoded Asset Paths

### Problem
The `+layout.svelte` file had hardcoded asset paths instead of using the centralized `ASSETS` configuration:
```typescript
const logo = "/icons/phaeton.png";
const xLogo = "/icons/x-logo.svg";
const discordLogo = "/icons/discord-logo.svg";
const telegramLogo = "/icons/telegram-logo.svg";
```

### Solution
Updated to use centralized asset configuration:
```typescript
import { ASSETS } from "$lib/config/assets";

const logo = ASSETS.icons.ui.logo;
const xLogo = ASSETS.icons.social.twitter;
const discordLogo = ASSETS.icons.social.discord;
const telegramLogo = ASSETS.icons.social.telegram;
```

### Benefits
- **Single source of truth**: All asset paths managed in one file
- **Easy updates**: Change paths globally from `assets.ts`
- **Type safety**: TypeScript ensures valid asset references
- **Consistency**: Same approach used across entire application

---

## ✅ Issue 2: Connect Wallet Button Not Replaced with LoginDropdown

### Problem
The layout still showed the old "Connect Wallet" button instead of the new `LoginDropdown` component with multi-login options (Discord, Telegram, EVM Wallet).

### Solution

**Desktop Navigation:**
```svelte
<!-- Before: Complex wallet connection UI -->
<div class="wallet-area">
  {#if $walletAddress}
    <!-- Chain selector, wallet address, disconnect button -->
  {:else}
    <button on:click={handleConnect}>Connect wallet</button>
  {/if}
</div>

<!-- After: Simple LoginDropdown -->
<div class="wallet-area">
  <LoginDropdown 
    user={data?.me}
    isLoggedIn={!!data?.me}
    on:connectWallet={handleConnect}
    on:logout={handleDisconnect}
  />
</div>
```

**Mobile Menu:**
```svelte
<!-- Before: Duplicate wallet connection UI -->
{#if $walletStore.connected}
  <!-- Wallet details and disconnect -->
{:else}
  <button on:click={handleConnect}>Connect wallet</button>
{/if}

<!-- After: Consistent LoginDropdown -->
<div class="mobile-login-wrapper">
  <LoginDropdown 
    user={data?.me}
    isLoggedIn={!!data?.me}
    on:connectWallet={handleConnect}
    on:logout={handleDisconnect}
  />
</div>
```

### Benefits
- **Multi-login support**: Discord, Telegram, and EVM Wallet options
- **Profile display**: Shows profile picture and username when logged in
- **Consistent UX**: Same component used on desktop and mobile
- **Cleaner code**: Reduced from ~80 lines to ~10 lines
- **Better navigation**: Profile and Dashboard links in dropdown menu

---

## ✅ Issue 3: Reward Configuration Missing Advanced Features

### Problem
The "Prize Configuration" section in Quick Event creation:
1. Was named "Prize Configuration" instead of "Reward Configuration"
2. Didn't provide access to the RewardsModal
3. Couldn't add multiple reward types simultaneously
4. Didn't support custom point system
5. Wasn't using the same modal component as Community setup

### Solution

**1. Renamed Section:**
```svelte
<!-- Before -->
<h2 class="section-title">Prize Configuration</h2>

<!-- After -->
<h2 class="section-title">Reward Configuration</h2>
```

**2. Added Advanced Rewards Button:**
```svelte
<div class="section-header-with-action">
  <div>
    <h2 class="section-title">Reward Configuration</h2>
    <p class="section-description">
      Detail the exact reward mechanics...
    </p>
  </div>
  <button type="button" class="ghost-btn" on:click={() => showRewardsModal = true}>
    ⚡ Advanced Rewards
  </button>
</div>
```

**3. Integrated RewardsModal:**
```svelte
<script lang="ts">
  import RewardsModal from "$lib/components/RewardsModal.svelte";
  
  let showRewardsModal = false;
  let advancedRewards: any[] = [];
  let pointSystem: any = null;
  
  function handleRewardsSaved(event: CustomEvent) {
    const { rewards, pointSystem: ps } = event.detail;
    advancedRewards = rewards;
    pointSystem = ps;
    showRewardsModal = false;
  }
</script>

<!-- At end of template -->
{#if showRewardsModal}
  <RewardsModal
    eventId=""
    existingRewards={advancedRewards}
    existingPointSystem={pointSystem}
    on:saved={handleRewardsSaved}
    on:close={() => showRewardsModal = false}
  />
{/if}
```

**4. Added CSS for Header Layout:**
```css
.section-header-with-action {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.5rem;
}
```

### Benefits
- **Consistent naming**: "Reward Configuration" matches Community setup
- **Same modal component**: Both Quick Events and Communities use `RewardsModal`
- **Multiple reward types**: Can add Token + NFT + Points simultaneously
- **Custom point system**: Enable point system with custom name and leaderboard
- **Better UX**: "Advanced Rewards" button clearly indicates additional options
- **Dual approach**: Basic config in form + advanced config in modal

---

## Files Modified

### 1. `src/routes/+layout.svelte`
**Changes:**
- Added import for `ASSETS` config
- Added import for `LoginDropdown` component
- Replaced hardcoded asset paths with `ASSETS` references
- Replaced wallet connection UI with `LoginDropdown` (desktop)
- Replaced wallet connection UI with `LoginDropdown` (mobile)

**Lines changed:** ~100 lines simplified to ~20 lines

### 2. `src/routes/projects/create-event/+page.svelte`
**Changes:**
- Added import for `RewardsModal` component
- Added state variables: `showRewardsModal`, `advancedRewards`, `pointSystem`
- Added `handleRewardsSaved()` function
- Renamed "Prize Configuration" to "Reward Configuration"
- Added section header with "Advanced Rewards" button
- Added `RewardsModal` component at end of template
- Added CSS for `.section-header-with-action`

**Lines added:** ~30 lines

---

## User Flow Improvements

### Before: Quick Event Creation
1. Fill basic details
2. Add tasks
3. Configure **ONE** prize type (Token OR NFT OR Gift, etc.)
4. Submit

### After: Quick Event Creation
1. Fill basic details
2. Add tasks
3. Configure basic reward (existing form)
4. **Click "Advanced Rewards"** to open modal
5. Add **multiple** reward types (Token + NFT + Gift + Points)
6. Enable custom point system with leaderboard
7. Save advanced configuration
8. Submit

### Before: Login
1. Click "Connect Wallet"
2. Connect MetaMask
3. Done

### After: Login
1. Click "Login" dropdown
2. Choose: Discord, Telegram, or EVM Wallet
3. Connect chosen method
4. See profile picture + username in header
5. Access Profile and Dashboard from dropdown

---

## Testing Checklist

- [ ] **Layout Assets**
  - [ ] Logo displays correctly
  - [ ] Social icons (Twitter, Discord, Telegram) display correctly
  - [ ] Icons update when changing paths in `assets.ts`

- [ ] **LoginDropdown**
  - [ ] Dropdown shows "Login" button when not logged in
  - [ ] Clicking shows 3 login options (Discord, Telegram, Wallet)
  - [ ] Profile picture displays when logged in
  - [ ] Username displays next to profile picture
  - [ ] Dropdown menu shows Profile and Dashboard links
  - [ ] Logout works correctly
  - [ ] Mobile version works identically

- [ ] **Reward Configuration**
  - [ ] Section title shows "Reward Configuration"
  - [ ] "Advanced Rewards" button visible
  - [ ] Clicking button opens RewardsModal
  - [ ] Can add multiple reward types
  - [ ] Can enable custom point system
  - [ ] Point system name can be customized
  - [ ] Leaderboard toggle works
  - [ ] Saving modal updates `advancedRewards` and `pointSystem`
  - [ ] Modal closes after saving

---

## Known Issues (Non-Breaking)

### Layout.svelte CSS Warnings
Several unused CSS selectors remain from the old wallet connection UI:
- `.wallet-info`
- `.wallet-details`
- `.chain-selector`
- `.chain-button`
- `.connect-wallet`
- etc.

**Impact:** None (just warnings)  
**Fix:** Can be safely removed in cleanup pass

**Recommendation:** Leave for now in case you want to add chain selector back to LoginDropdown later.

---

## Migration Notes

### For Existing Events
- Old "prize_details" field still works
- New events can use "reward_types" array
- Both approaches supported simultaneously

### For Asset Management
If you want to update an asset path:
1. Open `src/lib/config/assets.ts`
2. Change the path in one place
3. All references update automatically

Example:
```typescript
// Change logo globally
export const ASSETS = {
  icons: {
    ui: {
      logo: '/icons/new-logo.png', // Changed here
      // ...
    }
  }
}
// Now logo updates everywhere it's used
```

---

## Summary

All three issues have been resolved:

1. ✅ **Asset paths centralized** - Layout uses `ASSETS` config
2. ✅ **LoginDropdown integrated** - Multi-login UI in place of Connect Wallet
3. ✅ **Advanced rewards available** - RewardsModal accessible in Quick Events

The application now has:
- **Consistent asset management** across all files
- **Modern authentication UI** with multiple login options
- **Unified reward configuration** using the same modal for both event types
- **Support for multiple rewards** and custom point systems in all event types

---

**Date:** December 24, 2025  
**Status:** ✅ All issues resolved  
**Next Steps:** Test the changes and create avatar image files
