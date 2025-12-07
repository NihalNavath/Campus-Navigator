<script>
	import { onMount } from 'svelte';

	export let onNavigate = () => {}; // Callback when user selects a location

	let events = [];
	let blocks = [];
	let isExpanded = true;
	let isLoading = true;

	onMount(async () => {
		await loadEvents();
		await loadBlocks();
		isLoading = false;
	});

	async function loadEvents() {
		try {
			const res = await fetch('/api/events');
			if (res.ok) {
				events = await res.json();
			}
		} catch (error) {
			console.error('Error loading events:', error);
		}
	}

	async function loadBlocks() {
		try {
			const res = await fetch('/map_main.geojson');
			if (res.ok) {
				const geojson = await res.json();
				// Extract buildings from GeoJSON features
				blocks = geojson.features
					.filter((f) => f.properties?.name && f.geometry?.type === 'Polygon')
					.map((f) => ({
						name: f.properties.name,
						id: f.properties.id,
						coordinates: f.geometry.coordinates[0][0] // First coordinate of polygon
					}))
					.sort((a, b) => a.name.localeCompare(b.name));
			}
		} catch (error) {
			console.error('Error loading blocks:', error);
		}
	}

	function handleEventClick(event) {
		if (event.location?.coordinates) {
			onNavigate(event.location.coordinates, event.title);
		}
	}

	function handleBlockClick(block) {
		if (block.coordinates) {
			onNavigate(block.coordinates, block.name);
		}
	}

	function toggleExpand() {
		isExpanded = !isExpanded;
	}
</script>

<div class="sidebar" class:collapsed={!isExpanded}>
	<button class="toggle-btn" on:click={toggleExpand} aria-label="Toggle sidebar">
		{isExpanded ? '→' : '←'}
	</button>

	{#if isExpanded}
		<div class="sidebar-content">
			{#if isLoading}
				<div class="loading">Loading...</div>
			{:else}
				<!-- Events Section -->
				<section class="section">
					<h3>Events</h3>
					{#if events.length === 0}
						<p class="empty">No events scheduled</p>
					{:else}
						<div class="items-list">
							{#each events as event}
								<button class="item event-item" on:click={() => handleEventClick(event)}>
									<div class="item-title">{event.title}</div>
									{#if event.description}
										<div class="item-description">{event.description}</div>
									{/if}
									{#if event.date}
										<div class="item-meta">📅 {event.date}</div>
									{/if}
									{#if event.location?.name}
										<div class="item-meta">📍 {event.location.name}</div>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</section>

				<div class="divider"></div>

				<!-- Blocks Section -->
				<section class="section">
					<h3>Blocks</h3>
					{#if blocks.length === 0}
						<p class="empty">No blocks available</p>
					{:else}
						<div class="items-list blocks-list">
							{#each blocks as block}
								<button class="item block-item" on:click={() => handleBlockClick(block)}>
									<div class="item-title">{block.name}</div>
								</button>
							{/each}
						</div>
					{/if}
				</section>
			{/if}
		</div>
	{/if}
</div>

<style>
	.sidebar {
		position: fixed;
		top: 12px;
		right: 12px;
		z-index: 1000;
		max-width: 320px;
		min-width: 280px;
		max-height: 90vh;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(12px);
		border-radius: 12px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	.sidebar.collapsed {
		min-width: 48px;
		max-width: 48px;
	}

	.toggle-btn {
		position: absolute;
		top: 12px;
		left: 12px;
		width: 32px;
		height: 32px;
		border: none;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border-radius: 8px;
		cursor: pointer;
		font-size: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
		z-index: 10;
	}

	.toggle-btn:hover {
		transform: scale(1.05);
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
	}

	.sidebar-content {
		padding: 16px;
		padding-top: 52px;
		overflow-y: auto;
		max-height: calc(90vh - 32px);
	}

	.section {
		margin-bottom: 24px;
	}

	.section h3 {
		font-size: 16px;
		font-weight: 700;
		margin: 0 0 12px 0;
		color: #1a202c;
		letter-spacing: 0.5px;
		text-transform: uppercase;
	}

	.divider {
		height: 2px;
		background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
		margin: 20px 0;
	}

	.items-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.blocks-list {
		max-height: 300px;
		overflow-y: auto;
	}

	.item {
		width: 100%;
		padding: 12px;
		border: none;
		background: white;
		border-radius: 8px;
		cursor: pointer;
		text-align: left;
		transition: all 0.2s;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid #e2e8f0;
	}

	.item:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		border-color: #667eea;
	}

	.event-item {
		background: linear-gradient(135deg, #ffffff 0%, #f7fafc 100%);
	}

	.event-item:hover {
		background: linear-gradient(135deg, #fff5f7 0%, #fed7e2 100%);
	}

	.block-item {
		padding: 10px 12px;
	}

	.item-title {
		font-weight: 600;
		color: #2d3748;
		font-size: 14px;
		margin-bottom: 4px;
	}

	.item-description {
		font-size: 12px;
		color: #718096;
		margin-bottom: 6px;
		line-height: 1.4;
	}

	.item-meta {
		font-size: 11px;
		color: #a0aec0;
		margin-top: 4px;
	}

	.empty {
		font-size: 13px;
		color: #a0aec0;
		font-style: italic;
		text-align: center;
		padding: 20px 0;
	}

	.loading {
		text-align: center;
		padding: 40px 20px;
		color: #718096;
		font-size: 14px;
	}

	/* Scrollbar styling */
	.sidebar-content::-webkit-scrollbar,
	.blocks-list::-webkit-scrollbar {
		width: 6px;
	}

	.sidebar-content::-webkit-scrollbar-track,
	.blocks-list::-webkit-scrollbar-track {
		background: transparent;
	}

	.sidebar-content::-webkit-scrollbar-thumb,
	.blocks-list::-webkit-scrollbar-thumb {
		background: #cbd5e0;
		border-radius: 3px;
	}

	.sidebar-content::-webkit-scrollbar-thumb:hover,
	.blocks-list::-webkit-scrollbar-thumb:hover {
		background: #a0aec0;
	}

	@media (max-width: 768px) {
		.sidebar {
			max-width: 280px;
			min-width: 240px;
			top: 8px;
			right: 8px;
		}

		.sidebar.collapsed {
			min-width: 44px;
			max-width: 44px;
		}
	}
</style>
