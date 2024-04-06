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

// Add event listeners for controls
const toggleGridBtn = document.getElementById('toggle-grid');
const downloadImageBtn = document.getElementById('download-image');
const downloadGeoJSONBtn = document.getElementById('download-geojson');
const uploadGeoJSONInput = document.getElementById('upload-geojson');
const searchResultsTable = document.getElementById('search-results-table');

var settings = {
    objects : []
};

// Add event handlers for controls
L.Control.geocoder({
    defaultMarkGeocode: false, // Do not recentre map to serached location
    position: 'topleft',
    geocoder: new L.Control.Geocoder.Nominatim({geocodingQueryParams: {polygon_geojson: 1}})
  })
  .on('markgeocode', function(e) {
    settings.objects.push(
        {
            name: e.geocode.properties.name,
            place_id: e.geocode.properties.place_id,
            geojson: e.geocode.properties.geojson,
            lat: e.geocode.properties.lat,
            lon: e.geocode.properties.lon
        }
    );
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${e.geocode.properties.name}</td>
      <td>
        <a class="waves-effect waves-light btn-small" data-id="${e.geocode.properties.place_id}" data-action="remove">
          <span class="material-icons">delete</span>
        </a>
        <a class="waves-effect waves-light btn-small" data-id="${e.geocode.properties.place_id}" data-action="centre">
          <span class="material-icons">my_location</span>
        </a>
      </td>
    `;
    searchResultsTable.appendChild(row);
  })
  .addTo(map);

searchResultsTable.addEventListener('click', (event) => {
    if (event.target.dataset.action === 'remove') {
        const resultId = event.target.dataset.id;
        settings.objects = settings.objects.filter(o => o.place_id != resultId);
        const row = event.target.closest('tr');
        searchResultsTable.removeChild(row);
    } else if (event.target.dataset.action === 'centre') {
        console.log(event.target.dataset);
        const resultId = event.target.dataset.id;
        const result = settings.objects.find(o => o.place_id === parseInt(resultId));
        map.setView([result.lat, result.lon]);
    }
  });

document.addEventListener('DOMContentLoaded', function() {
    var bottomSheet = document.querySelector('.bottom-sheet');
    var bottomSheetTrigger = document.querySelector('.modal-trigger');
    var bottomSheetInstance = M.Modal.init(bottomSheet);

    bottomSheetTrigger.addEventListener('click', function(event) {
        event.preventDefault();
        bottomSheetInstance.open();
    });
});

// Handle object overlay and editing
// ...