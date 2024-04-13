// Initialize the map
const map = L.map('map').setView([51.505, -0.09], 13);

// Add base layers
const blankLayer = L.tileLayer('');
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
  maxZoom: 19,
});

// TODO: allow overlay of name on map
// TODO: allow positioning of name on map
// TODO: allow angle of name on map
// TODO: add streams and roads

// Create layer control and add to the map
const baseLayers = {
  'Blank': blankLayer,
  'OpenStreetMap': osmLayer,
};
L.control.layers(baseLayers).addTo(map);

// Add event listeners for controls
const toggleGridBtn = document.getElementById('toggle-grid');
const downloadImageBtn = document.getElementById('download-image');
const objectsTable = document.getElementById('objects-table');
const categoriesTable = document.getElementById('categories-table');

var settings = {
    objects: [],
    categories: []
};

var layers = {};

function createOption(text, value, id, selected, disabled) {
    var el = document.createElement("option");
    el.text = text;
    el.value = value;
    el.id = id;
    el.selected = selected;
    el.disabled = disabled;
    return(el);
}

function selectOption(selectorId, selected) {
    var select = document.getElementById(selectorId);
    for (var i=0; i<select.length; i++) {
        select[i].selected = (select[i].value === selected);
    }
}

function updateObjectLayer(category) {
    map.removeLayer(layers[category]);
    const layer = settings.objects.filter(o => (o.category === category)).map(o => o.geojson);
    layers[category] = L.geoJson(layer, {style: layerStyle(settings.categories.find(o => o.id === category))}).addTo(map)
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
    // Recreate the relevant map layer
    updateObjectLayer(object.category);
}

function editObject(object) {
    // Update the setting storage
    const index = settings.objects.findIndex(o => o.id === parseInt(object.id));
    const categoryStart = settings.objects[index].category;
    settings.objects[index].title = object.title;
    settings.objects[index].category = object.category;
    settings.objects[index].label = object.label;
    // Update the object table row
    const cells = document.getElementById('object-row-' + object.id).querySelectorAll('td');
    cells[0].innerHTML = `<td>${object.title}</td>`;
    // Update the map if category has changed
    if (categoryStart !== object.category) {
        updateObjectLayer(object.category);
        updateObjectLayer(categoryStart);
    }
}

function removeObject(id) {
    const object = settings.objects.find(o => o.id == parseInt(id));
    // Remove from settings store
    settings.objects = settings.objects.filter(o => o.id != id);
    // Remove from objects table
    document.getElementById('object-row-' + id).remove();
    // Recreate the relevant map layer
    updateObjectLayer(object.category);
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
        lon: e.geocode.properties.lon,
        category: settings.categories[0].id,
        label: true
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
        document.getElementById('object-label').checked = (result.hasOwnProperty('label') ? result.label : true);
        M.updateTextFields();
        selectOption('object-category', result.category.toString());
        M.FormSelect.init(document.getElementById("object-category"));
        M.Modal.getInstance(document.getElementById('object-modal')).open();
    }
});

document.getElementById('object-modal-form').addEventListener('submit', function(event) {
    event.preventDefault();

    editObject({
        id: parseInt(document.getElementById('object-id').value),
        title: document.getElementById('object-title').value,
        category: parseInt(document.getElementById('object-category').value),
        label: document.getElementById('object-label').checked
    });

    M.Modal.getInstance(document.getElementById('object-modal')).close();
});

function layerStyle(category) {
    return {
        fillColor: category.colour,
        weight: 0,
        opacity: 1,
        fillOpacity: 0.8
    };
}

function addCategory(category) {
    if (!category.hasOwnProperty('id')) {
        // Ensure no ID clashes for new categories
        category.id = settings.categories.reduce((a,b) => (b.id > a) ? b.id : a, -1) + 1;
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
    // Add a new empty layer to the map
    layers[category.id] = L.geoJson(null, {style: layerStyle(category)}).addTo(map)
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
    // Update the map, adding an empty layer
    updateObjectLayer(category.id);
}

function removeCategory(id) {
    // Remove from settings
    settings.categories = settings.categories.filter(o => (o.id !== id));
    // Remove row from categories table
    document.getElementById('category-row-' + id).remove();
    // Remove option from categories dropdown
    document.getElementById('object-category-' + id).remove();
    M.FormSelect.init(document.getElementById("object-category"));
    // Remove category from any objects which have it set
    const objectsAffected = settings.objects.filter(o => (o.category === id));
    if (objectsAffected.length > 0) {
        const newid = settings.categories[0].id;
        objectsAffected.map(function(o) {
            o.category = newid;
            editObject(o);
        });
    }
    // Remove the layer from the map
    map.removeLayer(layers[id]);
}

function setCategoryFormFields(add, category) {
    if (add) {
        document.getElementById('category-modal-title').textContent = "Add a new category";
        document.getElementById('category-id').value = '';
        document.getElementById('category-title').value = '';
        document.getElementById('category-colour').value = '#ff0000';
    } else {
        document.getElementById('category-modal-title').textContent = "Edit a category";
        document.getElementById('category-id').value = category.id;
        document.getElementById('category-title').value = category.title;
        document.getElementById('category-colour').value = category.colour;
    }
    M.updateTextFields();
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
        category.id = parseInt(id);
        updateCategory(category);
    } else {
        addCategory(category);
    }
    // Close the modal
    M.Modal.getInstance(document.getElementById('category-modal')).close();
});

categoriesTable.addEventListener('click', (event) => {
    const id = parseInt(event.target.dataset.id);
    if (event.target.dataset.action === 'remove') {
        // Remove all evidence of the category
        if (settings.categories.length > 1) {
            removeCategory(id);
        } else {
            M.toast({html: 'Cannot remove remaining category, edit it instead'})
        }
    } else if (event.target.dataset.action === 'edit') {
        // Set up the modal fields and open the modal
        setCategoryFormFields(false, settings.categories.find(o => (o.id === id)));
        M.Modal.getInstance(document.getElementById('category-modal')).open();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    var downloadGeoJSONBtn = document.getElementById('download-geojson');
    var bottomSheetTrigger = document.querySelector('.modal-trigger');
    var bottomSheetInstance = M.Modal.init(document.getElementById('bottom-sheet'));
    var categoryModalTrigger = document.querySelector('.add-category');
    var categoryModalInstance = M.Modal.init(document.getElementById('category-modal'));
    var uploadGeoJSONInput = document.getElementById('upload-geojson');
    M.Modal.init(document.getElementById('object-modal'));
    M.updateTextFields();

    bottomSheetTrigger.addEventListener('click', function(event) {
        event.preventDefault();
        bottomSheetInstance.open();
    });

    categoryModalTrigger.addEventListener('click', function(event) {
        event.preventDefault();
        setCategoryFormFields(true);
        categoryModalInstance.open();
    });

    downloadGeoJSONBtn.addEventListener('click', function() {
        settings.zoom = map.getZoom();
        settings.centre = map.getCenter();
        const json = JSON.stringify(settings, null, 2); // Convert the object to JSON with indentation for readability
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'map-creator' + (new Date()).toISOString() + '.json'; // Set the desired file name
        a.click();
        URL.revokeObjectURL(url);
    });

    uploadGeoJSONInput.addEventListener('change', function(event) {
        const fileblob = this.files[0];
        if (fileblob) {
            const reader = new FileReader();
            reader.onload = () => {
                const upload = JSON.parse(reader.result);
                if (upload.hasOwnProperty('categories') && upload.hasOwnProperty('objects')) {
                    // First remove all existing objects
                    while (settings.objects.length > 0) {
                        removeObject(settings.objects[0].id);
                    }
                    // Next remove all existing categories
                    while (settings.categories.length > 0) {
                        removeCategory(settings.categories[0].id);
                    }
                    // Add the new categories
                    upload.categories.map(o => addCategory(o));
                    // Add the new objects
                    upload.objects.map(o => addObject(o));
                    // Apply zoom and centre (if available)
                    if (upload.hasOwnProperty('zoom') && upload.hasOwnProperty('centre')) {
                        map.setView(upload.centre, upload.zoom);
                    }
                } else {
                    M.toast({html: 'Cannot parse uploaded file'})
                }
            };
            reader.readAsText(fileblob);
        }
    });

    // Add a default category so that searches have something to attach to
    addCategory({title: 'Default', id: 0, colour: '#ff0000'});
});
