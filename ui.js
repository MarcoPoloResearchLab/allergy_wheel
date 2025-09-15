export const qs = (s, r = document) => r.querySelector(s);
export const show = el => el.removeAttribute("hidden");
export const hide = el => el.setAttribute("hidden", "");

export function bindFullScreen(btn, root = document.documentElement) {
  btn.addEventListener("click", async () => {
    if (!document.fullscreenElement) { try { await root.requestFullscreen(); btn.textContent = "Exit Full Screen"; } catch {} }
    else { await document.exitFullscreen(); btn.textContent = "Full Screen"; }
  });
  document.addEventListener("fullscreenchange", () => {
    btn.textContent = document.fullscreenElement ? "Exit Full Screen" : "Full Screen";
  });
}

export function renderAllergyChecklist(container, catalog) {
  container.innerHTML = "";
  for (const a of catalog) {
    const lab = document.createElement("label");
    lab.className = "chip";
    lab.innerHTML = `<input type="checkbox" value="${a.token}"/><span>${a.label}</span>`;
    container.appendChild(lab);
  }
  return function getSelected() {
    const selected = new Set();
    container.querySelectorAll('input[type="checkbox"]:checked').forEach(i => selected.add(i.value));
    return selected;
  };
}

export function updateBadges(container, tokens, catalog) {
  container.innerHTML = "";
  if (!tokens.size) { container.innerHTML = `<span class="badge" style="background:#d1f7ff">None</span>`; return; }
  const map = new Map(catalog.map(a => [a.token, a.label]));
  for (const t of tokens) {
    const b = document.createElement("span");
    b.className = "badge";
    b.textContent = map.get(t) || t;
    container.appendChild(b);
  }
}

export const openModal = modal => modal.removeAttribute("hidden");
export const closeModal = modal => modal.setAttribute("hidden", "");
