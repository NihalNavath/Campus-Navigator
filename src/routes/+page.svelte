<script>
	import { onMount } from 'svelte';
	import Map from '$lib/components/Map.svelte';
	import EventsSidebar from '$lib/components/EventsSidebar.svelte';

	let mapComponent;

	function handleNavigation(coords, locationName) {
		if (mapComponent && coords) {
			console.log('Navigating to:', locationName, coords);
			mapComponent.navigateTo(coords);
		}
	}
</script>

<svelte:head>
	<title>Christ University Map Navigator</title>
	<meta name="description" content="Navigate the Christ University campus with GPS" />
</svelte:head>

<div class="app-container">
	<Map bind:this={mapComponent} />
	<EventsSidebar onNavigate={handleNavigation} />
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		overflow: hidden;
	}

	.app-container {
		position: relative;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
	}
</style>
