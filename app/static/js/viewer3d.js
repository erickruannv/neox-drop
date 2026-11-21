// "Ver em 3D": palco grande em <dialog> (#viewer-3d), aberto só por clique. A página abre
// com a foto; o 3D carrega sob demanda. Giro SOMENTE em Y nos dois motores:
// - GLB próprio/licenciado: Model Viewer com phi fixo (min = max), sem zoom/pan;
// - embed Sketchfab: camada própria de arraste (ver sketchfab.js).
import { createSketchfabViewer, sketchfabUid } from "./sketchfab.js";

// Ângulo polar fixo (phi = min = max): sem inclinação vertical.
// shortcut: 75deg é provisório, ajustar com o GLB licenciado em teste (T024/T025).
export const VIEWER_PHI = "75deg";
const MV_SRC = "/static/dist/vendor/model-viewer.min.js";

let dialog = null;
let sketch = null;
let glb = null;
let wanted = null; // uid pedido por último (o callback do viewer é criado uma vez só)

function els() {
  dialog ??= document.getElementById("viewer-3d");
  if (!dialog) return null;
  const $ = (s) => dialog.querySelector(s);
  return { stage: $("[data-viewer-stage]"), title: $("[data-viewer-title]"), hint: $("[data-viewer-hint]"), credit: $("[data-viewer-credit]"), poster: $("[data-viewer-poster]"), status: $("[data-viewer-status]") };
}

function setState(ui, state) {
  const ready = state === "ready";
  ui.poster.hidden = ready;
  ui.stage.toggleAttribute("data-loading", state === "loading");
  ui.hint.textContent = { loading: "Carregando modelo 3D…", ready: "Arraste na horizontal para girar 360°", error: "Modelo 3D indisponível agora. Tente novamente mais tarde." }[state] ?? "";
  ui.status.textContent = ready ? "Modelo 3D carregado. Arraste na horizontal ou use as setas para girar." : state === "error" ? "Modelo 3D indisponível." : "";
}

function glbViewer(ui, reduced) {
  const mv = document.createElement("model-viewer");
  const orbit = (theta) => `${theta} ${VIEWER_PHI} auto`;
  for (const [k, v] of Object.entries({
    "camera-controls": "", "disable-zoom": "", "disable-pan": "", "disable-tap": "", "touch-action": "pan-y",
    "interaction-prompt": "none", "camera-orbit": orbit("0deg"), "min-camera-orbit": orbit("-Infinity"),
    "max-camera-orbit": orbit("Infinity"), "rotation-per-second": "18deg", "shadow-intensity": "1",
    "environment-image": "neutral", exposure: "1.05",
  })) mv.setAttribute(k, v);
  mv.className = "absolute inset-0 size-full";
  mv.toggleAttribute("auto-rotate", !reduced.matches);
  mv.addEventListener("load", () => setState(ui, "ready"));
  mv.addEventListener("error", () => setState(ui, "error"));
  ui.stage.append(mv);
  return mv;
}

// item: { model3dUrl, name, colorName, mainImageUrl, attributes }
export async function open3d(item, opener) {
  const ui = els();
  if (!ui || !item?.model3dUrl) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const label = item.colorName ? `${item.name}, ${item.colorName}` : item.name;
  const a = item.attributes ?? {};
  ui.title.textContent = item.name;
  ui.poster.src = item.mainImageUrl;
  ui.poster.alt = label;
  ui.credit.textContent = a.model3dCredit ?? "";
  if (a.model3dCreditUrl) ui.credit.href = a.model3dCreditUrl;
  else ui.credit.removeAttribute("href");
  dialog.returnFocus = opener;
  dialog.showModal();

  const uid = sketchfabUid(item.model3dUrl);
  if (uid) {
    glb?.remove();
    glb = null;
    wanted = uid;
    sketch ??= createSketchfabViewer(ui.stage, { reduced, zoom: 0.8, onState: (s, id) => id && id === wanted && setState(ui, s) });
    setState(ui, "loading");
    sketch.show(uid, `Modelo 3D de ${label}`);
    return;
  }
  wanted = null;
  sketch?.hide();
  setState(ui, "loading");
  try {
    await import(MV_SRC);
  } catch {
    return setState(ui, "error");
  }
  glb ??= glbViewer(ui, reduced);
  glb.alt = `Modelo 3D de ${label}. Arraste na horizontal para girar.`;
  glb.src = item.model3dUrl;
}

// Fecha: libera o motor (para de girar/consumir GPU) e devolve o foco a quem abriu.
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-viewer-close]") || e.target === dialog) dialog?.close();
});
document.getElementById("viewer-3d")?.addEventListener("close", () => {
  sketch?.hide();
  glb?.remove();
  glb = null;
  dialog.returnFocus?.focus();
});
