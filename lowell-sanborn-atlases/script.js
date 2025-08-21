/* global turf */
/* global autocomplete */
/* global L */
/* global axios */

// Define layers---one light and dark for each basemap,
// plus the sanborn overlay and sideBySide object---
// we only add the sanborn overlay and sideBySide for now

let map = L.map("leaflet-map", {
  center: [42.63052288354389, -71.31265634670854],
  zoom: 14,
  minZoom: 14,
  maxZoom: 18,
});

let left = map.createPane("left");
let right = map.createPane("right");

let tileLayerDetails = [
  {
    tileSize: 512,
    zoomOffset: -1,
    minZoom: 14,
    maxZoom: 18,
    crossOrigin: true,
  },
];

// define basemap tile variables

let streetsURL = "https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?";
let satURL = "https://api.maptiler.com/maps/hybrid/256/{z}/{x}/{y}@2x.jpg?";
let key = "key=1HCKO0pQuPEfNXXzGgSM";

// define overlay string variables

let baseURL =
  "https://s3.us-east-2.wasabisys.com/lmec-public-files/temp/lowell-georef/";
let xyz = "/{z}/{x}/{-y}.png";

// define basemap layers

let streetsLight = L.tileLayer(streetsURL + key, tileLayerDetails);
let streetsDark = L.tileLayer(streetsURL + key, tileLayerDetails);
let satLight = L.tileLayer(satURL + key, tileLayerDetails);
let satDark = L.tileLayer(satURL + key, tileLayerDetails);

// define overlay layers

let mosaic1896 = L.tileLayer(baseURL + "mosaic-1896" + xyz, tileLayerDetails);
let mosaic1906 = L.tileLayer(baseURL + "mosaic-1906" + xyz, tileLayerDetails);
let mosaic1907 = L.tileLayer(baseURL + "mosaic-1907" + xyz, tileLayerDetails);
let mosaic1924 = L.tileLayer(baseURL + "mosaic-1924" + xyz, tileLayerDetails);
let mosaic1936 = L.tileLayer(baseURL + "mosaic-1936" + xyz, tileLayerDetails);

// define side-by-side control

let overlayMaps = [mosaic1896, mosaic1906, mosaic1907, mosaic1924, mosaic1936];
let sideBySide = L.control.sideBySide(null, overlayMaps);

// create object to hold key-value pairs for basemap toggle,
// variables to hold overlay data, and
// variable to hold Leaflet control

// let streets = [streetsLight, streetsDark];
// let sat = [satLight, satDark];

let baseMaps = {
  Streets: streetsLight,
  Satellite: satLight,
};

let sanborn1896 = "Sanborn Maps, 1896";
let sanborn1906 = "Sanborn Maps, 1906";
let sanborn1907 = "Sanborn Maps, 1907";
let sanborn1924 = "Sanborn Maps, 1924";
let sanborn1936 = "Sanborn Maps, 1936";
// let opacitySliderTitle = "Opacity slider: "

let overlays = {
  [sanborn1896]: mosaic1896,
  [sanborn1906]: mosaic1906,
  [sanborn1907]: mosaic1907,
  [sanborn1924]: mosaic1924,
  [sanborn1936]: mosaic1936,
  // [opacitySliderTitle]: '<br><input id="range" type="range" min="0" max="1" step="0.05" value="1" class="slider" oninput="updateOpacity(this.value)">',
};

let controlBase = L.control.layers(baseMaps, null);

let controlOverlay = L.control.layers(overlays, null);

// define functions for
// updating opacity,
// drawing the map, and
// updating the map

// function updateOpacity(value) {
//   overlayMaps[0].setOpacity(value);
// }

function drawMap(light, dark) {
  map.removeLayer(dark);
  map.addLayer(dark);
  dark.getContainer().style.filter = "brightness(25%)";
  map.addLayer(light);
  sideBySide.setLeftLayers(light);
}

map.on("baselayerchange", function (baseMaps) {
  if (baseMaps.name === "Satellite") {
    drawMap(satLight, satDark);
  } else if (baseMaps.name === "Streets") {
    drawMap(streetsLight, streetsDark);
    map.addLayer(streetsLight.bringToFront());
  } else {
  }
});

// grip it and rip it

drawMap(streetsLight, streetsDark);

sideBySide.addTo(map);
controlBase.addTo(map);
controlOverlay.addTo(map);
