// Visualizador 3D via Sketchfab Viewer API (embed oficial do autor, sem download do arquivo).
// Giro SOMENTE em Y: a câmera nativa do Sketchfab não recebe ponteiro (camada por cima);
// o arraste horizontal gira a câmera em volta do eixo vertical (Z no Sketchfab), mantendo
// altura e distância. orbit_constraint_* exigiria conta Pro, por isso o controle é nosso.

const API_SRC = "https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js";
const EMBED_RE = /^https:\/\/sketchfab\.com\/models\/([0-9a-f]{32})\/embed$/;
const SPIN_DEG_PER_S = 14;
const KEY_STEP = Math.PI / 12; // 15°
// Script carregou mas o modelo não ficou pronto (iframe bloqueado, rede lenta): desiste e volta
// à foto com aviso, em vez de "Carregando…" eterno.
export const READY_TIMEOUT_MS = 25000;

export const sketchfabUid = (url) => EMBED_RE.exec(url ?? "")?.[1] ?? null;

let apiLoad = null;
function loadApi() {
  apiLoad ??= new Promise((resolve, reject) => {
    const s = Object.assign(document.createElement("script"), { src: API_SRC, async: true });
    s.onload = () => (window.Sketchfab ? resolve(window.Sketchfab) : reject(new Error("Sketchfab ausente")));
    s.onerror = () => {
      apiLoad = null;
      reject(new Error("falha ao carregar Sketchfab"));
    };
    document.head.append(s);
  });
  return apiLoad;
}

// Gira (x, y) do olho em volta do alvo; z (altura) fica fixo: sem inclinação.
export function yawPosition(base, angle) {
  const [tx, ty] = base.target;
  const [dx, dy, z] = [base.position[0] - tx, base.position[1] - ty, base.position[2]];
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [tx + dx * c - dy * s, ty + dx * s + dy * c, z];
}

// Cada autor salva uma câmera diferente (um modelo vinha 2x mais perto que outro).
// focusOnVisibleGeometries enquadra a geometria inteira; depois aproximamos por `zoom`,
// mantendo direção e altura relativa. Tudo antes de revelar o iframe (sem salto visível).
const look = (api) => new Promise((r) => api.getCameraLookAt((err, cam) => r(err ? null : cam)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function frameModel(api, zoom) {
  if (api.focusOnVisibleGeometries) {
    await new Promise((r) => api.focusOnVisibleGeometries(() => r()));
    // a transição é animada: espera a câmera parar (2 leituras iguais), no máximo ~2,4 s
    let prev = await look(api);
    for (let i = 0; i < 16; i++) {
      await sleep(150);
      const cur = await look(api);
      if (!cur || !prev) break;
      if (cur.position.every((v, k) => Math.abs(v - prev.position[k]) < 1e-4)) break;
      prev = cur;
    }
  }
  const cam = await look(api);
  if (!cam) return null;
  const position = cam.position.map((v, k) => cam.target[k] + (v - cam.target[k]) * zoom);
  api.setCameraLookAt(position, cam.target, 0);
  return { position, target: cam.target };
}

const INIT = {
  autostart: 1,
  preload: 1, // só revela com texturas prontas; a foto cobre o carregamento
  camera: 0,
  transparent: 1,
  dnt: 1,
  ui_animations: 0,
  ui_annotations: 0,
  ui_ar: 0,
  ui_controls: 0,
  ui_fullscreen: 0,
  ui_help: 0,
  ui_hint: 0,
  ui_infos: 0,
  ui_inspector: 0,
  ui_loading: 0,
  ui_settings: 0,
  ui_stop: 0,
  ui_vr: 0,
  scrollwheel: 0,
};

// stage: elemento com position relative onde o iframe e a camada de arraste entram.
// zoom < 1 aproxima a câmera após enquadrar (palco largo do hero).
// onState("loading"|"ready"|"error"|"idle", uid) informa o chamador (foto x 3D, mensagens).
export function createSketchfabViewer(stage, { reduced, zoom = 1, onState = () => {} }) {
  const frame = document.createElement("iframe");
  frame.title = "Visualizador 3D";
  frame.allow = "autoplay; fullscreen; xr-spatial-tracking";
  frame.inert = true; // controles nativos (que inclinam) fora do foco e da árvore de acessibilidade
  frame.className = "pointer-events-none absolute inset-0 size-full border-0 opacity-0 transition-opacity duration-500";
  frame.dataset.sketchfabFrame = "";

  const pad = document.createElement("div");
  pad.className = "absolute inset-0 z-10 cursor-grab touch-pan-y select-none active:cursor-grabbing focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime";
  pad.hidden = true;
  pad.tabIndex = 0;
  pad.setAttribute("role", "slider");
  pad.setAttribute("aria-valuemin", "0");
  pad.setAttribute("aria-valuemax", "359");
  pad.dataset.rotatePad = "";
  stage.append(frame, pad);

  let current = null; // uid pedido por último
  let api = null;
  let base = null; // câmera inicial do autor (enquadramento)
  let yaw = 0;
  let sent = null;
  let spinning = false;
  let raf = 0;
  let last = 0;

  function apply() {
    raf = 0;
    if (!api || !base) return;
    const now = performance.now();
    if (spinning && !reduced.matches) yaw += ((now - last) / 1000) * (SPIN_DEG_PER_S * Math.PI) / 180;
    last = now;
    if (yaw !== sent) {
      sent = yaw;
      api.setCameraLookAt(yawPosition(base, yaw), base.target, 0);
      const deg = Math.round((((yaw * 180) / Math.PI) % 360) + 360) % 360;
      pad.setAttribute("aria-valuenow", String(deg));
      pad.setAttribute("aria-valuetext", `${deg} graus`);
    }
    if (spinning && !reduced.matches) raf = requestAnimationFrame(apply);
  }
  const schedule = () => (raf ||= requestAnimationFrame(apply));
  const stopSpin = () => (spinning = false);

  // Arraste: só a componente horizontal gira; a vertical é ignorada (e rola a página no toque).
  let drag = null;
  pad.addEventListener("pointerdown", (e) => {
    if (!api) return;
    stopSpin();
    drag = { x: e.clientX, yaw };
    pad.setPointerCapture(e.pointerId);
  });
  pad.addEventListener("pointermove", (e) => {
    if (!drag) return;
    yaw = drag.yaw + ((e.clientX - drag.x) / pad.clientWidth) * 1.6 * Math.PI;
    schedule();
  });
  const end = () => (drag = null);
  pad.addEventListener("pointerup", end);
  pad.addEventListener("pointercancel", end);
  pad.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    stopSpin();
    yaw += e.key === "ArrowLeft" ? -KEY_STEP : KEY_STEP;
    schedule();
  });
  reduced.addEventListener?.("change", () => reduced.matches && stopSpin());

  async function show(uid, label) {
    if (uid === current) return;
    current = uid;
    api = base = null;
    yaw = 0;
    sent = null;
    frame.classList.add("opacity-0");
    pad.hidden = true;
    pad.setAttribute("aria-label", `${label}. Use as setas ou arraste na horizontal para girar.`);
    onState("loading", uid);
    let Sketchfab;
    try {
      Sketchfab = await loadApi();
    } catch {
      if (current === uid) onState("error", uid);
      return;
    }
    if (current !== uid) return;
    const timer = setTimeout(() => current === uid && !api && onState("error", uid), window.__sfTimeoutMs ?? READY_TIMEOUT_MS);
    new Sketchfab(frame).init(uid, {
      ...INIT,
      success(next) {
        next.start();
        next.addEventListener("viewerready", async () => {
          const cam = await frameModel(next, zoom);
          clearTimeout(timer);
          if (current !== uid) return;
          if (!cam) return onState("error", uid);
          api = next;
          base = cam;
          sent = 0; // frameModel já posicionou a câmera em yaw 0
          pad.setAttribute("aria-valuenow", "0");
          pad.setAttribute("aria-valuetext", "0 graus");
          frame.classList.remove("opacity-0");
          pad.hidden = false;
          spinning = !reduced.matches;
          last = performance.now();
          schedule();
          onState("ready", uid);
        });
      },
      error() {
        clearTimeout(timer);
        if (current === uid) onState("error", uid);
      },
    });
  }

  function hide() {
    current = null;
    api = base = null;
    stopSpin();
    frame.classList.add("opacity-0");
    pad.hidden = true;
    onState("idle", null);
  }

  return { show, hide };
}
