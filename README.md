# Map Creator App

A basic web app that allows the user to create simple maps using geographical features displayed on [openstreetmap](https://www.openstreetmap.org). It is intended to allow the creation of maps containing only important features.

Maps can be downloaded as SVG files or screengrabbed.

If you like the map and can afford it, please [donate to Action Cancer](https://actioncancer.org/donate-to-action-cancer/) or [buy me a coffee](https://www.buymeacoffee.com/pbarber).

## Privacy

The app uses Google Analytics to measure usage and to capture search and starting locations.

## Adding features

To add features to the map, try using the search box to find the feature by name. The search uses the [Nominatim API](https://nominatim.openstreetmap.org).

Not all features are can be found using Nominatim, so you can also add features at the required position on the map by clicking, using either right-click (on mouse/mousepad) or long press (on mobile/tablet). The search method can be changed in the Settings page; Areas, Highways (including footpaths) and Railways use the [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API), while Reverse Geocoding uses Nominatim. 

To make it easier to locate the feature that you want to click, you can change the base map by clicking the layers button under the map zoom. Clicking behaves differently at different zoom levels, so if clicking does not find the right feature, try zooming in or out and then clicking again.

For best results, zoom in as close as possible to roads, railways and footpaths and try clicking at different points along the line to find the right line. Some trial and error is usually needed when clicking, it is often best to keep clicking until you find the feature you want, then go into Settings to delete any unwanted features that were added.

The map will automatically centre itself only when the first feature is added. All added features will be labelled with their name, if available, or the Overpass ID otherwise. The map can be dragged and zoomed.

## Settings

To change the way that features are displayed, click on the 'Settings' button. This will bring up a modal window containing a list of all features on the map. Any changes made in Settings are automatically applied. To return to the map from Settings, click on the greyed-out section of the map above the Settings window.

### Changing features

To remove an incorrectly added feature, click on the 'Settings' button and use the 'bin' button next to the feature. To centre the map on the feature, click the 'target' button next to the feature. If you want to edit the feature name, or hide the label, use the 'pencil' button.

### Categorising features

The app allows you to group features into categories. This allows features of a particular type (e.g. woodland) to be coloured in the same way on the map. To add a new category, open the Settings and click 'Add Category'.

Existing categories can be removed (bin button) or edited (pencil button). To change the outline and fill colour of a category, use the edit button.

### Saving and restoring settings

All settings can be saved using the Download Settings button. This will download a timestamped JSON format file to your computer. It is recommended that you regularly download the settings file so that you do not lose your work.

Previously downloaded settings files can be uploaded using the 'Upload Settings' button. You should be able to share the JSON file with other users, who can then upload the file to view or work on your map.

### Exporting an image

If you are happy with the map as it is displayed on the screen, you can use screengrab to take an image of the map and then crop it appropriately.

If you would like to make further changes to the map, you can export the map as an SVG using the 'Download Image' button in Settings. If you want to make further adjustments to downloaded SVG files, [Inkscape](https://inkscape.org/) is recommended. This will allow you to change fonts, apply additional styling and adjust the position of labels.

### Adding a GB tetrad grid

The app allows you to overlay a [Great Britain tetrad](https://www.bto.org/our-science/projects/birdatlas/methods/correct-grid-references/know-your-place) grid onto your map. This is useful for ornithological survey work.

## Technical details

Don't read any further unless you really want to.

### App setup

To run the app, clone the github repo and open [index.html](index.html) in a web browser. The app consists of a [single HTML file](index.html) and a [single JavaScript file](app.js). It uses a [static GeoJSON file for the tetrad grid](osgb-2k-grid-2024-06-02T19_20_06.214Z.geojson).

Key JavaScript libraries used are:

* [Leaflet](https://leafletjs.com/) - for the base map, feature display, zoom, labels and grid
* [Leaflet Control Geocoder](https://github.com/perliedman/leaflet-control-geocoder) - for the search box and results
* [Materialize](https://materializecss.com/getting-started.html) - for the Settings controls
* [proj4](http://proj4js.org/) - for calculating the GB tetrads and associated grids
* [Material Icons](https://fonts.google.com/icons) - for Settings icons
* [Font Awesome Icons](https://fontawesome.com/v4/cheatsheet/) - for search icon
