<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	
	export let eventId: string;
	export let existingRewards: any[] = [];
	export let existingPointSystem: any = null;

	const dispatch = createEventDispatcher();

	let rewards = existingRewards.length > 0 ? JSON.parse(JSON.stringify(existingRewards)) : [];
	let pointSystem = existingPointSystem ? JSON.parse(JSON.stringify(existingPointSystem)) : {
		enabled: false,
		point_name: 'Points',
		leaderboard_enabled: false
	};
	
	let saving = false;
	let error = '';
	let selectedRewardType = '';

	const rewardTypeOptions = [
		{ value: 'Token', label: 'Token Reward' },
		{ value: 'ETH', label: 'ETH Reward' },
		{ value: 'NFT', label: 'NFT Reward' },
		{ value: 'MintableNFT', label: 'Mintable NFT' },
		{ value: 'Gift', label: 'Physical Gift/Merch' },
		{ value: 'Voucher', label: 'Voucher/Code' },
		{ value: 'CustomPoints', label: 'Custom Point System' }
	];

	function addReward() {
		if (!selectedRewardType) return;

		if (selectedRewardType === 'CustomPoints') {
			// Enable point system instead of adding as reward
			pointSystem.enabled = true;
			selectedRewardType = '';
			return;
		}
		
		const newReward = {
			id: crypto.randomUUID(),
			type: selectedRewardType,
			config: getDefaultConfig(selectedRewardType)
		};
		
		rewards = [...rewards, newReward];
		selectedRewardType = '';
	}

	function getDefaultConfig(type: string) {
		switch (type) {
			case 'Token':
				return { token_address: '', prize_pool: 0, distribution_type: 'even' };
			case 'ETH':
				return { prize_pool: 0, distribution_type: 'even' };
			case 'NFT':
				return { nfts: [], distribution_type: 'even' };
			case 'MintableNFT':
				return { variants: [], distribution_type: 'random' };
			case 'Gift':
				return { description: '', estimated_value: 0 };
			case 'Voucher':
				return { description: '', codes: [] };
			default:
				return {};
		}
	}

	function removeReward(index: number) {
		rewards = rewards.filter((_, i) => i !== index);
	}

	function togglePointSystem() {
		pointSystem.enabled = !pointSystem.enabled;
	}

	async function saveRewards() {
		saving = true;
		error = '';

		const updateData: any = {
			reward_types: rewards,
			setup_progress: supabase.raw(`
				jsonb_set(
					COALESCE(setup_progress, '{}'::jsonb),
					'{rewards}',
					'100'::jsonb
				)
			`)
		};

		if (pointSystem.enabled) {
			updateData.point_system = pointSystem;
		}

		const { error: updateError } = await supabase
			.from('events')
			.update(updateData)
			.eq('id', eventId);

		if (updateError) {
			error = 'Failed to save rewards';
			saving = false;
			return;
		}

		saving = false;
		dispatch('saved', { rewards, pointSystem });
		dispatch('close');
	}

	function close() {
		dispatch('close');
	}
</script>

<div class="modal-overlay" on:click={close}>
	<div class="modal-content" on:click|stopPropagation>
		<div class="modal-header">
			<h2>🎁 Reward Configuration</h2>
			<button class="close-btn" on:click={close}>✕</button>
		</div>

		<div class="modal-body">
			<p class="section-description">
				Configure multiple reward types for your event. You can combine different rewards and enable a custom point system.
			</p>

			<!-- Point System Section -->
			<div class="point-system-section">
				<div class="section-header">
					<h3>Custom Point System</h3>
					<label class="toggle-switch">
						<input type="checkbox" bind:checked={pointSystem.enabled} on:change={togglePointSystem} />
						<span class="toggle-slider"></span>
					</label>
				</div>

				{#if pointSystem.enabled}
					<div class="point-config">
						<div class="form-group">
							<label for="point-name">Point Name (e.g., "Stars", "Gems", "XP")</label>
							<input
								id="point-name"
								type="text"
								bind:value={pointSystem.point_name}
								placeholder="Enter custom point name"
							/>
						</div>

						<div class="form-group">
							<label class="checkbox-label">
								<input type="checkbox" bind:checked={pointSystem.leaderboard_enabled} />
								<span>Enable Leaderboard</span>
							</label>
							<p class="field-hint">Show a public leaderboard ranking participants by points</p>
						</div>
					</div>
				{/if}
			</div>

			<!-- Add Reward Section -->
			<div class="add-reward-section">
				<h3>Reward Types</h3>
				<div class="reward-selector">
					<select bind:value={selectedRewardType}>
						<option value="">Select reward type...</option>
						{#each rewardTypeOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
					<button class="add-btn" on:click={addReward} disabled={!selectedRewardType}>
						+ Add Reward
					</button>
				</div>
			</div>

			<!-- Rewards List -->
			<div class="rewards-list">
				{#if rewards.length === 0}
					<div class="empty-state">
						<p>No rewards added yet. Select a reward type above to get started.</p>
					</div>
				{:else}
					{#each rewards as reward, index (reward.id)}
						<div class="reward-item">
							<div class="reward-header">
								<div class="reward-info">
									<span class="reward-icon">
										{#if reward.type === 'Token'}💰
										{:else if reward.type === 'ETH'}Ξ
										{:else if reward.type === 'NFT'}🖼️
										{:else if reward.type === 'MintableNFT'}🎨
										{:else if reward.type === 'Gift'}🎁
										{:else if reward.type === 'Voucher'}🎫
										{:else}🏆
										{/if}
									</span>
									<span class="reward-type">{rewardTypeOptions.find(t => t.value === reward.type)?.label || reward.type}</span>
								</div>
								<button class="remove-btn" on:click={() => removeReward(index)}>
									Remove
								</button>
							</div>
							
							<div class="reward-config">
								<p class="config-label">Configuration:</p>
								<pre>{JSON.stringify(reward.config, null, 2)}</pre>
								<p class="config-hint">Click to edit detailed configuration (coming soon)</p>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			{#if error}
				<div class="error-message">{error}</div>
			{/if}
		</div>

		<div class="modal-footer">
			<button class="secondary-btn" on:click={close}>Cancel</button>
			<button class="primary-btn" on:click={saveRewards} disabled={saving || (rewards.length === 0 && !pointSystem.enabled)}>
				{saving ? 'Saving...' : 'Save Rewards'}
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
		max-width: 800px;
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

	.point-system-section {
		background: rgba(111, 160, 255, 0.08);
		border: 1px solid rgba(111, 160, 255, 0.2);
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.section-header h3 {
		margin: 0;
		font-size: 1.1rem;
		color: #f2f3ff;
	}

	.toggle-switch {
		position: relative;
		display: inline-block;
		width: 52px;
		height: 28px;
	}

	.toggle-switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-slider {
		position: absolute;
		cursor: pointer;
		inset: 0;
		background-color: rgba(255, 255, 255, 0.2);
		transition: 0.3s;
		border-radius: 28px;
	}

	.toggle-slider:before {
		position: absolute;
		content: "";
		height: 20px;
		width: 20px;
		left: 4px;
		bottom: 4px;
		background-color: white;
		transition: 0.3s;
		border-radius: 50%;
	}

	input:checked + .toggle-slider {
		background-color: #6fa0ff;
	}

	input:checked + .toggle-slider:before {
		transform: translateX(24px);
	}

	.point-config {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		font-weight: 600;
		font-size: 0.9rem;
		color: #f2f3ff;
	}

	.form-group input[type="text"] {
		background: rgba(26, 28, 45, 0.88);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 10px;
		padding: 0.75rem 1rem;
		font-size: 0.95rem;
		color: #f6f6ff;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
	}

	.checkbox-label input[type="checkbox"] {
		width: 20px;
		height: 20px;
		cursor: pointer;
	}

	.checkbox-label span {
		font-weight: 600;
		color: #f2f3ff;
	}

	.field-hint {
		margin: 0;
		font-size: 0.85rem;
		color: rgba(242, 243, 255, 0.6);
	}

	.add-reward-section {
		margin-bottom: 2rem;
	}

	.add-reward-section h3 {
		margin: 0 0 1rem;
		font-size: 1.1rem;
		color: #f2f3ff;
	}

	.reward-selector {
		display: flex;
		gap: 1rem;
	}

	.reward-selector select {
		flex: 1;
		background: rgba(26, 28, 45, 0.88);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 12px;
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
	}

	.add-btn:hover:not(:disabled) {
		background: rgba(111, 160, 255, 0.3);
	}

	.add-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.rewards-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.empty-state {
		text-align: center;
		padding: 3rem 2rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px dashed rgba(255, 255, 255, 0.1);
		border-radius: 12px;
	}

	.empty-state p {
		margin: 0;
		color: rgba(242, 243, 255, 0.6);
	}

	.reward-item {
		background: rgba(12, 14, 30, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		padding: 1.25rem;
	}

	.reward-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.reward-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.reward-icon {
		font-size: 1.5rem;
	}

	.reward-type {
		font-weight: 600;
		color: #f2f3ff;
	}

	.remove-btn {
		background: rgba(218, 30, 40, 0.12);
		border: 1px solid rgba(218, 30, 40, 0.3);
		color: #ff9b9b;
		border-radius: 8px;
		padding: 0.5rem 1rem;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.remove-btn:hover {
		background: rgba(218, 30, 40, 0.2);
	}

	.reward-config {
		margin-top: 1rem;
	}

	.config-label {
		margin: 0 0 0.5rem;
		font-size: 0.85rem;
		color: rgba(242, 243, 255, 0.7);
		font-weight: 600;
	}

	.reward-config pre {
		margin: 0 0 0.5rem;
		padding: 0.75rem;
		background: rgba(8, 9, 22, 0.85);
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.05);
		font-size: 0.85rem;
		color: rgba(242, 243, 255, 0.8);
		overflow-x: auto;
	}

	.config-hint {
		margin: 0;
		font-size: 0.8rem;
		color: rgba(242, 243, 255, 0.5);
		font-style: italic;
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

		.reward-selector {
			flex-direction: column;
		}

		.reward-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}
	}
</style>
