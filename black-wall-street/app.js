
require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/layers/WebTileLayer",
  "esri/widgets/LayerList",
  "esri/widgets/Legend"
], function (Map, MapView, FeatureLayer, WebTileLayer, LayerList, Legend) {

  // ---------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalize(s) {
    return String(s ?? "").trim();
  }

  function row(label, value) {
    const v = normalize(value);
    if (!v) return "";
    return `
      <div class="museum-k">${escapeHtml(label)}</div>
      <div class="museum-v">${escapeHtml(v)}</div>
    `;
  }

  // Build once per layer, not repeatedly
  function buildFieldIndexFromFields(fields) {
    const map = {};
    (fields || []).forEach(f => {
      if (!f) return;
      if (f.name)  map[String(f.name).toLowerCase()]  = f.name;
      if (f.alias) map[String(f.alias).toLowerCase()] = f.name;
    });
    return map;
  }

  function resolveField(fieldIndex, candidates) {
    for (const c of (candidates || [])) {
      const key = String(c).toLowerCase();
      if (fieldIndex[key]) return fieldIndex[key];
    }
    return "";
  }

  function getVal(attrs, fieldIndex, candidates) {
    if (!attrs) return "";

    // 1) exact match
    for (const c of (candidates || [])) {
      const k = String(c);
      const v = attrs[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }

    // 2) alias/name (case-insensitive)
    for (const c of (candidates || [])) {
      const resolved = fieldIndex[String(c).toLowerCase()];
      if (!resolved) continue;
      const v = attrs[resolved];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }

    return "";
  }

  function sqlUpperLike(fieldName, token) {
    const t = normalize(token).toUpperCase().replaceAll("'", "''");
    return `UPPER(${fieldName}) LIKE '%${t}%'`;
  }

  // ---------------------------------------------------------
  // Museum popup factory (per layer schema)
  // ---------------------------------------------------------
  function makeMuseumPopupTemplate(getFieldIndex, cfg) {
    const {
      sourceText = "",
      subtitleText = "",
      titleCandidates = [],
      rowsSpec = [],            // [{ label, candidates }]
      pictureCandidates = []
    } = cfg || {};

    return {
      title: " ",
      content: (feature) => {
        const fieldIndex = getFieldIndex ? getFieldIndex() : {};
        const attrs = feature?.graphic?.attributes || {};

        const titleVal =
          getVal(attrs, fieldIndex, titleCandidates) ||
          getVal(attrs, fieldIndex, ["Street_Address", "Street Address", "Address", "ADDR"]) ||
          "Location";

        let rowsHtml = "";
        rowsSpec.forEach(r => {
          const v = getVal(attrs, fieldIndex, r.candidates);
          rowsHtml += row(r.label, v);
        });

        if (!rowsHtml) rowsHtml = row("LOCATION", titleVal);

        const picUrl = getVal(attrs, fieldIndex, pictureCandidates);
        const pictureHtml = picUrl
          ? `<div class="museum-note"><a href="${escapeHtml(picUrl)}" target="_blank" rel="noopener">View image</a></div>`
          : "";

        return `
          <div class="museum-popup">
            <div class="museum-title">${escapeHtml(titleVal)}</div>
            ${subtitleText ? `<div class="museum-subtitle">${escapeHtml(subtitleText)}</div>` : ""}

            <div class="museum-grid">
              ${rowsHtml}
            </div>

            ${pictureHtml}

            <div class="museum-source">
              <strong>Source:</strong> ${escapeHtml(sourceText)}
            </div>
          </div>
        `;
      }
    };
  }

  // ---------------------------------------------------------
  // Historic basemaps
  // ---------------------------------------------------------
  const historicMap = new WebTileLayer({
    urlTemplate: "https://s3.us-east-2.wasabisys.com/urbanatlases/al8c31qra/tiles/{level}/{col}/{row}.png",
    title: "Roxbury 1895",
    opacity: 0.55,
    visible: false
  });

  const historicMap1915 = new WebTileLayer({
    urlTemplate: "https://s3.us-east-2.wasabisys.com/urbanatlases/al8c3krxy/tiles/{level}/{col}/{row}.png",
    title: "Roxbury 1915",
    opacity: 0.55,
    visible: false
  });

  const historicMap1917 = new WebTileLayer({
    urlTemplate: "https://s3.us-east-2.wasabisys.com/urbanatlases/al8c4phfq/tiles/{level}/{col}/{row}.png",
    title: "Roxbury 1917",
    opacity: 0.55,
    visible: false
  });

  // ---------------------------------------------------------
  // Context layers with museum popup
  // ---------------------------------------------------------
  const redliningLayer = new FeatureLayer({
    url: "https://services1.arcgis.com/KUeKSLlMUcWvuPRM/arcgis/rest/services/Boston_redlining/FeatureServer/0",
    title: "Boston Redlining (HOLC 1930s)",
    opacity: 0.8,
    visible: false,
    outFields: ["*"],
    popupTemplate: {
      title: " ",
      content: (feature) => {
        const a = feature?.graphic?.attributes || {};
        const grade = a.grade ?? a.GRADE ?? "";
        const area = a.area_id ?? a.AREA_ID ?? a.objectid ?? a.OBJECTID ?? "";
        const notes = a.description ?? a.DESCRIPTION ?? a.remarks ?? a.REMARKS ?? a.notes ?? a.NOTES ?? "";

        const gradeLabel =
          grade === "A" ? "A - Best" :
          grade === "B" ? "B - Still Desirable" :
          grade === "C" ? "C - Declining" :
          grade === "D" ? "D - Hazardous" :
          (grade ? String(grade) : "");

        return `
          <div class="museum-popup">
            <div class="museum-title">HOLC Redlining Area</div>
            <div class="museum-subtitle">Home Owners’ Loan Corporation • 1930s</div>

            <div class="museum-grid">
              ${row("GRADE", gradeLabel)}
              ${row("AREA ID", area)}
              ${row("NOTES", notes)}
            </div>

            <div class="museum-source">
              <strong>Source:</strong> HOLC “Mapping Inequality” (Boston)
            </div>
          </div>
        `;
      }
    },
    renderer: {
      type: "unique-value",
      field: "grade",
      uniqueValueInfos: [
        { value: "A", label: "A - Best", symbol: { type: "simple-fill", color: "#2E8B57", outline: { color: "white", width: 0.5 } } },
        { value: "B", label: "B - Still Desirable", symbol: { type: "simple-fill", color: "#4C78A8", outline: { color: "white", width: 0.5 } } },
        { value: "C", label: "C - Declining", symbol: { type: "simple-fill", color: "#E0A800", outline: { color: "white", width: 0.5 } } },
        { value: "D", label: "D - Hazardous", symbol: { type: "simple-fill", color: "#B22222", outline: { color: "white", width: 0.5 } } }
      ]
    }
  });

  const roxburyBoundary = new FeatureLayer({
    url: "https://services.arcgis.com/sFnw0xNflSi8J0uh/arcgis/rest/services/Roxbury_callout/FeatureServer/0",
    title: "Roxbury Boundary",
    visible: false,
    outFields: ["*"],
    popupTemplate: {
      title: " ",
      content: (feature) => {
        const a = feature?.graphic?.attributes || {};
        const name = a.Name ?? a.NAME ?? a.neighborhood ?? a.NEIGHBORHOOD ?? "Roxbury";
        const notes = a.Description ?? a.DESCRIPTION ?? a.notes ?? a.NOTES ?? "";

        return `
          <div class="museum-popup">
            <div class="museum-title">${escapeHtml(name)}</div>
            <div class="museum-subtitle">Neighborhood reference boundary</div>

            <div class="museum-grid">
              ${row("BOUNDARY", "Roxbury")}
              ${row("NOTES", notes)}
            </div>

            <div class="museum-source">
              <strong>Source:</strong> Roxbury boundary reference layer
            </div>
          </div>
        `;
      }
    },
    renderer: {
      type: "simple",
      symbol: {
        type: "simple-fill",
        color: [0, 0, 0, 0],
        outline: { color: [245, 240, 230, 0.95], width: 3.6 }
      }
    }
  });

  // ---------------------------------------------------------
  // Point layer factory (museum popup + alias support)
  // ---------------------------------------------------------
  function makePointLayer(opts) {
    const layer = new FeatureLayer({
      url: opts.url,
      title: opts.title,
      visible: false,
      outFields: ["*"],
      featureReduction: null,
      renderer: {
        type: "simple",
        symbol: {
          type: "simple-marker",
          style: "circle",
          size: 8,
          color: opts.color,
          outline: { color: [255, 255, 255, 0.96], width: 1.3 }
        }
      }
    });

    let fieldIndex = {};
    layer.when(() => {
      fieldIndex = buildFieldIndexFromFields(layer.fields);
    });

    layer.popupTemplate = makeMuseumPopupTemplate(() => fieldIndex, opts.popup);
    return layer;
  }

  // ---------------------------------------------------------
  // Point layers (schemas match your tables)
  // ---------------------------------------------------------
  const directoryLayer = makePointLayer({
    url: "https://services1.arcgis.com/KUeKSLlMUcWvuPRM/arcgis/rest/services/Directory_location_points/FeatureServer/0",
    title: "1914 Directory Locations",
    color: "#bc5090",
    popup: {
      sourceText: "1914 Directory of Negro Business and Professional Men and Women of Boston",
      subtitleText: "Boston Negro Business and Professionals Directory • 1914",
      titleCandidates: ["Business_Name", "businessName", "Name", "Business_Owner", "Street_Address", "Street Address"],
      rowsSpec: [
        { label: "BUSINESS NAME", candidates: ["Business_Name", "businessName", "Name"] },
        { label: "STREET ADDRESS", candidates: ["Street_Address", "Street Address", "Address"] },
        { label: "CITY", candidates: ["City"] },
        { label: "STATE", candidates: ["State"] },
        { label: "BUSINESS OWNER", candidates: ["Business_Owner"] },
        { label: "CATEGORY", candidates: ["Category"] },
        { label: "NOTES", candidates: ["Notes"] }
      ]
    }
  });

  const souvenirLayer = makePointLayer({
    url: "https://services1.arcgis.com/KUeKSLlMUcWvuPRM/arcgis/rest/services/Souvenir_points/FeatureServer/0",
    title: "1915 National Negro Business League",
    color: "#17becf",
    popup: {
      sourceText: "1915 National Negro Business League Souvenir Program",
      subtitleText: "National Negro Business League Souvenir Program • 1915",
      titleCandidates: ["Location Name", "Location_Name", "Location", "Name", "Street_Address", "Street Address"],
      rowsSpec: [
        { label: "LOCATION NAME", candidates: ["Location Name", "Location_Name", "Location", "Name"] },
        { label: "STREET ADDRESS", candidates: ["Street_Address", "Street Address", "Address"] },
        { label: "CITY", candidates: ["City"] },
        { label: "STATE", candidates: ["State"] },
        { label: "DESCRIPTION", candidates: ["Description"] }
      ]
    }
  });

  const greenBookLayer = makePointLayer({
    url: "https://services1.arcgis.com/KUeKSLlMUcWvuPRM/arcgis/rest/services/Green_book/FeatureServer/0",
    title: "1938–1967 Negro Motorist Green Book",
    color: "#2ca02c",
    popup: {
      sourceText: "The Negro Motorist Green Book (selected editions)",
      subtitleText: "Negro Motorist Green Book • Boston listings",
      titleCandidates: ["businessName", "Business Name", "Name", "Street_Address", "Street Address"],
      rowsSpec: [
        { label: "BUSINESS NAME", candidates: ["businessName", "Business Name", "Name"] },
        { label: "STREET ADDRESS", candidates: ["Street_Address", "Street Address", "Address"] },
        { label: "CITY", candidates: ["City"] },
        { label: "STATE", candidates: ["State"] },
        { label: "CATEGORY", candidates: ["Category"] }
      ],
      pictureCandidates: ["Picture", "Image", "Photo"]
    }
  });

  const concertLayer = makePointLayer({
    url: "https://services1.arcgis.com/KUeKSLlMUcWvuPRM/arcgis/rest/services/concert_florence_points/FeatureServer/0",
    title: "1921 Florence Cole Talbert Concert Program",
    color: "#ff7f0e",
    popup: {
      sourceText: "Sedalia Club Concert Souvenir Program (1921)",
      subtitleText: "Ebenezer Baptist Church Concert Program • 1921",
      titleCandidates: ["Name", "Location Name", "Location_Name", "Street Address", "Street_Address"],
      rowsSpec: [
        { label: "LOCATION NAME", candidates: ["Location Name", "Location_Name", "Loc_name", "Venue"] },
        { label: "NAME", candidates: ["Name"] },
        { label: "STREET ADDRESS", candidates: ["Street Address", "Street_Address", "Address"] },
        { label: "CITY", candidates: ["City"] },
        { label: "STATE", candidates: ["State"] },
        { label: "QUOTE", candidates: ["Quote"] }
      ]
    }
  });

  const hotelLayer = makePointLayer({
    url: "https://services1.arcgis.com/KUeKSLlMUcWvuPRM/arcgis/rest/services/massachusetts_hotels_Negro_/FeatureServer/0",
    title: "1940 Massachusetts Negro Hotels",
    color: "#f1c40f",
    popup: {
      sourceText: "Massachusetts Negro Hotels (1940)",
      subtitleText: "Massachusetts Negro Hotels • 1940",
      titleCandidates: ["Name", "Hotel", "Street_Address", "Street Address"],
      rowsSpec: [
        { label: "SUBREGION", candidates: ["Subregion"] },
        { label: "NAME", candidates: ["Name", "Hotel"] },
        { label: "STREET ADDRESS", candidates: ["Street_Address", "Street Address", "Address"] },
        { label: "CITY", candidates: ["City"] },
        { label: "STATE", candidates: ["State"] }
      ],
      pictureCandidates: ["Picture", "Image", "Photo"]
    }
  });

  // ---------------------------------------------------------
  // Map + view
  // ---------------------------------------------------------
  const map = new Map({
    basemap: "dark-gray-vector",
    layers: [
      historicMap,
      historicMap1915,
      historicMap1917,
      redliningLayer,
      roxburyBoundary,
      directoryLayer,
      souvenirLayer,
      greenBookLayer,
      concertLayer,
      hotelLayer
    ]
  });

  const view = new MapView({
    container: "viewDiv",
    map,
    center: [-71.083, 42.325],
    zoom: 12,
    constraints: { minZoom: 10 },
    popup: {
      dockEnabled: false,
      dockOptions: { position: "bottom-right", breakpoint: false }
    }
  });

  const layerList = new LayerList({ view });
  const legend = new Legend({ view });
  let explorationEnabled = false;

  // ---------------------------------------------------------
  // Visibility helpers
  // ---------------------------------------------------------
  function setVisibility(v) {
    historicMap.visible = !!v.historic;
    historicMap1915.visible = !!v.historic1915;
    historicMap1917.visible = !!v.historic1917;

    roxburyBoundary.visible = !!v.boundary;
    redliningLayer.visible = !!v.redlining;

    directoryLayer.visible = !!v.dir1914;
    souvenirLayer.visible = !!v.souv1915;
    greenBookLayer.visible = !!v.greenbook;
    concertLayer.visible = !!v.concert1921;
    hotelLayer.visible = !!v.hotels1940;
  }

  async function goToState(state) {
    setVisibility(state.layers || {});
    const op = state.historicOpacity ?? 0.55;
    historicMap.opacity = op;
    historicMap1915.opacity = op;
    historicMap1917.opacity = op;

    await view.goTo(
      { center: state.center, zoom: state.zoom },
      { duration: 900, easing: "ease-in-out" }
    );
  }

  function enableFreeExploration() {
    if (explorationEnabled) return;
    explorationEnabled = true;
    view.ui.add(layerList, "top-right");
    view.ui.add(legend, "bottom-left");
    roxburyBoundary.visible = true;
  }

  function disableFreeExploration() {
    if (!explorationEnabled) return;
    explorationEnabled = false;
    view.ui.remove(layerList);
    view.ui.remove(legend);
  }

  // ---------------------------------------------------------
  // Deep zoom POIs (NO objectid)
  // ---------------------------------------------------------
  const POIS = {
    "poi-1914-johns": {
      layer: directoryLayer,
      layersVisibility: { boundary: true, historic1915: true, dir1914: true },
      zoom: 18,
      find: { address: ["798", "TREMONT"], name: ["JOHN"] }
    },
    "poi-1915-oldnorth": {
      layer: souvenirLayer,
      layersVisibility: { boundary: true, historic1917: true, souv1915: true },
      zoom: 18,
      find: { address: ["193", "SALEM"], name: ["CHRIST", "CHURCH", "OLD", "NORTH"] }
    },
    "poi-greenbook-tubman": {
      layer: greenBookLayer,
      layersVisibility: { boundary: true, historic1915: true, greenbook: true },
      zoom: 18,
      find: { address: ["25", "HOLYOKE"], name: ["TUBMAN"] }
    },
    "poi-1921-cooper": {
      layer: concertLayer,
      layersVisibility: { boundary: true, historic1915: true, concert1921: true },
      zoom: 18,
      find: { address: ["36", "WILLIAMS"], name: ["COOPER", "HATTIE"] }
    },
    "poi-1940-melbourne": {
      layer: hotelLayer,
      layersVisibility: { boundary: true, historic1915: true, hotels1940: true },
      zoom: 18,
      find: { address: ["815", "TREMONT"], name: ["MELBOURNE"] }
    }
  };

  function buildPoiWhere(layer, findSpec) {
    const idx = buildFieldIndexFromFields(layer.fields);

    const addressField = resolveField(idx, [
      "Street_Address", "Street Address", "USER_Street_Address", "Address", "ADDR", "Street"
    ]);

    const nameField = resolveField(idx, [
      "businessName", "Business Name", "Business_Name",
      "Location Name", "Location_Name", "Name", "USER_Name", "Hotel"
    ]);

    const parts = [];

    if (addressField && findSpec?.address?.length) {
      findSpec.address.forEach(tok => parts.push(sqlUpperLike(addressField, tok)));
    }

    if (nameField && findSpec?.name?.length) {
      const nameOr = findSpec.name.map(tok => sqlUpperLike(nameField, tok)).join(" OR ");
      if (nameOr) parts.push(`(${nameOr})`);
    }

    return parts.length ? parts.join(" AND ") : "";
  }

  async function zoomToPOI(poiId) {
    const poi = POIS[poiId];
    if (!poi) return;

    setVisibility({});
    setVisibility(poi.layersVisibility || {});
    await poi.layer.load();

    const where = buildPoiWhere(poi.layer, poi.find);
    if (!where) {
      console.warn("Could not build WHERE for POI:", poiId);
      return;
    }

    const q = poi.layer.createQuery();
    q.where = where;
    q.returnGeometry = true;
    q.outFields = ["*"];
    q.num = 3;

    const result = await poi.layer.queryFeatures(q);
    if (!result.features || result.features.length === 0) {
      console.warn("No match for POI:", poiId, where);
      return;
    }

    const feature = result.features[0];
    const target = feature.geometry;

    await view.goTo({ target, zoom: poi.zoom || 18 }, { duration: 900, easing: "ease-in-out" });
    view.popup.open({ features: [feature], location: target });
  }

  // ---------------------------------------------------------
  // Zoom-link wiring (event delegation on #story)
  // ---------------------------------------------------------
  function wireZoomLinks() {
    const storyEl = document.getElementById("story");
    if (!storyEl) return;

    storyEl.addEventListener("click", (e) => {
      const link = e.target.closest(".zoom-link[data-poi]");
      if (!link) return;

      e.preventDefault();
      e.stopPropagation();

      const poiId = link.getAttribute("data-poi");
      if (poiId) zoomToPOI(poiId);
    });
  }

  // ---------------------------------------------------------
  // Scroll chapters (01–11)
  // IMPORTANT: NO auto-zoom here. Scroll only changes layers/extent.
  // ✅ FIXED: Chapter 02 shows ALL ARCHIVAL POINT LAYERS (NOT boundary)
  // ---------------------------------------------------------
  const chapterStates = {
    "01": { center: [-71.083, 42.325], zoom: 12, layers: {} },

    // ✅ CHAPTER 02 FIX (archival layers only)
    "02": {
      center: [-71.083, 42.323],
      zoom: 12,
      layers: {
        dir1914: true,
        souv1915: true,
        greenbook: true,
        concert1921: true,
        hotels1940: true
      }
    },

    "03": { center: [-71.080, 42.350], zoom: 13, layers: { historic: true }, historicOpacity: 0.55 },
    "04": { center: [-71.090, 42.320], zoom: 13, layers: { historic: true, boundary: true }, historicOpacity: 0.55 },
    "05": { center: [-71.086, 42.330], zoom: 13, layers: { historic1915: true, boundary: true, dir1914: true }, historicOpacity: 0.55 },
    "06": { center: [-71.086, 42.348], zoom: 13, layers: { historic1917: true, boundary: true, souv1915: true }, historicOpacity: 0.55 },
    "07": { center: [-71.083, 42.330], zoom: 13, layers: { historic1915: true, boundary: true, greenbook: true }, historicOpacity: 0.55 },
    "08": { center: [-71.083, 42.335], zoom: 14, layers: { historic1915: true, boundary: true, concert1921: true }, historicOpacity: 0.55 },
    "09": { center: [-71.083, 42.325], zoom: 12, layers: { boundary: true, redlining: true } },
    "10": { center: [-71.083, 42.325], zoom: 13, layers: { boundary: true, dir1914: true, souv1915: true, greenbook: true, concert1921: true, hotels1940: true, redlining: true } },
    "11": { center: [-71.083, 42.325], zoom: 12, layers: { boundary: true, dir1914: true, souv1915: true, greenbook: true, concert1921: true, hotels1940: true, redlining: true } }
  };

  function setupScrollDriver() {
    const storyEl = document.getElementById("story");
    const panels = Array.from(document.querySelectorAll(".panel"));
    let activeIndex = -1;

    function getActiveIndex() {
      const containerRect = storyEl.getBoundingClientRect();
      const topThreshold = containerRect.top + containerRect.height * 0.20;
      const bottomThreshold = containerRect.top + containerRect.height * 0.80;

      for (let i = 0; i < panels.length; i++) {
        const rect = panels[i].getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        if (center >= topThreshold && center <= bottomThreshold) return i;
      }

      // fallback: closest to midpoint
      let closest = 0;
      let closestDist = Infinity;
      const midpoint = containerRect.top + containerRect.height / 2;

      for (let i = 0; i < panels.length; i++) {
        const rect = panels[i].getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const dist = Math.abs(center - midpoint);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }
      return closest;
    }

    async function update() {
      const newIndex = getActiveIndex();
      if (newIndex === activeIndex) return;
      activeIndex = newIndex;

      panels.forEach(p => p.classList.remove("active"));
      panels[activeIndex].classList.add("active");

      const key = panels[activeIndex].getAttribute("data-chapter");
      const state = chapterStates[key];
      if (!state) return;

      if (key === "11") enableFreeExploration();
      else disableFreeExploration();

      await goToState(state);
    }

    storyEl.addEventListener("scroll", update, { passive: true });
    update();
  }

  // ---------------------------------------------------------
  // Click-to-open popup behavior (map click)
  // ---------------------------------------------------------
  view.popupEnabled = true;
  view.popup.autoOpenEnabled = false;

  view.on("click", async (event) => {
    const hit = await view.hitTest(event);
    if (!hit.results?.length) return;

    const target = hit.results[0];
    view.popup.open({ features: [target.graphic], location: event.mapPoint });
  });

  // ---------------------------------------------------------
  // Init
  // ---------------------------------------------------------
  view.when(() => {
    setVisibility({});
    wireZoomLinks();
    setupScrollDriver();
  });

});