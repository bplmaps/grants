let map = L.map("leaflet-map", {
  center: [42.349025757480695, -71.0633773458004],
  minZoom: 13,
  maxZoom: 20,
  zoom: 14,
  zoomControl: false,
});
L.control
  .zoom({
    position: "bottomleft",
  })
  .addTo(map);

let left = map.createPane("left");
let right = map.createPane("right");

let details = {
  minZoom: 13,
  maxZoom: 20,
};

let syriaPoints =
  "https://raw.githubusercontent.com/chloebordewich/boston-little-syria/main/_data/032124v6LittleSyriaPoints.geojson";
let streets = L.tileLayer(
  "https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=1HCKO0pQuPEfNXXzGgSM",
  details
);
let tileLayers = {
  streets:
    "https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=1HCKO0pQuPEfNXXzGgSM",
  b1895:
    "https://s3.us-east-2.wasabisys.com/urbanatlases/39999059011260/tiles/{z}/{x}/{y}.png",
  b1912:
    "https://s3.us-east-2.wasabisys.com/urbanatlases/39999059011492/tiles/{z}/{x}/{y}.png",
  b1922:
    "https://s3.us-east-2.wasabisys.com/urbanatlases/39999059011526/tiles/{z}/{x}/{y}.png",
  b1938:
    "https://s3.us-east-2.wasabisys.com/urbanatlases/39999059011690/tiles/{z}/{x}/{y}.png",
  bra1960:
    "https://s3.us-east-2.wasabisys.com/lmec-public-files/temp/small-grants-storage/tiles/{z}/{x}/{y}.png",
};
let labelNames = {
  yesToday: "See today (Modern street map)",
  yes1895: "See 1895 (Bromley atlas)",
  yes1912: "See 1912 (Bromley atlas)",
  yes1922: "See 1922 (Bromley atlas)",
  yes1938: "See 1938 (Bromley atlas)",
  yes1960: "See 1960/1962 (BRA maps)",
};
let filteredPoints = {
  yesToday: "2023yn",
  yes1895: "1895yn",
  yes1912: "1912yn",
  yes1922: "1922yn",
  yes1938: "1938yn",
  yes1960: "1960yn",
};
let types = [
  "Church",
  "Civic Organization",
  "Food and Entertainment",
  "Sign/Memorial",
  "Publication",
  "Residence",
  "Store",
];

let iconClass = L.Icon.extend({
  options: {
    iconSize: [40, 40],
  },
});

// Add icon links below

let chrch = new iconClass({
    iconUrl:
      "https://cdn.glitch.global/ffcff6bd-e46b-4ac9-8907-75465813c262/church.png?v=1692883968292",
  }),
  civ = new iconClass({
    iconUrl:
      "https://cdn.glitch.global/ffcff6bd-e46b-4ac9-8907-75465813c262/civic.png?v=1692883968292",
  }),
  bus = new iconClass({
    iconUrl:
      "https://cdn.glitch.global/ffcff6bd-e46b-4ac9-8907-75465813c262/fin.png?v=1692883968292",
  }),
  mem = new iconClass({
    iconUrl:
      "https://cdn.glitch.global/ffcff6bd-e46b-4ac9-8907-75465813c262/memorial.png?v=1692883968292",
  }),
  pub = new iconClass({
    iconUrl:
      "https://cdn.glitch.global/ffcff6bd-e46b-4ac9-8907-75465813c262/pub.png?v=1692883968292",
  }),
  home = new iconClass({
    iconUrl:
      "https://cdn.glitch.global/ffcff6bd-e46b-4ac9-8907-75465813c262/res.png?v=1692883968292",
  }),
  rest = new iconClass({
    iconUrl:
      "https://cdn.glitch.global/ffcff6bd-e46b-4ac9-8907-75465813c262/restaurant.png?v=1692883968292",
  });

let overlayMaps = [], // empty array of maps
  overlayMapLabels = {}, // empty object for control labels
  overlayPoints = {}; // empty object for points

let i = 0;
for (key in tileLayers) {
  if (tileLayers.hasOwnProperty(key)) {
    overlayMaps.push(L.tileLayer(tileLayers[key], details));
    let source = { [Object.values(labelNames)[i]]: overlayMaps[i] };
    Object.assign(overlayMapLabels, source);
    i += 1;
  }
}

Promise.all([fetch(syriaPoints).then((data) => data.json())]).then(function (
  json
) {
  drawMap(json, streets, Object.values(overlayMaps)[3]);
});

function drawMap(jsonLayer, streets, overlay) {
  map.addLayer(overlay);
  let overlayControl = L.control
    .layers(null, null, {
      collapsed: true,
    })
    .addTo(map);
  let i = 0;
  let image = document.createElement("img");
  let bib = document.createElement("bib");
  let noImage = document.createElement("img");
  let imageParent = document.getElementById("embeddedPic");
  for (key in filteredPoints) {
    let val = Object.values(filteredPoints)[i];
    let key = Object.keys(filteredPoints)[i];
    let pointsLayer = {
      [key]: L.geoJSON(jsonLayer, {
        filter: function (feature) {
          if (feature.properties[val] === "yes") {
            return true;
          }
        },
        pointToLayer: function (feature, ll) {
          let feat = L.marker(ll, {
            icon: iconByType(feature),
          });
          return feat;
        },
      }).on("click", function (feature) {
        let f = feature.layer.feature.properties;
        let categories = [
          "siteName",
          "address",
          "siteType",
          "dates",
          "popupText",
          "imageSource",
        ];
        for (const cat of categories) {
          document.getElementById(cat).innerHTML = f[cat];
        }
        image.id = "embeddedPic";
        // image.className = "class";
        image.src = f.embeddedPic;
        bib.src = f.imageSource;
        if (image.src === window.location.href) {
          document.getElementById("embeddedPic").innerHTML =
            'There is no image for this site just yet.<br><br>Do you have something that would fit here? If so, <a href="https://bostonlittlesyria.org/contact">let us know</a>!';
        } else {
          document.getElementById("embeddedPic").innerHTML = "";
          imageParent.appendChild(image);
          // imageParent.appendChild(bib);
        }
      }),
    };
    function iconByType(feature) {
      if (feature.properties.siteType === "Church") return chrch;
      else if (feature.properties.siteType === "Civic Organization") return civ;
      else if (feature.properties.siteType === "Food and Entertainment")
        return rest;
      else if (feature.properties.siteType === "Sign/Memorial") return mem;
      else if (feature.properties.siteType === "Publication") return pub;
      else if (feature.properties.siteType === "Residence") return home;
      else return bus;
    }
    Object.assign(overlayPoints, pointsLayer);
    i += 1;
  }

  updatePoints();

  function wipe(points, controls) {
    console.log(points);
    let arr = [];
    for (const control of controls._layers) {
      arr.push(control);
    }
    for (const layer of arr) {
      overlayControl.removeLayer(layer.layer);
    }
    for (key in points) {
      points[key].eachLayer(function (layer) {
        map.removeLayer(layer);
      });
    }
  }

  function updateOverlays(points) {
    for (const type of types) {
      let arr = [];
      let retypes = [];
      points.eachLayer(function (layer) {
        if (layer.feature.properties.siteType == type) {
          let retype = type + "asdjkafd";
          arr.push(layer);
          retypes.push(retype);
        }
      });
      let total = arr.length;
      if (arr.length == total && total > 0) {
        let typeLayer = L.layerGroup(arr);
        typeLayer.addTo(map);
        overlayControl.addOverlay(typeLayer, type);
      }
    }
  }

  function updatePoints() {
    if (map.hasLayer(overlayMapLabels["See 1895 (Bromley atlas)"]) === true) {
      wipe(overlayPoints, overlayControl);
      updateOverlays(overlayPoints.yes1895);
    } else if (
      map.hasLayer(overlayMapLabels["See 1912 (Bromley atlas)"]) === true
    ) {
      wipe(overlayPoints, overlayControl);
      updateOverlays(overlayPoints.yes1912);
    } else if (
      map.hasLayer(overlayMapLabels["See 1922 (Bromley atlas)"]) === true
    ) {
      wipe(overlayPoints, overlayControl);
      updateOverlays(overlayPoints.yes1922);
    } else if (
      map.hasLayer(overlayMapLabels["See 1938 (Bromley atlas)"]) === true
    ) {
      wipe(overlayPoints, overlayControl);
      updateOverlays(overlayPoints.yes1938);
    } else if (
      map.hasLayer(overlayMapLabels["See 1960/1962 (BRA maps)"]) === true
    ) {
      wipe(overlayPoints, overlayControl);
      updateOverlays(overlayPoints.yes1960);
    } else {
      wipe(overlayPoints, overlayControl);
      updateOverlays(overlayPoints.yesToday);
    }
  }

  map.on("baselayerchange", updatePoints);

  let baseControl = L.control
    .layers(overlayMapLabels, null, {
      position: "topleft",
      collapsed: true,
    })
    .addTo(map);

  map.addLayer(streets);

  let overlayLegend = overlayControl.getContainer();
  let baseLegend = baseControl.getContainer();
  let ol = document.getElementById("overlay-legend");
  let bl = document.getElementById("base-legend");
  function setParent(el, newParent) {
    newParent.appendChild(el);
  }
  setParent(overlayLegend, ol);
  setParent(baseLegend, bl);
}
