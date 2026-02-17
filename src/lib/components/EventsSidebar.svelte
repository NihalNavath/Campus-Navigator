<script>
	import { onMount } from 'svelte';

	export let isNavigating = false;
	export let destinationName = '';
	export let onStopNavigation = () => {};
	export let onNavigate = () => {}; // Callback when user selects a location

	let events = [];
	let blocks = [];
	export let arrivalInfo = null; // { name: '...' } when arrived
	let isMinimized = false; // For mobile bottom sheet
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
			const now = new Date().getTime();
			const res = await fetch(`/map_main.geojson?t=${now}`);
			if (res.ok) {
				const geojson = await res.json();
				blocks = geojson.features
					.filter((f) => f.properties?.name && f.geometry?.type === 'Polygon')
					.map((f) => {
						let coordinates;
						const dest = f.properties.destination;

						if (dest) {
							try {
								const parsedDest = typeof dest === 'string' ? JSON.parse(dest) : dest;
								if (Array.isArray(parsedDest) && parsedDest.length >= 2) {
									coordinates = [Number(parsedDest[0]), Number(parsedDest[1])];
								}
							} catch (err) {
								console.warn('Error parsing destination:', err);
							}
						}

						if (!coordinates) {
							const firstCoord = f.geometry.coordinates[0][0];
							coordinates = firstCoord.slice(0, 2);
						}

						return {
							name: f.properties.name,
							id: f.properties.id,
							coordinates: coordinates
						};
					})
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

	function toggleMinimize() {
		isMinimized = !isMinimized;
	}
</script>

<div class="sidebar-container" class:navigating={isNavigating} class:minimized={isMinimized}>
	{#if isNavigating}
		<!-- Unified Navigation Bar (Restored & Improved) -->
		<div class="nav-bar-unified">
			<div class="nav-info">
				<span class="nav-label">NAVIGATING TO</span>
				<div class="nav-target">{destinationName || 'Destination'}</div>
			</div>
			<div class="nav-actions">
				<button class="nav-btn stop-btn" on:click={onStopNavigation}>
					<span class="icon">✕</span> Stop<span class="btn-text-ext"> Navigation</span>
				</button>
			</div>
		</div>
	{/if}

	{#if arrivalInfo}
		<!-- Arrival Overlay (Celebratory) -->
		<div class="arrival-overlay">
			<div class="arrival-card">
				<div class="arrival-icon">🎉</div>
				<h2>You've Arrived!</h2>
				<p>You are now at <strong>{arrivalInfo.name}</strong></p>
				<button class="arrival-close-btn" on:click={() => (arrivalInfo = null)}> Dismiss </button>
			</div>
		</div>
	{/if}

	{#if !isNavigating}
		<!-- Modern Event List & Blocks -->
		<div class="sheet-handle" on:click={toggleMinimize}></div>

		<button class="expand-pill" on:click={toggleMinimize}>
			<span class="icon">🏢</span>
			<span class="text">Campus Hub</span>
		</button>

		<div class="content-wrapper">
			<header class="sidebar-header">
				<div class="header-main">
					<div class="header-text">
						<h2>Campus Hub</h2>
						<p>Explore events and locations</p>
					</div>
					<button class="collapse-btn" on:click={toggleMinimize} aria-label="Collapse">
						<span class="icon">✕</span>
					</button>
				</div>
			</header>

			{#if isLoading}
				<div class="loading-container">
					<div class="spinner"></div>
					<p>Loading your campus...</p>
				</div>
			{:else}
				<div class="sections-scroll">
					<!-- Events Section -->
					<section class="ui-section">
						<div class="section-title">
							<h3>Live Events</h3>
							<span class="count-badge">{events.length}</span>
						</div>

						<div class="cards-grid">
							{#each events as event}
								<div class="card event-card" on:click={() => handleEventClick(event)}>
									<div class="card-content">
										<div class="card-tag">Upcoming</div>
										<h4>{event.title}</h4>
										{#if event.description}
											<p>{event.description}</p>
										{/if}
										<div class="card-footer">
											{#if event.date}
												<span>📅 {event.date}</span>
											{/if}
											{#if event.location?.name}
												<span>📍 {event.location.name}</span>
											{/if}
										</div>
									</div>
									<button class="go-btn">Go</button>
								</div>
							{:else}
								<p class="empty-state">No events found today.</p>
							{/each}
						</div>
					</section>

					<!-- Blocks Section -->
					<section class="ui-section">
						<div class="section-title">
							<h3>Campus Blocks</h3>
						</div>

						<div class="blocks-flex">
							{#each blocks as block}
								<button class="block-chip" on:click={() => handleBlockClick(block)}>
									<span class="chip-icon">🏢</span>
									{block.name}
								</button>
							{/each}
						</div>
					</section>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	:root {
		--primary: #6366f1;
		--primary-dark: #4f46e5;
		--accent: #f43f5e;
		--bg-glass: rgba(255, 255, 255, 0.85);
		--border-glass: rgba(255, 255, 255, 0.3);
		--text-main: #1e293b;
		--text-muted: #64748b;
	}

	.sidebar-container {
		position: fixed;
		z-index: 1000;
		background: var(--bg-glass);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid var(--border-glass);
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1);
		transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);

		/* Desktop Default */
		top: 20px;
		right: 20px;
		width: 380px;
		height: calc(100vh - 40px);
		border-radius: 24px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	/* Sidebar Container States */
	.sidebar-container.minimized {
		/* Desktop Minimized (Floating Pill) */
		width: 140px;
		height: 48px;
		border-radius: 24px;
		padding: 0;
		cursor: pointer;
	}

	.sidebar-container.minimized .content-wrapper {
		display: none;
	}

	.sidebar-container.minimized .expand-pill {
		display: flex;
	}

	.expand-pill {
		display: none;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		height: 100%;
		border: none;
		background: transparent;
		color: var(--text-main);
		font-weight: 700;
		font-size: 14px;
		cursor: pointer;
	}

	/* Navigation Mode */
	.sidebar-container.navigating {
		height: auto;
		width: auto;
		min-width: 250px;
		padding: 0;
		background: transparent;
		backdrop-filter: none;
		border: none;
		box-shadow: none;
	}

	.nav-bar-unified {
		box-sizing: border-box;
		background: var(--bg-glass);
		backdrop-filter: blur(30px);
		-webkit-backdrop-filter: blur(30px);
		border: 1px solid var(--border-glass);
		padding: 5px 5px 5px 18px; /* Balanced, ultra-tight */
		border-radius: 100px; /* Perfect Pill */
		display: flex;
		align-items: center;
		gap: 12px;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
		width: fit-content;
		min-width: auto;
		pointer-events: auto;
	}

	@media (min-width: 769px) {
		.nav-bar-unified {
			padding: 8px 8px 8px 24px;
			gap: 24px;
			min-width: 280px;
		}
	}

	.nav-info {
		display: flex;
		flex-direction: column;
	}

	.nav-label {
		font-size: 9px; /* Smaller mobile lead */
		font-weight: 800;
		color: var(--primary);
		letter-spacing: 1px;
		line-height: 1;
		margin-bottom: 2px;
	}

	@media (min-width: 769px) {
		.nav-label {
			font-size: 10px;
		}
	}

	.nav-target {
		font-weight: 700;
		color: var(--text-main);
		font-size: 15px; /* Slightly smaller for compact feel */
		max-width: 110px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.2;
	}

	@media (min-width: 769px) {
		.nav-target {
			max-width: 200px;
			font-size: 18px;
		}
	}

	.nav-actions {
		display: flex;
		gap: 8px;
		margin-left: auto; /* Push to the right edge */
	}

	.nav-btn {
		height: 44px;
		border: none;
		border-radius: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		font-size: 14px;
		line-height: 1; /* Prevent vertical displacement */
	}

	.stop-btn {
		height: 34px; /* Ultra compact */
		padding: 0 16px;
		background: linear-gradient(135deg, var(--accent), #ff5a79);
		color: white;
		box-shadow: 0 4px 12px rgba(244, 63, 94, 0.25);
		letter-spacing: 0.3px;
		border-radius: 100px; /* Perfect Pill */
		font-size: 13px;
	}

	@media (min-width: 769px) {
		.stop-btn {
			height: 48px;
			padding: 0 24px;
			border-radius: 100px;
			font-size: 14px;
		}
	}

	.btn-text-ext {
		display: none;
	}

	@media (min-width: 769px) {
		.btn-text-ext {
			display: inline;
		}
	}

	.nav-btn .icon {
		font-size: 14px;
		opacity: 0.9;
	}

	@media (min-width: 769px) {
		.nav-btn .icon {
			font-size: 16px;
		}
	}

	.nav-btn:hover {
		transform: translateY(-2px);
		filter: brightness(1.15);
	}

	.nav-btn:active {
		transform: translateY(0) scale(0.96);
	}

	/* Arrival Overlay */
	.arrival-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
		padding: 20px;
	}

	.arrival-card {
		background: var(--bg-glass);
		border: 1px solid var(--border-glass);
		padding: 40px 30px;
		border-radius: 32px;
		text-align: center;
		max-width: 320px;
		width: 100%;
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
		animation: cardEntry 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	@keyframes cardEntry {
		from {
			opacity: 0;
			transform: scale(0.8) translateY(20px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.arrival-icon {
		font-size: 64px;
		margin-bottom: 20px;
	}

	.arrival-card h2 {
		margin: 0 0 10px 0;
		color: var(--text-main);
		font-size: 24px;
	}

	.arrival-card p {
		margin: 0 0 30px 0;
		color: var(--text-main);
		opacity: 0.8;
	}

	.arrival-close-btn {
		width: 100%;
		height: 54px;
		background: var(--primary);
		color: white;
		border: none;
		border-radius: 18px;
		font-weight: 700;
		font-size: 16px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.arrival-close-btn:hover {
		transform: scale(1.02);
		filter: brightness(1.1);
	}

	/* Sidebar Content Styles */
	.content-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 24px;
	}

	.sidebar-header .header-main {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 24px;
	}

	.sidebar-header h2 {
		margin: 0;
		font-size: 24px;
		font-weight: 800;
		color: var(--text-main);
		background: linear-gradient(135deg, var(--primary), #8b5cf6);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.collapse-btn {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: none;
		background: rgba(0, 0, 0, 0.05);
		color: var(--text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
	}

	.collapse-btn:hover {
		background: rgba(255, 59, 48, 0.1);
		color: var(--accent);
	}

	.sidebar-header p {
		margin: 4px 0 0 0;
		color: var(--text-muted);
		font-size: 14px;
	}

	.sections-scroll {
		flex: 1;
		overflow-y: auto;
		padding-right: 4px;
	}

	.sections-scroll::-webkit-scrollbar {
		width: 4px;
	}

	.sections-scroll::-webkit-scrollbar-thumb {
		background: rgba(0, 0, 0, 0.1);
		border-radius: 10px;
	}

	.ui-section {
		margin-bottom: 32px;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
	}

	.section-title h3 {
		margin: 0;
		font-size: 18px;
		font-weight: 700;
		color: var(--text-main);
	}

	.count-badge {
		background: var(--primary);
		color: white;
		padding: 2px 8px;
		border-radius: 20px;
		font-size: 11px;
		font-weight: 700;
	}

	/* Cards Grid */
	.cards-grid {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.card {
		position: relative;
		background: white;
		border-radius: 20px;
		padding: 20px;
		border: 1px solid rgba(0, 0, 0, 0.05);
		transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.event-card {
		background: linear-gradient(to right bottom, #ffffff, #f8fafc);
	}

	.card:hover {
		transform: scale(1.02);
		box-shadow: 0 15px 30px rgba(0, 0, 0, 0.08);
		border-color: var(--primary);
	}

	.card-content {
		flex: 1;
	}

	.card-tag {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--primary);
		margin-bottom: 8px;
	}

	.card h4 {
		margin: 0 0 6px 0;
		font-size: 16px;
		font-weight: 700;
		color: var(--text-main);
	}

	.card p {
		margin: 0 0 12px 0;
		font-size: 13px;
		color: var(--text-muted);
		line-height: 1.5;
	}

	.card-footer {
		display: flex;
		gap: 12px;
		font-size: 11px;
		color: var(--text-muted);
		font-weight: 500;
	}

	.go-btn {
		width: 44px;
		height: 44px;
		border: none;
		border-radius: 14px;
		background: linear-gradient(135deg, var(--primary), var(--primary-dark));
		color: white;
		font-weight: 700;
		box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
		cursor: pointer;
		margin-left: 16px;
	}

	/* Blocks Flex */
	.blocks-flex {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.block-chip {
		background: white;
		border: 1px solid rgba(0, 0, 0, 0.05);
		padding: 8px 16px;
		border-radius: 12px;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-main);
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 6px;
		transition: all 0.2s;
	}

	.block-chip:hover {
		background: var(--primary);
		color: white;
		transform: translateY(-2px);
	}

	/* Sheet Handle (Mobile) */
	.sheet-handle {
		display: none;
	}

	/* Mobile Adaptations (Bottom Sheet) */
	@media (max-width: 768px) {
		.sidebar-container {
			top: auto;
			right: 0;
			left: 0;
			bottom: 0;
			width: 100%;
			height: 70vh;
			border-radius: 32px 32px 0 0;
			transform: translateY(0);
		}

		.sidebar-container.minimized {
			transform: translateY(calc(70vh - 40px)); /* Lower than before, just the handle visible */
			width: 100%;
			height: 70vh;
			border-radius: 32px 32px 0 0;
		}

		.sidebar-container.minimized .expand-pill {
			display: none; /* Keep handle for mobile */
		}

		.sidebar-container.minimized .content-wrapper {
			display: none;
		}

		.sidebar-container.navigating {
			bottom: 30px;
			left: 16px;
			right: 16px;
			width: auto;
			transform: none;
		}

		.nav-bar-unified {
			width: 100%;
			justify-content: space-between;
			padding: 16px;
			border-radius: 24px;
		}

		.nav-target {
			max-width: 180px;
			font-size: 18px;
		}

		.sheet-handle {
			display: block;
			width: 50px;
			height: 6px;
			background: rgba(0, 0, 0, 0.1);
			margin: 12px auto;
			border-radius: 10px;
			cursor: pointer;
		}

		.content-wrapper {
			padding: 0 24px 24px 24px;
		}

		.sidebar-header h2 {
			font-size: 22px;
		}

		.card {
			padding: 16px;
		}
	}

	/* Loading Spinner */
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: var(--text-muted);
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid rgba(0, 0, 0, 0.05);
		border-top: 4px solid var(--primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 16px;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.empty-state {
		text-align: center;
		color: var(--text-muted);
		padding: 40px 0;
		font-style: italic;
	}
</style>
