<script lang="ts">
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  let reviewingEventId: string | null = null;
  let reviewReason = '';
  let newModeratorEmail = '';
  let pendingEvents = data.pendingEvents;
  let moderators = data.moderators;
  const isAdmin = data.userRole === 'admin';

  async function approveEvent(eventId: string) {
    const response = await fetch('/api/admin/approve-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, action: 'approve' }),
      credentials: 'include'
    });

    if (!response.ok) {
      alert('Failed to approve event');
      return;
    }

    // Remove from pending list
    pendingEvents = pendingEvents.filter(e => e.id !== eventId);
    alert('Event approved!');
  }

  async function rejectEvent(eventId: string) {
    if (!reviewReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    const response = await fetch('/api/admin/approve-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, action: 'reject', reason: reviewReason }),
      credentials: 'include'
    });

    if (!response.ok) {
      alert('Failed to reject event');
      return;
    }

    // Remove from pending list
    pendingEvents = pendingEvents.filter(e => e.id !== eventId);
    reviewingEventId = null;
    reviewReason = '';
    alert('Event rejected');
  }

  async function addModerator() {
    if (!newModeratorEmail.trim()) return;

    const response = await fetch('/api/admin/add-moderator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: newModeratorEmail }),
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      alert('Failed to add moderator: ' + (error.message || 'Unknown error'));
      return;
    }

    const result = await response.json();
    moderators = [...moderators, result.moderator];
    newModeratorEmail = '';
    alert('Moderator added!');
  }

  async function removeModerator(roleId: string) {
    if (!confirm('Remove this moderator?')) return;

    const response = await fetch('/api/admin/remove-moderator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id: roleId }),
      credentials: 'include'
    });

    if (!response.ok) {
      alert('Failed to remove moderator');
      return;
    }

    moderators = moderators.filter(m => m.id !== roleId);
    alert('Moderator removed');
  }
</script>

<svelte:head>
  <title>Admin Dashboard - Event Launchpad</title>
</svelte:head>

<div class="admin-container">
    <div class="admin-content">
      <h1>Admin Dashboard</h1>

      <!-- Pending Events Section -->
      <section class="admin-section">
        <h2>Pending Event Reviews ({pendingEvents.length})</h2>
        
        {#if pendingEvents.length === 0}
          <p class="empty-state">No events pending review</p>
        {:else}
          <div class="events-grid">
            {#each pendingEvents as event}
              <div class="event-card">
                <div class="event-header">
                  <h3>{event.title}</h3>
                  <span class="event-type">{event.event_type === 'quick_event' ? 'Quick Event' : 'Community'}</span>
                </div>
                
                <p class="event-description">{event.description}</p>
                
                <div class="event-meta">
                  <p><strong>Creator:</strong> {event.users?.username || event.users?.wallet_address?.slice(0, 8)}</p>
                  <p><strong>Tasks:</strong> {event.tasks?.length || 0}</p>
                  <p><strong>Rewards:</strong> {event.reward_types?.length || 0}</p>
                  <p><strong>Winners:</strong> {event.num_winners || 'All participants'}</p>
                  <p><strong>Start:</strong> {new Date(event.start_time).toLocaleDateString()}</p>
                  <p><strong>End:</strong> {new Date(event.end_time).toLocaleDateString()}</p>
                </div>

                <div class="event-actions">
                  {#if reviewingEventId === event.id}
                    <div class="reject-form">
                      <textarea
                        bind:value={reviewReason}
                        placeholder="Reason for rejection..."
                        rows="3"
                      ></textarea>
                      <div class="reject-actions">
                        <button class="btn-primary" on:click={() => rejectEvent(event.id)}>
                          Confirm Reject
                        </button>
                        <button class="btn-secondary" on:click={() => { reviewingEventId = null; reviewReason = ''; }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  {:else}
                    <button class="btn-success" on:click={() => approveEvent(event.id)}>
                      ✓ Approve
                    </button>
                    <button class="btn-danger" on:click={() => reviewingEventId = event.id}>
                      ✗ Reject
                    </button>
                    <a href="/events/{event.id}" class="btn-secondary" target="_blank">
                      View Details
                    </a>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>

      <!-- Moderators Section -->
      <section class="admin-section">
        <h2>Moderators & Admins</h2>
        
        <div class="add-moderator">
          <input
            type="text"
            bind:value={newModeratorEmail}
            placeholder="Enter wallet address or email"
          />
          <button class="btn-primary" on:click={addModerator}>
            Add Moderator
          </button>
        </div>

        <div class="moderators-list">
          {#each moderators as mod}
            <div class="moderator-card">
              <div class="moderator-info">
                <strong>{mod.users?.username || mod.users?.wallet_address?.slice(0, 16)}</strong>
                <span class="role-badge {mod.role}">{mod.role}</span>
              </div>
              {#if mod.role !== 'admin' || moderators.filter(m => m.role === 'admin').length > 1}
                <button class="btn-danger-sm" on:click={() => removeModerator(mod.id)}>
                  Remove
                </button>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    </div>
</div>

<style>
  .admin-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .loading, .access-denied {
    text-align: center;
    padding: 4rem 2rem;
  }

  .access-denied h1 {
    color: #ef4444;
    margin-bottom: 1rem;
  }

  .admin-content h1 {
    font-size: 2rem;
    margin-bottom: 2rem;
  }

  .admin-section {
    margin-bottom: 3rem;
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .admin-section h2 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    color: #1f2937;
  }

  .empty-state {
    text-align: center;
    color: #6b7280;
    padding: 2rem;
  }

  .events-grid {
    display: grid;
    gap: 1.5rem;
  }

  .event-card {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.5rem;
  }

  .event-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 1rem;
  }

  .event-header h3 {
    font-size: 1.25rem;
    color: #111827;
    margin: 0;
  }

  .event-type {
    background: #dbeafe;
    color: #1e40af;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .event-description {
    color: #4b5563;
    margin-bottom: 1rem;
  }

  .event-meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .event-meta p {
    margin: 0;
    color: #6b7280;
  }

  .event-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .reject-form {
    width: 100%;
  }

  .reject-form textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    margin-bottom: 0.75rem;
    font-family: inherit;
  }

  .reject-actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn-success {
    background: #10b981;
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-success:hover {
    background: #059669;
  }

  .btn-danger {
    background: #ef4444;
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-danger:hover {
    background: #dc2626;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .btn-secondary {
    background: #6b7280;
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    text-decoration: none;
    display: inline-block;
  }

  .btn-secondary:hover {
    background: #4b5563;
  }

  .add-moderator {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .add-moderator input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
  }

  .moderators-list {
    display: grid;
    gap: 0.75rem;
  }

  .moderator-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
  }

  .moderator-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .role-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .role-badge.admin {
    background: #fef3c7;
    color: #92400e;
  }

  .role-badge.moderator {
    background: #dbeafe;
    color: #1e40af;
  }

  .btn-danger-sm {
    background: #ef4444;
    color: white;
    padding: 0.375rem 0.75rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .btn-danger-sm:hover {
    background: #dc2626;
  }
</style>
