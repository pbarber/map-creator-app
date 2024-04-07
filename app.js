// Initialize the map
const map = L.map('map').setView([51.505, -0.09], 13);

// Add base layers
const blankLayer = L.tileLayer('');
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
  maxZoom: 19,
});

// TODO: add type management in the settings window (with name, colour)
// TODO: associate types in the objects table
// TODO; display objects with the associated type colour
// TODO: allow editing of name
// TODO: allow overlay of name on map
// TODO: allow positioning of name on map
// TODO: allow angle of name on map
// TODO: include map zoom and position in settings
// TODO: export of settings object to JSON
// TODO: import of settings object from JSON

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
const searchResultsTable = document.getElementById('objects-table');

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

document.getElementById('category-modal-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form submission

    const title = document.getElementById('title').value;
    const color = document.getElementById('color').value;

    // Create a new data object with a unique ID
    const dataObject = {
        id: nextId++,
        title: title,
        color: color
    };

    formData.push(dataObject); // Add the data object to the array

    // Reset form fields
    document.getElementById('title').value = '';
    document.getElementById('color').value = '#ff0000';

    console.log(formData); // Log the updated formData array
});

document.addEventListener('DOMContentLoaded', function() {
    var bottomSheet = document.querySelector('.bottom-sheet');
    var bottomSheetTrigger = document.querySelector('.modal-trigger');
    var bottomSheetInstance = M.Modal.init(bottomSheet);
    var modals = document.querySelectorAll('.modal');
    var modalTriggerBtn = document.querySelector('.add-category');
    
    bottomSheetTrigger.addEventListener('click', function(event) {
        event.preventDefault();
        bottomSheetInstance.open();
    });
  
    M.Modal.init(modals);

    modalTriggerBtn.addEventListener('click', function() {
      var instance = M.Modal.getInstance(document.getElementById('category-modal'));
      instance.open();
    });
});

// Handle object overlay and editing
// ...