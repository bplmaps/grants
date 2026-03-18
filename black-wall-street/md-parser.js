/**
 * md-parser.js
 *
 * Fetches `content.md`, parses its custom syntax, and injects structured HTML
 * into #story. Fires a global "contentReady" CustomEvent when done so app.js
 * can initialise safely.
 *
 * ── Markdown conventions used in content.md ──────────────────────────────────
 *
 * DOCUMENT FRONT-MATTER  (YAML-ish, between opening --- and closing ---)
 *   title:    Hero <h1> (may contain <br> via \n in text)
 *   eyebrow:  Small line above the title
 *   subtitle: Paragraph below the title
 *   credits:  Fine print at the bottom of the hero (supports **bold**)
 *
 * CHAPTER BLOCKS  :::chapter{id="NN"} … :::
 *   First line after opening fence = `# Chapter heading`
 *   Second line                    = `label: Label text`  (optional)
 *   Body paragraphs                = regular Markdown paragraphs
 *   Blockquote `> text`            = .mini-note  (supports inline links)
 *   Inline link with .zoom-link    = rendered as <a class="zoom-link" data-poi="…">
 *   `sources:` YAML list           = rendered as <ul class="source-list">
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  "use strict";

  // ── Tiny inline-Markdown renderer ──────────────────────────────────────────
  // Handles: **bold**, *italic*, [text](url){.class data-x="y"}, [text](url)
  function renderInline(text) {
    if (!text) return "";

    return text
      // **bold**
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // *italic*
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // [text](url){.cls data-foo="bar"}  — link with extra attrs
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)\{([^}]*)\}/g,
        (_, linkText, href, attrs) => {
          // attrs string like: .zoom-link data-poi="poi-1914-johns"
          let classVal = "";
          const attrPairs = [];
          attrs.split(/\s+/).forEach((token) => {
            if (token.startsWith(".")) {
              classVal += (classVal ? " " : "") + token.slice(1);
            } else if (token.includes("=")) {
              attrPairs.push(token);
            }
          });
          const classAttr = classVal ? ` class="${classVal}"` : "";
          const extraAttrs = attrPairs.length ? " " + attrPairs.join(" ") : "";
          const hrefFinal = href === "#" ? "#" : href;
          return `<a href="${hrefFinal}"${classAttr}${extraAttrs}>${linkText}</a>`;
        }
      )
      // [text](url)  — plain link
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>'
      );
  }

  // ── YAML-ish source list parser ─────────────────────────────────────────────
  // Parses the `sources:` block inside a chapter into an array of
  // { label, text, url } objects.
  function parseSources(block) {
    // block is the text after "sources:\n"
    const items = [];
    const entryRe = /^-\s+label:\s*"(.+?)"\s*\n\s+text:\s*"(.+?)"\s*\n\s+url:\s*"(.+?)"/gm;
    let m;
    while ((m = entryRe.exec(block)) !== null) {
      items.push({ label: m[1], text: m[2], url: m[3] });
    }
    return items;
  }

  // ── Front-matter parser ─────────────────────────────────────────────────────
  function parseFrontMatter(text) {
    const match = text.match(/^---\n([\s\S]+?)\n---/);
    if (!match) return { body: text, meta: {} };

    const raw = match[1];
    const meta = {};

    // Multi-line aware: each key: value (value may be quoted)
    const kvRe = /^(\w+):\s*("[\s\S]+?"|[^\n]+)$/gm;
    let m;
    while ((m = kvRe.exec(raw)) !== null) {
      const key = m[1];
      let val = m[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      meta[key] = val;
    }

    return { body: text.slice(match[0].length).trim(), meta };
  }

  // ── Hero builder ────────────────────────────────────────────────────────────
  function buildHero(meta) {
    const title = (meta.title || "").replace(/\\n/g, "<br>");
    const credits = renderInline(meta.credits || "");

    return `
      <div class="hero-inner">
        <div class="hero-eyebrow">${escHtml(meta.eyebrow || "")}</div>
        <h1 class="hero-title">${title}</h1>
        <p class="hero-subtitle">${escHtml(meta.subtitle || "")}</p>
        <div class="hero-scroll-hint">
          <span>Scroll to explore</span>
          <div class="hero-arrow">↓</div>
        </div>
        <div class="hero-credits">${credits}</div>
      </div>
    `;
  }

  // ── Chapter block parser ────────────────────────────────────────────────────
  function parseChapters(body) {
    // Split on :::chapter{id="XX"} … :::
    const chapterRe = /:::chapter\{id="(\d+)"\}([\s\S]+?):::/g;
    const chapters = [];
    let m;

    while ((m = chapterRe.exec(body)) !== null) {
      const id = m[1].padStart(2, "0");
      const raw = m[2].trim();
      chapters.push({ id, raw });
    }

    return chapters;
  }

  // ── Chapter HTML builder ────────────────────────────────────────────────────
  function buildChapter(ch) {
    const lines = ch.raw.split("\n");
    let label = "";
    let heading = "";
    const paragraphs = [];
    const miniNotes = [];
    let sourceLines = "";
    let inSources = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Heading
      if (line.startsWith("# ")) {
        heading = line.slice(2).trim();
        continue;
      }

      // Label
      if (line.startsWith("label:")) {
        label = line.slice(6).trim();
        continue;
      }

      // Sources block start
      if (line.trim() === "sources:") {
        inSources = true;
        continue;
      }

      if (inSources) {
        sourceLines += line + "\n";
        continue;
      }

      // Blockquote → mini-note
      if (line.startsWith("> ")) {
        miniNotes.push(line.slice(2).trim());
        continue;
      }

      // Paragraph (skip blank lines)
      if (line.trim()) {
        paragraphs.push(line.trim());
      }
    }

    // ── Render ──
    let html = `<section class="panel" data-chapter="${ch.id}">\n`;

    if (label) {
      html += `  <div class="label">${escHtml(label)}</div>\n`;
    }

    if (heading) {
      html += `  <h2>${escHtml(heading)}</h2>\n`;
    }

    paragraphs.forEach((p) => {
      html += `  <p>${renderInline(p)}</p>\n`;
    });

    miniNotes.forEach((note) => {
      html += `  <div class="mini-note">${renderInline(note)}</div>\n`;
    });

    if (sourceLines.trim()) {
      const sources = parseSources(sourceLines);
      if (sources.length) {
        html += `  <ul class="source-list">\n`;
        sources.forEach((s) => {
          html += `    <li>${escHtml(s.label)}: <a href="${escHtml(s.url)}" target="_blank" rel="noopener">${escHtml(s.text)}</a></li>\n`;
        });
        html += `  </ul>\n`;
      }
    }

    html += `</section>\n`;
    return html;
  }

  // ── Minimal HTML escaper ────────────────────────────────────────────────────
  function escHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Main: fetch → parse → inject ───────────────────────────────────────────
  async function loadContent(mdPath) {
    const res = await fetch(mdPath);
    if (!res.ok) throw new Error(`Failed to load ${mdPath}: ${res.status}`);
    return res.text();
  }

  async function init() {
    const mdPath = "content.md";

    let mdText;
    try {
      mdText = await loadContent(mdPath);
    } catch (err) {
      console.error("[md-parser] Could not load content:", err);
      document.dispatchEvent(new CustomEvent("contentReady"));
      return;
    }

    const { body, meta } = parseFrontMatter(mdText);

    // Update <title>
    if (meta.title) {
      document.title = meta.title.replace(/\\n/g, " ");
    }

    // Inject hero
    const heroEl = document.getElementById("hero");
    if (heroEl) heroEl.innerHTML = buildHero(meta);

    // Parse and inject chapters
    const storyEl = document.getElementById("story");
    const chapters = parseChapters(body);

    chapters.forEach((ch) => {
      const chHtml = buildChapter(ch);
      const wrapper = document.createElement("div");
      wrapper.innerHTML = chHtml;
      // Append the <section> (first child of wrapper)
      while (wrapper.firstChild) storyEl.appendChild(wrapper.firstChild);
    });

    // Signal app.js that the DOM is ready
    document.dispatchEvent(new CustomEvent("contentReady"));
  }

  // Run after DOM is parsed (script is in <body>, but being safe)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();