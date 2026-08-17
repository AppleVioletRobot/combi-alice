const kinds = ["heads", "torsos", "legs", "feet"];
const queryKeys = { heads: "h", torsos: "t", legs: "l", feet: "f" };
const selection = {};
const locked = Object.fromEntries(kinds.map(kind => [kind, false]));
let parts;
let pointerMoved = false;

const alice = document.querySelector("#alice");
const stage = document.querySelector(".stage");
const viewer = document.querySelector("#viewer");
const status = document.querySelector("#status");
const wrap = (value, length) => (value + length) % length;

function current(kind) {
  return parts[kind][selection[kind]];
}

function indexFromUrl(kind) {
  const id = new URLSearchParams(location.search).get(queryKeys[kind]);
  const index = parts[kind].findIndex(item => item.id === id);
  return index < 0 ? 0 : index;
}

function updateUrl() {
  const params = new URLSearchParams();
  kinds.forEach(kind => params.set(queryKeys[kind], current(kind).id));
  history.replaceState({}, "", `${location.pathname}?${params}`);
}

function makeSlide(item, position) {
  const slide = document.createElement("div");
  slide.className = `slide slide-${position}`;
  slide.dataset.position = position;
  slide.innerHTML = `<img src="${item.file}" alt="${item.alt_text}" draggable="false">`;
  return slide;
}

function buildCarousel(kind) {
  const items = parts[kind];
  const index = selection[kind];
  const row = document.createElement("section");
  row.className = "carousel-row";
  row.dataset.kind = kind;
  row.tabIndex = 0;
  row.setAttribute("aria-label", `${kind}: ${current(kind).display_name}`);

  const viewport = document.createElement("div");
  viewport.className = "carousel-viewport";
  const track = document.createElement("div");
  track.className = "carousel-track";
  track.append(
    makeSlide(items[wrap(index - 1, items.length)], "previous"),
    makeSlide(items[index], "current"),
    makeSlide(items[wrap(index + 1, items.length)], "next")
  );
  viewport.append(track);

  const previous = document.createElement("button");
  previous.className = "turn turn-left";
  previous.type = "button";
  previous.ariaLabel = `Previous ${kind}`;
  previous.innerHTML = "<span aria-hidden='true'>‹</span>";
  const next = document.createElement("button");
  next.className = "turn turn-right";
  next.type = "button";
  next.ariaLabel = `Next ${kind}`;
  next.innerHTML = "<span aria-hidden='true'>›</span>";
  const lock = document.createElement("button");
  lock.className = `lock${locked[kind] ? " is-locked" : ""}`;
  lock.type = "button";
  lock.ariaLabel = `${locked[kind] ? "Unlock" : "Lock"} ${kind}`;
  lock.ariaPressed = String(locked[kind]);
  lock.innerHTML = `<span aria-hidden="true">${locked[kind] ? "●" : "○"}</span><span class="lock-label">${locked[kind] ? "Locked" : "Lock"}</span>`;

  previous.onclick = () => turn(kind, -1, row);
  next.onclick = () => turn(kind, 1, row);
  lock.onclick = event => {
    event.stopPropagation();
    locked[kind] = !locked[kind];
    render();
  };
  row.onkeydown = event => {
    if (event.key === "ArrowLeft") turn(kind, -1, row);
    if (event.key === "ArrowRight") turn(kind, 1, row);
  };
  addDrag(viewport, track, kind, row);
  row.append(viewport, previous, next, lock);
  return row;
}

function turn(kind, direction, row = document.querySelector(`[data-kind="${kind}"]`)) {
  if (row?.classList.contains("is-turning")) return;
  const track = row.querySelector(".carousel-track");
  row.classList.add("is-turning");
  track.style.transition = "transform 260ms cubic-bezier(.2,.75,.25,1)";
  track.style.transform = direction > 0
    ? "translateX(calc(var(--track-start) - var(--block-size)))"
    : "translateX(calc(var(--track-start) + var(--block-size)))";
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    selection[kind] = wrap(selection[kind] + direction, parts[kind].length);
    render();
  };
  track.addEventListener("transitionend", finish, { once: true });
  setTimeout(finish, 330);
}

function addDrag(viewport, track, kind, row) {
  let startX = 0;
  let delta = 0;
  viewport.onpointerdown = event => {
    startX = event.clientX;
    delta = 0;
    pointerMoved = false;
    track.style.transition = "none";
    viewport.setPointerCapture(event.pointerId);
    row.classList.add("is-dragging");
  };
  viewport.onpointermove = event => {
    if (!viewport.hasPointerCapture(event.pointerId)) return;
    delta = event.clientX - startX;
    if (Math.abs(delta) > 5) pointerMoved = true;
    track.style.transform = `translateX(calc(var(--track-start) + ${delta}px))`;
  };
  viewport.onpointerup = event => {
    if (!viewport.hasPointerCapture(event.pointerId)) return;
    viewport.releasePointerCapture(event.pointerId);
    row.classList.remove("is-dragging");
    const threshold = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--block-size")) * .16;
    if (Math.abs(delta) > threshold) {
      turn(kind, delta < 0 ? 1 : -1, row);
    } else {
      track.style.transition = "transform 180ms ease-out";
      track.style.transform = "translateX(var(--track-start))";
    }
  };
  viewport.onclick = event => {
    if (!pointerMoved && event.target.closest(".slide-current")) openViewer();
  };
}

function render() {
  alice.replaceChildren(...kinds.map(buildCarousel));
  updateUrl();
  updateViewer();
}

function randomise() {
  const before = kinds.map(kind => selection[kind]).join("-");
  let attempts = 0;
  do {
    kinds.forEach(kind => {
      if (!locked[kind]) selection[kind] = Math.floor(Math.random() * parts[kind].length);
    });
    attempts += 1;
  } while (attempts < 12 && kinds.map(kind => selection[kind]).join("-") === before && kinds.some(kind => !locked[kind]));
  render();
}

function currentName() {
  return kinds.map(kind => current(kind).display_name).join(" / ");
}

function updateViewer() {
  document.querySelector("#viewer-name").textContent = currentName();
  const assembled = document.querySelector("#assembled");
  assembled.replaceChildren(...kinds.map(kind => {
    const image = document.createElement("img");
    image.src = current(kind).file;
    image.alt = current(kind).alt_text;
    return image;
  }));
  const notes = kinds
    .map(kind => current(kind).biographical_note?.trim())
    .filter(Boolean);
  const summary = document.querySelector("#biographical-summary");
  summary.textContent = notes.join(" ");
  summary.hidden = notes.length === 0;
}

function openViewer() {
  updateViewer();
  viewer.showModal();
}

async function saveAlice() {
  const size = 800;
  const gap = 12;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size * kinds.length + gap * (kinds.length - 1);
  const context = canvas.getContext("2d");
  context.fillStyle = "#3f2f1f";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const images = await Promise.all(kinds.map(kind => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = current(kind).file;
  })));
  images.forEach((image, index) => context.drawImage(image, 0, index * (size + gap), size, size));
  canvas.toBlob(blob => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `combinatorial-alice-${kinds.map(kind => current(kind).id).join("-")}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    showStatus("Alice saved!");
  }, "image/png");
}

async function copyLink() {
  await navigator.clipboard.writeText(location.href);
  showStatus("Alice copied!");
}

async function shareAlice() {
  if (navigator.share) {
    await navigator.share({ title: "Combinatorial Alice", text: currentName(), url: location.href });
  } else {
    await copyLink();
  }
}

function showStatus(message) {
  status.textContent = message;
  setTimeout(() => { if (status.textContent === message) status.textContent = ""; }, 2200);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderMarkdown(markdown) {
  const blocks = markdown.trim().split(/\n\s*\n/);
  return blocks.map(block => {
    const lines = block.split("\n").map(line => line.trim()).filter(Boolean);
    if (lines.every(line => /^[-*]\s+/.test(line))) {
      return `<ul>${lines.map(line => `<li>${inlineMarkdown(line.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
    }
    const heading = lines[0].match(/^(#{1,3})\s+(.+)$/);
    if (heading && lines.length === 1) {
      const level = heading[1].length + 2;
      return `<h${level}>${inlineMarkdown(heading[2])}</h${level}>`;
    }
    return `<p>${lines.map(inlineMarkdown).join("<br>")}</p>`;
  }).join("");
}

async function loadAbout() {
  const response = await fetch("about.md", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load the About text.");
  document.querySelector("#about-copy").innerHTML = renderMarkdown(await response.text());
}

function sizeAlice() {
  const availableWidth = stage.clientWidth;
  const availableHeight = stage.clientHeight - 50;
  const gapTotal = 15;
  const size = Math.max(92, Math.min(360, availableWidth / 2.1, (availableHeight - gapTotal) / 4));
  document.documentElement.style.setProperty("--block-size", `${Math.floor(size)}px`);
  document.documentElement.style.setProperty("--peek", `${Math.max(38, Math.floor(size * .48))}px`);
}

async function init() {
  const [response] = await Promise.all([fetch("components.json", { cache: "no-store" }), loadAbout()]);
  if (!response.ok) throw new Error("Could not load Alice’s components.");
  parts = await response.json();
  kinds.forEach(kind => selection[kind] = indexFromUrl(kind));
  const total = kinds.reduce((product, kind) => product * parts[kind].length, 1);
  document.querySelector("#count").textContent = total.toLocaleString("en-GB");
  document.querySelector("#randomise").onclick = randomise;
  document.querySelector("#view-alice").onclick = openViewer;
  document.querySelector("#about-button").onclick = () => document.querySelector("#about").showModal();
  document.querySelector("#save-alice").onclick = saveAlice;
  document.querySelector("#copy-link").onclick = copyLink;
  document.querySelector("#share-alice").onclick = shareAlice;
  document.querySelectorAll("[data-close]").forEach(button => button.onclick = () => document.querySelector(`#${button.dataset.close}`).close());
  document.querySelectorAll("dialog").forEach(dialog => dialog.onclick = event => { if (event.target === dialog) dialog.close(); });
  new ResizeObserver(sizeAlice).observe(stage);
  sizeAlice();
  render();
}

init().catch(error => {
  alice.innerHTML = `<p class="error">${error.message}</p>`;
});
