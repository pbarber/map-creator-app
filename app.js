// Initialize the map
const map = L.map('map').setView([51.505, -0.09], 13);
map.zoomControl.setPosition('topright');
map.createPane('labels');
map.getPane('labels').style.zIndex = 650;
map.getPane('labels').style.pointerEvents = 'none';
map.createPane('grid');
map.getPane('grid').style.zIndex = 649;
map.getPane('grid').style.pointerEvents = 'none';

// Add base layers
const blankLayer = L.tileLayer('', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
});
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
    maxZoom: 19,
});

// Create layer control and add to the map
const baseLayers = {
    'Blank': blankLayer,
    'OpenStreetMap': osmLayer
};
L.control.layers(baseLayers).addTo(map);

// TODO: control opacity of lines and fills
// TODO: control colour, size and opacity of text

function calculate_5x5_grid(basegrid, lettergrid, size) {
    return Object.fromEntries(
        Object.entries(basegrid).flatMap(o =>
            Object.entries(lettergrid).map(t =>
                [o[0]+t[0], [o[1][0]+(size*t[1][0]),o[1][1]+(size*t[1][1])]]
            )
        )
    );
}

function calculate_10x10_grid(basegrid, size) {
    return Object.fromEntries(
        Object.entries(basegrid).flatMap(o =>
            [...Array(10).keys()].flatMap(x =>
                [...Array(10).keys()].map(y =>
                    [o[0] + x + y, [o[1][0]+(x*size), o[1][1]+(y*size)]]
                )
            )
        )
    );
}

// Two conversion attempts necessary in some cases as the nadgrids option (preferred) does not cover the outer edges of the outermost grid squares
function reproject_osgb_to_wgs84(coords) {
    var result = proj4('EPSG:27700', 'EPSG:4326', coords)
    if (isNaN(result[0])) {
        console.log('Falling back to simpler translation');
        result = proj4('EPSG:27700a', 'EPSG:4326', coords);
    }
    return [result[1], result[0]];
}

// Convert the SW corner location (easting, northing) and a size to a WGS84 polygon
function coords_to_polygons(coords, size) {
    return Object.fromEntries(Object.entries(coords).map(a => [a[0], L.polygon([
        reproject_osgb_to_wgs84([a[1][0], a[1][1]]),
        reproject_osgb_to_wgs84([a[1][0], a[1][1]+size]),
        reproject_osgb_to_wgs84([a[1][0]+size, a[1][1]+size]),
        reproject_osgb_to_wgs84([a[1][0]+size, a[1][1]]),
        reproject_osgb_to_wgs84([a[1][0], a[1][1]])
    ],{ fill: false, color: '#ccc' })]));
}

function create_osgb_grid_wgs84() {
    // Lookup of SW corner of the OS grid squares
    const os_grid_letters = {
        'A': [0, 4],'B': [1, 4],'C': [2, 4],'D': [3, 4],'E': [4, 4],
        'F': [0, 3],'G': [1, 3],'H': [2, 3],'J': [3, 3],'K': [4, 3],
        'L': [0, 2],'M': [1, 2],'N': [2, 2],'O': [3, 2],'P': [4, 2],
        'Q': [0, 1],'R': [1, 1],'S': [2, 1],'T': [3, 1],'U': [4, 1],
        'V': [0, 0],'W': [1, 0],'X': [2, 0],'Y': [3, 0],'Z': [4, 0]
    };

    // Lookup of SW corner of the OS tetrad squares
    const os_tetrad_letters = {
        'E': [0, 4],'J': [1, 4],'P': [2, 4],'U': [3, 4],'Z': [4, 4],
        'D': [0, 3],'I': [1, 3],'N': [2, 3],'T': [3, 3],'Y': [4, 3],
        'C': [0, 2],'H': [1, 2],'M': [2, 2],'S': [3, 2],'X': [4, 2],
        'B': [0, 1],'G': [1, 1],'L': [2, 1],'R': [3, 1],'W': [4, 1],
        'A': [0, 0],'F': [1, 0],'K': [2, 0],'Q': [3, 0],'V': [4, 0]
    };

    var osgb = {coords: {}, polygons: {}};

    // Lookup of easting, northing of the SW corner of the GB OS 500km squares, applying correction (-2, -1) for false origin at SV
    osgb.coords['500k'] = Object.fromEntries(
        ['H','N','S','T'].map(o => [o, [((os_grid_letters[o[0]][0]-2) * 500000), ((os_grid_letters[o[0]][1]-1) * 500000)]])
    );

    // Lookup of easting, northing of the SW corner of the GB OS 100km squares
    osgb.coords['100k'] = Object.fromEntries(Object.entries(calculate_5x5_grid(osgb.coords['500k'], os_grid_letters, 100000)).filter(([k,v]) =>
        [
                        'HP',
                'HT','HU',
        'HW','HX','HY','HZ',
    'NA','NB','NC','ND',
    'NF','NG','NH','NJ','NK',
    'NL','NM','NN','NO',
        'NR','NS','NT','NU',
        'NW','NX','NY','NZ',
            'SC','SD','SE','TA',
            'SH','SJ','SK','TF','TG',
        'SM','SN','SO','SP','TL','TM',
        'SR','SS','ST','SU','TQ','TR',
    'SV','SW','SX','SY','SZ','TV'
        ].includes(k)));

    osgb.coords['10k'] = calculate_10x10_grid(osgb.coords['100k'], 10000); // Lookup of easting, northing of the SW corner of the GB OS 10km squares
    osgb.coords['2k'] = calculate_5x5_grid(osgb.coords['10k'], os_tetrad_letters, 2000); // Lookup of easting, northing of the SW corner of the GB OS 2km tetrads
    osgb.coords['1k'] = calculate_10x10_grid(osgb.coords['10k'], 1000); // Lookup of easting, northing of the SW corner of the GB OS 1km squares

    // Create polygons for all levels of the grid
    osgb.polygons['500k'] = coords_to_polygons(osgb.coords['500k'], 500000);
    osgb.polygons['100k'] = coords_to_polygons(osgb.coords['100k'], 100000);
    osgb.polygons['10k'] = coords_to_polygons(osgb.coords['10k'], 10000);
    osgb.polygons['2k'] = coords_to_polygons(osgb.coords['2k'], 2000);
    osgb.polygons['1k'] = coords_to_polygons(osgb.coords['1k'], 1000);

    return(osgb);
}

function downloadObjectAsJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

var request = new XMLHttpRequest();
request.onload = function() {
    var arrayBuffer = request.response;
    proj4.nadgrid('OSTN15_NTv2_OSGBtoETRS', arrayBuffer);
    // Two definitions necessary as the nadgrids option (preferred) does not cover the outer edges of the outermost grid squares
    proj4.defs('EPSG:27700', '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +units=m +no_defs +nadgrids=OSTN15_NTv2_OSGBtoETRS');
    proj4.defs('EPSG:27700a', '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +units=m +no_defs');
};
request.open('GET', 'https://raw.githubusercontent.com/OrdnanceSurvey/os-transform/main/OSTN15_NTv2_OSGBtoETRS.gsb');
request.responseType = 'arraybuffer';
request.send();

const defaultColour = '#13a300';

const objectsTable = document.getElementById('objects-table');
const categoriesTable = document.getElementById('categories-table');

var settings = {
    objects: [],
    categories: [],
    showGrid: false,
    clickmode: 'area'
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
    layers[category] = L.geoJson(layer, {style: layerStyle(settings.categories.find(o => o.id === category))}).addTo(map);
}

function updateLabelLayer() {
    map.removeLayer(layers['label-layer']);
    var labels = [];
    settings.objects.filter(o => o.label).map(o => {
        var marker = new L.marker([o.lat, o.lon], { opacity: 0 });
        marker.bindTooltip(o.title, {permanent: true, className: "map-label", offset: [-16  , 27], direction: 'center' });
        labels.push(marker);
    });
    layers['label-layer'] = L.layerGroup(labels, {pane: 'labels'}).addTo(map);
}

function addObject(object) {
    // Add the object to the settings storage
    settings.objects.push(object);
    const category = settings.categories.find(o => (o.id === object.category));
    // Add a new row to the objects table
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><i class="colour-block" style="background: ${category.fill}; opacity: ${category.opacity}; fill-opacity: ${category.fillOpacity}; color: ${category.colour}"></i>${object.title}</td>
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
    cells[0].innerHTML = `<td><i class="colour-block" style="background: ${category.fill}; opacity: ${category.opacity}; fill-opacity: ${category.fillOpacity}; color: ${category.colour}"></i>${object.title}</td>`;
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
        '<b>Click <i class="fa fa-search"></i> below to search for a location</b><br />Use longpress/right-click to select locations which cannot be identified via search. The map will colour areas by their category, click Settings to change formatting.<br />' +
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
        opacity: category.opacity,
        fillOpacity: category.fillOpacity
    };
}

function addCategory(category) {
    if (!category.hasOwnProperty('id')) {
        // Ensure no ID clashes for new categories
        category.id = settings.categories.reduce((a,b) => (b.id > a) ? b.id : a, -1) + 1;
    }
    if (!category.hasOwnProperty('opacity')) {
        category.opacity = 1;
    }
    if (!category.hasOwnProperty('fillOpacity')) {
        category.fillOpacity = 0.7;
    }
    // New record - add to settings
    settings.categories.push(category);
    // Add row to the category table
    const row = document.createElement('tr');
    row.innerHTML = `
    <td><i class="colour-block" style="background: ${category.fill}; opacity: ${category.opacity}; fill-opacity: ${category.fillOpacity}; color: ${category.colour}"></i>${category.title}</td>
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
    settings.categories[index].opacity = category.opacity;
    settings.categories[index].fillOpacity = category.fillOpacity;
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
        document.getElementById('category-opacity').value = 100;
        document.getElementById('category-fillOpacity').value = 70;
    } else {
        document.getElementById('category-modal-title').textContent = "Edit a category";
        document.getElementById('category-id').value = category.id;
        document.getElementById('category-title').value = category.title;
        document.getElementById('category-fill').value = category.fill;
        document.getElementById('category-colour').value = category.colour;
        document.getElementById('category-weight').value = category.weight;
        document.getElementById('category-opacity').value = Math.round(category.opacity * 100);
        document.getElementById('category-fillOpacity').value = Math.round(category.fillOpacity * 100);
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
        weight: document.getElementById('category-weight').value,
        opacity: document.getElementById('category-opacity').value / 100.0,
        fillOpacity: document.getElementById('category-fillOpacity').value / 100.0
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
    var downloadSVGBtn = document.getElementById('download-svg');
    var bottomSheetTrigger = document.querySelector('.modal-trigger');
    var bottomSheetInstance = M.Modal.init(document.getElementById('bottom-sheet'));
    var categoryModalTrigger = document.querySelector('.add-category');
    var categoryModalInstance = M.Modal.init(document.getElementById('category-modal'));
    var uploadGeoJSONInput = document.getElementById('upload-geojson');
    var toggleGridBtn = document.getElementById('toggle-grid');
    var selectLayers = document.getElementsByClassName('leaflet-control-layers-selector');
    var clickModeRadioBtns = document.querySelectorAll('input[name="click-mode"]');

    toggleGridBtn.addEventListener('click', async function(event) {
        if (event.target.checked) {
            settings.showGrid = true;
            var result = await fetch("osgb-2k-grid-2024-06-02T19_20_06.214Z.geojson",).then(
                (data)=>data.json()
            );
            layers['osgb-tetrad-layer'] = L.geoJson(result, {style: {fill: false, color: '#ccc', opacity: 0.5, weight: 2}, pane: 'grid'}).addTo(map);
        } else {
            settings.showGrid = false;
            map.removeLayer(layers['osgb-tetrad-layer']);
            layers['osgb-tetrad-layer'] = null;
        }
    });

    clickModeRadioBtns.forEach(function(radio) {
        radio.addEventListener('change', function() {
            settings.clickmode = this.value;
        });
    });
    
    map.on("zoomend", function (event) { 
        if (layers.hasOwnProperty('osgb-tetrad-layer') && layers['osgb-tetrad-layer'] !== null) {
            if (event.target._zoom > 10) {
                if (!map.hasLayer(layers['osgb-tetrad-layer'])) {
                    layers['osgb-tetrad-layer'].addTo(map);
                }
            } else {
                if (map.hasLayer(layers['osgb-tetrad-layer'])) {
                    map.removeLayer(layers['osgb-tetrad-layer']);
                }
            }
        }
        if (layers.hasOwnProperty('label-layer') && layers['label-layer'] !== null) {
            if (event.target._zoom > 11) {
                if (!map.hasLayer(layers['label-layer'])) {
                    layers['label-layer'].addTo(map);
                }
            } else {
                if (map.hasLayer(layers['label-layer'])) {
                    map.removeLayer(layers['label-layer']);
                }
            }
        }
    });

    M.Modal.init(document.getElementById('object-modal'));
    M.updateTextFields();
    // Add an empty layer for labels to the map
    layers['label-layer'] = L.layerGroup([], {pane: 'labels'}).addTo(map)
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
        downloadObjectAsJSON(settings, 'map-creator-' + (new Date()).toISOString() + '.json');
    });

    downloadSVGBtn.addEventListener('click', function() {
        const svg = document.getElementsByClassName('leaflet-overlay-pane')[0].getElementsByTagName('svg')[0];
        const textsvg = Object.values(layers['label-layer']._layers).map(
            function(a) {
                var loc = map.latLngToLayerPoint(a.getLatLng());
                var text = a._tooltip._content;
                return('<text x="' + (loc.x) + '" y="' + (loc.y) + '" class="small" text-anchor="middle" font-family="Arial, Helvetica, sans-serif">' + text + '</text>');
            }
        ).join('\n\t');
        var gridsvg = '';
        if (settings.showGrid) {
            gridsvg = document.getElementsByClassName('leaflet-grid-pane')[0].getElementsByTagName('svg')[0].innerHTML;
        }
        var fullsvg = '<svg viewBox="' + svg.getAttribute('viewBox') + '" width="' + svg.getAttribute('width') + '" height="' + svg.getAttribute('height') + '">' + svg.innerHTML + textsvg + gridsvg + '</svg>'
        var svgBlob = new Blob([fullsvg], {type:"image/svg+xml;charset=utf-8"});
        var svgUrl = URL.createObjectURL(svgBlob);
        var downloadLink = document.createElement("a");
        downloadLink.href = svgUrl;
        downloadLink.download = 'map-creator-' + (new Date()).toISOString() + '.svg';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
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
        var overpassBody;
        if (settings.clickmode=='area') {
            overpassBody = `data=
[timeout:10]
[out:json];
is_in(${event.latlng.lat},${event.latlng.lng})->.a;
way(pivot.a);
out geom;
`;
        } else if (settings.clickmode=='highway') {
            overpassBody = `data=
[timeout:10]
[out:json];
node(around:10,${event.latlng.lat},${event.latlng.lng})->.aroundnodes;
way(bn.aroundnodes)[highway~".*"]->.allways;
node(w.allways)->.waynodes;
( 
    node.waynodes.aroundnodes; 
    way.allways.allways; 
    );
way(pivot.allways);
out geom;
`;
        } else if (settings.clickmode=='railway') {
            overpassBody = `data=
[timeout:10]
[out:json];
node(around:10,${event.latlng.lat},${event.latlng.lng})->.aroundnodes;
way(bn.aroundnodes)[railway~".*"]->.allways;
node(w.allways)->.waynodes;
( 
    node.waynodes.aroundnodes; 
    way.allways.allways; 
    );
way(pivot.allways);
out geom;
`;
        } else {
            M.toast({html: 'Unexpected mode'})
        }
        var result = await fetch(
            "https://overpass-api.de/api/interpreter",
            {
                method: "POST",
                body: overpassBody
            },
        ).then(
            (data)=>data.json()
        );
        var added = false;
        for (var r = 0; r < result.elements.length; r++) {
            var way = result.elements[r];
            var boundary = way.geometry.map(a => [a.lon, a.lat]);
            if (settings.objects.filter(o => (o.id === way.id)).length === 0) {
                var type = 'MultiLineString';
                if (way.nodes[0] === way.nodes.at(-1)) {
                    type = 'Polygon';
                }
                addObject({
                    title: way.tags.hasOwnProperty('name') ? way.tags.name : way.id.toString(),
                    id: way.id,
                    geojson: {
                        type: type,
                        coordinates: [boundary]
                    },
                    lat: event.latlng.lat,
                    lon: event.latlng.lng,
                    category: settings.categories[0].id,
                    label: true
                });
                added = true;
                break;
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
    addCategory({title: 'Default', id: 0, fill: defaultColour, colour: defaultColour, weight: 2, opacity: 1, fillOpacity: 0.7});
});
