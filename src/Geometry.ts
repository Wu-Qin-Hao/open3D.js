import { Shader } from "./Shader";

export class Geometry {
  protected vertices: Float32Array;
  protected colors: Float32Array | null = null;
  protected vertexBuffer: WebGLBuffer | null = null;
  protected colorBuffer: WebGLBuffer | null = null;
  protected shader: Shader;

  constructor(vertices: Float32Array, shader: Shader, colors?: Float32Array) {
    this.vertices = vertices;
    this.shader = shader;
    this.colors = colors || null;
  }

  init(gl: WebGL2RenderingContext) {
    // 初始化顶点缓冲区
    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

    // 初始化颜色缓冲区
    if (this.colors) {
      this.colorBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.STATIC_DRAW);
    }
  }

  render(gl: WebGL2RenderingContext) {
    if (!this.vertexBuffer) {
      this.init(gl);
    }

    this.shader.use(gl);

    // 绑定顶点缓冲区
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    const positionLocation = gl.getAttribLocation(
      this.shader.program,
      "aPosition",
    );
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

    // 绑定颜色缓冲区
    if (this.colors && this.colorBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
      const colorLocation = gl.getAttribLocation(this.shader.program, "aColor");
      gl.enableVertexAttribArray(colorLocation);
      gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
    }

    this.draw(gl);
  }

  protected draw(gl: WebGL2RenderingContext) {
    throw new Error("Method not implemented.");
  }
}

export class PointGeometry extends Geometry {
  private pointSize: number;

  constructor(
    vertices: Float32Array,
    shader: Shader,
    pointSize: number = 5.0,
    colors?: Float32Array,
  ) {
    super(vertices, shader, colors);
    this.pointSize = pointSize;
  }

  render(gl: WebGL2RenderingContext) {
    super.render(gl);
    gl.uniform1f(
      gl.getUniformLocation(this.shader.program, "uPointSize"),
      this.pointSize,
    );
  }

  protected draw(gl: WebGL2RenderingContext) {
    gl.drawArrays(gl.POINTS, 0, this.vertices.length / 3);
  }

  setPointSize(size: number) {
    this.pointSize = size;
  }
}

export class LineGeometry extends Geometry {
  private lineWidth: number;

  constructor(
    vertices: Float32Array,
    shader: Shader,
    lineWidth: number = 1.0,
    colors?: Float32Array,
  ) {
    super(vertices, shader, colors);
    this.lineWidth = lineWidth;
  }

  render(gl: WebGL2RenderingContext) {
    super.render(gl);
    gl.lineWidth(this.lineWidth);
  }

  protected draw(gl: WebGL2RenderingContext) {
    gl.drawArrays(gl.LINE_STRIP, 0, this.vertices.length / 3);
  }

  setLineWidth(width: number) {
    this.lineWidth = width;
  }
}

export class TriangleGeometry extends Geometry {
  constructor(vertices: Float32Array, shader: Shader, colors?: Float32Array) {
    super(vertices, shader, colors);
  }

  protected draw(gl: WebGL2RenderingContext) {
    gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length / 3);
  }
}
