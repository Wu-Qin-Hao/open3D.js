class d {
  constructor(e) {
    if (this.geometries = [], this.canvas = e, this.gl = e.getContext("webgl2"), !this.gl)
      throw new Error("WebGL2 not supported");
  }
  addGeometry(e) {
    this.geometries.push(e);
  }
  render() {
    const e = this.gl;
    e.clearColor(0, 0, 0, 1), e.clear(e.COLOR_BUFFER_BIT | e.DEPTH_BUFFER_BIT);
    for (const r of this.geometries)
      r.render(e);
  }
  setSize(e, r) {
    this.canvas.width = e, this.canvas.height = r, this.gl.viewport(0, 0, e, r);
  }
}
class a {
  constructor(e, r, o) {
    this.x = e, this.y = r, this.z = o;
  }
  toArray() {
    return [this.x, this.y, this.z];
  }
  static fromArray(e) {
    return new a(e[0], e[1], e[2]);
  }
}
class h {
  constructor(e, r) {
    this.vertexBuffer = null, this.vertices = e, this.shader = r;
  }
  init(e) {
    this.vertexBuffer = e.createBuffer(), e.bindBuffer(e.ARRAY_BUFFER, this.vertexBuffer), e.bufferData(e.ARRAY_BUFFER, this.vertices, e.STATIC_DRAW);
  }
  render(e) {
    this.vertexBuffer || this.init(e), this.shader.use(e), e.bindBuffer(e.ARRAY_BUFFER, this.vertexBuffer);
    const r = e.getAttribLocation(this.shader.program, "aPosition");
    e.enableVertexAttribArray(r), e.vertexAttribPointer(r, 3, e.FLOAT, !1, 0, 0), this.draw(e);
  }
  draw(e) {
    throw new Error("Method not implemented.");
  }
}
class m extends h {
  constructor(e, r, o = 5) {
    super(e, r), this.pointSize = o;
  }
  render(e) {
    super.render(e), e.uniform1f(e.getUniformLocation(this.shader.program, "uPointSize"), this.pointSize);
  }
  draw(e) {
    e.drawArrays(e.POINTS, 0, this.vertices.length / 3);
  }
  setPointSize(e) {
    this.pointSize = e;
  }
}
class c {
  constructor(e, r, o) {
    const t = this.createShader(e, e.VERTEX_SHADER, r), s = this.createShader(e, e.FRAGMENT_SHADER, o);
    if (this.program = e.createProgram(), e.attachShader(this.program, t), e.attachShader(this.program, s), e.linkProgram(this.program), !e.getProgramParameter(this.program, e.LINK_STATUS)) {
      const n = e.getProgramInfoLog(this.program);
      throw e.deleteProgram(this.program), e.deleteShader(s), e.deleteShader(t), new Error(`Could not compile WebGL program. 
${n}`);
    }
  }
  createShader(e, r, o) {
    const t = e.createShader(r);
    if (e.shaderSource(t, o), e.compileShader(t), !e.getShaderParameter(t, e.COMPILE_STATUS)) {
      const s = e.getShaderInfoLog(t);
      throw e.deleteShader(t), new Error(`Could not compile shader. 
${s}`);
    }
    return t;
  }
  use(e) {
    e.useProgram(this.program);
  }
}
function f(i) {
  const e = `
    attribute vec3 aPosition;
    uniform float uPointSize;
    
    void main() {
      gl_Position = vec4(aPosition, 1.0);
      gl_PointSize = uPointSize;
    }
  `, r = `
    void main() {
      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
  `;
  return new c(i, e, r);
}
export {
  h as Geometry,
  a as Point,
  m as PointGeometry,
  d as Renderer,
  c as Shader,
  f as createPointShader
};
