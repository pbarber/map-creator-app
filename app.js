// Initialize the map
const map = L.map('map').setView([51.505, -0.09], 13);

// Add base layers
const blankLayer = L.tileLayer('');
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
  maxZoom: 19,
});

// Create layer control and add to the map
const baseLayers = {
  'Blank': blankLayer,
  'OpenStreetMap': osmLayer,
};
L.control.layers(baseLayers).addTo(map);

L.Control.geocoder({
    defaultMarkGeocode: false,
    position: 'topleft',
    geocoder: new L.Control.Geocoder.Nominatim()
  })
  .on('markgeocode', function(e) {
    console.log(e);
  })
  .addTo(map);

// Add event listeners for controls
const toggleGridBtn = document.getElementById('toggle-grid');
const toggleBaseLayerBtn = document.getElementById('toggle-base-layer');
const downloadImageBtn = document.getElementById('download-image');
const downloadGeoJSONBtn = document.getElementById('download-geojson');
const uploadGeoJSONInput = document.getElementById('upload-geojson');

// Add event handlers for controls
// ...

// Handle search functionality
const searchResults = document.getElementById('search-results');

// Handle object overlay and editing
// ...