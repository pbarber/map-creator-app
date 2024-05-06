// Initialize the map
const map = L.map('map').setView([51.505, -0.09], 13);
map.zoomControl.setPosition('topright');

// Add base layers
const blankLayer = L.tileLayer('', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
});
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
    maxZoom: 19,
});
const gridLayer = L.gridLayer({
    attribution: 'Grid Layer',
    tileSize: 256
});

var request = new XMLHttpRequest();
request.onload = function() {
    var arrayBuffer = request.response;
    proj4.nadgrid('OSTN15_NTv2_OSGBtoETRS', arrayBuffer);
    proj4.defs('EPSG:27700', '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +units=m +no_defs +nadgrids=OSTN15_NTv2_OSGBtoETRS');
};
request.open('GET', 'https://raw.githubusercontent.com/OrdnanceSurvey/os-transform/main/OSTN15_NTv2_OSGBtoETRS.gsb');
request.responseType = 'arraybuffer';
request.send();

gridLayer.createTile = function(coords) {
    var tile = L.DomUtil.create('canvas', 'leaflet-tile');
    var size = this.getTileSize();
    tile.width = size.x;
    tile.height = size.y;
    var ctx = tile.getContext('2d');
  
    // Get the tile's northwest and southeast coordinates
    var nwPoint = coords.scaleBy(size);
    var sePoint = nwPoint.add(size);
    var nw = this._map.unproject(nwPoint, coords.z);
    var se = this._map.unproject(sePoint, coords.z);

    var nwosni = proj4('EPSG:27700', [nw.lng, nw.lat]);
    var seosni = proj4('EPSG:27700', [se.lng, se.lat]);

    var furthestN = Math.floor(nwosni[1]/1000)*1000;
    var furthestS = Math.ceil(seosni[1]/1000)*1000;
    var furthestW = Math.floor(nwosni[0]/1000)*1000;
    var furthestE = Math.ceil(seosni[0]/1000)*1000;
    ctx.beginPath();
    for (var latosni = furthestS; latosni <= furthestN; latosni += 1000) {
        var west = proj4('EPSG:27700', 'EPSG:4326', [nwosni[0], latosni]);
        var east = proj4('EPSG:27700', 'EPSG:4326', [seosni[0], latosni]);
        var westy = size.y * ((west[1] - se.lat) / (nw.lat - se.lat));
        var easty = size.y * ((east[1] - se.lat) / (nw.lat - se.lat));
        ctx.moveTo(0, westy);
        ctx.lineTo(size.x, easty);
//        for (var x = furthestW; x <= furthestE; x += 1000) {
//            console.log([x, y]);
//            ctx.fillText(lat.toFixed(5), 5, y + 15);
//        }
    }
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.stroke();

    ctx.beginPath();
    for (var lngosni = furthestW; lngosni <= furthestE; lngosni += 1000) {
        var south = proj4('EPSG:27700', 'EPSG:4326', [lngosni, seosni[1]]);
        var north = proj4('EPSG:27700', 'EPSG:4326', [lngosni, nwosni[1]]);
        var southx = size.x * ((south[0] - se.lng) / (nw.lng - se.lng));
        var northx = size.x * ((north[0] - se.lng) / (nw.lng - se.lng));
        ctx.moveTo(northx, 0);
        ctx.lineTo(southx, size.y);
//        for (var x = furthestW; x <= furthestE; x += 1000) {
//            console.log([x, y]);
//            ctx.fillText(lat.toFixed(5), 5, y + 15);
//        }
    }
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.stroke();

    return tile;
};

const defaultColour = '#13a300';

// TODO: add tetrad grid

// Create layer control and add to the map
const baseLayers = {
  'Blank': blankLayer,
  'OpenStreetMap': osmLayer,
  'Grid': gridLayer
};
L.control.layers(baseLayers).addTo(map);

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

function updateLabelLayer() {
    map.removeLayer(layers['label-layer']);
    var labels = [];
    settings.objects.filter(o => o.label).map(o => {
        var marker = new L.marker([o.lat, o.lon], { opacity: 0 });
        marker.bindTooltip(o.title, {permanent: true, className: "map-label", offset: [-16  , 27], direction: 'center' });
        labels.push(marker);
    });
    layers['label-layer'] = L.layerGroup(labels).addTo(map);
}

function addObject(object) {
    // Add the object to the settings storage
    settings.objects.push(object);
    const category = settings.categories.find(o => (o.id === object.category));
    // Add a new row to the objects table
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><i class="colour-block" style="background: ${category.fill}"></i>${object.title}</td>
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
    // If this is the first object, then centre the map on it
    if (settings.objects.length === 1) {
        map.setView([object.lat, object.lon]);
    }
    // Recreate the relevant map layer
    updateObjectLayer(object.category);
    // Add label to map
    if (object.label) {
        updateLabelLayer();
    }
}

function updateObjectTableRow(object, category) {
    const cells = document.getElementById('object-row-' + object.id).querySelectorAll('td');
    cells[0].innerHTML = `<td><i class="colour-block" style="background: ${category.fill}"></i>${object.title}</td>`;
}

function editObject(object) {
    // Update the setting storage
    const index = settings.objects.findIndex(o => o.id === parseInt(object.id));
    const original = structuredClone(settings.objects[index]);
    settings.objects[index].title = object.title;
    settings.objects[index].category = object.category;
    settings.objects[index].label = object.label;
    const category = settings.categories.find(o => (o.id === object.category));
    // Update the object table row
    updateObjectTableRow(object, category);
    // Update the map if category has changed
    if (original.category !== object.category) {
        updateObjectLayer(object.category);
        updateObjectLayer(original.category);
    }
    // Update map labels if changed
    if ((original.label !== object.label) || (original.title != object.title)) {
        updateLabelLayer();
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
    // Remove the label
    if (object.label) {
        updateLabelLayer();
    }
}

var info = L.control({position: 'topleft'});

info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
    this._div.innerHTML = (
        '<b>Click <i class="fa fa-search"></i> below to search for a location</b><br />The map will colour areas by their category, click Settings to change area formatting<br />' +
        '<a href="https://github.com/pbarber/map-creator-app/blob/main/README.md">More information</a>'
        );
    return this._div;
};

// Add event handlers for controls
const search = L.Control.geocoder({
    defaultMarkGeocode: false, // Do not recentre map to serached location
    position: 'topleft',
    geocoder: new L.Control.Geocoder.Nominatim({
        geocodingQueryParams: {polygon_geojson: 1, limit: 15},
        reverseQueryParams: {polygon_geojson: 1}
    })
  })
  .on('markgeocode', function(e) {
    if (settings.objects.filter(o => (o.id === parseInt(e.geocode.properties.place_id))).length === 0) {
        addObject({
            title: e.geocode.properties.name,
            id: e.geocode.properties.place_id,
            geojson: e.geocode.properties.geojson,
            lat: e.geocode.properties.lat,
            lon: e.geocode.properties.lon,
            category: settings.categories[0].id,
            label: true
        });
    } else {
        M.toast({html: 'Location is already on map, it will not be added'})
    }
});

info.addTo(map);
search.addTo(map);

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
        fillColor: category.fill,
        color: category.colour,
        weight: category.weight,
        opacity: 1,
        fillOpacity: 0.7
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
    <td><i class="colour-block" style="background: ${category.fill}"></i>${category.title}</td>
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
    settings.categories[index].fill = category.fill;
    settings.categories[index].colour = category.colour;
    settings.categories[index].weight = category.weight;
    // Update the category table
    const cells = document.getElementById('category-row-' + category.id).querySelectorAll('td');
    cells[0].innerHTML = `<i class="colour-block" style="background: ${category.fill}"></i>${category.title}`;
    // Update the dropdown for object category
    document.getElementById('object-category-' + category.id).text = category.title;
    M.FormSelect.init(document.getElementById("object-category"));
    // Update the map
    updateObjectLayer(category.id);
    // Update the affected object table rows to reflect the new colours
    settings.objects.filter(o => (o.category === category.id)).map(object => updateObjectTableRow(object, category))
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
        document.getElementById('category-fill').value = defaultColour;
        document.getElementById('category-colour').value = defaultColour;
        document.getElementById('category-weight').value = 2;
    } else {
        document.getElementById('category-modal-title').textContent = "Edit a category";
        document.getElementById('category-id').value = category.id;
        document.getElementById('category-title').value = category.title;
        document.getElementById('category-fill').value = category.fill;
        document.getElementById('category-colour').value = category.colour;
        document.getElementById('category-weight').value = category.weight;
    }
    M.updateTextFields();
}

document.getElementById('category-modal-form').addEventListener('submit', function(event) {
    event.preventDefault();

    // Get the data from the form
    const id = document.getElementById('category-id').value;
    var category = {
        title: document.getElementById('category-title').value,
        fill: document.getElementById('category-fill').value,
        colour: document.getElementById('category-colour').value,
        weight: document.getElementById('category-weight').value
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
    var toggleGridBtn = document.getElementById('toggle-grid');
    var selectLayers = document.getElementsByClassName('leaflet-control-layers-selector');

    M.Modal.init(document.getElementById('object-modal'));
    M.updateTextFields();
    // Add an empty layer for labels to the map
    layers['label-layer'] = L.layerGroup([]).addTo(map)
    // Make sure that the Blank layer is selected
    selectLayers[0].click()

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
        event.preventDefault();
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
                    // Add labels to map
                    updateLabelLayer();
                } else {
                    M.toast({html: 'Cannot parse uploaded file'})
                }
            };
            reader.readAsText(fileblob);
        }
    });

    map.addEventListener('contextmenu', async function(event) {
        var result = await fetch(
            "https://overpass-api.de/api/interpreter",
            {
                method: "POST",
                body: "data="+ `
                    [timeout:10]
                    [out:json];
                    is_in(${event.latlng.lat},${event.latlng.lng})->.a;
                    way(pivot.a);
                    out body;
                    >;
                    out skel qt;
                `
            },
        ).then(
            (data)=>data.json()
        );
        var added = false;
        if (result.elements.length !== 0) {
            // Get first way
            var way = result.elements.find(o => (o.type==='way'));
            var boundary = way.nodes.map(function(a) {
                const loc = result.elements.find(o => (a===o.id));
                return([loc.lon, loc.lat]);
            });
            if (way.nodes[0] === way.nodes.at(-1)) {
                if (settings.objects.filter(o => (o.id === way.id)).length === 0) {
                    addObject({
                        title: way.id.toString(),
                        id: way.id,
                        geojson: {
                            type: "Polygon",
                            coordinates: [boundary]
                        },
                        lat: event.latlng.lat,
                        lon: event.latlng.lng,
                        category: settings.categories[0].id,
                        label: true
                    });
                    added = true;
                } else {
                    M.toast({html: 'Location is already on map, it will not be added'})
                }
            } else {
                console.log('Line???');
            }
        }
        if (!added) {
            search.options.geocoder.reverse(event.latlng, map.options.crs.scale(map.getZoom()), function(results) {
                if (results[0]) {
                    if (settings.objects.filter(o => (o.id === parseInt(results[0].properties.place_id))).length === 0) {
                        addObject({
                            title: results[0].properties.name,
                            id: results[0].properties.place_id,
                            geojson: results[0].properties.geojson,
                            lat: results[0].properties.lat,
                            lon: results[0].properties.lon,
                            category: settings.categories[0].id,
                            label: true
                        });
                    } else {
                        M.toast({html: 'Location is already on map, it will not be added'})
                    }
                }
                else {
                    M.toast({html: 'No location found'})
                }
            }, {polygon_geojson: 1});
        }
    });

    // Add a default category so that searches have something to attach to
    addCategory({title: 'Default', id: 0, fill: defaultColour, colour: defaultColour, weight: 2});
});
