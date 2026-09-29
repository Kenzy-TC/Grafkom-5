import { Mat4, normalMatrixFromMat4, degToRad } from "./math3d.js";

// --- 1. SETUP WEBGL ---
const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");
if (!gl) throw new Error("WebGL2 tidak tersedia.");
gl.enable(gl.DEPTH_TEST);

// --- 2. GEOMETRY DATA ---
const positions = new Float32Array([
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

const flatNormals = new Float32Array([
  0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1,
  0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
  -1,0,0, -1,0,0, -1,0,0, -1,0,0, -1,0,0, -1,0,0,
  1,0,0, 1,0,0, 1,0,0, 1,0,0, 1,0,0, 1,0,0,
  0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,1,0,
  0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
]);

function createSmoothNormals(pos) {
  const n = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], y = pos[i+1], z = pos[i+2];
    const len = Math.hypot(x, y, z);
    n[i] = x/len; n[i+1] = y/len; n[i+2] = z/len;
  }
  return n;
}
const smoothNormals = createSmoothNormals(positions);

function createCubeUVs() {
  const faceUV = [0,0, 1,0, 1,1, 0,0, 1,1, 0,1];
  const uv = [];
  for (let i = 0; i < 6; i++) uv.push(...faceUV);
  return new Float32Array(uv);
}
const texCoords = createCubeUVs();

// --- 3. SHADERS ---
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
uniform sampler2D u_texture;
out vec4 outColor;
void main() {
  vec3 N = normalize(v_normal);
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

// --- 4. COMPILE & LINK ---
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

// --- 5. LOCATIONS & BUFFERS ---
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
};

function createBuf(data) {
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return b;
}
const bufPos = createBuf(positions);
const bufFlat = createBuf(flatNormals);
const bufSmooth = createBuf(smoothNormals);
const bufUV = createBuf(texCoords);

function setupAttr(buf, location, size) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}

// --- 6. TEXTURE ---
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
const texture = createCheckerTexture();
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.uniform1i(loc.tex, 0);

// --- 7. STATE ---
const state = {
  rotX: 20, rotY: 30,
  scaleX: 1, scaleY: 1, scaleZ: 1,
  shading: "FLAT",
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
  lightPos: [2, 2, 2],
  lightColor: [1, 1, 1],
};

const camera = {
  pos: [0, 1.4, 4.0],
  target: [0, 0, 0],
  up: [0, 1, 0],
  orbitAngle: 0,
};

// --- 8. UI BINDINGS ---
const $ = id => document.getElementById(id);

// Sliders
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

// Dropdowns
$("filterSelect").addEventListener("change", e => {
  state.filter = e.target.value;
  applyFiltering();
});
$("wrapSelect").addEventListener("change", e => {
  state.wrap = e.target.value;
  applyWrapping();
});

// Checkboxes
$("chkAmbient").addEventListener("change", e => state.useAmbient = e.target.checked);
$("chkDiffuse").addEventListener("change", e => state.useDiffuse = e.target.checked);
$("chkSpecular").addEventListener("change", e => state.useSpecular = e.target.checked);

// Buttons
$("btnFlatSmooth").addEventListener("click", () => {
  state.shading = state.shading === "FLAT" ? "SMOOTH" : "FLAT";
});
$("btnTexture").addEventListener("click", () => {
  // Placeholder untuk ganti texture jika ada
});
$("btnLightOrbit").addEventListener("click", () => {
  state.isLightOrbit = !state.isLightOrbit;
});
$("btnCameraOrbit").addEventListener("click", () => {
  state.isCameraOrbit = !state.isCameraOrbit;
});
$("btnStopRotation").addEventListener("click", () => {
  state.isRotating = !state.isRotating;
  $("btnStopRotation").textContent = state.isRotating ? "Stop Object Rotation (P)" : "Start Object Rotation (P)";
});
$("btnReset").addEventListener("click", resetScene);

// Keyboard
const keys = {};
window.addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (e.key.startsWith("Arrow")) e.preventDefault();
});
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

window.addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  if (e.repeat) return;
  if (k === "f") state.shading = state.shading === "FLAT" ? "SMOOTH" : "FLAT";
  if (k === "t") state.filter = state.filter === "LINEAR" ? "NEAREST" : "LINEAR";
  if (k === "g") {
    const modes = ["REPEAT", "CLAMP_TO_EDGE", "MIRRORED_REPEAT"];
    state.wrap = modes[(modes.indexOf(state.wrap) + 1) % modes.length];
  }
  if (k === "r") resetScene();
  if (k === "l") state.isLightOrbit = !state.isLightOrbit;
  if (k === "p") {
    state.isRotating = !state.isRotating;
    $("btnStopRotation").textContent = state.isRotating ? "Stop Object Rotation (P)" : "Start Object Rotation (P)";
  }
});

// --- 9. TEXTURE PARAMETERS ---
function applyFiltering() {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  const mode = state.filter === "NEAREST" ? gl.NEAREST : gl.LINEAR;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mode);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mode);
}

function applyWrapping() {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  let mode = gl.REPEAT;
  if (state.wrap === "CLAMP_TO_EDGE") mode = gl.CLAMP_TO_EDGE;
  if (state.wrap === "MIRRORED_REPEAT") mode = gl.MIRRORED_REPEAT;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, mode);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, mode);
}

// --- 10. UPDATE LOGIC ---
function resetScene() {
  state.lightPos = [2, 2, 2];
  state.shininess = 32.0;
  state.uvScale = 1.0;
  state.shading = "FLAT";
  state.filter = "LINEAR";
  state.wrap = "REPEAT";
  state.scaleX = 1.0; state.scaleY = 1.0; state.scaleZ = 1.0;
  state.useAmbient = true; state.useDiffuse = true; state.useSpecular = true;
  state.isRotating = true;
  
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
  $("btnStopRotation").textContent = "Stop Object Rotation (P)";

  applyFiltering();
  applyWrapping();
}

function update(dt) {
  if (state.isRotating) {
    state.rotX += 20.0 * dt;
    state.rotY += 35.0 * dt;
  }

  // Light Orbit
  if (state.isLightOrbit) {
    const t = performance.now() * 0.001;
    state.lightPos[0] = Math.cos(t) * 3.0;
    state.lightPos[2] = Math.sin(t) * 3.0;
    $("lightX").value = state.lightPos[0];
    $("lightXVal").textContent = state.lightPos[0].toFixed(1);
    $("lightZ").value = state.lightPos[2];
    $("lightZVal").textContent = state.lightPos[2].toFixed(1);
  }

  // Camera Orbit
  if (state.isCameraOrbit) {
    camera.orbitAngle += 0.5 * dt;
    camera.pos[0] = Math.cos(camera.orbitAngle) * 4.0;
    camera.pos[2] = Math.sin(camera.orbitAngle) * 4.0;
  }

  // Keyboard Light Control (Manual override)
  const speed = 2.0;
  if (!state.isLightOrbit) {
    if (keys["arrowleft"])  { state.lightPos[0] -= speed * dt; $("lightX").value = state.lightPos[0]; $("lightXVal").textContent = state.lightPos[0].toFixed(1); }
    if (keys["arrowright"]) { state.lightPos[0] += speed * dt; $("lightX").value = state.lightPos[0]; $("lightXVal").textContent = state.lightPos[0].toFixed(1); }
    if (keys["arrowup"])    { state.lightPos[1] += speed * dt; $("lightY").value = state.lightPos[1]; $("lightYVal").textContent = state.lightPos[1].toFixed(1); }
    if (keys["arrowdown"])  { state.lightPos[1] -= speed * dt; $("lightY").value = state.lightPos[1]; $("lightYVal").textContent = state.lightPos[1].toFixed(1); }
    if (keys["w"])          { state.lightPos[2] -= speed * dt; $("lightZ").value = state.lightPos[2]; $("lightZVal").textContent = state.lightPos[2].toFixed(1); }
    if (keys["s"])          { state.lightPos[2] += speed * dt; $("lightZ").value = state.lightPos[2]; $("lightZVal").textContent = state.lightPos[2].toFixed(1); }
  }

  // UV Scale (Keyboard only)
  if (keys["["]) state.uvScale = Math.max(0.25, state.uvScale - 1.5 * dt);
  if (keys["]"]) state.uvScale = Math.min(5.0, state.uvScale + 1.5 * dt);

  // Shininess (Keyboard only)
  if (keys["-"] || keys["_"]) state.shininess = Math.max(2, state.shininess - 50 * dt);
  if (keys["+"] || keys["="]) state.shininess = Math.min(128, state.shininess + 50 * dt);
}

// --- 11. DRAW ---
function draw() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.025, 0.04, 0.08, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(prog);

  setupAttr(bufPos, loc.pos, 3);
  setupAttr(bufUV, loc.uv, 2);
  setupAttr(state.shading === "FLAT" ? bufFlat : bufSmooth, loc.norm, 3);

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

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(loc.tex, 0);

  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

// --- 12. HUD UPDATE ---
function updateHUD() {
  $("hudShading").textContent = state.shading;
  $("hudFiltering").textContent = state.filter;
  $("hudWrapping").textContent = state.wrap;
  $("hudLight").textContent = `(${state.lightPos[0].toFixed(2)}, ${state.lightPos[1].toFixed(2)}, ${state.lightPos[2].toFixed(2)})`;
  $("hudTexture").textContent = "CHECKER";
  $("hudCamera").textContent = state.isCameraOrbit ? "ORBIT ON" : "ORBIT OFF";
  
  // Update badge
  const badge = $("statusBadge");
  if (state.isRotating || state.isLightOrbit || state.isCameraOrbit) {
    badge.textContent = "RUNNING - LIGHTING ON";
    badge.style.opacity = "1";
  } else {
    badge.textContent = "PAUSED";
    badge.style.opacity = "0.6";
  }
}

// --- 13. MAIN LOOP ---
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

// --- 14. INIT ---
applyFiltering();
applyWrapping();
requestAnimationFrame(render);