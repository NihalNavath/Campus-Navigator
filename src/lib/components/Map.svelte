<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	let map;
	let mapboxgl;
	let userMarker = null;
	let watchId = null;
	let isNavigating = false; // Track if user is actively navigating

	/* ---------------------------------------------------------
     EXPORTED METHOD — This is called from +page.svelte
     Example usage: mapRef.navigateTo([lng, lat])
  --------------------------------------------------------- */
	export function navigateTo(targetCoords) {
		isNavigating = true; // Enable location following

		// Use already-tracked location for instant navigation
		if (userMarker) {
			const userCoords = [userMarker.getLngLat().lng, userMarker.getLngLat().lat];
			getRoute(userCoords, targetCoords);
		} else {
			// Fallback: get GPS if user location not tracked yet
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
     INIT MAP
  --------------------------------------------------------- */
	onMount(() => {
		const script = document.createElement('script');
		script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.js';
		script.onload = initMap;
		document.body.appendChild(script);
	});

	function initMap() {
		mapboxgl = window.mapboxgl;

		mapboxgl.accessToken =
			'pk.eyJ1IjoiYW50cmlhbSIsImEiOiJjbWh2d2NiaGowMG9rMmtyN3Bkc3JnaThwIn0.iFHfpZ6plljq9I_HTwD_pQ';

		map = new mapboxgl.Map({
			container: 'map',
			style: 'mapbox://styles/mapbox/satellite-streets-v12', // Optimized for walking navigation
			center: [77.4395, 12.8622], // Christ University campus center
			zoom: 18,
			maxZoom: 22,
			pitch: 45, // Less tilted for better navigation
			bearing: 0, // North-up orientation
			maxBounds: [
				[77.435, 12.859], // southwest [lng, lat] - tighter bounds
				[77.444, 12.865] // northeast [lng, lat] - campus + small buffer
			]
		});

		map.addControl(new mapboxgl.NavigationControl());

		map.on('load', () => {
			loadCampusLayers();
			loadTerrainAndSky();
			loadEventMarker();
			startLiveTracking(); // REALTIME LIVE TRACKING
			dispatch('ready');
		});

		map.easeTo({
			pitch: 45,
			bearing: 0,
			duration: 2000
		});
	}

	/* ---------------------------------------------------------
     GOOGLE MAPS STYLE LIVE LOCATION
  --------------------------------------------------------- */
	function startLiveTracking() {
		if (!navigator.geolocation) return;

		watchId = navigator.geolocation.watchPosition(
			(pos) => {
				const lng = pos.coords.longitude;
				const lat = pos.coords.latitude;
				const heading = pos.coords.heading;

				const userPos = [lng, lat];

				// Create or update user marker
				if (!userMarker) {
					userMarker = new mapboxgl.Marker({ color: '#00aaff' }).setLngLat(userPos).addTo(map);
					// Don't auto-pan on initial load - keep campus in view
				} else {
					userMarker.setLngLat(userPos);
				}

				// Only follow user location when actively navigating
				if (isNavigating) {
					map.easeTo({
						center: userPos,
						bearing: heading ?? map.getBearing(),
						duration: 1000
					});
				}
			},
			(err) => console.error('GPS Error:', err),
			{
				enableHighAccuracy: true,
				maximumAge: 0,
				timeout: 5000
			}
		);
	}

	onDestroy(() => {
		if (watchId) navigator.geolocation.clearWatch(watchId);
		if (map) map.remove();
	});

	/* ---------------------------------------------------------
     CAMPUS LAYERS
  --------------------------------------------------------- */
	function loadCampusLayers() {
		map.addSource('campus', {
			type: 'geojson',
			data: '/map_main.geojson'
		});

		map.addLayer({
			id: 'campus-fill',
			type: 'fill',
			source: 'campus',
			paint: {
				'fill-color': ['get', 'color'],
				'fill-opacity': 0.55
			}
		});

		map.addLayer({
			id: 'campus-outline',
			type: 'line',
			source: 'campus',
			paint: {
				'line-color': '#ffffff',
				'line-width': 1.2
			}
		});

		map.addLayer({
			id: 'campus-labels',
			type: 'symbol',
			source: 'campus',
			layout: {
				'text-field': ['get', 'name'],
				'text-size': 14,
				'text-offset': [0, 1]
			},
			paint: {
				'text-color': '#ffffff',
				'text-halo-color': '#000000',
				'text-halo-width': 1.2
			}
		});

		// Helper function to calculate polygon center
		function getPolygonCenter(coordinates) {
			const coords = coordinates[0]; // Get outer ring of polygon
			let sumLng = 0;
			let sumLat = 0;
			const pointCount = coords.length - 1; // Exclude last point (same as first)

			for (let i = 0; i < pointCount; i++) {
				sumLng += coords[i][0];
				sumLat += coords[i][1];
			}

			return [sumLng / pointCount, sumLat / pointCount];
		}

		// BUILDING CLICK → SHOW POPUP
		map.on('click', 'campus-fill', (e) => {
			const feature = e.features[0];
			const name = feature.properties.name;

			// Skip features without a name
			if (!name) return;

			const coords = getPolygonCenter(feature.geometry.coordinates);

			dispatch('selectBuilding', {
				name,
				properties: feature.properties,
				coordinates: coords
			});

			new mapboxgl.Popup()
				.setLngLat(e.lngLat)
				.setHTML(
					`
          <h3>${name}</h3>
          <button id="goToBuilding" style="
            padding:6px 10px;
            background:#00aaff;
            color:white; border:none;
            border-radius:4px;
            cursor:pointer;
          ">Go Here</button>
        `
				)
				.addTo(map);

			// attach click handler
			setTimeout(() => {
				const btn = document.getElementById('goToBuilding');
				if (!btn) return;

				btn.onclick = () => {
					navigateTo(coords);
				};
			}, 80);
		});
	}

	/* ---------------------------------------------------------
     TERRAIN + SKY
  --------------------------------------------------------- */
	function loadTerrainAndSky() {
		map.addSource('mapbox-dem', {
			type: 'raster-dem',
			url: 'mapbox://mapbox.terrain-rgb',
			tileSize: 512,
			maxzoom: 14
		});

		map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

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
     EVENT MARKER
  --------------------------------------------------------- */
	function loadEventMarker() {
		const eventLocation = [77.43716007569962, 12.86190057440364];

		const eventMarker = new mapboxgl.Marker({ color: '#ff0000' })
			.setLngLat(eventLocation)
			.setPopup(
				new mapboxgl.Popup().setHTML(`
          <h3>NEXUS Event</h3>
          <button id="goToEvent" style="
            padding:6px 10px;
            background:#00aaff;
            color:white; border:none;
            border-radius:4px;
            cursor:pointer;
          ">Show Directions</button>
        `)
			)
			.addTo(map);

		map.on('click', () => {
			const btn = document.getElementById('goToEvent');
			if (!btn) return;

			btn.onclick = () => navigateTo(eventLocation);
		});
	}

	/* ---------------------------------------------------------
     DRAW ROUTE
  --------------------------------------------------------- */
	async function getRoute(start, end) {
		try {
			const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`;

			const res = await fetch(url);
			const data = await res.json();

			// Check for API errors
			if (!res.ok || !data.routes || data.routes.length === 0) {
				console.error('Routing error:', data);
				alert('Could not find a route. Please try again or choose a different location.');
				return;
			}

			const route = data.routes[0].geometry.coordinates;

			if (map.getSource('route')) {
				map.getSource('route').setData({
					type: 'Feature',
					geometry: { type: 'LineString', coordinates: route }
				});
			} else {
				map.addLayer({
					id: 'route',
					type: 'line',
					source: {
						type: 'geojson',
						data: {
							type: 'Feature',
							geometry: { type: 'LineString', coordinates: route }
						}
					},
					paint: {
						'line-color': '#00d4ff',
						'line-width': 5
					}
				});
			}

			const bounds = new mapboxgl.LngLatBounds();
			route.forEach((c) => bounds.extend(c));
			map.fitBounds(bounds, { padding: 80 });
		} catch (error) {
			console.error('Error getting route:', error);
			alert('An error occurred while getting directions. Please try again.');
		}
	}
</script>

<div id="map"></div>

<link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.css" />

<style>
	#map {
		width: 100vw;
		height: 100vh;
	}
</style>
