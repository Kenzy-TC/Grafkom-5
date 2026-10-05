import { Mat4, normalMatrixFromMat4, degToRad } from "./math3d.js";

// ============================================================
// 1. SETUP
// ============================================================
const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");
if (!gl) {
  document.body.innerHTML = "<h1 style='color:red;padding:20px;'>WebGL2 tidak tersedia di browser ini.</h1>";
  throw new Error("WebGL2 not available");
}
gl.enable(gl.DEPTH_TEST);

// ============================================================
// 2. GEOMETRY
// ============================================================
function createCube() {
  const p = new Float32Array([
    -0.5,-0.5, 0.5,  0.5,-0.5, 0.5,  0.5, 0.5, 0.5,
    -0.5,-0.5, 0.5,  0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
     0.5,-0.5,-0.5, -0.5,-0.5,-0.5, -0.5, 0.5,-0.5,
     0.5,-0.5,-0.5, -0.5, 0.5,-0.5,  0.5, 0.5,-0.5,
    -0.5,-0.5,-0.5, -0.5,-0.5, 0.5, -0.5, 0.5, 0.5,
    -0.5,-0.5,-0.5, -0.5, 0.5, 0.5, -0.5, 0.5,-0.5,
     0.5,-0.5, 0.5,  0.5,-0.5,-0.5,  0.5, 0.5,-0.5,
     0.5,-0.5, 0.5,  0.5, 0.5,-0.5,  0.5, 0.5, 0.5,
    -0.5, 0.5, 0.5,  0.5, 0.5, 0.5,  0.5, 0.5,-0.5,
    -0.5, 0.5, 0.5,  0.5, 0.5,-0.5, -0.5, 0.5,-0.5,
    -0.5,-0.5,-0.5,  0.5,-0.5,-0.5,  0.5,-0.5, 0.5,
    -0.5,-0.5,-0.5,  0.5,-0.5, 0.5, -0.5,-0.5, 0.5,
  ]);
  const n = new Float32Array(p.length);
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = p[i+1], z = p[i+2];
    const len = Math.hypot(x, y, z) || 1;
    n[i] = x/len; n[i+1] = y/len; n[i+2] = z/len;
  }
  const faceUV = [0,0, 1,0, 1,1, 0,0, 1,1, 0,1];
  const uv = [];
  for (let i = 0; i < 6; i++) uv.push(...faceUV);
  return { positions: p, normals: n, uvs: new Float32Array(uv), vertexCount: 36 };
}

function createSphere(radius = 0.75, latBands = 32, longBands = 32) {
  const pos = [], nrm = [], uvs = [];
  for (let lat = 0; lat <= latBands; lat++) {
    const theta = (lat * Math.PI) / latBands;
    const sinT = Math.sin(theta), cosT = Math.cos(theta);
    for (let lon = 0; lon <= longBands; lon++) {
      const phi = (lon * 2 * Math.PI) / longBands;
      const sinP = Math.sin(phi), cosP = Math.cos(phi);
      const x = cosP * sinT, y = cosT, z = sinP * sinT;
      pos.push(radius*x, radius*y, radius*z);
      nrm.push(x, y, z);
      uvs.push(lon/longBands, lat/latBands);
    }
  }
  const idx = [];
  for (let lat = 0; lat < latBands; lat++) {
    for (let lon = 0; lon < longBands; lon++) {
      const first = lat*(longBands+1) + lon;
      const second = first + longBands + 1;
      idx.push(first, second, first+1);
      idx.push(second, second+1, first+1);
    }
  }
  return buildGeometry(pos, nrm, uvs, idx);
}

function createTorus(R = 0.6, r = 0.25, majorSeg = 48, minorSeg = 24) {
  const pos = [], nrm = [], uvs = [];
  for (let i = 0; i <= majorSeg; i++) {
    const u = (i/majorSeg) * 2 * Math.PI;
    const cosU = Math.cos(u), sinU = Math.sin(u);
    for (let j = 0; j <= minorSeg; j++) {
      const v = (j/minorSeg) * 2 * Math.PI;
      const cosV = Math.cos(v), sinV = Math.sin(v);
      pos.push((R + r*cosV)*cosU, (R + r*cosV)*sinU, r*sinV);
      nrm.push(cosV*cosU, cosV*sinU, sinV);
      uvs.push(i/majorSeg, j/minorSeg);
    }
  }
  const idx = [];
  for (let i = 0; i < majorSeg; i++) {
    for (let j = 0; j < minorSeg; j++) {
      const a = i*(minorSeg+1) + j;
      const b = a + minorSeg + 1;
      idx.push(a, b, a+1);
      idx.push(b, b+1, a+1);
    }
  }
  return buildGeometry(pos, nrm, uvs, idx);
}

function createTorusKnot(p = 2, q = 3, radius = 0.6, tube = 0.22, tubularSeg = 128, radialSeg = 16) {
  const pos = [], nrm = [], uvs = [];
  const P = (t) => {
    const cu = Math.cos(t*p), su = Math.sin(t*p);
    const quOverP = q / p;
    const cs = Math.cos(t*quOverP);
    return [
      radius * (2 + cs) * 0.5 * cu,
      radius * (2 + cs) * su * 0.5,
      radius * Math.sin(t*quOverP) * 0.5
    ];
  };
  for (let i = 0; i <= tubularSeg; i++) {
    const u = (i/tubularSeg) * 2 * Math.PI * p;
    const pos1 = P(u);
    const eps = 0.001;
    const pos2 = P(u + eps);
    const T = [pos2[0]-pos1[0], pos2[1]-pos1[1], pos2[2]-pos1[2]];
    const lenT = Math.hypot(...T) || 1;
    T[0]/=lenT; T[1]/=lenT; T[2]/=lenT;
    let N = [T[1], -T[0], 0];
    const lenN = Math.hypot(...N) || 1;
    N[0]/=lenN; N[1]/=lenN; N[2]/=lenN;
    const B = [
      T[1]*N[2] - T[2]*N[1],
      T[2]*N[0] - T[0]*N[2],
      T[0]*N[1] - T[1]*N[0]
    ];
    for (let j = 0; j <= radialSeg; j++) {
      const v = (j/radialSeg) * 2 * Math.PI;
      const cx = -tube * Math.cos(v);
      const cy =  tube * Math.sin(v);
      const x = pos1[0] + cx*N[0] + cy*B[0];
      const y = pos1[1] + cx*N[1] + cy*B[1];
      const z = pos1[2] + cx*N[2] + cy*B[2];
      pos.push(x, y, z);
      const nx = x - pos1[0], ny = y - pos1[1], nz = z - pos1[2];
      const len = Math.hypot(nx, ny, nz) || 1;
      nrm.push(nx/len, ny/len, nz/len);
      uvs.push(i/tubularSeg, j/radialSeg);
    }
  }
  const idx = [];
  for (let i = 0; i < tubularSeg; i++) {
    for (let j = 0; j < radialSeg; j++) {
      const a = i*(radialSeg+1) + j;
      const b = a + radialSeg + 1;
      idx.push(a, b, a+1);
      idx.push(b, b+1, a+1);
    }
  }
  return buildGeometry(pos, nrm, uvs, idx);
}

function buildGeometry(positions, normals, uvs, indices) {
  const p = [], n = [], uv = [];
  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i];
    p.push(positions[idx*3], positions[idx*3+1], positions[idx*3+2]);
    n.push(normals[idx*3], normals[idx*3+1], normals[idx*3+2]);
    uv.push(uvs[idx*2], uvs[idx*2+1]);
  }
  return {
    positions: new Float32Array(p),
    normals:   new Float32Array(n),
    uvs:       new Float32Array(uv),
    vertexCount: indices.length
  };
}

// ============================================================
// 3. SHADERS
// ============================================================
const vsSource = `#version 300 es
in vec3 a_position;
in vec3 a_normal;
in vec2 a_texCoord;
uniform mat4 u_model, u_view, u_projection;
uniform mat3 u_normalMatrix;
uniform float u_uvScale;
out vec3 v_worldPosition;
out vec3 v_normal;
out vec2 v_texCoord;
void main() {
  vec4 wp = u_model * vec4(a_position, 1.0);
  v_worldPosition = wp.xyz;
  v_normal = u_normalMatrix * a_normal;
  v_texCoord = a_texCoord * u_uvScale;
  gl_Position = u_projection * u_view * wp;
}`;

// ★ FIX: pakai variabel `tc`, BUKAN `texColor`
const fsSource = `#version 300 es
precision highp float;
in vec3 v_worldPosition;
in vec3 v_normal;
in vec2 v_texCoord;
uniform vec3 u_lightPosition;
uniform vec3 u_lightColor;
uniform vec3 u_cameraPosition;
uniform float u_ambientStrength;
uniform float u_shininess;
uniform float u_useAmbient;
uniform float u_useDiffuse;
uniform float u_useSpecular;
uniform float u_flatShading;
uniform float u_useTexture;
uniform sampler2D u_texture;
out vec4 outColor;
void main() {
  vec3 N;
  if (u_flatShading > 0.5) {
    N = normalize(cross(dFdx(v_worldPosition), dFdy(v_worldPosition)));
  } else {
    N = normalize(v_normal);
  }
  vec3 L = normalize(u_lightPosition - v_worldPosition);
  vec3 V = normalize(u_cameraPosition - v_worldPosition);
  float diff = max(dot(N, L), 0.0);
  vec3 R = reflect(-L, N);
  float spec = 0.0;
  if (diff > 0.0) {
    spec = pow(max(dot(R, V), 0.0), u_shininess);
  }
  vec3 sampled = texture(u_texture, v_texCoord).rgb;
  vec3 plain   = vec3(0.85, 0.85, 0.85);
  vec3 tc      = mix(plain, sampled, u_useTexture);
  vec3 ambient  = u_useAmbient  * u_ambientStrength * tc;
  vec3 diffuse  = u_useDiffuse  * diff * u_lightColor * tc;
  vec3 specular = u_useSpecular * spec * u_lightColor;
  outColor = vec4(ambient + diffuse + specular, 1.0);
}`;

// ============================================================
// 4. COMPILE & LINK
// ============================================================
function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    console.error("Shader compile error:", log);
    throw new Error(log);
  }
  return s;
}

const program = gl.createProgram();
gl.attachShader(program, compile(gl.VERTEX_SHADER, vsSource));
gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fsSource));
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  const log = gl.getProgramInfoLog(program);
  console.error("Program link error:", log);
  throw new Error(log);
}
gl.useProgram(program);

// ============================================================
// 5. LOCATIONS
// ============================================================
const L = {
  pos:      gl.getAttribLocation(program, "a_position"),
  norm:     gl.getAttribLocation(program, "a_normal"),
  uv:       gl.getAttribLocation(program, "a_texCoord"),
  model:    gl.getUniformLocation(program, "u_model"),
  view:     gl.getUniformLocation(program, "u_view"),
  proj:     gl.getUniformLocation(program, "u_projection"),
  normMat:  gl.getUniformLocation(program, "u_normalMatrix"),
  lightPos: gl.getUniformLocation(program, "u_lightPosition"),
  lightCol: gl.getUniformLocation(program, "u_lightColor"),
  camPos:   gl.getUniformLocation(program, "u_cameraPosition"),
  amb:      gl.getUniformLocation(program, "u_ambientStrength"),
  shin:     gl.getUniformLocation(program, "u_shininess"),
  tex:      gl.getUniformLocation(program, "u_texture"),
  uvScale:  gl.getUniformLocation(program, "u_uvScale"),
  useAmb:   gl.getUniformLocation(program, "u_useAmbient"),
  useDiff:  gl.getUniformLocation(program, "u_useDiffuse"),
  useSpec:  gl.getUniformLocation(program, "u_useSpecular"),
  flat:     gl.getUniformLocation(program, "u_flatShading"),
  useTex:   gl.getUniformLocation(program, "u_useTexture"),
};

// ============================================================
// 6. BUFFERS
// ============================================================
const positionBuffer = gl.createBuffer();
const normalBuffer   = gl.createBuffer();
const uvBuffer       = gl.createBuffer();
let currentGeometry  = null;

function updateGeometry(shapeName) {
  let geo;
  switch (shapeName) {
    case "sphere":    geo = createSphere(); break;
    case "torus":     geo = createTorus(); break;
    case "torusKnot": geo = createTorusKnot(); break;
    default:          geo = createCube(); break;
  }
  currentGeometry = geo;

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, geo.positions, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, geo.normals, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, geo.uvs, gl.STATIC_DRAW);
}

function setupAttr(buffer, location, size) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}

// ============================================================
// 7. TEXTURES
// ============================================================
function createCheckerTexture() {
  const size = 64, cells = 8, cellSize = size / cells;
  const cvs = document.createElement("canvas");
  cvs.width = cvs.height = size;
  const ctx = cvs.getContext("2d");
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#f8fafc" : "#0ea5e9";
      ctx.fillRect(x*cellSize, y*cellSize, cellSize, cellSize);
    }
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cvs);
  gl.generateMipmap(gl.TEXTURE_2D);
  return tex;
}

function createImageTexture() {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([200, 30, 30, 255]));

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    applyTextureParams(tex);
  };
  img.onerror = () => {
    console.warn("[Texture] ./assets/texture.png tidak ditemukan, pakai fallback.");
    const cvs = document.createElement("canvas");
    cvs.width = cvs.height = 256;
    const ctx = cvs.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 256, 256);
    g.addColorStop(0.00, "#ff0099");
    g.addColorStop(0.33, "#ffcc00");
    g.addColorStop(0.66, "#00ffcc");
    g.addColorStop(1.00, "#0066ff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 2;
    const cell = 256 / 8;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo(i*cell, 0); ctx.lineTo(i*cell, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i*cell); ctx.lineTo(256, i*cell); ctx.stroke();
    }
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px monospace";
    ctx.fillText("U →", 10, 30);
    ctx.fillText("V ↓", 10, 250);

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cvs);
    gl.generateMipmap(gl.TEXTURE_2D);
    applyTextureParams(tex);
  };
  img.src = "./assets/texture.png";
  return tex;
}

const checkerTexture = createCheckerTexture();
const imageTexture   = createImageTexture();

gl.activeTexture(gl.TEXTURE0);
gl.uniform1i(L.tex, 0);

// ============================================================
// 8. STATE
// ============================================================
const state = {
  shape: "cube",
  rotX: 20, rotY: 30,
  scaleX: 1.0, scaleY: 1.0, scaleZ: 1.0,
  shading: "SMOOTH",
  textureSource: "checker",
  filter: "LINEAR",
  wrap: "REPEAT",
  uvScale: 1.0,
  ambient: 0.18,
  shininess: 32.0,
  useAmbient: true,
  useDiffuse: true,
  useSpecular: true,
  useTexture: true,
  isRotating: true,
  isLightOrbit: false,
  isCameraOrbit: false,
  isNonUniformScale: false,
  lightPos: [2, 2, 2],
  lightColor: [1, 1, 1],
};

const camera = {
  pos: [0, 1.4, 4.0],
  target: [0, 0, 0],
  up: [0, 1, 0],
  orbitAngle: 0,
};

// ============================================================
// 9. TEXTURE PARAMS
// ============================================================
function applyTextureParams(tex) {
  if (!tex) return;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  if (state.filter === "NEAREST") {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  } else if (state.filter === "LINEAR_MIPMAP") {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }
  const wMode = state.wrap === "CLAMP_TO_EDGE" ? gl.CLAMP_TO_EDGE : gl.REPEAT;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wMode);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wMode);
}

function applyTextureSettings() {
  applyTextureParams(checkerTexture);
  applyTextureParams(imageTexture);
}

function getActiveTexture() {
  return state.textureSource === "image" ? imageTexture : checkerTexture;
}

// ============================================================
// 10. UI HELPERS
// ============================================================
const $ = id => document.getElementById(id);

function on(id, event, handler) {
  const el = $(id);
  if (el) el.addEventListener(event, handler);
}

function setToggle(btnId, isActive) {
  const btn = $(btnId);
  if (btn) btn.classList.toggle("active", isActive);
}

function txt(id, val) {
  const el = $(id);
  if (el) el.textContent = val;
}

// ============================================================
// 11. UI BINDINGS — SLIDERS
// ============================================================
on("ambientSlider", "input", e => {
  state.ambient = parseFloat(e.target.value);
  txt("ambientVal", state.ambient.toFixed(2));
});

on("shininessSlider", "input", e => {
  state.shininess = parseFloat(e.target.value);
  txt("shininessVal", state.shininess.toFixed(0));
});

["X","Y","Z"].forEach(axis => {
  on("light" + axis, "input", e => {
    const v = parseFloat(e.target.value);
    const i = axis === "X" ? 0 : axis === "Y" ? 1 : 2;
    state.lightPos[i] = v;
    txt("light" + axis + "Val", v.toFixed(1));
  });
});

["X","Y","Z"].forEach(axis => {
  on("scale" + axis, "input", e => {
    const v = parseFloat(e.target.value);
    state["scale" + axis] = v;
    txt("scale" + axis + "Val", v.toFixed(1));
  });
});

// ============================================================
// 12. UI BINDINGS — DROPDOWNS & CHECKBOXES
// ============================================================
on("shapeSelect", "change", e => {
  state.shape = e.target.value;
  updateGeometry(state.shape);
});

on("textureSelect", "change", e => state.textureSource = e.target.value);

on("filterSelect", "change", e => {
  state.filter = e.target.value;
  applyTextureSettings();
});

on("wrapSelect", "change", e => {
  state.wrap = e.target.value;
  applyTextureSettings();
});

on("chkAmbient",  "change", e => state.useAmbient  = e.target.checked);
on("chkDiffuse",  "change", e => state.useDiffuse  = e.target.checked);
on("chkSpecular", "change", e => state.useSpecular = e.target.checked);

// ============================================================
// 13. UI BINDINGS — BUTTONS & TOGGLES
// ============================================================
on("btnFlatSmooth", "click", () => {
  state.shading = state.shading === "FLAT" ? "SMOOTH" : "FLAT";
  setToggle("btnFlatSmooth", state.shading === "FLAT");
});

on("btnTexture", "click", () => {
  state.useTexture = !state.useTexture;
  setToggle("btnTexture", state.useTexture);
});

on("btnLightOrbit", "click", () => {
  state.isLightOrbit = !state.isLightOrbit;
  setToggle("btnLightOrbit", state.isLightOrbit);
});

on("btnCameraOrbit", "click", () => {
  state.isCameraOrbit = !state.isCameraOrbit;
  setToggle("btnCameraOrbit", state.isCameraOrbit);
});

on("btnStopRotation", "click", () => {
  state.isRotating = !state.isRotating;
  updateRotationButton();
});

on("btnReset", "click", resetScene);

// ---- CHALLENGE B ----
function stepAmbient(delta) {
  state.ambient = Math.max(0, Math.min(1, state.ambient + delta));
  const slider = $("ambientSlider");
  if (slider) slider.value = state.ambient;
  txt("ambientVal", state.ambient.toFixed(2));
}

// ---- CHALLENGE C ----
function stepCameraX(delta) {
  if (state.isCameraOrbit) return;
  camera.pos[0] = Math.max(-6, Math.min(6, camera.pos[0] + delta));
}

// ---- HOLD-TO-REPEAT HELPER ----
function holdable(id, action, intervalMs = 50) {
  const el = $(id);
  if (!el) return;

  let intervalId = null;
  let timeoutId = null;

  const start = (e) => {
    e.preventDefault();
    action();
    timeoutId = setTimeout(() => {
      intervalId = setInterval(action, intervalMs);
    }, 300);
  };

  const stop = () => {
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
  };

  el.addEventListener("pointerdown", start);
  el.addEventListener("pointerup", stop);
  el.addEventListener("pointerleave", stop);
  el.addEventListener("pointercancel", stop);
  window.addEventListener("blur", stop);
}

holdable("btnAmbientDown", () => stepAmbient(-0.02), 40);
holdable("btnAmbientUp",   () => stepAmbient(+0.02), 40);
holdable("btnCamLeft",     () => stepCameraX(-0.05), 25);
holdable("btnCamRight",    () => stepCameraX(+0.05), 25);

// ---- CHALLENGE D ----
function toggleNonUniformScale() {
  state.isNonUniformScale = !state.isNonUniformScale;
  if (state.isNonUniformScale) {
    state.scaleX = 1.8; state.scaleY = 0.6; state.scaleZ = 1.0;
  } else {
    state.scaleX = 1.0; state.scaleY = 1.0; state.scaleZ = 1.0;
  }
  ["X","Y","Z"].forEach(axis => {
    const key = "scale" + axis;
    const slider = $(key);
    const label  = $(key + "Val");
    if (slider) slider.value = state[key];
    if (label)  label.textContent = state[key].toFixed(1);
  });
  setToggle("btnNonUniform", state.isNonUniformScale);
}
on("btnNonUniform", "click", toggleNonUniformScale);

// ============================================================
// 14. ROTATION BUTTON UPDATE
// ============================================================
function updateRotationButton() {
  const btn = $("btnStopRotation");
  if (!btn) return;
  const label = btn.querySelector(".btn-label");
  if (label) {
    label.textContent = state.isRotating ? "Stop Rotation (P)" : "Start Rotation (P)";
  }
  setToggle("btnStopRotation", state.isRotating);
}

// ============================================================
// 15. KEYBOARD
// ============================================================
const keys = {};
window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.startsWith("Arrow")) e.preventDefault();
});
window.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

window.addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  if (e.repeat) return;

  if (k === "f") {
    state.shading = state.shading === "FLAT" ? "SMOOTH" : "FLAT";
    setToggle("btnFlatSmooth", state.shading === "FLAT");
  } else if (k === "t") {
    state.useTexture = !state.useTexture;
    setToggle("btnTexture", state.useTexture);
  } else if (k === "g") {
    state.wrap = state.wrap === "REPEAT" ? "CLAMP_TO_EDGE" : "REPEAT";
    const s = $("wrapSelect"); if (s) s.value = state.wrap;
    applyTextureSettings();
  } else if (k === "r") {
    resetScene();
  } else if (k === "l") {
    state.isLightOrbit = !state.isLightOrbit;
    setToggle("btnLightOrbit", state.isLightOrbit);
  } else if (k === "p") {
    state.isRotating = !state.isRotating;
    updateRotationButton();
  } else if (k === "n") {
    toggleNonUniformScale();
  }
});

// ============================================================
// 16. RESET
// ============================================================
function resetScene() {
  state.lightPos = [2, 2, 2];
  state.shininess = 32.0;
  state.uvScale = 1.0;
  state.shading = "SMOOTH";
  state.filter = "LINEAR";
  state.wrap = "REPEAT";
  state.textureSource = "checker";
  state.scaleX = 1.0; state.scaleY = 1.0; state.scaleZ = 1.0;
  state.useAmbient = true; state.useDiffuse = true; state.useSpecular = true;
  state.useTexture = true;
  state.isRotating = true;
  state.isLightOrbit = false;
  state.isCameraOrbit = false;
  state.isNonUniformScale = false;
  state.ambient = 0.18;
  camera.pos = [0, 1.4, 4.0];
  camera.orbitAngle = 0;

  const set = (id, val) => { const el = $(id); if (el) el.value = val; };

  set("lightX", 2);  txt("lightXVal", "2.0");
  set("lightY", 2);  txt("lightYVal", "2.0");
  set("lightZ", 2);  txt("lightZVal", "2.0");
  set("shininessSlider", 32); txt("shininessVal", "32");
  set("ambientSlider", 0.18); txt("ambientVal", "0.18");
  set("scaleX", 1); txt("scaleXVal", "1.0");
  set("scaleY", 1); txt("scaleYVal", "1.0");
  set("scaleZ", 1); txt("scaleZVal", "1.0");
  set("filterSelect", "LINEAR");
  set("wrapSelect", "REPEAT");
  set("textureSelect", "checker");
  set("shapeSelect", "cube");

  const chk = (id, v) => { const el = $(id); if (el) el.checked = v; };
  chk("chkAmbient", true);
  chk("chkDiffuse", true);
  chk("chkSpecular", true);

  state.shape = "cube";
  updateGeometry("cube");

  setToggle("btnFlatSmooth", true);
  setToggle("btnTexture", true);
  setToggle("btnLightOrbit", false);
  setToggle("btnCameraOrbit", false);
  setToggle("btnNonUniform", false);
  updateRotationButton();

  applyTextureSettings();
}

// ============================================================
// 17. UPDATE
// ============================================================
function update(dt) {
  // ★ FIX: rotasi objek (yang tadinya hilang)
  if (state.isRotating) {
    state.rotX += 20.0 * dt;
    state.rotY += 35.0 * dt;
  }

  // ★ FIX: A/Z/Q/E key handling (bukan di dalam if isRotating!)
  const ambKeySpeed = 0.5;
  const camKeySpeed = 3.0;
  if (keys["a"]) stepAmbient(-ambKeySpeed * dt);
  if (keys["z"]) stepAmbient(+ambKeySpeed * dt);
  if (keys["q"]) stepCameraX(-camKeySpeed * dt);
  if (keys["e"]) stepCameraX(+camKeySpeed * dt);

  if (state.isLightOrbit) {
    const t = performance.now() * 0.001;
    state.lightPos[0] = Math.cos(t) * 3.0;
    state.lightPos[2] = Math.sin(t) * 3.0;
    const lx = $("lightX"); const lz = $("lightZ");
    if (lx) lx.value = state.lightPos[0];
    if (lz) lz.value = state.lightPos[2];
    txt("lightXVal", state.lightPos[0].toFixed(1));
    txt("lightZVal", state.lightPos[2].toFixed(1));
  }

  if (state.isCameraOrbit) {
    camera.orbitAngle += 0.5 * dt;
    camera.pos[0] = Math.cos(camera.orbitAngle) * 4.0;
    camera.pos[2] = Math.sin(camera.orbitAngle) * 4.0;
  }

  const speed = 2.0;
  if (!state.isLightOrbit) {
    if (keys["arrowleft"])  { state.lightPos[0] -= speed * dt; syncLight(0); }
    if (keys["arrowright"]) { state.lightPos[0] += speed * dt; syncLight(0); }
    if (keys["arrowup"])    { state.lightPos[1] += speed * dt; syncLight(1); }
    if (keys["arrowdown"])  { state.lightPos[1] -= speed * dt; syncLight(1); }
    if (keys["w"])          { state.lightPos[2] -= speed * dt; syncLight(2); }
    if (keys["s"])          { state.lightPos[2] += speed * dt; syncLight(2); }
  }

  if (keys["["]) state.uvScale = Math.max(0.25, state.uvScale - 1.5 * dt);
  if (keys["]"]) state.uvScale = Math.min(5.0, state.uvScale + 1.5 * dt);
  if (keys["-"] || keys["_"]) state.shininess = Math.max(2, state.shininess - 50 * dt);
  if (keys["+"] || keys["="]) state.shininess = Math.min(128, state.shininess + 50 * dt);
}

function syncLight(i) {
  const axis = ["X","Y","Z"][i];
  const slider = $("light" + axis);
  if (slider) slider.value = state.lightPos[i];
  txt("light" + axis + "Val", state.lightPos[i].toFixed(1));
}

// ============================================================
// 18. DRAW
// ============================================================
function draw() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);

  if (!currentGeometry) updateGeometry(state.shape);

  setupAttr(positionBuffer, L.pos, 3);
  setupAttr(uvBuffer,       L.uv,  2);
  setupAttr(normalBuffer,   L.norm, 3);

  const rx = Mat4.rotationX(degToRad(state.rotX));
  const ry = Mat4.rotationY(degToRad(state.rotY));
  const sc = Mat4.scaling(state.scaleX, state.scaleY, state.scaleZ);

  let model = Mat4.identity();
  model = Mat4.multiply(model, sc);
  model = Mat4.multiply(model, rx);
  model = Mat4.multiply(model, ry);

  const view = Mat4.lookAt(camera.pos, camera.target, camera.up);
  const proj = Mat4.perspective(degToRad(60), canvas.width / canvas.height, 0.1, 100.0);
  const nm   = normalMatrixFromMat4(model);

  gl.uniformMatrix4fv(L.model, false, model);
  gl.uniformMatrix4fv(L.view, false, view);
  gl.uniformMatrix4fv(L.proj, false, proj);
  gl.uniformMatrix3fv(L.normMat, false, nm);
  gl.uniform3fv(L.lightPos, state.lightPos);
  gl.uniform3fv(L.lightCol, state.lightColor);
  gl.uniform3fv(L.camPos, camera.pos);
  gl.uniform1f(L.amb, state.ambient);
  gl.uniform1f(L.shin, state.shininess);
  gl.uniform1f(L.uvScale, state.uvScale);
  gl.uniform1f(L.useAmb, state.useAmbient ? 1.0 : 0.0);
  gl.uniform1f(L.useDiff, state.useDiffuse ? 1.0 : 0.0);
  gl.uniform1f(L.useSpec, state.useSpecular ? 1.0 : 0.0);
  gl.uniform1f(L.flat, state.shading === "FLAT" ? 1.0 : 0.0);
  gl.uniform1f(L.useTex, state.useTexture ? 1.0 : 0.0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, getActiveTexture());
  gl.uniform1i(L.tex, 0);

  gl.drawArrays(gl.TRIANGLES, 0, currentGeometry.vertexCount);
}

// ============================================================
// 19. HUD
// ============================================================
function updateHUD() {
  txt("hudShading", state.shading);
  txt("hudFiltering", state.filter);
  txt("hudWrapping", state.wrap);
  txt("hudLight", `(${state.lightPos[0].toFixed(2)}, ${state.lightPos[1].toFixed(2)}, ${state.lightPos[2].toFixed(2)})`);
  txt("hudTexture", state.textureSource === "image" ? "IMAGE" : "CHECKER");
  txt("hudCamera", state.isCameraOrbit ? "ORBIT ON" : "ORBIT OFF");

  const badge = $("statusBadge");
  if (badge) {
    if (state.isRotating || state.isLightOrbit || state.isCameraOrbit) {
      badge.textContent = "● RUNNING";
      badge.style.opacity = "1";
    } else {
      badge.textContent = "● PAUSED";
      badge.style.opacity = "0.6";
    }
  }
}

// ============================================================
// 20. MAIN LOOP
// ============================================================
let lastTime = 0;
function render(time) {
  let dt = (time - lastTime) * 0.001;
  lastTime = time;
  dt = Math.min(dt, 0.05);

  try {
    update(dt);
    draw();
    updateHUD();
  } catch (e) {
    console.error("Render error:", e);
  }

  requestAnimationFrame(render);
}

// ============================================================
// 21. INIT
// ============================================================
updateGeometry("cube");
applyTextureSettings();
setToggle("btnFlatSmooth", true);
updateRotationButton();
requestAnimationFrame(render);

console.log("✓ Aplikasi berjalan. Shape: cube, Shading: SMOOTH");
