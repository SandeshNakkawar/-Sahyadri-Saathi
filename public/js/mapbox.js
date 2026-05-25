/* eslint-disable */
import mapboxgl from 'mapbox-gl';

// Disable Mapbox telemetry right after import
mapboxgl.setTelemetryEnabled(false);

export const displayMap = locations => {
  mapboxgl.accessToken = 'YOUR_MAPBOX_TOKEN';

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/sandesh527/cme14l1xt011901s844tpf3t4',
    center: [-74.5, 40],
    zoom: 9
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    const el = document.createElement('div');
    el.className = 'marker';

    new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat(loc.coordinates)
      .addTo(map);

    new mapboxgl.Popup({ offset: 30 })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: { top: 200, bottom: 150, left: 100, right: 100 }
  });
};
