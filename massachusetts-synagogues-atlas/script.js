let map = L.map("leaflet-map", {
  center: [42.351025757480695, -71.0683773458004],
  zoom: 14,
  zoomControl: false,
});

L.tileLayer(
  "https://api.maptiler.com/maps/pastel/{z}/{x}/{y}.png?key=1HCKO0pQuPEfNXXzGgSM",
  {
    tileSize: 512,
    zoomOffset: -1,
    minZoom: 8,
    attribution:
      '\u003ca href="https://www.maptiler.com/copyright/" target="_blank"\u003e\u0026copy; MapTiler\u003c/a\u003e \u003ca href="https://www.openstreetmap.org/copyright" target="_blank"\u003e\u0026copy; OpenStreetMap contributors\u003c/a\u003e',
    crossOrigin: true,
    // opacity: 0.5
  }
).addTo(map);

let iconBase = `<svg
      xmlns="http://www.w3.org/2000/svg"
      width="24px"
      height="24px"
      viewBox="-36 -12 536 536"
      stroke="black"
      stroke-width="10px"
    >
      <path fill="`;
let iconPath = `" d="M405.68 256l53.21-89.39C473.3 142.4 455.48 112 426.88 112H319.96l-55.95-93.98C256.86 6.01 244.43 0 232 0s-24.86 6.01-32.01 18.02L144.04 112H37.11c-28.6 0-46.42 30.4-32.01 54.61L58.32 256 5.1 345.39C-9.31 369.6 8.51 400 37.11 400h106.93l55.95 93.98C207.14 505.99 219.57 512 232 512s24.86-6.01 32.01-18.02L319.96 400h106.93c28.6 0 46.42-30.4 32.01-54.61L405.68 256z"/>
    </svg>`;

let townStyle = {
  color: "black",
  fill: "#044B94",
  fillOpacity: 0,
  weight: 2,
  opacity: 0.3,
};

let synagogues =
  "https://cdn.glitch.global/b5b0ddac-c72a-4b6a-985d-02f11af24299/synagogues_20240701.geojson?v=1719845074442";
let towns =
  "https://cdn.glitch.global/6176617c-0b0e-49a2-860c-5038007810df/mass-municipalities.geojson?v=1652292559639";

function highlightPoints(e) {
  let layer = e.target;
  layer.setStyle({
    weight: 5,
    color: "blue",
    fill: "blue",
    fillOpacity: 0,
  });
}

function resetPoints(e) {
  let layer = e.target;
  layer.setStyle({
    color: "black",
    fill: "#044B94",
    fillOpacity: 0,
    weight: 2,
    opacity: 0.3,
  });
}

function resetTown(e) {
  let layer = e.target;
  layer.setStyle({
    color: "black",
    fill: "#044B94",
    fillOpacity: 0,
    weight: 2,
    opacity: 0.3,
  });
}

let icons = {
  icon1: new L.divIcon({
    html: iconBase + "#fff44f" + iconPath,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [0, 0],
  }),
  icon2: new L.divIcon({
    html: iconBase + "#a1dab4" + iconPath,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [0, 0],
  }),
  icon3: new L.divIcon({
    html: iconBase + "#41b6c4" + iconPath,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [0, 0],
  }),
  icon4: new L.divIcon({
    html: iconBase + "#225ea8" + iconPath,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [0, 0],
  }),
};

function iconByYear(feature) {
  let icon;
  let year = feature.properties.YearNum;

  if (year >= 1840 && year <= 1889) icon = icons["icon1"];
  else if (year >= 1890 && year <= 1919) icon = icons["icon2"];
  else if (year >= 1920 && year <= 1949) icon = icons["icon3"];
  else icon = icons["icon4"];

  return icon;
}

function hoverPopup(marker) {
  marker.on("mouseover", function (e) {
    this.openPopup();
  });
  marker.on("mouseout", function (e) {
    this.closePopup();
  });
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.toLowerCase().slice(1);
}

function firstLower(lower) {
  return (lower && lower[0].toLowerCase() + lower.slice(1)) || lower;
}

Promise.all([
  fetch(synagogues).then((data) => data.json()),
  fetch(towns).then((data) => data.json()),
]).then(function (json) {
  drawMap(json);
});

function drawMap(json) {
  const synagoguesLayer = L.geoJSON(json[0], {
    pointToLayer: function (feature, latlng) {
      return L.marker(latlng, {
        icon: iconByYear(feature),
      });
    },
  })
    .bindPopup(function (layer) {
      function capitalize(str) {
        const lower = str.toLowerCase();
        const re = /(\b[a-z](?!\s))/g;
        return lower.replace(re, function (a) {
          return a.toUpperCase();
        });
      }
      let field = layer.feature.properties;
      let popupIn = {
        name: field.NameOfCongregation,
        address: field.Address,
        city: field.City,
        year: field.YearNum,
        founders: field.FoundedBy,
      };
      popupOut = [];
      for (const [key, value] of Object.entries(popupIn)) {
        if (value != "9999" || value != 9999) {
          popupOut.push(value);
        } else {
          popupOut.push(`Unknown ${key}`);
        }
      }
      console.log(popupOut);
      return `
        <b>${popupOut[0]}</b><br>
        Address: ${popupOut[1]}<br>
        City/Town: ${capitalize(popupOut[2])}<br>
        Year Founded: ${popupOut[3]}<br>
        Founders: ${popupOut[4]}<br>
        `;
    })
    .addTo(map)
    .on("click", clickZoom);

  autocomplete(document.getElementById("jump-input"), array);

  const townsLayer = L.geoJSON(json[1], {
    style: townStyle,
  }).addTo(map);

  let legend = L.control({ position: "topleft" });

  legend.onAdd = function (map) {
    let div = L.DomUtil.create("div", "legend");
    div.innerHTML += "<h4>Year Founded</h4>";
    div.innerHTML +=
      '<i style="background: #fff44f; "></i><span>Founded 1840 to 1889</span><br>';
    div.innerHTML +=
      '<i style="background: #a1dab4"></i><span>Founded 1890 to 1919</span><br>';
    div.innerHTML +=
      '<i style="background: #41b6c4"></i><span>Founded 1920 to 1949</span><br>';
    div.innerHTML +=
      '<i style="background: #225ea8"></i><span>Founded 1950 to 2012</span><br>';
    return div;
  };

  legend.addTo(map);

  let logos = L.control({ position: "bottomleft" });

  logos.onAdd = function (map) {
    let logo = L.DomUtil.create("div", "logos");
    logo.innerHTML += `<div class="p-2">
      <a href="https://www.jgsgb.org" target="blank">
              <img
                src="https://cdn.jewishboston.com/uploads/terms-images/organizations/JGSGB-logo-medium.png"
                id="JGSGB-logo"
                alt="JGSGB logo"
                class="small-logo"
              />
            </a>
            <a href="https://leventhalmap.org" target="blank">
              <img
                src="https://s3.wasabisys.com/lmec-public-files/images/MapCenter-small.png"
                class="small-logo"
                alt="LMEC Logo"
            /></a></div>
      `;
    return logo;
  };

  logos.addTo(map);

  let mapdivs = [logos, legend];
  for (let i = 0; i < mapdivs.length; i++) {
    mapdivs[i].getContainer().addEventListener("mouseover", function () {
      map.dragging.disable();
      map.doubleClickZoom.disable();
    });
    mapdivs[i].getContainer().addEventListener("mouseout", function () {
      map.dragging.enable();
      map.doubleClickZoom.enable();
    });
  }

  // L.control.layers(legend, {
  //     collapsed: false,
  //   })
  //   .addTo(map);

  map.on("overlayadd overlayremove", function (evt) {
    synagoguesLayer.clearLayers();
    synagoguesLayer.addData(json[0]);
  });
}

function clickZoom(e) {
  map.setView(e.layer.getLatLng());
}

function jump() {
  $.getJSON(towns, function (data) {
    let dataLayer = L.geoJSON(data);
    for (let i = 0; i < data.features.length; i++) {
      if (
        document.getElementById("jump-input").value.toUpperCase() ===
        data.features[i].properties.massgis_name
      ) {
        let name = data.features[i].properties.massgis_name;
        dataLayer.eachLayer(function (layer) {
          if (layer.feature.properties.massgis_name === name) {
            map.fitBounds(layer.getBounds());
          }
        });
      } else {
      }
    }
  });
}

// autocomplete

function autocomplete(inp, arr) {
  var currentFocus;
  inp.addEventListener("input", function (e) {
    var a,
      b,
      i,
      val = this.value;
    closeAllLists();
    if (!val) {
      return false;
    }
    currentFocus = -1;
    a = document.createElement("DIV");
    a.setAttribute("id", this.id + "autocomplete-list");
    a.setAttribute("class", "autocomplete-items");
    this.parentNode.appendChild(a);
    for (i = 0; i < arr.length; i++) {
      if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
        b = document.createElement("DIV");
        b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
        b.innerHTML += arr[i].substr(val.length);
        b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
        b.addEventListener("click", function (e) {
          inp.value = this.getElementsByTagName("input")[0].value;
          closeAllLists();
        });
        a.appendChild(b);
      }
    }
  });
  inp.addEventListener("keydown", function (e) {
    var x = document.getElementById(this.id + "autocomplete-list");
    if (x) x = x.getElementsByTagName("div");
    if (e.keyCode == 40) {
      currentFocus++;
      addActive(x);
    } else if (e.keyCode == 38) {
      currentFocus--;
      addActive(x);
    } else if (e.keyCode == 13) {
      e.preventDefault();
      if (currentFocus > -1) {
        if (x) x[currentFocus].click();
      }
    }
  });
  function addActive(x) {
    if (!x) return false;
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = x.length - 1;
    x[currentFocus].classList.add("autocomplete-active");
  }
  function removeActive(x) {
    for (var i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
  }
  function closeAllLists(elmnt) {
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
      if (elmnt != x[i] && elmnt != inp) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }  document.addEventListener("click", function (e) {
    closeAllLists(e.target);
  });
}

let array = [
  "Abington",
  "Acton",
  "Acushnet",
  "Adams",
  "Agawam",
  "Alford",
  "Amesbury",
  "Amherst",
  "Andover",
  "Aquinnah",
  "Arlington",
  "Ashburnham",
  "Ashby",
  "Ashfield",
  "Ashland",
  "Athol",
  "Attleboro",
  "Auburn",
  "Avon",
  "Ayer",
  "Barnstable",
  "Barre",
  "Becket",
  "Bedford",
  "Belchertown",
  "Bellingham",
  "Belmont",
  "Berkley",
  "Berlin",
  "Bernardston",
  "Beverly",
  "Billerica",
  "Blackstone",
  "Blandford",
  "Bolton",
  "Boston",
  "Bourne",
  "Boxborough",
  "Boxford",
  "Boylston",
  "Braintree",
  "Brewster",
  "Bridgewater",
  "Brighton",
  "Brimfield",
  "Brockton",
  "Brookfield",
  "Brookline",
  "Buckland",
  "Burlington",
  "Cambridge",
  "Canton",
  "Carlisle",
  "Carver",
  "Charlemont",
  "Charlestown",
  "Charlton",
  "Chatham",
  "Chelmsford",
  "Chelsea",
  "Cheshire",
  "Chester",
  "Chesterfield",
  "Chicopee",
  "Chilmark",
  "Clarksburg",
  "Clinton",
  "Cohasset",
  "Colrain",
  "Concord",
  "Conway",
  "Cummington",
  "Dalton",
  "Dana",
  "Danvers",
  "Dartmouth",
  "Dedham",
  "Deerfield",
  "Dennis",
  "Dighton",
  "Douglas",
  "Dorchester",
  "Dover",
  "Dracut",
  "Dudley",
  "Dunstable",
  "Duxbury",
  "East Bridgewater",
  "East Brookfield",
  "East Longmeadow",
  "Eastham",
  "Easthampton",
  "Easton",
  "Edgartown",
  "Egremont",
  "Enfield",
  "Erving",
  "Essex",
  "Everett",
  "Fairhaven",
  "Fall River",
  "Falmouth",
  "Fitchburg",
  "Florida",
  "Foxborough",
  "Framingham",
  "Franklin",
  "Freetown",
  "Gardner",
  "Georgetown",
  "Gill",
  "Gloucester",
  "Goshen",
  "Gosnold",
  "Grafton",
  "Granby",
  "Granville",
  "Great Barrington",
  "Greenfield",
  "Greenwich",
  "Groton",
  "Groveland",
  "Hadley",
  "Halifax",
  "Hamilton",
  "Hampden",
  "Hancock",
  "Hanover",
  "Hanson",
  "Hardwick",
  "Harvard",
  "Harwich",
  "Hatfield",
  "Haverhill",
  "Hawley",
  "Heath",
  "Hingham",
  "Hinsdale",
  "Holbrook",
  "Holden",
  "Holland",
  "Holliston",
  "Holyoke",
  "Hopedale",
  "Hopkinton",
  "Hubbardston",
  "Hudson",
  "Hull",
  "Huntington",
  "Hyde Park",
  "Ipswich",
  "Kingston",
  "Lakeville",
  "Lancaster",
  "Lanesborough",
  "Lawrence",
  "Lee",
  "Leicester",
  "Lenox",
  "Leominster",
  "Leverett",
  "Lexington",
  "Leyden",
  "Lincoln",
  "Littleton",
  "Longmeadow",
  "Lowell",
  "Ludlow",
  "Lunenburg",
  "Lynn",
  "Lynnfield",
  "Malden",
  "Manchester-By-The-Sea",
  "Mansfield",
  "Marblehead",
  "Marion",
  "Marlborough",
  "Marshfield",
  "Mashpee",
  "Mattapoisett",
  "Maynard",
  "Medfield",
  "Medford",
  "Medway",
  "Melrose",
  "Mendon",
  "Merrimac",
  "Methuen",
  "Middleborough",
  "Middlefield",
  "Middleton",
  "Milford",
  "Millbury",
  "Millis",
  "Millville",
  "Milton",
  "Monroe",
  "Monson",
  "Montague",
  "Monterey",
  "Montgomery",
  "Mount Washington",
  "Nahant",
  "Nantucket",
  "Natick",
  "Needham",
  "New Ashford",
  "New Bedford",
  "New Braintree",
  "New Marlborough",
  "New Salem",
  "Newbury",
  "Newburyport",
  "Newton",
  "Norfolk",
  "North Adams",
  "North Andover",
  "North Attleborough",
  "North Brookfield",
  "North Reading",
  "Northampton",
  "Northborough",
  "Northbridge",
  "Northfield",
  "Norton",
  "Norwell",
  "Norwood",
  "Oak Bluffs",
  "Oakham",
  "Orange",
  "Orleans",
  "Otis",
  "Oxford",
  "Palmer",
  "Paxton",
  "Peabody",
  "Pelham",
  "Pembroke",
  "Pepperell",
  "Peru",
  "Petersham",
  "Phillipston",
  "Pittsfield",
  "Plainfield",
  "Plainville",
  "Plymouth",
  "Plympton",
  "Prescott",
  "Princeton",
  "Provincetown",
  "Quincy",
  "Randolph",
  "Raynham",
  "Reading",
  "Rehoboth",
  "Revere",
  "Richmond",
  "Rochester",
  "Rockland",
  "Rockport",
  "Rowe",
  "Rowley",
  "Roxbury",
  "Royalston",
  "Russell",
  "Rutland",
  "Salem",
  "Salisbury",
  "Sandisfield",
  "Sandwich",
  "Saugus",
  "Savoy",
  "Scituate",
  "Seekonk",
  "Sharon",
  "Sheffield",
  "Shelburne",
  "Sherborn",
  "Shirley",
  "Shrewsbury",
  "Shutesbury",
  "Somerset",
  "Somerville",
  "South Hadley",
  "Southampton",
  "Southborough",
  "Southbridge",
  "Southwick",
  "Spencer",
  "Springfield",
  "Sterling",
  "Stockbridge",
  "Stoneham",
  "Stoughton",
  "Stow",
  "Sturbridge",
  "Sudbury",
  "Sunderland",
  "Sutton",
  "Swampscott",
  "Swansea",
  "Taunton",
  "Templeton",
  "Tewksbury",
  "Tisbury",
  "Tolland",
  "Topsfield",
  "Townsend",
  "Truro",
  "Tyngsborough",
  "Tyringham",
  "Upton",
  "Uxbridge",
  "Wakefield",
  "Wales",
  "Walpole",
  "Waltham",
  "Ware",
  "Wareham",
  "Warren",
  "Warwick",
  "Washington",
  "Watertown",
  "Wayland",
  "Webster",
  "Wellesley",
  "Wellfleet",
  "Wendell",
  "Wenham",
  "West Boylston",
  "West Bridgewater",
  "West Brookfield",
  "West Newbury",
  "West Roxbury",
  "West Springfield",
  "West Stockbridge",
  "West Tisbury",
  "Westborough",
  "Westfield",
  "Westford",
  "Westhampton",
  "Westminster",
  "Weston",
  "Westport",
  "Westwood",
  "Weymouth",
  "Whately",
  "Whitman",
  "Wilbraham",
  "Williamsburg",
  "Williamstown",
  "Wilmington",
  "Winchendon",
  "Winchester",
  "Windsor",
  "Winthrop",
  "Woburn",
  "Worcester",
  "Worthington",
  "Wrentham",
  "Yarmouth",
];

autocomplete(document.getElementById("myInput"), array);
