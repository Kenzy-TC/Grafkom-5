import { Mat4, normalMatrixFromMat4, degToRad } from "./math3d.js";

// ==================== 1. SETUP WEBGL ====================
const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");
if (!gl) throw new Error("WebGL2 tidak tersedia.");
gl.enable(gl.DEPTH_TEST);

// ==================== 2. GEOMETRY GENERATORS ====================
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
    const len = Math.hypot(x, y, z);
    n[i] = x/len; n[i+1] = y/len; n[i+2] = z/len;
  }
  const faceUV = [0,0, 1,0, 1,1, 0,0, 1,1, 0,1];
  const uv = [];
  for (let i = 0; i < 6; i++) uv.push(...faceUV);
  return { positions: p, normals: n, uvs: new Float32Array(uv), vertexCount: 36 };
}

function createSphere(radius = 0.75, latBands = 32, longBands = 32) {
  const positions = [], normals = [], uvs = [];
  for (let lat = 0; lat <= latBands; lat++) {
    const theta = (lat * Math.PI) / latBands;
    const sinTheta = Math.sin(theta), cosTheta = Math.cos(theta);
    for (let lon = 0; lon <= longBands; lon++) {
      const phi = (lon * 2 * Math.PI) / longBands;
      const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi);
      const x = cosPhi * sinTheta, y = cosTheta, z = sinPhi * sinTheta;
      positions.push(radius * x, radius * y, radius * z);
      normals.push(x, y, z);
      uvs.push(lon / longBands, lat / latBands);
    }
  }
  const indices = [];
  for (let lat = 0; lat < latBands; lat++) {
    for (let lon = 0; lon < longBands; lon++) {
      const first = lat * (longBands + 1) + lon;
      const second = first + longBands + 1;
      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }
  return buildGeometry(positions, normals, uvs, indices);
}

function createTorus(R = 0.6, r = 0.25, majorSeg = 48, minorSeg = 24) {
  const positions = [], normals = [], uvs = [];
  for (let i = 0; i <= majorSeg; i++) {
    const u = (i / majorSeg) * 2 * Math.PI;
    const cosU = Math.cos(u), sinU = Math.sin(u);
    for (let j = 0; j <= minorSeg; j++) {
      const v = (j / minorSeg) * 2 * Math.PI;
      const cosV = Math.cos(v), sinV = Math.sin(v);
      positions.push((R + r * cosV) * cosU, (R + r * cosV) * sinU, r * sinV);
      normals.push(cosV * cosU, cosV * sinU, sinV);
      uvs.push(i / majorSeg, j / minorSeg);
    }
  }
  const indices = [];
  for (let i = 0; i < majorSeg; i++) {
    for (let j = 0; j < minorSeg; j++) {
      const a = i * (minorSeg + 1) + j;
      const b = a + minorSeg + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }
  return buildGeometry(positions, normals, uvs, indices);
}

function createTorusKnot(p = 2, q = 3, radius = 0.6, tube = 0.22, tubularSeg = 128, radialSeg = 16) {
  const positions = [], normals = [], uvs = [];
  const P = (t) => {
    const cu = Math.cos(t * p), su = Math.sin(t * p);
    const quOverP = q / p;
    const cs = Math.cos(t * quOverP);
    return [
      radius * (2 + cs) * 0.5 * cu,
      radius * (2 + cs) * su * 0.5,
      radius * Math.sin(t * quOverP) * 0.5
    ];
  };
  for (let i = 0; i <= tubularSeg; i++) {
    const u = (i / tubularSeg) * 2 * Math.PI * p;
    const pos = P(u);
    const eps = 0.001;
    const pos2 = P(u + eps);
    const T = [pos2[0]-pos[0], pos2[1]-pos[1], pos2[2]-pos[2]];
    const lenT = Math.hypot(...T);
    T[0]/=lenT; T[1]/=lenT; T[2]/=lenT;
    const N = [T[1], -T[0], 0];
    const lenN = Math.hypot(...N) || 1;
    N[0]/=lenN; N[1]/=lenN; N[2]/=lenN;
    const B = [
      T[1]*N[2] - T[2]*N[1],
      T[2]*N[0] - T[0]*N[2],
      T[0]*N[1] - T[1]*N[0]
    ];
    for (let j = 0; j <= radialSeg; j++) {
      const v = (j / radialSeg) * 2 * Math.PI;
      const cx = -tube * Math.cos(v), cy = tube * Math.sin(v);
      const x = pos[0] + cx * N[0] + cy * B[0];
      const y = pos[1] + cx * N[1] + cy * B[1];
      const z = pos[2] + cx * N[2] + cy * B[2];
      positions.push(x, y, z);
      const nx = x - pos[0], ny = y - pos[1], nz = z - pos[2];
      const len = Math.hypot(nx, ny, nz) || 1;
      normals.push(nx/len, ny/len, nz/len);
      uvs.push(i / tubularSeg, j / radialSeg);
    }
  }
  const indices = [];
  for (let i = 0; i < tubularSeg; i++) {
    for (let j = 0; j < radialSeg; j++) {
      const a = i * (radialSeg + 1) + j;
      const b = a + radialSeg + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }
  return buildGeometry(positions, normals, uvs, indices);
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
    normals: new Float32Array(n),
    uvs: new Float32Array(uv),
    vertexCount: indices.length
  };
}

// ==================== 3. SHADERS ====================
const vsSource = `#version 300 es
in vec3 a_position;
in vec3 a_normal;
in vec2 a_texCoord;
uniform mat4 u_model, u_view, u_projection;
uniform mat3 u_normalMatrix;
uniform float u_uvScale;
out vec3 v_worldPosition, v_normal;
out vec2 v_texCoord;
void main() {
  vec4 wp = u_model * vec4(a_position, 1.0);
  v_worldPosition = wp.xyz;
  v_normal = u_normalMatrix * a_normal;
  v_texCoord = a_texCoord * u_uvScale;
  gl_Position = u_projection * u_view * wp;
}`;

const fsSource = `#version 300 es
precision highp float;
in vec3 v_worldPosition, v_normal;
in vec2 v_texCoord;
uniform vec3 u_lightPosition, u_lightColor, u_cameraPosition;
uniform float u_ambientStrength, u_shininess;
uniform float u_useAmbient, u_useDiffuse, u_useSpecular;
uniform float u_flatShading;
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
  if (diff > 0.0) spec = pow(max(dot(R, V), 0.0), u_shininess);
  vec3 texColor = texture(u_texture, v_texCoord).rgb;
  vec3 ambient = u_useAmbient * u_ambientStrength * texColor;
  vec3 diffuse = u_useDiffuse * diff * u_lightColor * texColor;
  vec3 specular = u_useSpecular * spec * u_lightColor;
  outColor = vec4(ambient + diffuse + specular, 1.0);
}`;

// ==================== 4. COMPILE & LINK ====================
function createShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
const prog = gl.createProgram();
gl.attachShader(prog, createShader(gl, gl.VERTEX_SHADER, vsSource));
gl.attachShader(prog, createShader(gl, gl.FRAGMENT_SHADER, fsSource));
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
gl.useProgram(prog);

// ==================== 5. LOCATIONS ====================
const loc = {
  pos: gl.getAttribLocation(prog, "a_position"),
  norm: gl.getAttribLocation(prog, "a_normal"),
  uv: gl.getAttribLocation(prog, "a_texCoord"),
  model: gl.getUniformLocation(prog, "u_model"),
  view: gl.getUniformLocation(prog, "u_view"),
  proj: gl.getUniformLocation(prog, "u_projection"),
  normMat: gl.getUniformLocation(prog, "u_normalMatrix"),
  lightPos: gl.getUniformLocation(prog, "u_lightPosition"),
  lightCol: gl.getUniformLocation(prog, "u_lightColor"),
  camPos: gl.getUniformLocation(prog, "u_cameraPosition"),
  amb: gl.getUniformLocation(prog, "u_ambientStrength"),
  shin: gl.getUniformLocation(prog, "u_shininess"),
  tex: gl.getUniformLocation(prog, "u_texture"),
  uvScale: gl.getUniformLocation(prog, "u_uvScale"),
  useAmb: gl.getUniformLocation(prog, "u_useAmbient"),
  useDiff: gl.getUniformLocation(prog, "u_useDiffuse"),
  useSpec: gl.getUniformLocation(prog, "u_useSpecular"),
  flatShading: gl.getUniformLocation(prog, "u_flatShading"),
};

// ==================== 6. GEOMETRY MANAGEMENT ====================
let currentGeometry = null;
let positionBuffer, normalBuffer, uvBuffer;

function updateGeometry(shapeName) {
  let geo;
  switch (shapeName) {
    case "sphere": geo = createSphere(); break;
    case "torus": geo = createTorus(); break;
    case "torusKnot": geo = createTorusKnot(); break;
    default: geo = createCube(); break;
  }
  currentGeometry = geo;

  if (!positionBuffer) {
    positionBuffer = gl.createBuffer();
    normalBuffer = gl.createBuffer();
    uvBuffer = gl.createBuffer();
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, geo.positions, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, geo.normals, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, geo.uvs, gl.STATIC_DRAW);
}

function setupAttr(buf, location, size) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}

// ==================== 7. TEXTURES ====================
function createCheckerTexture() {
  const size = 64, cells = 8, cellSize = size / cells;
  const src = document.createElement("canvas");
  src.width = src.height = size;
  const ctx = src.getContext("2d");
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#f8fafc" : "#0ea5e9";
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  gl.generateMipmap(gl.TEXTURE_2D);
  return tex;
}

function createImageTexture() {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([180, 20, 20, 255]));

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
    console.warn("[Texture] ./assets/texture.png tidak ditemukan → pakai fallback.");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0.00, "#ff0099");
    grad.addColorStop(0.33, "#ffcc00");
    grad.addColorStop(0.66, "#00ffcc");
    grad.addColorStop(1.00, "#0066ff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 2;
    const g = 256 / 8;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo(i*g, 0); ctx.lineTo(i*g, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i*g); ctx.lineTo(256, i*g); ctx.stroke();
    }
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px monospace";
    ctx.fillText("U →", 10, 30);
    ctx.fillText("V ↓", 10, 250);

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    applyTextureParams(tex);
  };
  img.src = "./assets/texture.png";

  return tex;
}

const checkerTexture = createCheckerTexture();
const imageTexture = createImageTexture();

gl.activeTexture(gl.TEXTURE0);
gl.uniform1i(loc.tex, 0);

// ==================== 8. STATE ====================
const state = {
  shape: "cube",
  rotX: 20, rotY: 30,
  scaleX: 1, scaleY: 1, scaleZ: 1,
  shading: "FLAT",
  textureSource: "checker",
  filter: "LINEAR",
  wrap: "REPEAT",
  uvScale: 1.0,
  ambient: 0.18,
  shininess: 32.0,
  useAmbient: true,
  useDiffuse: true,
  useSpecular: true,
  isRotating: true,
  isLightOrbit: false,
  isCameraOrbit: false,
  isNonUniformScale: false,  // [CHALLENGE D]
  lightPos: [2, 2, 2],
  lightColor: [1, 1, 1],
};

const camera = {
  pos: [0, 1.4, 4.0],
  target: [0, 0, 0],
  up: [0, 1, 0],
  orbitAngle: 0,
};

// ==================== 9. TEXTURE PARAM HELPERS ====================
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

// ==================== 10. UI BINDINGS ====================
const $ = id => document.getElementById(id);

$("shapeSelect").addEventListener("change", e => {
  state.shape = e.target.value;
  updateGeometry(state.shape);
});

$("ambientSlider").addEventListener("input", e => {
  state.ambient = parseFloat(e.target.value);
  $("ambientVal").textContent = state.ambient.toFixed(2);
});

$("shininessSlider").addEventListener("input", e => {
  state.shininess = parseFloat(e.target.value);
  $("shininessVal").textContent = state.shininess.toFixed(0);
});

["X", "Y", "Z"].forEach(axis => {
  $(`light${axis}`).addEventListener("input", e => {
    const val = parseFloat(e.target.value);
    state.lightPos[axis === "X" ? 0 : axis === "Y" ? 1 : 2] = val;
    $(`light${axis}Val`).textContent = val.toFixed(1);
  });
});

["X", "Y", "Z"].forEach(axis => {
  $(`scale${axis}`).addEventListener("input", e => {
    const val = parseFloat(e.target.value);
    state[`scale${axis}`] = val;
    $(`scale${axis}Val`).textContent = val.toFixed(1);
  });
});

$("textureSelect").addEventListener("change", e => state.textureSource = e.target.value);

$("filterSelect").addEventListener("change", e => {
  state.filter = e.target.value;
  applyTextureSettings();
});

$("wrapSelect").addEventListener("change", e => {
  state.wrap = e.target.value;
  applyTextureSettings();
});

$("chkAmbient").addEventListener("change",  e => state.useAmbient  = e.target.checked);
$("chkDiffuse").addEventListener("change",  e => state.useDiffuse  = e.target.checked);
$("chkSpecular").addEventListener("change", e => state.useSpecular = e.target.checked);

function setToggle(btnId, isActive) {
  const btn = $(btnId);
  if (!btn) return;
  btn.classList.toggle("active", isActive);
}

$("btnFlatSmooth").addEventListener("click", () => {
  state.shading = state.shading === "FLAT" ? "SMOOTH" : "FLAT";
  setToggle("btnFlatSmooth", state.shading === "SMOOTH");
});

$("btnTexture").addEventListener("click", () => {
  $("btnTexture").classList.toggle("active");
});

$("btnLightOrbit").addEventListener("click", () => {
  state.isLightOrbit = !state.isLightOrbit;
  setToggle("btnLightOrbit", state.isLightOrbit);
});

$("btnCameraOrbit").addEventListener("click", () => {
  state.isCameraOrbit = !state.isCameraOrbit;
  setToggle("btnCameraOrbit", state.isCameraOrbit);
});

$("btnStopRotation").addEventListener("click", () => {
  state.isRotating = !state.isRotating;
  updateRotationButton();
});

$("btnReset").addEventListener("click", resetScene);

function updateRotationButton() {
  const btn = $("btnStopRotation");
  const label = btn.querySelector(".btn-label");
  if (label) label.textContent = state.isRotating ? "Stop Object Rotation (P)" : "Start Object Rotation (P)";
  setToggle("btnStopRotation", state.isRotating);
}

// ==================== 11. KEYBOARD ====================
const keys = {};
window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.startsWith("Arrow")) e.preventDefault();
});
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

window.addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  if (e.repeat) return;

  if (k === "f") {
    state.shading = state.shading === "FLAT" ? "SMOOTH" : "FLAT";
    setToggle("btnFlatSmooth", state.shading === "SMOOTH");
  }
  if (k === "t") {
    $("btnTexture").classList.toggle("active");
  }
  if (k === "g") {
    state.wrap = state.wrap === "REPEAT" ? "CLAMP_TO_EDGE" : "REPEAT";
    $("wrapSelect").value = state.wrap;
    applyTextureSettings();
  }
  if (k === "r") resetScene();
  if (k === "l") {
    state.isLightOrbit = !state.isLightOrbit;
    setToggle("btnLightOrbit", state.isLightOrbit);
  }
  if (k === "p") {
    state.isRotating = !state.isRotating;
    updateRotationButton();
  }

  // [CHALLENGE D] N — toggle non-uniform scale
  if (k === "n") {
    state.isNonUniformScale = !state.isNonUniformScale;
    if (state.isNonUniformScale) {
      state.scaleX = 1.8; state.scaleY = 0.6; state.scaleZ = 1.0;
    } else {
      state.scaleX = 1.0; state.scaleY = 1.0; state.scaleZ = 1.0;
    }
    // sinkronkan ke slider
    $("scaleX").value = state.scaleX; $("scaleXVal").textContent = state.scaleX.toFixed(1);
    $("scaleY").value = state.scaleY; $("scaleYVal").textContent = state.scaleY.toFixed(1);
    $("scaleZ").value = state.scaleZ; $("scaleZVal").textContent = state.scaleZ.toFixed(1);
  }
});

// ==================== 12. RESET ====================
function resetScene() {
  state.lightPos = [2, 2, 2];
  state.shininess = 32.0;
  state.uvScale = 1.0;
  state.shading = "FLAT";
  state.filter = "LINEAR";
  state.wrap = "REPEAT";
  state.textureSource = "checker";
  state.scaleX = 1.0; state.scaleY = 1.0; state.scaleZ = 1.0;
  state.useAmbient = state.useDiffuse = state.useSpecular = true;
  state.isRotating = true;
  state.isLightOrbit = false;
  state.isCameraOrbit = false;
  state.isNonUniformScale = false;

  // reset camera juga
  camera.pos = [0, 1.4, 4.0];
  camera.orbitAngle = 0;

  $("lightX").value = 2; $("lightXVal").textContent = "2.0";
  $("lightY").value = 2; $("lightYVal").textContent = "2.0";
  $("lightZ").value = 2; $("lightZVal").textContent = "2.0";
  $("shininessSlider").value = 32; $("shininessVal").textContent = "32";
  $("ambientSlider").value = 0.18; $("ambientVal").textContent = "0.18";
  $("scaleX").value = 1; $("scaleXVal").textContent = "1.0";
  $("scaleY").value = 1; $("scaleYVal").textContent = "1.0";
  $("scaleZ").value = 1; $("scaleZVal").textContent = "1.0";
  $("chkAmbient").checked = true;
  $("chkDiffuse").checked = true;
  $("chkSpecular").checked = true;
  $("filterSelect").value = "LINEAR";
  $("wrapSelect").value = "REPEAT";
  $("textureSelect").value = "checker";
  $("shapeSelect").value = "cube";
  state.shape = "cube";
  updateGeometry("cube");

  setToggle("btnFlatSmooth", false);
  setToggle("btnTexture", false);
  setToggle("btnLightOrbit", false);
  setToggle("btnCameraOrbit", false);
  updateRotationButton();

  applyTextureSettings();
}

// ==================== 13. UPDATE ====================
function update(dt) {
  if (state.isRotating) {
    state.rotX += 20.0 * dt;
    state.rotY += 35.0 * dt;
  }

  // ---- Light Orbit [CHALLENGE E] ----
  if (state.isLightOrbit) {
    const t = performance.now() * 0.001;
    state.lightPos[0] = Math.cos(t) * 3.0;
    state.lightPos[2] = Math.sin(t) * 3.0;
    $("lightX").value = state.lightPos[0];
    $("lightXVal").textContent = state.lightPos[0].toFixed(1);
    $("lightZ").value = state.lightPos[2];
    $("lightZVal").textContent = state.lightPos[2].toFixed(1);
  }

  // ---- Camera Orbit (auto) ----
  if (state.isCameraOrbit) {
    camera.orbitAngle += 0.5 * dt;
    camera.pos[0] = Math.cos(camera.orbitAngle) * 4.0;
    camera.pos[2] = Math.sin(camera.orbitAngle) * 4.0;
  }

  // ---- [CHALLENGE C] Camera Control manual via Q / E ----
  const camSpeed = 2.0;
  if (!state.isCameraOrbit) {
    if (keys["q"]) {
      camera.pos[0] -= camSpeed * dt;
    }
    if (keys["e"]) {
      camera.pos[0] += camSpeed * dt;
    }
    // clamp biar tidak terlalu jauh
    camera.pos[0] = Math.max(-6, Math.min(6, camera.pos[0]));
  }

  // ---- [CHALLENGE B] Ambient Control manual via A / Z ----
  const ambSpeed = 0.5;
  if (keys["a"]) {
    state.ambient = Math.max(0, state.ambient - ambSpeed * dt);
    $("ambientSlider").value = state.ambient;
    $("ambientVal").textContent = state.ambient.toFixed(2);
  }
  if (keys["z"]) {
    state.ambient = Math.min(1, state.ambient + ambSpeed * dt);
    $("ambientSlider").value = state.ambient;
    $("ambientVal").textContent = state.ambient.toFixed(2);
  }

  // ---- Keyboard Light control (manual) ----
  const speed = 2.0;
  if (!state.isLightOrbit) {
    if (keys["arrowleft"])  { state.lightPos[0] -= speed * dt; $("lightX").value = state.lightPos[0]; $("lightXVal").textContent = state.lightPos[0].toFixed(1); }
    if (keys["arrowright"]) { state.lightPos[0] += speed * dt; $("lightX").value = state.lightPos[0]; $("lightXVal").textContent = state.lightPos[0].toFixed(1); }
    if (keys["arrowup"])    { state.lightPos[1] += speed * dt; $("lightY").value = state.lightPos[1]; $("lightYVal").textContent = state.lightPos[1].toFixed(1); }
    if (keys["arrowdown"])  { state.lightPos[1] -= speed * dt; $("lightY").value = state.lightPos[1]; $("lightYVal").textContent = state.lightPos[1].toFixed(1); }
    if (keys["w"])          { state.lightPos[2] -= speed * dt; $("lightZ").value = state.lightPos[2]; $("lightZVal").textContent = state.lightPos[2].toFixed(1); }
    if (keys["s"])          { state.lightPos[2] += speed * dt; $("lightZ").value = state.lightPos[2]; $("lightZVal").textContent = state.lightPos[2].toFixed(1); }
  }

  if (keys["["]) state.uvScale = Math.max(0.25, state.uvScale - 1.5 * dt);
  if (keys["]"]) state.uvScale = Math.min(5.0, state.uvScale + 1.5 * dt);

  if (keys["-"] || keys["_"]) state.shininess = Math.max(2, state.shininess - 50 * dt);
  if (keys["+"] || keys["="]) state.shininess = Math.min(128, state.shininess + 50 * dt);
}

// ==================== 14. DRAW ====================
function draw() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(prog);

  if (!currentGeometry) updateGeometry(state.shape);

  setupAttr(positionBuffer, loc.pos, 3);
  setupAttr(uvBuffer, loc.uv, 2);
  setupAttr(normalBuffer, loc.norm, 3);

  const rx = Mat4.rotationX(degToRad(state.rotX));
  const ry = Mat4.rotationY(degToRad(state.rotY));
  const s  = Mat4.scaling(state.scaleX, state.scaleY, state.scaleZ);
  let model = Mat4.identity();
  model = Mat4.multiply(model, s);
  model = Mat4.multiply(model, rx);
  model = Mat4.multiply(model, ry);

  const view = Mat4.lookAt(camera.pos, camera.target, camera.up);
  const proj = Mat4.perspective(degToRad(60), canvas.width / canvas.height, 0.1, 100.0);
  const normMat = normalMatrixFromMat4(model);

  gl.uniformMatrix4fv(loc.model, false, model);
  gl.uniformMatrix4fv(loc.view, false, view);
  gl.uniformMatrix4fv(loc.proj, false, proj);
  gl.uniformMatrix3fv(loc.normMat, false, normMat);
  gl.uniform3fv(loc.lightPos, state.lightPos);
  gl.uniform3fv(loc.lightCol, state.lightColor);
  gl.uniform3fv(loc.camPos, camera.pos);
  gl.uniform1f(loc.amb, state.ambient);
  gl.uniform1f(loc.shin, state.shininess);
  gl.uniform1f(loc.uvScale, state.uvScale);
  gl.uniform1f(loc.useAmb, state.useAmbient ? 1.0 : 0.0);
  gl.uniform1f(loc.useDiff, state.useDiffuse ? 1.0 : 0.0);
  gl.uniform1f(loc.useSpec, state.useSpecular ? 1.0 : 0.0);
  gl.uniform1f(loc.flatShading, state.shading === "FLAT" ? 1.0 : 0.0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, getActiveTexture());
  gl.uniform1i(loc.tex, 0);

  gl.drawArrays(gl.TRIANGLES, 0, currentGeometry.vertexCount);
}

// ==================== 15. HUD ====================
function updateHUD() {
  $("hudShading").textContent   = state.shading;
  $("hudFiltering").textContent = state.filter;
  $("hudWrapping").textContent  = state.wrap;
  $("hudLight").textContent     = `(${state.lightPos[0].toFixed(2)}, ${state.lightPos[1].toFixed(2)}, ${state.lightPos[2].toFixed(2)})`;
  $("hudTexture").textContent   = state.textureSource === "image" ? "IMAGE" : "CHECKER";
  $("hudCamera").textContent    = state.isCameraOrbit ? "ORBIT ON" : "ORBIT OFF";

  const badge = $("statusBadge");
  if (state.isRotating || state.isLightOrbit || state.isCameraOrbit) {
    badge.textContent = "● RUNNING";
    badge.style.opacity = "1";
  } else {
    badge.textContent = "● PAUSED";
    badge.style.opacity = "0.6";
  }
}

// ==================== 16. MAIN LOOP ====================
let lastTime = 0;
function render(time) {
  let dt = (time - lastTime) * 0.001;
  lastTime = time;
  dt = Math.min(dt, 0.05);

  update(dt);
  draw();
  updateHUD();

  requestAnimationFrame(render);
}

// ==================== 17. INIT ====================
updateGeometry("cube");
applyTextureSettings();
updateRotationButton();
requestAnimationFrame(render);
