// Initialize the map
const map = L.map('map').setView([51.505, -0.09], 13);

// Add base layers
const blankLayer = L.tileLayer('');
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
  maxZoom: 19,
});

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
const objectsTable = document.getElementById('objects-table');
const categoriesTable = document.getElementById('categories-table');

var settings = {
    objects: [],
    categories: [] 
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
            title: e.geocode.properties.name,
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
        <a class="waves-effect waves-light btn-small" data-id="${e.geocode.properties.place_id}" data-action="edit">
          <span class="material-icons">edit</span>
        </a>
      </td>
    `;
    row.setAttribute('id', 'object-row-' + e.geocode.properties.place_id);
    objectsTable.appendChild(row);
  })
  .addTo(map);


function createOption(text, value, id, selected, disabled) {
    var el = document.createElement("option");
    el.text = text;
    el.value = value;
    el.id = id;
    el.selected = selected;
    el.disabled = disabled;
    return(el);
}

objectsTable.addEventListener('click', (event) => {
    if (event.target.dataset.action === 'remove') {
        const resultId = event.target.dataset.id;
        settings.objects = settings.objects.filter(o => o.place_id != resultId);
        const row = event.target.closest('tr');
        objectsTable.removeChild(row);
    } else if (event.target.dataset.action === 'centre') {
        const resultId = event.target.dataset.id;
        const result = settings.objects.find(o => o.place_id === parseInt(resultId));
        map.setView([result.lat, result.lon]);
    } else if (event.target.dataset.action === 'edit') {
        const resultId = event.target.dataset.id;
        const modal = M.Modal.getInstance(document.getElementById('object-modal'));
        const result = settings.objects.find(o => o.place_id === parseInt(resultId));
        document.getElementById('object-id').value = result.place_id;
        document.getElementById('object-title').value = result.title;
//        document.getElementById('object-category').value = result.category;
        modal.open();
    }
});

document.getElementById('object-modal-form').addEventListener('submit', function(event) {
    event.preventDefault();

    object = {
        id: document.getElementById('object-id').value,
        title: document.getElementById('object-title').value,
        category: document.getElementById('object-category').value
    };
    const index = settings.objects.findIndex(o => o.place_id === parseInt(object.id));
    settings.objects[index].title = object.title;
    settings.objects[index].category = object.category;
    const cells = document.getElementById('object-row-' + object.id).querySelectorAll('td');
    cells[0].innerHTML = `<td>${object.title}</td>`;

    const modal = M.Modal.getInstance(document.getElementById('object-modal'));
    modal.close();
});

document.getElementById('category-modal-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const maxId = settings.categories.reduce((a,b) => (b.id > a) ? b.id : a, -1);
    const id = document.getElementById('category-id').value;
    category = {
        id: (id !== "") ? parseInt(id) : (maxId + 1),
        title: document.getElementById('category-title').value,
        colour: document.getElementById('category-colour').value
    };
    if (id !== "") {
        const index = settings.categories.findIndex(o => o.id === parseInt(id));
        settings.categories[index].title = category.title;
        settings.categories[index].colour = category.colour;
        const cells = document.getElementById('category-row-' + category.id).querySelectorAll('td');
        cells[0].innerHTML = `<i class="colour-block" style="background: ${category.colour}"></i>${category.title}`;
        document.getElementById('object-category-' + category.id).text = category.title;
    } else {
        settings.categories.push(category);
        const row = document.createElement('tr');
        row.innerHTML = `
        <td><i class="colour-block" style="background: ${category.colour}"></i>${category.title}</td>
        <td>
            <a class="waves-effect waves-light btn-small" data-id="${category.id}" data-action="remove">
            <span class="material-icons">delete</span>
            </a>
            <a class="waves-effect waves-light btn-small" data-id="${category.id}" data-action="edit">
            <span class="material-icons">edit</span>
            </a>
        </td>
        `;
        row.setAttribute('id', 'category-row-' + category.id);
        categoriesTable.appendChild(row);
        document.getElementById("object-category").append(createOption(category.title, category.id, 'object-category-' + category.id, false, false));
    }
    M.FormSelect.init(document.getElementById("object-category"));

    const modal = M.Modal.getInstance(document.getElementById('category-modal'));
    modal.close();

    document.getElementById('category-id').value = '';
    document.getElementById('category-title').value = '';
    document.getElementById('category-colour').value = '#ff0000';
});

categoriesTable.addEventListener('click', (event) => {
    if (event.target.dataset.action === 'remove') {
        const resultId = event.target.dataset.id;
        settings.categories = settings.categories.filter(o => o.id != resultId);
        const row = event.target.closest('tr');
        categoriesTable.removeChild(row);
    } else if (event.target.dataset.action === 'edit') {
        const resultId = event.target.dataset.id;
        const modal = M.Modal.getInstance(document.getElementById('category-modal'));
        const result = settings.categories.find(o => o.id === parseInt(resultId));
        document.getElementById('category-modal-title').textContent = "Edit a category";
        document.getElementById('category-id').value = result.id;
        document.getElementById('category-title').value = result.title;
        document.getElementById('category-colour').value = result.colour;
        modal.open();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    var bottomSheetTrigger = document.querySelector('.modal-trigger');
    var bottomSheetInstance = M.Modal.init(document.getElementById('bottom-sheet'));
    var categoryModalTrigger = document.querySelector('.add-category');
    var categoryModalInstance = M.Modal.init(document.getElementById('category-modal'));
    M.Modal.init(document.getElementById('object-modal'));
    
    bottomSheetTrigger.addEventListener('click', function(event) {
        event.preventDefault();
        bottomSheetInstance.open();
    });

    categoryModalTrigger.addEventListener('click', function(event) {
        event.preventDefault();
        document.getElementById('category-modal-title').textContent = "Add a new category";
        document.getElementById('category-id').value = '';
        document.getElementById('category-title').value = '';
        document.getElementById('category-colour').value = '#ff0000';
        categoryModalInstance.open();
    });
});
