class I {
  constructor(t = [0, 0, 5], i = [0, 0, 0], e = [0, 1, 0], o = 45, r = 1, a = 0.1, n = 1e3) {
    this.position = new Float32Array(t), this.target = new Float32Array(i), this.up = new Float32Array(e), this.fov = o, this.aspect = r, this.near = a, this.far = n, this.viewMatrix = new Float32Array(16), this.projectionMatrix = new Float32Array(16), this.modelMatrix = new Float32Array(16), this.mvpMatrix = new Float32Array(16), this.updateViewMatrix(), this.updateProjectionMatrix(), this.updateModelMatrix();
  }
  setPosition(t, i, e) {
    this.position[0] = t, this.position[1] = i, this.position[2] = e, this.updateViewMatrix();
  }
  setTarget(t, i, e) {
    this.target[0] = t, this.target[1] = i, this.target[2] = e, this.updateViewMatrix();
  }
  setAspect(t) {
    this.aspect = t, this.updateProjectionMatrix();
  }
  updateViewMatrix() {
    const [t, i, e] = this.position, [o, r, a] = this.target, [n, h, m] = this.up, s = o - t, d = r - i, l = a - e, u = Math.sqrt(s * s + d * d + l * l), c = s / u, M = d / u, p = l / u, A = M * m - p * h, S = p * n - c * m, P = c * h - M * n, g = Math.sqrt(A * A + S * S + P * P), f = A / g, v = S / g, w = P / g, y = v * p - w * M, C = w * c - f * p, B = f * M - v * c;
    this.viewMatrix[0] = f, this.viewMatrix[1] = y, this.viewMatrix[2] = -c, this.viewMatrix[3] = 0, this.viewMatrix[4] = v, this.viewMatrix[5] = C, this.viewMatrix[6] = -M, this.viewMatrix[7] = 0, this.viewMatrix[8] = w, this.viewMatrix[9] = B, this.viewMatrix[10] = -p, this.viewMatrix[11] = 0, this.viewMatrix[12] = -(f * t + v * i + w * e), this.viewMatrix[13] = -(y * t + C * i + B * e), this.viewMatrix[14] = c * t + M * i + p * e, this.viewMatrix[15] = 1;
  }
  updateProjectionMatrix() {
    const t = 1 / Math.tan(this.fov * Math.PI / 360), i = 1 / (this.near - this.far);
    this.projectionMatrix[0] = t / this.aspect, this.projectionMatrix[1] = 0, this.projectionMatrix[2] = 0, this.projectionMatrix[3] = 0, this.projectionMatrix[4] = 0, this.projectionMatrix[5] = t, this.projectionMatrix[6] = 0, this.projectionMatrix[7] = 0, this.projectionMatrix[8] = 0, this.projectionMatrix[9] = 0, this.projectionMatrix[10] = (this.near + this.far) * i, this.projectionMatrix[11] = -1, this.projectionMatrix[12] = 0, this.projectionMatrix[13] = 0, this.projectionMatrix[14] = this.near * this.far * i * 2, this.projectionMatrix[15] = 0;
  }
  updateModelMatrix() {
    this.modelMatrix[0] = 1, this.modelMatrix[1] = 0, this.modelMatrix[2] = 0, this.modelMatrix[3] = 0, this.modelMatrix[4] = 0, this.modelMatrix[5] = 1, this.modelMatrix[6] = 0, this.modelMatrix[7] = 0, this.modelMatrix[8] = 0, this.modelMatrix[9] = 0, this.modelMatrix[10] = 1, this.modelMatrix[11] = 0, this.modelMatrix[12] = 0, this.modelMatrix[13] = 0, this.modelMatrix[14] = 0, this.modelMatrix[15] = 1;
  }
  getViewMatrix() {
    return this.viewMatrix;
  }
  getProjectionMatrix() {
    return this.projectionMatrix;
  }
  getModelMatrix() {
    return this.modelMatrix;
  }
  getMVPMatrix() {
    this.multiplyMatrices(this.projectionMatrix, this.viewMatrix, this.mvpMatrix);
    const t = new Float32Array(16);
    return this.multiplyMatrices(this.mvpMatrix, this.modelMatrix, t), this.mvpMatrix.set(t), this.mvpMatrix;
  }
  getPosition() {
    return this.position;
  }
  multiplyMatrices(t, i, e) {
    const o = t[0], r = t[1], a = t[2], n = t[3], h = t[4], m = t[5], s = t[6], d = t[7], l = t[8], u = t[9], c = t[10], M = t[11], p = t[12], A = t[13], S = t[14], P = t[15], g = i[0], f = i[1], v = i[2], w = i[3];
    e[0] = g * o + f * h + v * l + w * p, e[1] = g * r + f * m + v * u + w * A, e[2] = g * a + f * s + v * c + w * S, e[3] = g * n + f * d + v * M + w * P;
    const y = i[4], C = i[5], B = i[6], F = i[7];
    e[4] = y * o + C * h + B * l + F * p, e[5] = y * r + C * m + B * u + F * A, e[6] = y * a + C * s + B * c + F * S, e[7] = y * n + C * d + B * M + F * P;
    const R = i[8], L = i[9], Y = i[10], E = i[11];
    e[8] = R * o + L * h + Y * l + E * p, e[9] = R * r + L * m + Y * u + E * A, e[10] = R * a + L * s + Y * c + E * S, e[11] = R * n + L * d + Y * M + E * P;
    const b = i[12], z = i[13], j = i[14], _ = i[15];
    e[12] = b * o + z * h + j * l + _ * p, e[13] = b * r + z * m + j * u + _ * A, e[14] = b * a + z * s + j * c + _ * S, e[15] = b * n + z * d + j * M + _ * P;
  }
}
class V {
  constructor(t) {
    if (this.geometries = [], this.canvas = t, this.gl = t.getContext("webgl2"), !this.gl)
      throw new Error("WebGL2 not supported");
    this.camera = new I(), this.camera.setAspect(t.width / t.height);
  }
  addGeometry(t) {
    this.geometries.push(t);
  }
  render() {
    const t = this.gl;
    t.clearColor(0, 0, 0, 1), t.clear(t.COLOR_BUFFER_BIT | t.DEPTH_BUFFER_BIT);
    for (const i of this.geometries)
      i.render(t, this.camera);
  }
  setSize(t, i) {
    this.canvas.width = t, this.canvas.height = i, this.gl.viewport(0, 0, t, i), this.camera.setAspect(t / i);
  }
  getCamera() {
    return this.camera;
  }
}
class X {
  constructor(t, i, e) {
    this.x = t, this.y = i, this.z = e;
  }
  toArray() {
    return [this.x, this.y, this.z];
  }
  static fromArray(t) {
    return new X(t[0], t[1], t[2]);
  }
}
class T {
  constructor(t, i, e) {
    this.colors = null, this.vertexBuffer = null, this.colorBuffer = null, this.vertices = t, this.shader = i, this.colors = e || null;
  }
  init(t) {
    this.vertexBuffer = t.createBuffer(), t.bindBuffer(t.ARRAY_BUFFER, this.vertexBuffer), t.bufferData(t.ARRAY_BUFFER, this.vertices, t.STATIC_DRAW), this.colors && (this.colorBuffer = t.createBuffer(), t.bindBuffer(t.ARRAY_BUFFER, this.colorBuffer), t.bufferData(t.ARRAY_BUFFER, this.colors, t.STATIC_DRAW));
  }
  render(t, i) {
    this.vertexBuffer || this.init(t), this.shader.use(t);
    const e = t.getUniformLocation(this.shader.program, "uMVP");
    t.uniformMatrix4fv(e, !1, i.getMVPMatrix()), t.bindBuffer(t.ARRAY_BUFFER, this.vertexBuffer);
    const o = t.getAttribLocation(
      this.shader.program,
      "aPosition"
    );
    if (t.enableVertexAttribArray(o), t.vertexAttribPointer(o, 3, t.FLOAT, !1, 0, 0), this.colors && this.colorBuffer) {
      t.bindBuffer(t.ARRAY_BUFFER, this.colorBuffer);
      const r = t.getAttribLocation(this.shader.program, "aColor");
      t.enableVertexAttribArray(r), t.vertexAttribPointer(r, 4, t.FLOAT, !1, 0, 0);
    }
    this.draw(t);
  }
  draw(t) {
    throw new Error("Method not implemented.");
  }
}
class U extends T {
  constructor(t, i, e = 5, o) {
    super(t, i, o), this.pointSize = e;
  }
  render(t) {
    super.render(t), t.uniform1f(
      t.getUniformLocation(this.shader.program, "uPointSize"),
      this.pointSize
    );
  }
  draw(t) {
    t.drawArrays(t.POINTS, 0, this.vertices.length / 3);
  }
  setPointSize(t) {
    this.pointSize = t;
  }
}
class W extends T {
  constructor(t, i, e = 1, o) {
    super(t, i, o), this.lineWidth = e;
  }
  render(t) {
    super.render(t), t.lineWidth(this.lineWidth);
  }
  draw(t) {
    t.drawArrays(t.LINE_STRIP, 0, this.vertices.length / 3);
  }
  setLineWidth(t) {
    this.lineWidth = t;
  }
}
class G extends T {
  constructor(t, i, e) {
    super(t, i, e);
  }
  draw(t) {
    t.drawArrays(t.TRIANGLES, 0, this.vertices.length / 3);
  }
}
class D {
  constructor(t, i, e) {
    const o = this.createShader(
      t,
      t.VERTEX_SHADER,
      i
    ), r = this.createShader(
      t,
      t.FRAGMENT_SHADER,
      e
    );
    if (this.program = t.createProgram(), t.attachShader(this.program, o), t.attachShader(this.program, r), t.linkProgram(this.program), !t.getProgramParameter(this.program, t.LINK_STATUS)) {
      const a = t.getProgramInfoLog(this.program);
      throw t.deleteProgram(this.program), t.deleteShader(r), t.deleteShader(o), new Error(`Could not compile WebGL program. 
${a}`);
    }
  }
  createShader(t, i, e) {
    const o = t.createShader(i);
    if (t.shaderSource(o, e), t.compileShader(o), !t.getShaderParameter(o, t.COMPILE_STATUS)) {
      const r = t.getShaderInfoLog(o);
      throw t.deleteShader(o), new Error(`Could not compile shader. 
${r}`);
    }
    return o;
  }
  use(t) {
    t.useProgram(this.program);
  }
}
function Z(x) {
  const t = `
    attribute vec3 aPosition;
    attribute vec4 aColor;
    uniform float uPointSize;
    uniform mat4 uMVP;
    varying vec4 vColor;
    
    void main() {
      gl_Position = uMVP * vec4(aPosition, 1.0);
      gl_PointSize = uPointSize;
      vColor = aColor;
    }
  `, i = `
    precision mediump float;
    varying vec4 vColor;
    void main() {
      gl_FragColor = vColor;
    }
  `;
  return new D(x, t, i);
}
function N(x) {
  const t = `
    attribute vec3 aPosition;
    attribute vec4 aColor;
    uniform mat4 uMVP;
    varying vec4 vColor;
    
    void main() {
      gl_Position = uMVP * vec4(aPosition, 1.0);
      vColor = aColor;
    }
  `, i = `
    precision mediump float;
    varying vec4 vColor;
    void main() {
      gl_FragColor = vColor;
    }
  `;
  return new D(x, t, i);
}
class O {
  constructor(t, i) {
    this.isDragging = !1, this.lastX = 0, this.lastY = 0, this.rotationSpeed = 0.01, this.zoomSpeed = 0.1, this.panSpeed = 0.01, this.camera = t, this.canvas = i, this.setupEventListeners();
  }
  setupEventListeners() {
    this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this)), this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this)), this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this)), this.canvas.addEventListener("wheel", this.onWheel.bind(this));
  }
  onMouseDown(t) {
    console.log("Mouse down:", t.clientX, t.clientY), this.isDragging = !0, this.lastX = t.clientX, this.lastY = t.clientY;
  }
  onMouseMove(t) {
    if (!this.isDragging) return;
    const i = t.clientX - this.lastX, e = t.clientY - this.lastY;
    console.log("Mouse move:", i, e), this.rotateCamera(i, e), this.lastX = t.clientX, this.lastY = t.clientY;
  }
  onMouseUp() {
    console.log("Mouse up"), this.isDragging = !1;
  }
  onWheel(t) {
    t.preventDefault(), console.log("Wheel:", t.deltaY), this.zoomCamera(t.deltaY);
  }
  rotateCamera(t, i) {
    const e = this.camera.getPosition(), o = [e[0], e[1], e[2]], r = [0, 0, 0];
    console.log("Before rotation - Camera position:", o);
    const a = o[0] - r[0], n = o[1] - r[1], h = o[2] - r[2], m = Math.sqrt(a * a + n * n + h * h);
    let s = Math.asin(n / m), d = Math.atan2(a, h);
    console.log("Before rotation - Pitch:", s, "Yaw:", d), d -= t * this.rotationSpeed, s -= i * this.rotationSpeed, console.log("After rotation - Pitch:", s, "Yaw:", d), s = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, s));
    const l = r[0] + m * Math.sin(d) * Math.cos(s), u = r[1] + m * Math.sin(s), c = r[2] + m * Math.cos(d) * Math.cos(s);
    console.log("After rotation - New camera position:", l, u, c), this.camera.setPosition(l, u, c);
  }
  zoomCamera(t) {
    const i = this.camera.getPosition(), e = [i[0], i[1], i[2]], o = [0, 0, 0];
    console.log("Before zoom - Camera position:", e);
    const r = e[0] - o[0], a = e[1] - o[1], n = e[2] - o[2], h = Math.sqrt(r * r + a * a + n * n);
    console.log("Before zoom - Distance:", h);
    const m = 1 - t * this.zoomSpeed * 0.01, s = Math.max(1, Math.min(100, h * m));
    console.log("After zoom - New distance:", s);
    const d = r / h, l = a / h, u = n / h, c = o[0] + d * s, M = o[1] + l * s, p = o[2] + u * s;
    console.log("After zoom - New camera position:", c, M, p), this.camera.setPosition(c, M, p);
  }
}
export {
  I as Camera,
  O as Controls,
  T as Geometry,
  W as LineGeometry,
  X as Point,
  U as PointGeometry,
  V as Renderer,
  D as Shader,
  G as TriangleGeometry,
  N as createColorShader,
  Z as createPointShader
};
