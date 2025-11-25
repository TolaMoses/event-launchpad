<!-- src\routes\projects -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { getRafflesByHost } from '$lib/db';
  import { getGamesByHost } from '$lib/db';
  import { getGiveawaysByHost } from '$lib/db';
  import { supabase } from '$lib/supabaseClient';

  let raffles: any[] = [];
  let games: any[] = [];
  let giveaways: any[] = [];
  let wallet: string | null = null;
  let loading = false;

  onMount(async () => {
    // Get logged in wallet
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.wallet_address) {
      wallet = user.user_metadata.wallet_address;
      raffles = await getRafflesByHost(wallet);
      giveaways = await getGiveawaysByHost(wallet);
      games = await getGamesByHost(wallet);
    }
    loading = false;
  });
</script>
<section class="trending">
  <div class="flex at-ends pd-mini">
    <h3>My Raffles</h3>
    <div class="flex mrgn-right">
      <a href="../projects/create-raffle">Create Raffle</a>
      <img class="view-all" src="/icons/arrow-right-up.svg">
    </div>
  </div>

  {#if loading}
    <p>Loading raffles...</p>
  {:else if raffles.length === 0}
    <p>You have not created any raffles yet.</p>
  {:else}
    <div class="main-directory-1">
      <div class="flex">
        {#each raffles as raffle}
          <div class="card">
            <div class="item-image"><img src="/icons/pfp.png"></div>
            <div class="event-summary">
              <div class="title"><p>{raffle.prize_type} Raffle</p></div>
              <div class="countdown">
                {#if new Date(raffle.end_time) > new Date()}
                  Ends - {new Date(raffle.end_time).toLocaleString()}
                {:else}
                  <span class="ended">Ended</span>
                {/if}
              </div>
              <div class="reward">
                <p>Pool - {raffle.ticket_price} ETH</p>
              </div>
            </div>
            {#if raffle.status === 'open'}
              <button class="small-button">Join</button>
            {:else}
              <button class="small-button" disabled>Closed</button>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</section>

<section class="trending">
  <div class="flex at-ends pd-mini">
    <h3>My Giveaways</h3>
    <div class="flex mrgn-right">
      <a href="../projects/create-giveaway">Create Giveaway</a>
      <img class="view-all" src="/icons/arrow-right-up.svg">
    </div>
  </div>
	{#if loading}
	    <p>Loading giveaways...</p>
	  {:else if giveaways.length === 0}
	    <p>You have not created any giveaways yet.</p>
	  {:else}
	  <div class="main-directory-1">
	      <div class="flex">
	        {#each giveaways as giveaway}
	          <div class="card">
	            <div class="item-image"><img src="/icons/pfp.png"></div>
	            <div class="event-summary">
	              <div class="title"><p>{giveaway.prize_type} Giveaway</p></div>
	              <div class="countdown">
	                {#if new Date(giveaway.end_time) > new Date()}
	                  Ends - {new Date(giveaway.end_time).toLocaleString()}
	                {:else}
	                  <span class="ended">Ended</span>
	                {/if}
	              </div>
	              <div class="reward">
	                <p>Pool - {giveaway.ticket_price} ETH</p>
	              </div>
	            </div>
	            {#if giveaway.status === 'open'}
	              <button class="small-button">Join</button>
	            {:else}
	              <button class="small-button" disabled>Closed</button>
	            {/if}
	          </div>
	        {/each}
	      </div>
	    </div>
	  {/if}
	 </section>
	 <section class="trending">
  <div class="flex at-ends pd-mini">
    <h3>My Games</h3>
    <div class="flex mrgn-right">
      <a href="../projects/create-game">Create Event</a>
      <img class="view-all" src="/icons/arrow-right-up.svg">
    </div>
  </div>
	{#if loading}
	    <p>Loading games...</p>
	  {:else if raffles.length === 0}
	    <p>You have not created any games yet.</p>
	  {:else}
	  <div class="main-directory-1">
	      <div class="flex">
	        {#each games as game}
	          <div class="card">
	            <div class="item-image"><img src="/icons/pfp.png"></div>
	            <div class="event-summary">
	              <div class="title"><p>{game.prize_type} Games</p></div>
	              <div class="countdown">
	                {#if new Date(game.end_time) > new Date()}
	                  Ends - {new Date(game.end_time).toLocaleString()}
	                {:else}
	                  <span class="ended">Ended</span>
	                {/if}
	              </div>
	              <div class="reward">
	                <p>Pool - {game.ticket_price} ETH</p>
	              </div>
	            </div>
	            {#if game.status === 'open'}
	              <button class="small-button">Join</button>
	            {:else}
	              <button class="small-button" disabled>Closed</button>
	            {/if}
	          </div>
	        {/each}
	      </div>
	    </div>
	  {/if}
	 </section>