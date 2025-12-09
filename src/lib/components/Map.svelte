<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	// --- CONFIGURATION ---
	const CONFIG = {
		MAX_ZOOM: 20, // Clear limit for satellite imagery
		MIN_ZOOM: 16, // Keep context but don't allow zooming out too far
		DEFAULT_PITCH: 30, // Comfortable viewing angle
		TERRAIN_EXAGGERATION: 1.0, // Realistic terrain
		ANIMATION_DURATION: 2000,
		ACCESS_TOKEN:
			'pk.eyJ1IjoiYW50cmlhbSIsImEiOiJjbWh2d2NiaGowMG9rMmtyN3Bkc3JnaThwIn0.iFHfpZ6plljq9I_HTwD_pQ'
	};

	let map;
	let mapboxgl;
	let userMarker = null;
	let destinationMarker = null; // Dynamic Destination Marker
	let watchId = null;
	let isNavigating = false; // Track if auto-tracking is active
	let showRecenterBtn = false; // UI State
	let isManualLocation = false; // Manual override flag

	/* ---------------------------------------------------------
     EXPORTED METHOD
  --------------------------------------------------------- */
	export function navigateTo(targetCoords) {
		startNavigation(); // Enable tracking state

		// Add Dynamic Destination Marker
		if (destinationMarker) destinationMarker.remove();
		destinationMarker = new mapboxgl.Marker({ color: '#ff4444' })
			.setLngLat(targetCoords)
			.setPopup(new mapboxgl.Popup().setHTML(`<b>Destination</b>`))
			.addTo(map);
		destinationMarker.togglePopup(); // Show it immediately

		// If we know where the user is, immediately calculate route
		if (userMarker) {
			const userCoords = [userMarker.getLngLat().lng, userMarker.getLngLat().lat];
			getRoute(userCoords, targetCoords);
		} else {
			// Fallback: wait for GPS
			if (!navigator.geolocation) {
				alert('Your device does not support GPS.');
				return;
			}
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					const userCoords = [pos.coords.longitude, pos.coords.latitude];
					getRoute(userCoords, targetCoords);
				},
				() => alert('Enable GPS to get directions'),
				{ enableHighAccuracy: true }
			);
		}
	}

	/* ---------------------------------------------------------
     LIFECYCLE
  --------------------------------------------------------- */
	onMount(() => {
		const script = document.createElement('script');
		script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.js';
		script.onload = initMap;
		document.body.appendChild(script);
	});

	onDestroy(() => {
		if (watchId) navigator.geolocation.clearWatch(watchId);
		if (map) map.remove();
	});

	/* ---------------------------------------------------------
     INIT MAP
  --------------------------------------------------------- */
	function initMap() {
		mapboxgl = window.mapboxgl;
		mapboxgl.accessToken = CONFIG.ACCESS_TOKEN;

		map = new mapboxgl.Map({
			container: 'map',
			style: 'mapbox://styles/mapbox/satellite-streets-v12',
			center: [77.4395, 12.8622], // Christ University campus center
			zoom: 18,
			maxZoom: CONFIG.MAX_ZOOM,
			minZoom: CONFIG.MIN_ZOOM,
			pitch: CONFIG.DEFAULT_PITCH,
			bearing: 0,
			attributionControl: false,
			cooperativeGestures: true, // Require Ctrl + Scroll to zoom (better for trackpads)
			maxBounds: [
				[77.42, 12.84], // southwest - Much wider bounds
				[77.46, 12.88] // northeast - Much wider bounds
			]
		});

		map.addControl(new mapboxgl.NavigationControl(), 'top-right');
		map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

		map.on('load', () => {
			loadCampusLayers();
			loadTerrainAndSky();
			// loadEventMarker(); // REMOVED HARDCODED MARKER
			startLiveTracking();
			dispatch('ready');
		});

		// Initial ease-in
		map.easeTo({
			pitch: CONFIG.DEFAULT_PITCH,
			bearing: 0,
			duration: CONFIG.ANIMATION_DURATION
		});

		// --- INTERACTION HANDLING ---
		// Stop tracking if user manually moves the map
		map.on('dragstart', handleUserInteraction);
		map.on('zoomstart', handleUserInteraction);
		map.on('pitchstart', handleUserInteraction);
	}

	function handleUserInteraction(e) {
		// Only stop interaction if it originated from the user (touch/mouse)
		if (e && e.originalEvent && isNavigating) {
			stopNavigation();
		}
	}

	function startNavigation() {
		isNavigating = true;
		showRecenterBtn = false;
	}

	function stopNavigation() {
		isNavigating = false;
		showRecenterBtn = true;
	}

	function handleRecenter() {
		isManualLocation = false; // Resume GPS
		if (userMarker) {
			const pos = userMarker.getLngLat();
			map.flyTo({
				center: pos,
				zoom: 19,
				pitch: CONFIG.DEFAULT_PITCH,
				bearing: 0,
				speed: 1.2, // Make it look like a smooth flight
				curve: 1.42
			});
			startNavigation();
		} else {
			alert('Waiting for GPS location...');
		}
	}

	/* ---------------------------------------------------------
     GPS TRACKING
  --------------------------------------------------------- */
	function startLiveTracking() {
		if (!navigator.geolocation) return;

		// Initialize Accuracy Source & Layer
		if (!map.getSource('user-accuracy')) {
			map.addSource('user-accuracy', {
				type: 'geojson',
				data: { type: 'FeatureCollection', features: [] }
			});
			map.addLayer(
				{
					id: 'user-accuracy-fill',
					type: 'fill',
					source: 'user-accuracy',
					paint: {
						'fill-color': '#00aaff',
						'fill-opacity': 0.15
					}
				},
				'campus-labels'
			); // Put below labels
		}

		watchId = navigator.geolocation.watchPosition(
			(pos) => {
				const lng = pos.coords.longitude;
				const lat = pos.coords.latitude;
				const heading = pos.coords.heading;
				const accuracy = pos.coords.accuracy; // Accuracy in meters

				const userPos = [lng, lat];

				// Update or Create Marker
				if (!userMarker) {
					const el = document.createElement('div');
					el.className = 'user-marker-glow';
					userMarker = new mapboxgl.Marker({ element: el, draggable: true })
						.setLngLat(userPos)
						.addTo(map);

					userMarker.on('dragstart', () => {
						isManualLocation = true;
						stopNavigation();
					});
				} else {
					if (!isManualLocation) {
						userMarker.setLngLat(userPos);
					}
				}

				// Accuracy Circle Logic
				if (isManualLocation) {
					const source = map.getSource('user-accuracy');
					if (source) source.setData({ type: 'FeatureCollection', features: [] });
				} else if (accuracy) {
					const circleGeo = createGeoJSONCircle([lng, lat], accuracy / 1000);
					const source = map.getSource('user-accuracy');
					if (source) source.setData(circleGeo);
				}

				// Follow User if Navigating
				if (isNavigating && !isManualLocation) {
					map.easeTo({
						center: userPos,
						bearing: heading ?? 0,
						duration: 1000,
						easing: (t) => t
					});
				}
			},
			(err) => console.error('GPS Error:', err),
			{ enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
		);
	}

	// Helper: Create a circular polygon around a point
	function createGeoJSONCircle(center, radiusInKm, points = 64) {
		const coords = { longitude: center[0], latitude: center[1] };
		const km = radiusInKm;
		const ret = [];
		const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
		const distanceY = km / 110.574;

		let theta, x, y;
		for (let i = 0; i < points; i++) {
			theta = (i / points) * (2 * Math.PI);
			x = distanceX * Math.cos(theta);
			y = distanceY * Math.sin(theta);
			ret.push([coords.longitude + x, coords.latitude + y]);
		}
		ret.push(ret[0]); // Close the ring

		return {
			type: 'Feature',
			geometry: {
				type: 'Polygon',
				coordinates: [ret]
			}
		};
	}

	/* ---------------------------------------------------------
     LOADERS & LAYERS
  --------------------------------------------------------- */
	function loadCampusLayers() {
		map.addSource('campus', {
			type: 'geojson',
			data: '/map_main.geojson'
		});

		// 1. Polygons Fill
		map.addLayer({
			id: 'campus-fill',
			type: 'fill',
			source: 'campus',
			filter: ['==', '$type', 'Polygon'], // Explicitly only polygons
			paint: {
				'fill-color': ['get', 'color'],
				'fill-opacity': 0.5
			}
		});

		// 2. Polygon Outlines
		map.addLayer({
			id: 'campus-outline',
			type: 'line',
			source: 'campus',
			filter: ['==', '$type', 'Polygon'],
			paint: {
				'line-color': '#ffffff',
				'line-width': 1.5
			}
		});

		// 3. Paths (LineStrings) - Make them POP
		map.addLayer({
			id: 'campus-paths',
			type: 'line',
			source: 'campus',
			filter: ['==', '$type', 'LineString'],
			layout: {
				'line-join': 'round',
				'line-cap': 'round'
			},
			paint: {
				'line-color': '#ffcc00', // Bright Yellow
				'line-width': 4,
				'line-opacity': 0.9
			}
		});

		map.addLayer({
			id: 'campus-labels',
			type: 'symbol',
			source: 'campus',
			layout: {
				'text-field': ['get', 'name'],
				'text-size': 13,
				'text-offset': [0, 1],
				'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold']
			},
			paint: {
				'text-color': '#ffffff',
				'text-halo-color': 'rgba(0,0,0,0.8)',
				'text-halo-width': 1.5
			}
		});

		// Click Handler
		map.on('click', 'campus-fill', (e) => {
			const feature = e.features[0];
			const name = feature.properties.name;
			if (!name) return;

			// Center calculation (naive)
			const coordinates = feature.geometry.coordinates[0];
			const center = coordinates[0]; // Simplified center for demo

			dispatch('selectBuilding', { name, properties: feature.properties, coordinates: center });

			new mapboxgl.Popup({ offset: 25 })
				.setLngLat(e.lngLat)
				.setHTML(`<b>${name}</b><br><button id="btn-go" class="popup-btn">Go Here</button>`)
				.addTo(map);

			setTimeout(() => {
				const btn = document.getElementById('btn-go');
				if (btn) btn.onclick = () => navigateTo(center);
			}, 50);
		});
	}

	function loadTerrainAndSky() {
		map.addSource('mapbox-dem', {
			type: 'raster-dem',
			url: 'mapbox://mapbox.terrain-rgb',
			tileSize: 512,
			maxzoom: 14
		});
		map.setTerrain({ source: 'mapbox-dem', exaggeration: CONFIG.TERRAIN_EXAGGERATION });

		map.addLayer({
			id: 'sky',
			type: 'sky',
			paint: {
				'sky-type': 'atmosphere',
				'sky-atmosphere-sun': [0.0, 0.0],
				'sky-atmosphere-sun-intensity': 15
			}
		});
	}

	/* ---------------------------------------------------------
     ROUTING
  --------------------------------------------------------- */
	async function getRoute(start, end) {
		try {
			const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`;
			const res = await fetch(url);
			const data = await res.json();

			if (!data.routes || !data.routes.length) {
				alert('No route found.');
				return;
			}

			const route = data.routes[0].geometry.coordinates;
			const geojson = { type: 'Feature', geometry: { type: 'LineString', coordinates: route } };

			if (map.getSource('route')) {
				map.getSource('route').setData(geojson);
			} else {
				map.addLayer({
					id: 'route',
					type: 'line',
					source: { type: 'geojson', data: geojson },
					layout: {
						'line-join': 'round',
						'line-cap': 'round'
					},
					paint: {
						'line-color': '#00aaff',
						'line-width': 6,
						'line-opacity': 0.8
					}
				});
			}

			// Fit bounds to show route
			const bounds = new mapboxgl.LngLatBounds();
			route.forEach((p) => bounds.extend(p));
			map.fitBounds(bounds, { padding: 100, duration: 1500 });
		} catch (err) {
			console.error(err);
		}
	}
</script>

<div id="map"></div>

<!-- Custom UI Elements -->
{#if showRecenterBtn}
	<button class="recenter-btn" on:click={handleRecenter}> Recenter </button>
{/if}

<link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.css" />

<style>
	#map {
		width: 100vw;
		height: 100vh;
	}

	/* Floating Recenter Button */
	.recenter-btn {
		position: absolute;
		bottom: 30px;
		left: 50%;
		transform: translateX(-50%);
		background: #ffffff;
		color: #333;
		border: none;
		padding: 12px 24px;
		border-radius: 30px;
		font-weight: 600;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		cursor: pointer;
		z-index: 10;
		transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.recenter-btn:hover {
		transform: translateX(-50%) scale(1.05);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
		background: #f8f9fa;
	}

	.recenter-btn:active {
		transform: translateX(-50%) scale(0.95);
	}

	/* Custom Marker Styling */
	:global(.user-marker-glow) {
		width: 20px;
		height: 20px;
		background-color: #00aaff;
		border-radius: 50%;
		border: 3px solid white;
		box-shadow: 0 0 0 rgba(0, 170, 255, 0.4);
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0% {
			box-shadow: 0 0 0 0 rgba(0, 170, 255, 0.7);
		}
		70% {
			box-shadow: 0 0 0 15px rgba(0, 170, 255, 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(0, 170, 255, 0);
		}
	}

	/* Popup Button Styling */
	:global(.popup-btn) {
		margin-top: 5px;
		background: #00aaff;
		color: white;
		border: none;
		padding: 5px 10px;
		border-radius: 4px;
		cursor: pointer;
		width: 100%;
	}

	/* Hide the "Use Ctrl + scroll to zoom" message */
	:global(.mapboxgl-ctrl-message) {
		display: none !important;
	}
</style>
