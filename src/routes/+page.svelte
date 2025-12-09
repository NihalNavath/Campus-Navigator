<script>
	import { onMount } from 'svelte';
	import Map from '$lib/components/Map.svelte';
	import EventsSidebar from '$lib/components/EventsSidebar.svelte';
	import SubVenuePopup from '$lib/components/SubVenuePopup.svelte';

	let mapComponent;

	// Sub-venue popup state
	let showSubVenuePopup = false;
	let selectedBlockName = '';
	let currentSubVenues = [];

	// Whitelist of blocks allowed to show the popup
	const allowedBlocks = [
		'Block 1',
		'Block 2',
		'Block 3',
		'Block 4',
		'Devadan Block',
		'Block 5',
		'Block 6',
		'Architecture Block'
	];

	// Dummy data for blocks
	const SubVenues = {
		'Block 1': ['Auditorium', 'MBA Library', 'Admissions Office'],
		'Block 2': ['Seminar Hall', "Dean's Office", 'Faculty Cabins'],
		'Block 3': ['Auditorium', 'Health Center'],
		'Block 4': ['Library', 'South Canteen', 'Stationery Shop', 'Gym'],
		'Block 5': ['Incubation Cell', 'LG Labs', 'Centre of Excellence'],
		'Block 6': ['Physics Lab', 'Mech Labs'],
		'Architecture Block': ['Design Studio', 'Model Making Room', 'Crystal Block']
	};

	function getSubVenues(blockName) {
		// Return specific venues if defined
		return SubVenues[blockName];
	}

	function handleNavigation(coords, locationName) {
		if (mapComponent && coords) {
			console.log('Navigating to:', locationName, coords);
			mapComponent.navigateTo(coords);
		}
	}

	function handleBlockSelection(event) {
		const { name } = event.detail;

		// Checking if the location is in the allowed list for idsplaying sub venue pop up
		const isAllowed = allowedBlocks.some((b) => b.toLowerCase() === name.toLowerCase());

		if (isAllowed) {
			selectedBlockName = name;
			currentSubVenues = getSubVenues(name);
			showSubVenuePopup = true;
		} else {
			showSubVenuePopup = false;
		}
	}

	function closeSubVenuePopup() {
		showSubVenuePopup = false;
	}
</script>

<svelte:head>
	<title>Christ University Map Navigator</title>
	<meta name="description" content="Navigate the Christ University campus with GPS" />
</svelte:head>

<div class="app-container">
	<Map bind:this={mapComponent} on:selectBuilding={handleBlockSelection} />
	<EventsSidebar onNavigate={handleNavigation} />
	<SubVenuePopup
		visible={showSubVenuePopup}
		blockName={selectedBlockName}
		subVenues={currentSubVenues}
		onClose={closeSubVenuePopup}
	/>
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
