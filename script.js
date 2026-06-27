const sections = document.querySelectorAll('.page-section');
const buttons = document.querySelectorAll('.nav-button');
const feedList = document.getElementById('feed-list');
const eventList = document.getElementById('event-list');
const mapContainer = document.getElementById('beach-map');

// API Configuration
const MAPBOX_ACCESS_TOKEN = window.MAPBOX_ACCESS_TOKEN || '';
const BEACHES_API_URL = '/api/beaches';
const MARINE_API_URL = 'https://marine-api.open-meteo.com/v1/marine';
const BEACH_COORDS = {
  latitude: 38.7,
  longitude: -9.1,
};

async function fetchBeaches() {
  try {
    const response = await fetch(BEACHES_API_URL);
    if (!response.ok) throw new Error('Beach API unavailable');
    return response.json();
  } catch (error) {
    console.error('Beach API unavailable.', error);
    return [];
  }
}

function createBeachGeoJSON(beaches) {
  return {
    type: 'FeatureCollection',
    features: beaches.map((beach) => ({
      type: 'Feature',
      properties: {
        id: beach.id,
        name: beach.name,
      },
      geometry: {
        type: 'Point',
        coordinates: [beach.lng, beach.lat],
      },
    })),
  };
}

async function initBeachMap() {
  if (!mapContainer) return;
  if (!MAPBOX_ACCESS_TOKEN || MAPBOX_ACCESS_TOKEN === 'YOUR_MAPBOX_ACCESS_TOKEN') {
    mapContainer.innerHTML = '<div class="map-placeholder">Set a valid Mapbox access token in the HTML to view the interactive map.</div>';
    return;
  }

  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
  const map = new mapboxgl.Map({
    container: 'beach-map',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    center: [-8.2, 39.5],
    zoom: 6.5,
  });

  map.addControl(new mapboxgl.NavigationControl(), 'top-right');

  map.on('load', async () => {
    const beaches = await fetchBeaches();
    if (!beaches.length) return;

    map.addSource('beaches', {
      type: 'geojson',
      data: createBeachGeoJSON(beaches),
    });

    map.addLayer({
      id: 'beach-dots',
      type: 'circle',
      source: 'beaches',
      paint: {
        'circle-radius': 5,
        'circle-color': '#1e88e5',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    });

    const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: true });

    map.on('click', 'beach-dots', (event) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const { name } = feature.properties;
      const coordinates = feature.geometry.coordinates.slice();
      popup
        .setLngLat(coordinates)
        .setHTML(`<strong>${name}</strong>`)
        .addTo(map);
    });

    map.on('mouseenter', 'beach-dots', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'beach-dots', () => {
      map.getCanvas().style.cursor = '';
    });
  });
}

// Fetch marine conditions from Open-Meteo API
async function fetchMarineConditions() {
  try {
    const params = new URLSearchParams({
      latitude: BEACH_COORDS.latitude,
      longitude: BEACH_COORDS.longitude,
      hourly: 'wave_height,wave_direction,wave_period,swell_wave_height,wind_speed_10m,wind_direction_10m',
    });

    const response = await fetch(`${MARINE_API_URL}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch marine data');
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching marine conditions:', error);
    return null;
  }
}

// Get current hour's conditions
function getCurrentConditions(data) {
  if (!data || !data.hourly) return null;
  
  const now = new Date();
  const hourIndex = now.getHours();
  const hourly = data.hourly;
  
  return {
    waveHeight: hourly.wave_height?.[hourIndex] || 'N/A',
    waveDirection: hourly.wave_direction?.[hourIndex] || 'N/A',
    wavePeriod: hourly.wave_period?.[hourIndex] || 'N/A',
    swellHeight: hourly.swell_wave_height?.[hourIndex] || 'N/A',
    windSpeed: hourly.wind_speed_10m?.[hourIndex] || 'N/A',
    windDirection: hourly.wind_direction_10m?.[hourIndex] || 'N/A',
  };
}

// Convert degrees to compass direction
function degreesToCompass(degrees) {
  if (degrees === null || degrees === undefined) return '';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

// Update dashboard with current conditions
async function updateConditionsDashboard() {
  const marineData = await fetchMarineConditions();
  const conditions = getCurrentConditions(marineData);
  
  if (conditions) {
    const waveHeightEl = document.getElementById('wave-height');
    const windEl = document.getElementById('wind-speed');
    
    if (waveHeightEl) {
      const swellInfo = conditions.swellHeight !== 'N/A' ? ` (swell: ${conditions.swellHeight.toFixed(1)}m)` : '';
      const periodInfo = conditions.wavePeriod !== 'N/A' ? `, ${conditions.wavePeriod.toFixed(1)}s period` : '';
      waveHeightEl.textContent = `${conditions.waveHeight.toFixed(2)}m${periodInfo}${swellInfo}`;
    }
    
    if (windEl && conditions.windSpeed !== 'N/A') {
      const windDir = degreesToCompass(conditions.windDirection);
      windEl.textContent = `${conditions.windSpeed.toFixed(1)} km/h • ${windDir}`;
    }
  }
}

// Update conditions on page load
document.addEventListener('DOMContentLoaded', () => {
  updateConditionsDashboard();
  initBeachMap();
  // Refresh every 10 minutes
  setInterval(updateConditionsDashboard, 10 * 60 * 1000);
});

const feedPosts = [
  {
    title: 'Loose dog near the south path',
    body: 'Spotted a friendly labrador near the dunes. Be careful if you have little ones.',
    category: 'General',
  },
  {
    title: 'Purple flag up at North Cove',
    body: 'Strong currents reported. Swim is not advised until lifeguards clear it.',
    category: 'Hazard Warning',
  },
  {
    title: 'Free surfboard fins',
    body: 'Two sets of fins left by the beach access. First come, first served.',
    category: 'Free Stuff',
  },
];

const events = [
  {
    title: 'Sunrise Beach Cleanup',
    time: 'Tomorrow • 7:00 AM',
    location: 'Boardwalk Beach',
    type: 'Cleanup',
  },
  {
    title: 'Family Sandcastle Contest',
    time: 'Saturday • 2:30 PM',
    location: 'North Cove',
    type: 'Family',
  },
];

function setActiveSection(sectionId) {
  sections.forEach((section) => {
    section.classList.toggle('hidden', section.id !== sectionId);
  });

  buttons.forEach((button) => {
    const active = button.dataset.section === sectionId;
    button.classList.toggle('active', active);
  });
}

function renderFeed() {
  feedList.innerHTML = feedPosts
    .map(
      (post) => `
        <article class="feed-item">
          <h3>${post.title}</h3>
          <p>${post.body}</p>
          <p><strong>Category:</strong> ${post.category}</p>
        </article>
      `
    )
    .join('');
}

function renderEvents() {
  eventList.innerHTML = events
    .map(
      (event) => `
        <article class="event-item">
          <h3>${event.title}</h3>
          <p>${event.time} • ${event.location}</p>
          <p><strong>Type:</strong> ${event.type}</p>
        </article>
      `
    )
    .join('');
}

buttons.forEach((button) => {
  button.addEventListener('click', () => setActiveSection(button.dataset.section));
});

renderFeed();
renderEvents();
setActiveSection('dashboard');
