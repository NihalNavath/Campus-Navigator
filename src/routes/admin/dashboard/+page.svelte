<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let events = [];
	let loading = true;
	let showAddForm = false;
	let editingEvent = null;
	let useCustomLocation = false;

	// Predefined campus locations from GeoJSON
	const PREDEFINED_LOCATIONS = [
		{ name: 'Basketball 1', coords: [77.43716007569962, 12.86190057440364] },
		{ name: 'Basketball 2', coords: [77.43695467133065, 12.86180364615626] },
		{ name: 'Block 4', coords: [77.43917124814757, 12.86282069368337] },
		{ name: 'Chapel', coords: [77.4375183520711, 12.86039677223134] },
		{ name: 'Devadan Block', coords: [77.43917635330726, 12.86050490639038] },
		{ name: 'Devadan Football Ground', coords: [77.4409394715666, 12.85778588073384] },
		{ name: 'First block', coords: [77.4377560072327, 12.8631246191905] },
		{ name: 'Football and track Playground', coords: [77.43589525456464, 12.86121660231805] },
		{ name: 'Juice World', coords: [77.43953870753039, 12.86217888684644] },
		{ name: 'Long Jump', coords: [77.4358231768903, 12.86176763426339] },
		{ name: 'MBA Canteen', coords: [77.43773020834865, 12.86279278717707] },
		{ name: 'North Canteen', coords: [77.43887844453603, 12.85943205775281] },
		{ name: 'Open Auditorium', coords: [77.43856113753331, 12.86317436327717] },
		{ name: 'PU College', coords: [77.43743749523748, 12.8599352216635] },
		{ name: 'Tennis Court', coords: [77.43679823483333, 12.86118951507979] }
	];

	// Form fields
	let formData = {
		title: '',
		description: '',
		date: '',
		time: '',
		locationName: '',
		coordinates: []
	};

	onMount(async () => {
		await checkAuth();
		await loadEvents();
	});

	async function checkAuth() {
		const res = await fetch('/api/auth/me');
		if (!res.ok) {
			goto('/admin');
		}
	}

	async function loadEvents() {
		loading = true;
		try {
			const res = await fetch('/api/events');
			if (res.ok) {
				events = await res.json();
			}
		} catch (error) {
			console.error('Error loading events:', error);
		} finally {
			loading = false;
		}
	}

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		goto('/admin');
	}

	function showAdd() {
		resetForm();
		showAddForm = true;
		editingEvent = null;
	}

	function showEdit(event) {
		formData = {
			title: event.title,
			description: event.description || '',
			date: event.date || '',
			time: event.time || '',
			locationName: event.location?.name || '',
			coordinates: event.location?.coordinates || []
		};
		editingEvent = event;
		showAddForm = true;
	}

	function resetForm() {
		formData = {
			title: '',
			description: '',
			date: '',
			time: '',
			locationName: '',
			coordinates: []
		};
		useCustomLocation = false;
		showAddForm = false;
		editingEvent = null;
	}

	async function handleSubmit(e) {
		e.preventDefault();

		const eventData = {
			title: formData.title,
			description: formData.description,
			date: formData.date,
			time: formData.time,
			location: {
				name: formData.locationName,
				coordinates:
					formData.coordinates.length === 2
						? formData.coordinates
						: parseCoordinates(formData.coordinates)
			}
		};

		try {
			let res;
			if (editingEvent) {
				// Update
				res = await fetch(`/api/events/${editingEvent.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(eventData)
				});
			} else {
				// Create
				res = await fetch('/api/events', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(eventData)
				});
			}

			if (res.ok) {
				await loadEvents();
				resetForm();
			} else {
				const error = await res.json();
				alert(error.error || 'Failed to save event');
			}
		} catch (error) {
			console.error('Error saving event:', error);
			alert('Failed to save event');
		}
	}

	async function handleDelete(eventId) {
		if (!confirm('Are you sure you want to delete this event?')) return;

		try {
			const res = await fetch(`/api/events/${eventId}`, {
				method: 'DELETE'
			});

			if (res.ok) {
				await loadEvents();
			} else {
				alert('Failed to delete event');
			}
		} catch (error) {
			console.error('Error deleting event:', error);
			alert('Failed to delete event');
		}
	}

	function parseCoordinates(input) {
		if (Array.isArray(input)) return input;
		const parts = String(input)
			.split(',')
			.map((s) => parseFloat(s.trim()));
		return parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) ? parts : [];
	}

	function coordsToString(coords) {
		return Array.isArray(coords) && coords.length === 2 ? `${coords[0]}, ${coords[1]}` : '';
	}

	function selectLocation(location) {
		formData.locationName = location.name;
		formData.coordinates = location.coords;
		useCustomLocation = false;
	}
</script>

<svelte:head>
	<title>Admin Dashboard - Christ Map Navigator</title>
</svelte:head>

<div class="dashboard">
	<header class="header">
		<div class="header-content">
			<h1>Event Management</h1>
			<div class="header-actions">
				<a href="/" class="btn btn-secondary">View Map</a>
				<button on:click={handleLogout} class="btn btn-secondary">Logout</button>
			</div>
		</div>
	</header>

	<main class="main-content">
		<div class="controls">
			<button on:click={showAdd} class="btn btn-primary">+ Add Event</button>
		</div>

		{#if loading}
			<div class="loading">Loading events...</div>
		{:else if showAddForm}
			<div class="form-card">
				<h2>{editingEvent ? 'Edit Event' : 'Add New Event'}</h2>
				<form on:submit={handleSubmit}>
					<div class="form-row">
						<div class="form-group">
							<label for="title">Event Title *</label>
							<input
								id="title"
								type="text"
								bind:value={formData.title}
								placeholder="e.g., Nexus Event"
								required
							/>
						</div>
					</div>

					<div class="form-row">
						<div class="form-group">
							<label for="description">Description</label>
							<textarea
								id="description"
								bind:value={formData.description}
								placeholder="Event description..."
								rows="3"
							></textarea>
						</div>
					</div>

					<div class="form-row">
						<div class="form-group">
							<label for="date">Date</label>
							<input id="date" type="date" bind:value={formData.date} />
						</div>

						<div class="form-group">
							<label for="time">Time</label>
							<input id="time" type="time" bind:value={formData.time} />
						</div>
					</div>

					<div class="form-row">
						<div class="form-group full-width">
							<label>Location *</label>
							<div class="location-selector">
								<div class="location-buttons">
									{#each PREDEFINED_LOCATIONS as location}
										<button
											type="button"
											class="location-btn"
											class:active={formData.locationName === location.name && !useCustomLocation}
											on:click={() => selectLocation(location)}
										>
											📍 {location.name}
										</button>
									{/each}
									<button
										type="button"
										class="location-btn custom-btn"
										class:active={useCustomLocation}
										on:click={() => {
											useCustomLocation = true;
											formData.locationName = '';
											formData.coordinates = [];
										}}
									>
										➕ Custom Location
									</button>
								</div>

								{#if useCustomLocation}
									<div class="custom-location-inputs">
										<div class="form-group">
											<label for="customLocationName">Custom Location Name *</label>
											<input
												id="customLocationName"
												type="text"
												bind:value={formData.locationName}
												placeholder="e.g., Special Event Hall"
												required={useCustomLocation}
											/>
										</div>
										<div class="form-group">
											<label for="customCoordinates">Coordinates (longitude, latitude) *</label>
											<input
												id="customCoordinates"
												type="text"
												value={coordsToString(formData.coordinates)}
												on:input={(e) => (formData.coordinates = e.target.value)}
												placeholder="e.g., 77.43716, 12.86190"
												required={useCustomLocation}
											/>
											<small>Find coordinates by clicking on the map</small>
										</div>
									</div>
								{/if}

								{#if formData.locationName && !useCustomLocation}
									<div class="selected-location">
										✅ Selected: <strong>{formData.locationName}</strong>
									</div>
								{/if}
							</div>
						</div>
					</div>

					<div class="form-actions">
						<button type="button" on:click={resetForm} class="btn btn-secondary">Cancel</button>
						<button type="submit" class="btn btn-primary">
							{editingEvent ? 'Update Event' : 'Create Event'}
						</button>
					</div>
				</form>
			</div>
		{/if}

		<div class="events-list">
			<h2>All Events ({events.length})</h2>

			{#if events.length === 0}
				<div class="empty-state">
					<p>No events found. Create your first event!</p>
				</div>
			{:else}
				<div class="events-grid">
					{#each events as event}
						<div class="event-card">
							<div class="event-header">
								<h3>{event.title}</h3>
								<div class="event-actions">
									<button on:click={() => showEdit(event)} class="icon-btn" title="Edit">
										✏️
									</button>
									<button on:click={() => handleDelete(event.id)} class="icon-btn" title="Delete">
										🗑️
									</button>
								</div>
							</div>

							{#if event.description}
								<p class="event-description">{event.description}</p>
							{/if}

							<div class="event-meta">
								{#if event.date}
									<div class="meta-item">📅 {event.date}</div>
								{/if}
								{#if event.time}
									<div class="meta-item">🕐 {event.time}</div>
								{/if}
								{#if event.location?.name}
									<div class="meta-item">📍 {event.location.name}</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #f7fafc;
	}

	.dashboard {
		min-height: 100vh;
	}

	.header {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 24px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header h1 {
		margin: 0;
		font-size: 28px;
		font-weight: 700;
	}

	.header-actions {
		display: flex;
		gap: 12px;
	}

	.main-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 32px 24px;
	}

	.controls {
		margin-bottom: 24px;
	}

	.btn {
		padding: 10px 20px;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
		display: inline-block;
	}

	.btn-primary {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
	}

	.btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
	}

	.btn-secondary {
		background: white;
		color: #667eea;
		border: 2px solid #667eea;
	}

	.btn-secondary:hover {
		background: #f7fafc;
	}

	.form-card {
		background: white;
		border-radius: 12px;
		padding: 32px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		margin-bottom: 32px;
	}

	.form-card h2 {
		margin: 0 0 24px 0;
		font-size: 22px;
		color: #1a202c;
	}

	.form-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 16px;
		margin-bottom: 16px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
	}

	.form-group label {
		font-size: 14px;
		font-weight: 600;
		color: #2d3748;
		margin-bottom: 8px;
	}

	.form-group input,
	.form-group textarea {
		padding: 10px 14px;
		border: 2px solid #e2e8f0;
		border-radius: 8px;
		font-size: 14px;
		transition: all 0.2s;
		font-family: inherit;
	}

	.form-group input:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: #667eea;
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
	}

	.form-group small {
		font-size: 12px;
		color: #718096;
		margin-top: 4px;
	}

	.form-group.full-width {
		grid-column: 1 / -1;
	}

	.location-selector {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.location-buttons {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 10px;
	}

	.location-btn {
		padding: 10px 14px;
		border: 2px solid #e2e8f0;
		background: white;
		border-radius: 8px;
		font-size: 13px;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
		font-weight: 500;
		color: #2d3748;
	}

	.location-btn:hover {
		border-color: #667eea;
		background: #f7fafc;
	}

	.location-btn.active {
		border-color: #667eea;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}

	.location-btn.custom-btn {
		background: #f7fafc;
		font-weight: 600;
	}

	.custom-location-inputs {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
		padding: 16px;
		background: #f7fafc;
		border-radius: 8px;
		border: 2px dashed #cbd5e0;
	}

	.selected-location {
		padding: 12px 16px;
		background: #f0fff4;
		border: 2px solid #9ae6b4;
		border-radius: 8px;
		color: #22543d;
		font-size: 14px;
	}

	.form-actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
		margin-top: 24px;
	}

	.events-list {
		background: white;
		border-radius: 12px;
		padding: 32px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.events-list h2 {
		margin: 0 0 24px 0;
		font-size: 22px;
		color: #1a202c;
	}

	.events-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 20px;
	}

	.event-card {
		border: 2px solid #e2e8f0;
		border-radius: 10px;
		padding: 20px;
		transition: all 0.2s;
	}

	.event-card:hover {
		border-color: #667eea;
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
	}

	.event-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 12px;
	}

	.event-header h3 {
		margin: 0;
		font-size: 18px;
		color: #1a202c;
		flex: 1;
	}

	.event-actions {
		display: flex;
		gap: 8px;
	}

	.icon-btn {
		background: none;
		border: none;
		font-size: 18px;
		cursor: pointer;
		padding: 4px;
		opacity: 0.7;
		transition: opacity 0.2s;
	}

	.icon-btn:hover {
		opacity: 1;
	}

	.event-description {
		color: #4a5568;
		font-size: 14px;
		line-height: 1.5;
		margin: 0 0 12px 0;
	}

	.event-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}

	.meta-item {
		font-size: 13px;
		color: #718096;
	}

	.empty-state {
		text-align: center;
		padding: 60px 20px;
		color: #a0aec0;
	}

	.loading {
		text-align: center;
		padding: 60px 20px;
		color: #718096;
		font-size: 16px;
	}

	@media (max-width: 768px) {
		.header-content {
			flex-direction: column;
			gap: 16px;
			align-items: flex-start;
		}

		.events-grid {
			grid-template-columns: 1fr;
		}

		.location-buttons {
			grid-template-columns: 1fr;
		}

		.custom-location-inputs {
			grid-template-columns: 1fr;
		}
	}
</style>
