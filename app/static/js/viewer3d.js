// Foto → 3D no próprio lugar da foto (hero e página do produto). A página abre com a foto;
// o 3D só carrega quando a pessoa interage: arrasta na horizontal, toca/clica na foto ou usa a
// pílula "Girar 360°" (teclado). Enquanto carrega, a foto continua visível; se falhar, fica a
// foto com aviso. Giro SOMENTE em Y nos dois motores:
// - embed Sketchfab: camada própria de arraste (ver sketchfab.js);
// - GLB próprio/licenciado: Model Viewer com phi fixo (min = max), sem zoom/pan.
import { createSketchfabViewer, sketchfabUid } from "./sketchfab.js";

// Ângulo polar fixo (phi = min = max): sem inclinação vertical.
// shortcut: 75deg é provisório, ajustar com o GLB licenciado em teste (T024/T025).
export const VIEWER_PHI = "75deg";
const MV_SRC = "/static/dist/vendor/model-viewer.min.js";
const DRAG_PX = 10; // arraste mínimo antes de ativar (evita ativar ao rolar a página)
const LABELS = { idle: "Girar 360°", loading: "Carregando 3D…", ready: "Ver foto", error: "3D indisponível" };
const STATUS = {
  loading: "Carregando modelo 3D.",
  ready: "Modelo 3D carregado. Arraste na horizontal ou use as setas para girar. Esc volta à foto.",
  error: "Modelo 3D indisponível agora. Mostrando a foto.",
};

function glbViewer(item, reduced) {
  const mv = document.createElement("model-viewer");
  const orbit = (theta) => `${theta} ${VIEWER_PHI} auto`;
  for (const [k, v] of Object.entries({
    "camera-controls": "", "disable-zoom": "", "disable-pan": "", "disable-tap": "", "touch-action": "pan-y",
    "interaction-prompt": "none", "camera-orbit": orbit("0deg"), "min-camera-orbit": orbit("-Infinity"),
    "max-camera-orbit": orbit("Infinity"), "rotation-per-second": "18deg", "shadow-intensity": "1",
    "environment-image": "neutral", exposure: "1.05",
  })) mv.setAttribute(k, v);
  mv.className = "absolute inset-0 z-10 size-full";
  mv.toggleAttribute("auto-rotate", !reduced.matches);
  mv.alt = `Modelo 3D de ${item.name}. Arraste na horizontal para girar.`;
  mv.src = item.model3dUrl;
  return mv;
}

// media: contêiner relative com [data-3d-photo], [data-3d-toggle] e [data-3d-status].
// onState(state, item) avisa o chamador (ex.: trocar o crédito da foto pelo do modelo).
export function inline3d(media, { zoom = 0.8, onState = () => {} } = {}) {
  const toggle = media.querySelector("[data-3d-toggle]");
  const label = toggle.querySelector("[data-3d-label]");
  const status = media.querySelector("[data-3d-status]");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let item = null;
  let state = "idle";
  let sketch = null;
  let glb = null;
  let byKey = false; // ativado por teclado: leva o foco ao controle de giro

  function setState(next) {
    state = next;
    media.dataset.state3d = next;
    label.textContent = LABELS[next];
    toggle.setAttribute("aria-label", next === "ready" ? `Voltar à foto de ${item.name}` : `Girar ${item.name} em 360 graus`);
    toggle.setAttribute("aria-busy", String(next === "loading"));
    status.textContent = STATUS[next] ?? "";
    onState(next, item);
    if (next === "ready" && byKey) (media.querySelector("[data-rotate-pad]:not([hidden])") ?? glb)?.focus();
  }

  async function activate() {
    if (!item?.model3dUrl || state === "loading" || state === "ready") return;
    const uid = sketchfabUid(item.model3dUrl);
    const name = item.colorName ? `${item.name}, ${item.colorName}` : item.name;
    setState("loading");
    if (uid) {
      sketch ??= createSketchfabViewer(media, {
        reduced, zoom,
        onState: (s, id) => id && id === sketchfabUid(item?.model3dUrl) && (state === "loading" || state === "ready") && setState(s),
      });
      sketch.hide(); // permite tentar de novo após erro (show ignora o mesmo uid)
      sketch.show(uid, `Modelo 3D de ${name}`);
      return;
    }
    const want = item;
    try {
      await import(MV_SRC);
    } catch {
      return item === want && setState("error");
    }
    if (item !== want || state !== "loading") return;
    glb = glbViewer(item, reduced);
    glb.addEventListener("load", () => item === want && state === "loading" && setState("ready"));
    glb.addEventListener("error", () => {
      if (item !== want) return;
      glb?.remove();
      glb = null;
      setState("error");
    });
    media.append(glb);
  }

  function reset() {
    sketch?.hide();
    glb?.remove();
    glb = null;
    if (item) setState("idle");
  }

  // Arraste horizontal ou toque na foto ativam o 3D; arraste vertical rola a página.
  let start = null;
  media.addEventListener("pointerdown", (e) => {
    if (!item?.model3dUrl || (state !== "idle" && state !== "error")) return;
    if (e.target.closest("[data-3d-toggle], [data-rotate-pad], model-viewer")) return;
    start = { x: e.clientX, y: e.clientY };
    byKey = false;
  });
  media.addEventListener("pointermove", (e) => {
    if (!start) return;
    const [dx, dy] = [Math.abs(e.clientX - start.x), Math.abs(e.clientY - start.y)];
    if (dx > DRAG_PX && dx > dy) {
      start = null;
      activate();
    } else if (dy > DRAG_PX) start = null;
  });
  media.addEventListener("pointerup", () => {
    if (!start) return;
    start = null;
    activate();
  });
  media.addEventListener("pointercancel", () => (start = null));
  // Arrastar a <img> inicia o drag nativo do navegador, que cancela os pointer events.
  media.addEventListener("dragstart", (e) => item?.model3dUrl && e.preventDefault());

  toggle.addEventListener("click", (e) => {
    byKey = e.detail === 0; // clique sintetizado por Enter/Espaço
    if (state === "ready" || state === "loading") {
      reset();
      toggle.focus();
    } else activate();
  });
  media.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || state === "idle") return;
    e.preventDefault();
    reset();
    toggle.focus();
  });

  return {
    // Troca de produto (carrossel/galeria): sempre volta à foto do item novo.
    set(next) {
      reset();
      item = next;
      toggle.hidden = !next?.model3dUrl;
      media.toggleAttribute("data-has-3d", Boolean(next?.model3dUrl));
      if (next) setState("idle");
    },
    reset,
  };
}
