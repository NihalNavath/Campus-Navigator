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
		ACCESS_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN
	};

	let map;
	let mapboxgl;
	let userMarker = null;
	let destinationMarker = null; // Dynamic Destination Marker
	let watchId = null;
	export let isNavigating = false; // Track if auto-tracking is active
	export let showRecenterBtn = false; // UI State
	export let isManualLocation = false; // Manual override flag

	let navInterval;
	let currentDestination = null;

	/* ---------------------------------------------------------
     EXPORTED METHOD
  --------------------------------------------------------- */
	export function navigateTo(targetCoords, locationName = 'Destination') {
		if (!map || !mapboxgl) return;
		startNavigation(locationName); // Pass name to state

		// Add Dynamic Destination Marker
		if (destinationMarker) destinationMarker.remove();
		destinationMarker = new mapboxgl.Marker({ color: '#ff4444' })
			.setLngLat(targetCoords)
			.setPopup(new mapboxgl.Popup().setHTML(`<b>${locationName}</b>`))
			.addTo(map);
		destinationMarker.togglePopup(); // Show it immediately

		// If we know where the user is, immediately calculate route and focus on user
		if (userMarker) {
			currentDestination = targetCoords;
			const userPos = userMarker.getLngLat();
			const userCoords = [userPos.lng, userPos.lat];

			// Initial focus: Go directly to user location at high zoom
			map.flyTo({
				center: userCoords,
				zoom: 19,
				pitch: CONFIG.DEFAULT_PITCH,
				bearing: 0,
				speed: 1.5,
				curve: 1
			});

			getRoute(userCoords, targetCoords, false); // Fetch route but don't force overview
		} else {
			// Fallback: wait for GPS
			if (!navigator.geolocation) {
				alert('Your device does not support GPS.');
				return;
			}
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					const userCoords = [pos.coords.longitude, pos.coords.latitude];
					map.flyTo({ center: userCoords, zoom: 19 });
					getRoute(userCoords, targetCoords, false);
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
		if (navInterval) clearInterval(navInterval);
		if (map) map.remove();
	});

	/* ---------------------------------------------------------
     INIT MAP
  --------------------------------------------------------- */
	function initMap() {
		mapboxgl = window.mapboxgl;
		const token = CONFIG.ACCESS_TOKEN;

		if (!token || token === 'undefined') {
			console.error('Mapbox Access Token is missing or undefined.');
			alert(
				'Mapbox Token Missing! 🛑\n\nPlease ensure you have a .env file with VITE_MAPBOX_TOKEN correctly set and restart your terminal.'
			);
			return;
		}

		mapboxgl.accessToken = token;

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
		// Only show recenter button if the interaction originated from the user (touch/mouse)
		if (e && e.originalEvent && !isManualLocation) {
			isManualLocation = true;
			showRecenterBtn = true;
		}
	}

	export function startNavigation(locationName = 'Destination') {
		if (!map) return;
		isNavigating = true;
		showRecenterBtn = false;

		// Dispatch event to parent
		dispatch('navigationStart', { name: locationName });

		// Close any open popups to reduce clutter
		const popups = document.getElementsByClassName('mapboxgl-popup');
		if (popups.length) {
			for (let i = 0; i < popups.length; i++) {
				popups[i].remove();
			}
		}

		// Clear existing interval if any
		if (navInterval) clearInterval(navInterval);

		// Start dynamic route updates (don't move camera focus)
		// Reduced frequency (10s) to save battery/resources
		navInterval = setInterval(() => {
			if (isNavigating && userMarker && currentDestination) {
				const userPos = userMarker.getLngLat().toArray();
				getRoute(userPos, currentDestination, false);
			}
		}, 10000); // 10 seconds is plenty for walking speed
	}

	export function stopNavigation() {
		isNavigating = false;
		showRecenterBtn = true;

		// Dispatch event to parent
		dispatch('navigationEnd');

		if (navInterval) {
			clearInterval(navInterval);
			navInterval = null;
		}

		// Clear Destination Marker
		if (destinationMarker) {
			destinationMarker.remove();
			destinationMarker = null;
		}

		// Clear the route line
		if (map && map.getSource('route')) {
			map.getSource('route').setData({
				type: 'Feature',
				properties: {},
				geometry: {
					type: 'LineString',
					coordinates: []
				}
			});
		}
	}

	export function handleRecenter() {
		isManualLocation = false; // Resume GPS
		showRecenterBtn = false;

		if (userMarker) {
			const pos = userMarker.getLngLat();
			const currentZoom = map.getZoom();
			map.flyTo({
				center: pos,
				zoom: Math.max(currentZoom, 19), // Don't zoom out if already closer
				pitch: CONFIG.DEFAULT_PITCH,
				bearing: 0,
				speed: 1.2,
				curve: 1.42
			});
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
					const circleFeature = createGeoJSONCircle([lng, lat], accuracy / 1000);
					const source = map.getSource('user-accuracy');
					if (source) {
						source.setData({
							type: 'FeatureCollection',
							features: [circleFeature]
						});
					}
				}

				// Follow User if Navigating
				if (isNavigating && !isManualLocation) {
					map.easeTo({
						center: userPos,
						bearing: heading ?? 0,
						duration: 1000,
						easing: (t) => t
					});

					// Arrival Detection
					if (currentDestination) {
						const dist = getDistance(userPos, currentDestination);

						if (dist < 15) {
							// 15 meters
							dispatch('arrival', { destinationName });
							stopNavigation();
						}
					}
				}
			},
			(err) => {
				console.error('GPS Error:', err);
				if (err.code === 1) alert('Please enable Location permissions to use navigation.');
			},
			{ enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
		);
	}

	// Haversine formula to calculate distance in meters
	function getDistance(coord1, coord2) {
		const R = 6371000; // Radius of Earth in meters
		const dLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
		const dLon = ((coord2[0] - coord1[0]) * Math.PI) / 180;
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos((coord1[1] * Math.PI) / 180) *
				Math.cos((coord2[1] * Math.PI) / 180) *
				Math.sin(dLon / 2) *
				Math.sin(dLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
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
		const now = new Date().getTime();
		map.addSource('campus', {
			type: 'geojson',
			data: `/map_main.geojson?t=${now}`
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
				'line-color': '#D3D3D3',
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

			// Use destination property if available, otherwise use polygon center
			let targetCoords;
			const dest = feature.properties.destination;

			if (dest) {
				try {
					const parsedDest = typeof dest === 'string' ? JSON.parse(dest) : dest;
					if (Array.isArray(parsedDest) && parsedDest.length >= 2) {
						targetCoords = [Number(parsedDest[0]), Number(parsedDest[1])];
						console.log(`✓ Map click ${name}: Using precise destination`, targetCoords);
					}
				} catch (err) {
					console.warn('Error parsing destination:', err);
				}
			}

			if (!targetCoords) {
				// Fallback: use first coordinate of polygon (remove elevation if present)
				const coordinates = feature.geometry.coordinates[0];
				const firstCoord = coordinates[0];
				targetCoords = Array.isArray(firstCoord) ? firstCoord.slice(0, 2) : firstCoord;
				console.log(`⚠ Map click ${name}: Using fallback coords`, targetCoords);
			}

			dispatch('selectBuilding', {
				name,
				properties: feature.properties,
				coordinates: targetCoords
			});

			new mapboxgl.Popup({ offset: 25 })
				.setLngLat(e.lngLat)
				.setHTML(`<b>${name}</b><br><button id="btn-go" class="popup-btn">Go Here</button>`)
				.addTo(map);

			setTimeout(() => {
				const btn = document.getElementById('btn-go');
				if (btn) btn.onclick = () => navigateTo(targetCoords, name);
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
	async function getRoute(start, end, fitToRoute = false) {
		if (!map || !map.getStyle()) return;
		try {
			const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`;
			const res = await fetch(url);
			const data = await res.json();

			if (!data.routes || !data.routes.length) {
				alert('No route found.');
				return;
			}

			const rawCoords = data.routes[0].geometry.coordinates;

			// Extend the route to the exact destination point
			if (end && Array.isArray(end) && end.length >= 2) {
				const lastPoint = rawCoords[rawCoords.length - 1];
				const isDifferent =
					Math.abs(lastPoint[0] - end[0]) > 0.000001 || Math.abs(lastPoint[1] - end[1]) > 0.000001;

				if (isDifferent) {
					rawCoords.push(end);
				}
			}

			const geojson = {
				type: 'Feature',
				properties: {},
				geometry: {
					type: 'LineString',
					coordinates: rawCoords
				}
			};

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

			// Fit bounds to show route only if requested (e.g., at start of navigation)
			if (fitToRoute) {
				const bounds = new mapboxgl.LngLatBounds();
				geojson.geometry.coordinates.forEach((p) => bounds.extend(p));
				// Use more conservative padding and a maxZoom to avoid "big view" zoom outs
				map.fitBounds(bounds, {
					padding: { top: 60, bottom: 120, left: 60, right: 60 }, // More space at bottom for UI
					duration: 1500,
					maxZoom: 19 // Prevent zooming out too far for short routes
				});
			}
		} catch (err) {
			console.error(err);
		}
	}
</script>

<div id="map"></div>

<!-- Custom UI Elements -->
{#if showRecenterBtn}
	<button class="recenter-btn" on:click={handleRecenter} aria-label="Recenter Map">
		<span class="icon">🎯</span>
	</button>
{/if}

<link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.css" />

<style>
	#map {
		width: 100vw;
		height: 100vh;
	}

	/* Floating Recenter Button (G-Maps Style) */
	.recenter-btn {
		position: absolute;
		bottom: 120px; /* Elevated to sit above bottom sheet/nav bar */
		right: 20px;
		width: 52px;
		height: 52px;
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		color: var(--primary, #6366f1);
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 50%;
		font-weight: 600;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
		cursor: pointer;
		z-index: 999;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
	}

	.recenter-btn .icon {
		font-size: 24px;
	}

	.recenter-btn:hover {
		transform: scale(1.1);
		background: #ffffff;
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
	}

	.recenter-btn:active {
		transform: scale(0.9);
	}

	/* Desktop adjustment for recenter */
	@media (min-width: 769px) {
		.recenter-btn {
			bottom: 30px;
			right: 420px; /* Positioned relative to the wider sidebar */
		}
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
