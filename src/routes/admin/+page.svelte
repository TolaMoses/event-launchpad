<script lang="ts">
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  let reviewingEventId: string | null = null;
  let reviewReason = '';
  let newModeratorEmail = '';
  let pendingEvents = data.pendingEvents;
  let moderators = data.moderators;
  const isAdmin = data.userRole === 'admin';
  let viewingEventDetails: any = null;
  let loadingEventDetails = false;

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

  async function viewEventDetails(eventId: string) {
    loadingEventDetails = true;
    viewingEventDetails = null;

    const response = await fetch(`/api/admin/event-details?event_id=${eventId}`, {
      credentials: 'include'
    });

    if (response.ok) {
      viewingEventDetails = await response.json();
    } else {
      alert('Failed to load event details');
    }

    loadingEventDetails = false;
  }

  function closeEventDetails() {
    viewingEventDetails = null;
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
                  <p><strong>Creator:</strong> {event.users?.username || event.users?.wallet_address?.slice(0, 6) + '...' + event.users?.wallet_address?.slice(-4) || 'Unknown'}</p>
                  <p><strong>Tasks:</strong> {event.tasks?.length || 0}</p>
                  <p><strong>Rewards:</strong> {event.reward_types?.length || (event.prize_details ? 1 : 0)}</p>
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
                    <button class="btn-secondary" on:click={() => viewEventDetails(event.id)}>
                      👁️ View Details
                    </button>
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

<!-- Event Details Modal -->
{#if viewingEventDetails}
  <div class="modal-overlay" on:click={closeEventDetails} role="button" tabindex="0" on:keydown={(e) => e.key === 'Escape' && closeEventDetails()}>
    <div class="modal-content" on:click|stopPropagation role="dialog">
      <button class="modal-close" on:click={closeEventDetails}>✕</button>
      
      <h2>Event Review Details</h2>
      
      <div class="event-detail-section">
        <h3>Basic Information</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <strong>Title:</strong>
            <span>{viewingEventDetails.title}</span>
          </div>
          <div class="detail-item">
            <strong>Creator:</strong>
            <span>{viewingEventDetails.creator_username || viewingEventDetails.creator_wallet}</span>
          </div>
          <div class="detail-item">
            <strong>Type:</strong>
            <span>{viewingEventDetails.event_type === 'quick_event' ? 'Quick Event' : 'Community Event'}</span>
          </div>
          <div class="detail-item">
            <strong>Start Date:</strong>
            <span>{new Date(viewingEventDetails.start_time).toLocaleString()}</span>
          </div>
          <div class="detail-item">
            <strong>End Date:</strong>
            <span>{new Date(viewingEventDetails.end_time).toLocaleString()}</span>
          </div>
          <div class="detail-item">
            <strong>Winners:</strong>
            <span>{viewingEventDetails.num_winners || 'All participants'}</span>
          </div>
        </div>
        
        <div class="detail-item full-width">
          <strong>Description:</strong>
          <p class="description-text">{viewingEventDetails.description}</p>
        </div>
      </div>

      <div class="event-detail-section">
        <h3>Rewards</h3>
        {#if viewingEventDetails.reward_types && viewingEventDetails.reward_types.length > 0}
          <div class="rewards-list">
            {#each viewingEventDetails.reward_types as reward}
              <div class="reward-card">
                <strong>{reward.type}</strong>
                <span>{reward.amount} {reward.token_symbol || ''}</span>
                {#if reward.chain_id}
                  <span class="chain-badge">Chain: {reward.chain_id}</span>
                {/if}
              </div>
            {/each}
          </div>
        {:else if viewingEventDetails.prize_details}
          <div class="reward-card">
            <strong>{viewingEventDetails.prize_details.type}</strong>
            <span>{viewingEventDetails.prize_details.amount || ''}</span>
          </div>
        {:else}
          <p class="empty-state">No rewards specified</p>
        {/if}
      </div>

      <div class="event-detail-section">
        <h3>Tasks ({viewingEventDetails.tasks?.length || 0})</h3>
        {#if viewingEventDetails.tasks && viewingEventDetails.tasks.length > 0}
          <div class="tasks-review-list">
            {#each viewingEventDetails.tasks as task, index}
              <div class="task-review-card">
                <div class="task-review-header">
                  <span class="task-number">Task #{index + 1}</span>
                  <span class="task-type-badge">{task.type}</span>
                </div>
                
                <div class="task-review-details">
                  {#if task.type === 'twitter' || task.type === 'discord' || task.type === 'telegram'}
                    <div class="social-task-details">
                      <p><strong>Platform:</strong> {task.type}</p>
                      {#if task.config.action}
                        <p><strong>Action:</strong> {task.config.action}</p>
                      {/if}
                      {#if task.config.username}
                        <p><strong>Username/Account:</strong> @{task.config.username}</p>
                      {/if}
                      {#if task.config.channelName}
                        <p><strong>Channel:</strong> {task.config.channelName}</p>
                      {/if}
                      {#if task.config.serverId}
                        <p><strong>Server ID:</strong> {task.config.serverId}</p>
                      {/if}
                      {#if task.config.serverName}
                        <p><strong>Server Name:</strong> {task.config.serverName}</p>
                      {/if}
                      {#if task.config.tweetUrl}
                        <p><strong>Tweet URL:</strong> <a href={task.config.tweetUrl} target="_blank" rel="noopener">{task.config.tweetUrl}</a></p>
                      {/if}
                    </div>
                  {:else if task.type === 'quiz'}
                    <div class="quiz-task-details">
                      <p><strong>Question:</strong> {task.config.question}</p>
                      <p><strong>Options:</strong> {task.config.options?.join(', ')}</p>
                      <p class="admin-only"><strong>Correct Answer:</strong> {task.config.correctAnswer}</p>
                    </div>
                  {:else if task.type === 'code'}
                    <div class="code-task-details">
                      <p><strong>Instructions:</strong> {task.config.instructions}</p>
                      <p class="admin-only"><strong>Valid Code:</strong> {task.config.validCode}</p>
                    </div>
                  {:else}
                    <pre class="config-preview">{JSON.stringify(task.config, null, 2)}</pre>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <p class="empty-state">No tasks defined</p>
        {/if}
      </div>

      <div class="modal-actions">
        <button class="btn-success" on:click={() => { approveEvent(viewingEventDetails.id); closeEventDetails(); }}>
          ✓ Approve Event
        </button>
        <button class="btn-danger" on:click={() => { reviewingEventId = viewingEventDetails.id; closeEventDetails(); }}>
          ✗ Reject Event
        </button>
        <button class="btn-secondary" on:click={closeEventDetails}>
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

{#if loadingEventDetails}
  <div class="loading-overlay">
    <div class="spinner"></div>
    <p>Loading event details...</p>
  </div>
{/if}

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

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .modal-content {
    background: #1a1c2d;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    max-width: 900px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    padding: 2rem;
    position: relative;
  }

  .modal-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: none;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    font-size: 1.25rem;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .modal-close:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .modal-content h2 {
    margin: 0 0 2rem;
    font-size: 1.75rem;
    color: #f2f3ff;
  }

  .event-detail-section {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .event-detail-section:last-of-type {
    border-bottom: none;
  }

  .event-detail-section h3 {
    margin: 0 0 1rem;
    font-size: 1.25rem;
    color: #6fa0ff;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .detail-item.full-width {
    grid-column: 1 / -1;
  }

  .detail-item strong {
    color: rgba(242, 243, 255, 0.7);
    font-size: 0.875rem;
    font-weight: 600;
  }

  .detail-item span,
  .detail-item p {
    color: #f2f3ff;
    font-size: 1rem;
  }

  .description-text {
    margin: 0.5rem 0 0;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .rewards-list {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .reward-card {
    background: rgba(111, 160, 255, 0.1);
    border: 1px solid rgba(111, 160, 255, 0.3);
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .chain-badge {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    color: rgba(242, 243, 255, 0.8);
  }

  .tasks-review-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .task-review-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 1rem;
  }

  .task-review-header {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .task-number {
    background: rgba(111, 160, 255, 0.2);
    color: #6fa0ff;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .task-type-badge {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(242, 243, 255, 0.9);
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: capitalize;
  }

  .task-review-details p {
    margin: 0.5rem 0;
    color: rgba(242, 243, 255, 0.9);
    font-size: 0.95rem;
  }

  .task-review-details strong {
    color: rgba(242, 243, 255, 0.7);
  }

  .task-review-details a {
    color: #6fa0ff;
    text-decoration: none;
  }

  .task-review-details a:hover {
    text-decoration: underline;
  }

  .admin-only {
    background: rgba(255, 160, 0, 0.1);
    border-left: 3px solid #ffa500;
    padding: 0.5rem 0.75rem;
    margin: 0.5rem 0;
    border-radius: 4px;
  }

  .config-preview {
    background: rgba(0, 0, 0, 0.3);
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.875rem;
    color: rgba(242, 243, 255, 0.8);
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    z-index: 2000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(111, 160, 255, 0.2);
    border-top-color: #6fa0ff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-overlay p {
    color: rgba(242, 243, 255, 0.8);
    font-size: 1.1rem;
  }

  @media (max-width: 768px) {
    .modal-overlay {
      padding: 0;
    }

    .modal-content {
      max-height: 100vh;
      border-radius: 0;
    }

    .detail-grid {
      grid-template-columns: 1fr;
    }

    .modal-actions {
      flex-direction: column;
    }
  }
</style>
