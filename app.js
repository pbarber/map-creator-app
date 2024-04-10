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

function createOption(text, value, id, selected, disabled) {
    var el = document.createElement("option");
    el.text = text;
    el.value = value;
    el.id = id;
    el.selected = selected;
    el.disabled = disabled;
    return(el);
}

function addObject(object) {
    // Add the object to the settings storage
    settings.objects.push(object);
    // Add a new row to the objects table
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${object.title}</td>
      <td>
        <a class="waves-effect waves-light btn-small" data-id="${object.id}" data-action="remove">
          <span class="material-icons">delete</span>
        </a>
        <a class="waves-effect waves-light btn-small" data-id="${object.id}" data-action="centre">
          <span class="material-icons">my_location</span>
        </a>
        <a class="waves-effect waves-light btn-small" data-id="${object.id}" data-action="edit">
          <span class="material-icons">edit</span>
        </a>
      </td>
    `;
    row.setAttribute('id', 'object-row-' + object.id);
    objectsTable.appendChild(row);
}

function editObject(object) {
    // Update the setting storage
    const index = settings.objects.findIndex(o => o.id === parseInt(object.id));
    settings.objects[index].title = object.title;
    settings.objects[index].category = object.category;
    // Update the object table row
    const cells = document.getElementById('object-row-' + object.id).querySelectorAll('td');
    cells[0].innerHTML = `<td>${object.title}</td>`;
}

function removeObject(id) {
    // Remove from settings store
    settings.objects = settings.objects.filter(o => o.id != id);
    // Remove from objects table
    document.getElementById('object-row-' + id).remove();
}

// Add event handlers for controls
L.Control.geocoder({
    defaultMarkGeocode: false, // Do not recentre map to serached location
    position: 'topleft',
    geocoder: new L.Control.Geocoder.Nominatim({geocodingQueryParams: {polygon_geojson: 1}})
  })
  .on('markgeocode', function(e) {
    addObject({
        title: e.geocode.properties.name,
        id: e.geocode.properties.place_id,
        geojson: e.geocode.properties.geojson,
        lat: e.geocode.properties.lat,
        lon: e.geocode.properties.lon
    });
  })
  .addTo(map);

objectsTable.addEventListener('click', (event) => {
    const id = parseInt(event.target.dataset.id);
    if (event.target.dataset.action === 'remove') {
        removeObject(id);
    } else if (event.target.dataset.action === 'centre') {
        const result = settings.objects.find(o => o.id === id);
        map.setView([result.lat, result.lon]);
    } else if (event.target.dataset.action === 'edit') {
        const result = settings.objects.find(o => o.id === id);
        document.getElementById('object-id').value = result.id;
        document.getElementById('object-title').value = result.title;
//        document.getElementById('object-category').value = result.category;
        M.Modal.getInstance(document.getElementById('object-modal')).open();
    }
});

document.getElementById('object-modal-form').addEventListener('submit', function(event) {
    event.preventDefault();

    editObject({
        id: document.getElementById('object-id').value,
        title: document.getElementById('object-title').value,
        category: document.getElementById('object-category').value
    });

    M.Modal.getInstance(document.getElementById('object-modal')).close();
});

function addCategory(category) {
    if (!category.hasOwnProperty('id')) {
        // Ensure no ID clashes for new categories
        category.id = settings.categories.reduce((a,b) => (b.id > a) ? b.id : a, -1);
    }
    // New record - add to settings
    settings.categories.push(category);
    // Add row to the category table
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
    // Add option to dropdown for object category
    document.getElementById("object-category").append(createOption(category.title, category.id, 'object-category-' + category.id, false, false));
    M.FormSelect.init(document.getElementById("object-category"));
}

function updateCategory(category) {
    // Update to existing record - store changes to settings
    const index = settings.categories.findIndex(o => o.id === parseInt(category.id));
    settings.categories[index].title = category.title;
    settings.categories[index].colour = category.colour;
    // Update the category table
    const cells = document.getElementById('category-row-' + category.id).querySelectorAll('td');
    cells[0].innerHTML = `<i class="colour-block" style="background: ${category.colour}"></i>${category.title}`;
    // Update the dropdown for object category
    document.getElementById('object-category-' + category.id).text = category.title;
    M.FormSelect.init(document.getElementById("object-category"));
}

function removeCategory(id) {
    // Remove from settings
    settings.categories = settings.categories.filter(o => o.id != id);
    // Remove row from categories table
    document.getElementById('category-row-' + id).remove();
    // Remove option from categories dropdown
    document.getElementById('object-category-' + id).remove();
    M.FormSelect.init(document.getElementById("object-category"));
}

function setCategoryFormFields(add, category) {
    if (add) {
        document.getElementById('category-id').value = '';
        document.getElementById('category-title').value = '';
        document.getElementById('category-colour').value = '#ff0000';
    } else {
        document.getElementById('category-modal-title').textContent = "Edit a category";
        document.getElementById('category-id').value = category.id;
        document.getElementById('category-title').value = category.title;
        document.getElementById('category-colour').value = category.colour;
    }

}

document.getElementById('category-modal-form').addEventListener('submit', function(event) {
    event.preventDefault();

    // Get the data from the form
    const id = document.getElementById('category-id').value;
    var category = {
        title: document.getElementById('category-title').value,
        colour: document.getElementById('category-colour').value
    };
    // Handle add or edit
    if (id !== "") {
        category.id = id;
        updateCategory(category);
    } else {
        addCategory(category);
    }
    // Close the modal
    M.Modal.getInstance(document.getElementById('category-modal')).close();
});

categoriesTable.addEventListener('click', (event) => {
    if (event.target.dataset.action === 'remove') {
        // Remove all evidence of the category
        removeCategory(event.target.dataset.id);
    } else if (event.target.dataset.action === 'edit') {
        // Set up the modal fields and open the modal
        setCategoryFormFields(false, settings.categories.find(o => o.id === parseInt(event.target.dataset.id)));
        M.Modal.getInstance(document.getElementById('category-modal')).open();
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
        setCategoryFormFields(true);
        categoryModalInstance.open();
    });
});
