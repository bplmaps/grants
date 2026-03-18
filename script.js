// Minimal YAML parser — handles simple flat lists of key: value mappings
// sufficient for this data structure (no nested objects, no multiline values)
function parseYaml(text) {
  const items = [];
  let current = null;

  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (/^-\s*$/.test(line) || line === "-") {
      current = {};
      items.push(current);
      continue;
    }
    if (/^-\s+\w/.test(line)) {
      current = {};
      items.push(current);
      const inner = line.replace(/^-\s+/, "");
      const [k, ...rest] = inner.split(":");
      current[k.trim()] = rest.join(":").trim();
      continue;
    }
    if (current && /^\s+\w+:/.test(line)) {
      const [k, ...rest] = line.split(":");
      current[k.trim()] = rest.join(":").trim();
    }
  }

  return items;
}

const colors = [
  "#FF5A5A", "#FF8B5A", "#FFA95A", "#FFD45A",
  "#FE9EC7", "#F9F6C4", "#89D4FF", "#44ACFF",
  // "#FFC570", "#EFD2B0", "#547792", "#1A3263",
];

function pickColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

function buildTile({ slug, title, description, image }) {
  const color = pickColor();

  const tile = document.createElement("div");
  tile.className = "tile";

  const imgWrap = document.createElement("div");
  imgWrap.className = "tile-img-wrap";
  imgWrap.style.borderColor = color;

  const img = document.createElement("img");
  img.className = "tile-img";
  img.src = image || "";
  img.alt = title || slug;
  img.loading = "lazy";
  imgWrap.appendChild(img);

  const body = document.createElement("div");
  body.className = "tile-body";

  const accent = document.createElement("div");
  accent.className = "tile-accent";
  accent.style.backgroundColor = color;

  const link = document.createElement("a");
  link.className = "tile-name";
  link.href = slug;
  link.target = "_blank";
  link.textContent = title || slug;

  const desc = document.createElement("div");
  desc.className = "tile-desc";
  desc.textContent = description || "";

  const github = document.createElement("a");
  github.className = "tile-github";
  github.href = `https://github.com/bplmaps/grants/tree/main/${slug}`;
  github.target = "_blank";
  github.innerHTML = `<i class="fab fa-github"></i> View source`;

  body.appendChild(accent);
  body.appendChild(link);
  body.appendChild(desc);
  body.appendChild(github);

  tile.appendChild(imgWrap);
  tile.appendChild(body);

  return tile;
}

async function loadSection(yamlPath, containerId) {
  const container = document.getElementById(containerId);

  try {
    const res = await fetch(yamlPath);
    if (!res.ok) throw new Error(`Failed to load ${yamlPath}`);
    const text = await res.text();
    const entries = parseYaml(text);

    entries
      .slice()
      .sort((a, b) => (a.slug || "").localeCompare(b.slug || ""))
      .forEach(entry => container.appendChild(buildTile(entry)));
  } catch (err) {
    console.error(err);
    const msg = document.createElement("p");
    msg.className = "load-error";
    msg.textContent = `Could not load ${yamlPath}.`;
    container.appendChild(msg);
  }
}

loadSection("grants-in-aid.yaml", "grantsInAid");
loadSection("small-grants.yaml", "smallGrants");

// Modal
const helpBtn = document.getElementById("help");
const modal = document.getElementById("help-modal");
const closeBtn = document.getElementById("modal-close");

helpBtn.addEventListener("click", () => modal.classList.add("is-active"));
closeBtn.addEventListener("click", () => modal.classList.remove("is-active"));
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.remove("is-active");
});