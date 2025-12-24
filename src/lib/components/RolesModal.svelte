<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	
	export let eventId: string;
	export let existingRoles: any = null;

	const dispatch = createEventDispatcher();

	let rolesConfig = existingRoles ? JSON.parse(JSON.stringify(existingRoles)) : {
		roles: [
			{ id: 'admin', name: 'Admin', permissions: ['manage_event', 'manage_tasks', 'manage_rewards', 'manage_participants', 'view_analytics'] },
			{ id: 'moderator', name: 'Moderator', permissions: ['manage_participants', 'view_analytics'] },
			{ id: 'viewer', name: 'Viewer', permissions: ['view_analytics'] }
		],
		assignments: []
	};
	
	let saving = false;
	let error = '';
	let newRoleName = '';
	let newUsername = '';
	let selectedRole = '';

	const availablePermissions = [
		{ id: 'manage_event', label: 'Manage Event Settings', description: 'Edit event details and configuration' },
		{ id: 'manage_tasks', label: 'Manage Tasks', description: 'Add, edit, and remove event tasks' },
		{ id: 'manage_rewards', label: 'Manage Rewards', description: 'Configure reward settings' },
		{ id: 'manage_participants', label: 'Manage Participants', description: 'View and manage participant submissions' },
		{ id: 'view_analytics', label: 'View Analytics', description: 'Access event statistics and reports' }
	];

	function addRole() {
		if (!newRoleName.trim()) return;
		
		const newRole = {
			id: crypto.randomUUID(),
			name: newRoleName.trim(),
			permissions: []
		};
		
		rolesConfig.roles = [...rolesConfig.roles, newRole];
		newRoleName = '';
	}

	function removeRole(roleId: string) {
		rolesConfig.roles = rolesConfig.roles.filter((r: any) => r.id !== roleId);
		rolesConfig.assignments = rolesConfig.assignments.filter((a: any) => a.role !== roleId);
	}

	function togglePermission(roleId: string, permissionId: string) {
		const role = rolesConfig.roles.find((r: any) => r.id === roleId);
		if (!role) return;

		if (role.permissions.includes(permissionId)) {
			role.permissions = role.permissions.filter((p: any) => p !== permissionId);
		} else {
			role.permissions = [...role.permissions, permissionId];
		}
		rolesConfig.roles = rolesConfig.roles; // Trigger reactivity
	}

	async function addUserAssignment() {
		if (!newUsername.trim() || !selectedRole) {
			error = 'Please enter a username and select a role';
			return;
		}

		// Check if user exists by username
		const { data: userData, error: userError } = await supabase
			.from('users')
			.select('id, username, email')
			.eq('username', newUsername.trim())
			.single();

		if (userError || !userData) {
			error = 'User not found. Please check the username.';
			return;
		}

		// Check if already assigned
		if (rolesConfig.assignments.some((a: any) => a.user_id === userData.id)) {
			error = 'User is already assigned a role';
			return;
		}

		rolesConfig.assignments = [...rolesConfig.assignments, {
			user_id: userData.id,
			username: userData.username,
			role: selectedRole
		}];

		newUsername = '';
		selectedRole = '';
		error = '';
	}

	function removeAssignment(userId: string) {
		rolesConfig.assignments = rolesConfig.assignments.filter((a: any) => a.user_id !== userId);
	}

	async function saveRoles() {
		saving = true;
		error = '';

		// First update roles_permissions
		const { error: updateError } = await supabase
			.from('events')
			.update({ 
				roles_permissions: rolesConfig
			})
			.eq('id', eventId);

		if (updateError) {
			error = 'Failed to save roles and permissions';
			saving = false;
			return;
		}

		// Then update setup_progress separately
		const { data: currentEvent } = await supabase
			.from('events')
			.select('setup_progress')
			.eq('id', eventId)
			.single();

		const updatedProgress = {
			...(currentEvent?.setup_progress || {}),
			roles: 100
		};

		const { error: progressError } = await supabase
			.from('events')
			.update({ setup_progress: updatedProgress })
			.eq('id', eventId);

		if (updateError) {
			error = 'Failed to save roles and permissions';
			saving = false;
			return;
		}

		saving = false;
		dispatch('saved', { rolesConfig });
		dispatch('close');
	}

	function close() {
		dispatch('close');
	}
</script>

<div class="modal-overlay" on:click={close}>
	<div class="modal-content" on:click|stopPropagation>
		<div class="modal-header">
			<h2>👥 Roles & Permissions</h2>
			<button class="close-btn" on:click={close}>✕</button>
		</div>

		<div class="modal-body">
			<p class="section-description">
				Define roles and assign team members to help manage your event.
			</p>

			<!-- Roles Section -->
			<div class="roles-section">
				<h3>Roles</h3>
				
				<div class="add-role-form">
					<input
						type="text"
						bind:value={newRoleName}
						placeholder="New role name..."
						on:keypress={(e) => e.key === 'Enter' && addRole()}
					/>
					<button class="add-btn" on:click={addRole} disabled={!newRoleName.trim()}>
						+ Add Role
					</button>
				</div>

				<div class="roles-list">
					{#each rolesConfig.roles as role (role.id)}
						<div class="role-card">
							<div class="role-header">
								<h4>{role.name}</h4>
								{#if !['admin', 'moderator', 'viewer'].includes(role.id)}
									<button class="remove-btn-small" on:click={() => removeRole(role.id)}>
										✕
									</button>
								{/if}
							</div>

							<div class="permissions-grid">
								{#each availablePermissions as permission}
									<label class="permission-item">
										<input
											type="checkbox"
											checked={role.permissions.includes(permission.id)}
											on:change={() => togglePermission(role.id, permission.id)}
										/>
										<div class="permission-info">
											<span class="permission-label">{permission.label}</span>
											<span class="permission-desc">{permission.description}</span>
										</div>
									</label>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- User Assignments Section -->
			<div class="assignments-section">
				<h3>Team Members</h3>
				
				<div class="add-assignment-form">
					<input
						type="text"
						bind:value={newUsername}
						placeholder="Username..."
					/>
					<select bind:value={selectedRole}>
						<option value="">Select role...</option>
						{#each rolesConfig.roles as role}
							<option value={role.id}>{role.name}</option>
						{/each}
					</select>
					<button class="add-btn" on:click={addUserAssignment}>
						+ Assign
					</button>
				</div>

				<div class="assignments-list">
					{#if rolesConfig.assignments.length === 0}
						<div class="empty-state">
							<p>No team members assigned yet.</p>
						</div>
					{:else}
						{#each rolesConfig.assignments as assignment (assignment.user_id)}
							<div class="assignment-item">
								<div class="assignment-info">
									<span class="user-email">@{assignment.username}</span>
									<span class="user-role">
										{rolesConfig.roles.find((r: any) => r.id === assignment.role)?.name || assignment.role}
									</span>
								</div>
								<button class="remove-btn-small" on:click={() => removeAssignment(assignment.user_id)}>
									Remove
								</button>
							</div>
						{/each}
					{/if}
				</div>
			</div>

			{#if error}
				<div class="error-message">{error}</div>
			{/if}
		</div>

		<div class="modal-footer">
			<button class="secondary-btn" on:click={close}>Cancel</button>
			<button class="primary-btn" on:click={saveRoles} disabled={saving}>
				{saving ? 'Saving...' : 'Save Roles'}
			</button>
		</div>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
		animation: fadeIn 0.2s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.modal-content {
		background: rgba(18, 20, 38, 0.98);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		max-width: 900px;
		width: 100%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		animation: slideUp 0.3s ease;
	}

	@keyframes slideUp {
		from { transform: translateY(20px); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
		color: #f2f3ff;
	}

	.close-btn {
		background: none;
		border: none;
		color: rgba(242, 243, 255, 0.6);
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		transition: color 0.2s ease;
	}

	.close-btn:hover {
		color: #f2f3ff;
	}

	.modal-body {
		padding: 2rem;
		overflow-y: auto;
		flex: 1;
	}

	.section-description {
		margin: 0 0 1.5rem;
		color: rgba(242, 243, 255, 0.7);
		font-size: 0.95rem;
	}

	.roles-section, .assignments-section {
		margin-bottom: 2rem;
	}

	.roles-section h3, .assignments-section h3 {
		margin: 0 0 1rem;
		font-size: 1.1rem;
		color: #f2f3ff;
	}

	.add-role-form, .add-assignment-form {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.add-role-form input, .add-assignment-form input, .add-assignment-form select {
		flex: 1;
		background: rgba(26, 28, 45, 0.88);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 10px;
		padding: 0.75rem 1rem;
		font-size: 0.95rem;
		color: #f6f6ff;
	}

	.add-btn {
		background: rgba(111, 160, 255, 0.2);
		color: #6fa0ff;
		border: 1px solid rgba(111, 160, 255, 0.3);
		border-radius: 10px;
		padding: 0.75rem 1.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.add-btn:hover:not(:disabled) {
		background: rgba(111, 160, 255, 0.3);
	}

	.add-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.roles-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.role-card {
		background: rgba(12, 14, 30, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		padding: 1.25rem;
	}

	.role-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.role-header h4 {
		margin: 0;
		font-size: 1.1rem;
		color: #f2f3ff;
	}

	.remove-btn-small {
		background: rgba(218, 30, 40, 0.12);
		border: 1px solid rgba(218, 30, 40, 0.3);
		color: #ff9b9b;
		border-radius: 6px;
		padding: 0.25rem 0.75rem;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.remove-btn-small:hover {
		background: rgba(218, 30, 40, 0.2);
	}

	.permissions-grid {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.permission-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		cursor: pointer;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 8px;
		transition: background 0.2s ease;
	}

	.permission-item:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.permission-item input[type="checkbox"] {
		margin-top: 0.25rem;
		width: 18px;
		height: 18px;
		cursor: pointer;
	}

	.permission-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.permission-label {
		font-weight: 600;
		color: #f2f3ff;
		font-size: 0.95rem;
	}

	.permission-desc {
		font-size: 0.85rem;
		color: rgba(242, 243, 255, 0.6);
	}

	.assignments-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px dashed rgba(255, 255, 255, 0.1);
		border-radius: 12px;
	}

	.empty-state p {
		margin: 0;
		color: rgba(242, 243, 255, 0.6);
	}

	.assignment-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: rgba(12, 14, 30, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 10px;
	}

	.assignment-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.user-email {
		font-weight: 600;
		color: #f2f3ff;
	}

	.user-role {
		font-size: 0.85rem;
		color: rgba(242, 243, 255, 0.6);
	}

	.error-message {
		margin-top: 1rem;
		padding: 1rem;
		background: rgba(218, 30, 40, 0.12);
		border: 1px solid rgba(218, 30, 40, 0.3);
		border-radius: 8px;
		color: #ff9b9b;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding: 1.5rem 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.secondary-btn {
		background: rgba(255, 255, 255, 0.08);
		color: #f2f3ff;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 10px;
		padding: 0.75rem 1.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.secondary-btn:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	.primary-btn {
		background: linear-gradient(135deg, #6fa0ff 0%, #5a8dff 100%);
		color: white;
		border: none;
		border-radius: 10px;
		padding: 0.75rem 2rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.primary-btn:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(111, 160, 255, 0.4);
	}

	.primary-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 768px) {
		.modal-content {
			max-width: 100%;
			max-height: 100vh;
			border-radius: 0;
		}

		.add-role-form, .add-assignment-form {
			flex-direction: column;
		}

		.assignment-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}
	}
</style>
