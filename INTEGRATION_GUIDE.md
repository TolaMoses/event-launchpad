# Integration Guide - Username & Profile System

## Quick Start Integration

### Step 1: Run Database Migration

```bash
# Via Supabase Dashboard SQL Editor
# Copy and run: migrations/add_username_and_profile.sql
```

### Step 2: Update Your Header/Navbar Component

Find your current header component (likely in `src/lib/components/Header.svelte` or similar) and replace the Connect Wallet button.

**Before:**
```svelte
<button on:click={connectWallet}>
  Connect Wallet
</button>
```

**After:**
```svelte
<script>
  import LoginDropdown from '$lib/components/LoginDropdown.svelte';
  import { user } from '$lib/stores/auth'; // Your auth store
  
  async function handleConnectWallet() {
    // Your existing wallet connection logic
    await connectWallet();
  }
  
  async function handleLogout() {
    // Your existing logout logic
    await logout();
  }
</script>

<LoginDropdown 
  user={$user}
  isLoggedIn={!!$user}
  on:connectWallet={handleConnectWallet}
  on:logout={handleLogout}
/>
```

### Step 3: Update Asset References (Optional but Recommended)

Replace hardcoded asset paths throughout your codebase:

```svelte
<script>
  import { ASSETS } from '$lib/config/assets';
</script>

<!-- Social Icons -->
<img src={ASSETS.icons.social.discord} alt="Discord" />
<img src={ASSETS.icons.social.telegram} alt="Telegram" />
<img src={ASSETS.icons.social.twitter} alt="Twitter" />

<!-- Wallet Icons -->
<img src={ASSETS.icons.wallets.metamask} alt="MetaMask" />

<!-- Reward Icons -->
<img src={ASSETS.icons.rewards.token} alt="Token" />
<img src={ASSETS.icons.rewards.nft} alt="NFT" />

<!-- Default Avatar -->
<img src={ASSETS.avatars.default} alt="Profile" />
```

### Step 4: Add Profile Link to Navigation

Add a link to the profile page in your navigation:

```svelte
<nav>
  <a href="/">Home</a>
  <a href="/dashboard">Dashboard</a>
  <a href="/profile">Profile</a> <!-- NEW -->
</nav>
```

### Step 5: Create Avatar Image Files

Create the following directory structure in your `static/` or `public/` folder:

```
static/
  images/
    avatars/
      default.svg
      animals/
        cat.svg
        dog.svg
        fox.svg
        panda.svg
        lion.svg
        bear.svg
        rabbit.svg
        owl.svg
      characters/
        astronaut.svg
        ninja.svg
        robot.svg
        wizard.svg
        knight.svg
        pirate.svg
        superhero.svg
        alien.svg
      abstract/
        gradient-1.svg
        gradient-2.svg
        gradient-3.svg
        gradient-4.svg
        geometric-1.svg
        geometric-2.svg
        geometric-3.svg
        geometric-4.svg
      crypto/
        bitcoin.svg
        ethereum.svg
        nft-1.svg
        nft-2.svg
        nft-3.svg
        nft-4.svg
        wallet.svg
        diamond.svg
  icons/
    social/
      discord.svg
      telegram.svg
      twitter.svg
      github.svg
    wallets/
      metamask.svg
      walletconnect.svg
      coinbase.svg
    rewards/
      token.svg
      eth.svg
      nft.svg
      gift.svg
      voucher.svg
      points.svg
```

**Note:** You can use placeholder SVGs initially or find free icons from:
- [Heroicons](https://heroicons.com/)
- [Iconoir](https://iconoir.com/)
- [Lucide](https://lucide.dev/)
- [Flaticon](https://www.flaticon.com/) (attribution required for free)

### Step 6: Update User Store (If Needed)

Ensure your user store includes the new fields:

```typescript
// src/lib/stores/auth.ts
import { writable } from 'svelte/store';

export interface User {
  id: string;
  email: string;
  wallet_address?: string;
  username?: string; // NEW
  profile_picture?: string; // NEW
  connected_accounts?: { // NEW
    discord?: { id: string; username: string };
    telegram?: { id: string; username: string };
  };
}

export const user = writable<User | null>(null);
```

## OAuth Integration (Future Implementation)

### Discord OAuth Setup

1. **Create Discord Application**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create new application
   - Add OAuth2 redirect URL: `https://yourdomain.com/auth/discord/callback`

2. **Add Environment Variables**
   ```env
   DISCORD_CLIENT_ID=your_client_id
   DISCORD_CLIENT_SECRET=your_client_secret
   DISCORD_REDIRECT_URI=https://yourdomain.com/auth/discord/callback
   ```

3. **Create Auth Callback Route**
   ```typescript
   // src/routes/auth/discord/callback/+server.ts
   export async function GET({ url, cookies }) {
     const code = url.searchParams.get('code');
     
     // Exchange code for token
     const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
       method: 'POST',
       body: new URLSearchParams({
         client_id: DISCORD_CLIENT_ID,
         client_secret: DISCORD_CLIENT_SECRET,
         grant_type: 'authorization_code',
         code: code!,
         redirect_uri: DISCORD_REDIRECT_URI
       })
     });
     
     const { access_token } = await tokenResponse.json();
     
     // Get user info
     const userResponse = await fetch('https://discord.com/api/users/@me', {
       headers: { Authorization: `Bearer ${access_token}` }
     });
     
     const discordUser = await userResponse.json();
     
     // Update user in database
     await supabase
       .from('users')
       .update({
         connected_accounts: {
           discord: {
             id: discordUser.id,
             username: `${discordUser.username}#${discordUser.discriminator}`
           }
         }
       })
       .eq('id', userId);
     
     return redirect(302, '/profile');
   }
   ```

### Telegram OAuth Setup

1. **Create Telegram Bot**
   - Message [@BotFather](https://t.me/botfather) on Telegram
   - Create new bot with `/newbot`
   - Get bot token

2. **Add Telegram Widget**
   ```svelte
   <!-- In LoginDropdown.svelte or Profile page -->
   <script>
     function handleTelegramAuth(user) {
       // Verify hash
       // Update user in database
     }
   </script>
   
   <svelte:head>
     <script async src="https://telegram.org/js/telegram-widget.js?22" 
       data-telegram-login="YourBotName"
       data-size="large"
       data-onauth="handleTelegramAuth(user)"
       data-request-access="write">
     </script>
   </svelte:head>
   ```

## Common Issues & Solutions

### Issue: Username already exists
**Solution:** The database constraint will prevent duplicates. Show user-friendly error message.

### Issue: Profile picture not loading
**Solution:** Check that the image file exists at the path specified in `assets.ts`

### Issue: Login dropdown not showing
**Solution:** Ensure `user` prop is passed correctly and `isLoggedIn` is a boolean

### Issue: Role assignment fails
**Solution:** Ensure user has set a username before being assigned a role

## Testing Your Integration

1. **Test Login Flow**
   ```bash
   # 1. Click "Login" dropdown
   # 2. Select "EVM Wallet"
   # 3. Connect wallet
   # 4. Verify profile pic appears in header
   ```

2. **Test Profile Setup**
   ```bash
   # 1. Navigate to /profile
   # 2. Enter username "testuser123"
   # 3. Select avatar
   # 4. Click "Save Profile"
   # 5. Verify success message
   ```

3. **Test Role Assignment**
   ```bash
   # 1. Create community event
   # 2. Open "Roles & Permissions"
   # 3. Enter username "testuser123"
   # 4. Select role "Moderator"
   # 5. Click "Assign"
   # 6. Verify user appears in team list
   ```

## Migration Checklist

- [ ] Run database migration
- [ ] Update header component with LoginDropdown
- [ ] Create avatar image files
- [ ] Update asset references to use ASSETS config
- [ ] Test login/logout flow
- [ ] Test profile page functionality
- [ ] Test username uniqueness validation
- [ ] Test role assignment with usernames
- [ ] Verify profile picture displays in header
- [ ] Test on mobile devices

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify database migration ran successfully
3. Ensure all image files exist at specified paths
4. Check that user store is properly updated
5. Verify Supabase connection is working

---

**Quick Reference:**
- Profile Page: `/profile`
- Assets Config: `src/lib/config/assets.ts`
- Login Component: `src/lib/components/LoginDropdown.svelte`
- Roles Modal: `src/lib/components/RolesModal.svelte`
