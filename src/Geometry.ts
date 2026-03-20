import { Shader } from "./Shader";
import { Camera } from "./Camera";

class Geometry {
  protected vertices: Float32Array;
  protected colors: Float32Array | null = null;
  protected normals: Float32Array | null = null;
  protected vertexBuffer: WebGLBuffer | null = null;
  protected colorBuffer: WebGLBuffer | null = null;
  protected normalBuffer: WebGLBuffer | null = null;
  protected shader: Shader;

  constructor(
    vertices: Float32Array,
    shader: Shader,
    colors?: Float32Array,
    normals?: Float32Array,
  ) {
    this.vertices = vertices;
    this.shader = shader;
    this.colors = colors || null;
    this.normals = normals || null;
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

    // 初始化法线缓冲区
    if (this.normals) {
      this.normalBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);
    }
  }

  render(gl: WebGL2RenderingContext, camera: Camera) {
    if (!this.vertexBuffer) {
      this.init(gl);
    }

    this.shader.use(gl);

    // 传递MVP矩阵
    const mvpLocation = gl.getUniformLocation(this.shader.program, "uMVP");
    gl.uniformMatrix4fv(mvpLocation, false, camera.getMVPMatrix());

    // 传递模型矩阵
    const modelLocation = gl.getUniformLocation(this.shader.program, "uModel");
    if (modelLocation) {
      gl.uniformMatrix4fv(
        modelLocation,
        false,
        new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
      );
    }

    // 传递光照位置
    const lightPositionLocation = gl.getUniformLocation(
      this.shader.program,
      "uLightPosition",
    );
    if (lightPositionLocation) {
      gl.uniform3f(lightPositionLocation, 5.0, 5.0, 5.0);
    }

    // 传递观察位置
    const viewPositionLocation = gl.getUniformLocation(
      this.shader.program,
      "uViewPosition",
    );
    if (viewPositionLocation) {
      gl.uniform3f(viewPositionLocation, 0.0, 0.0, 5.0);
    }

    // 传递 shininess
    const shininessLocation = gl.getUniformLocation(
      this.shader.program,
      "uShininess",
    );
    if (shininessLocation) {
      gl.uniform1f(shininessLocation, 32.0);
    }

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

    // 绑定法线缓冲区
    if (this.normals && this.normalBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
      const normalLocation = gl.getAttribLocation(
        this.shader.program,
        "aNormal",
      );
      gl.enableVertexAttribArray(normalLocation);
      gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
    }

    this.draw(gl);
  }

  protected draw(gl: WebGL2RenderingContext) {
    throw new Error("Method not implemented.");
  }
}

class PointGeometry extends Geometry {
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

  render(gl: WebGL2RenderingContext, camera: Camera) {
    super.render(gl, camera);
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

class LineGeometry extends Geometry {
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

  render(gl: WebGL2RenderingContext, camera: Camera) {
    super.render(gl, camera);
    gl.lineWidth(this.lineWidth);
  }

  protected draw(gl: WebGL2RenderingContext) {
    gl.drawArrays(gl.LINE_STRIP, 0, this.vertices.length / 3);
  }

  setLineWidth(width: number) {
    this.lineWidth = width;
  }
}

class TriangleGeometry extends Geometry {
  constructor(vertices: Float32Array, shader: Shader, colors?: Float32Array) {
    super(vertices, shader, colors);
  }

  protected draw(gl: WebGL2RenderingContext) {
    gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length / 3);
  }
}

class WireframeBoxGeometry extends Geometry {
  constructor(
    width: number = 1,
    height: number = 1,
    depth: number = 1,
    shader: Shader,
  ) {
    const hw = width / 2;
    const hh = height / 2;
    const hd = depth / 2;

    // 定义立方体的 8 个顶点坐标
    const vertices = new Float32Array([
      // 前面
      -hw,
      -hh,
      hd,
      hw,
      -hh,
      hd,
      hw,
      hh,
      hd,
      -hw,
      hh,
      hd,
      // 后面
      -hw,
      -hh,
      -hd,
      hw,
      -hh,
      -hd,
      hw,
      hh,
      -hd,
      -hw,
      hh,
      -hd,
    ]);

    // 定义线框连接顺序（索引）
    const indices = new Uint16Array([
      // 前面
      0, 1, 1, 2, 2, 3, 3, 0,
      // 后面
      4, 5, 5, 6, 6, 7, 7, 4,
      // 侧面
      0, 4, 1, 5, 2, 6, 3, 7,
    ]);

    // 生成线段用的顶点列表
    const lineVertices = new Float32Array(indices.length * 3);
    for (let i = 0; i < indices.length; i += 2) {
      const a = indices[i] * 3;
      const b = indices[i + 1] * 3;

      lineVertices[i * 3] = vertices[a];
      lineVertices[i * 3 + 1] = vertices[a + 1];
      lineVertices[i * 3 + 2] = vertices[a + 2];

      lineVertices[i * 3 + 3] = vertices[b];
      lineVertices[i * 3 + 4] = vertices[b + 1];
      lineVertices[i * 3 + 5] = vertices[b + 2];
    }

    super(lineVertices, shader);
  }

  protected draw(gl: WebGL2RenderingContext) {
    gl.drawArrays(gl.LINES, 0, this.vertices.length / 3);
  }
}

class BoxGeometry extends Geometry {
  constructor(
    width: number = 1,
    height: number = 1,
    depth: number = 1,
    shader: Shader,
  ) {
    const hw = width / 2;
    const hh = height / 2;
    const hd = depth / 2;

    // 定义立方体的 8 个顶点坐标
    const vertices = new Float32Array([
      // 前面
      -hw,
      -hh,
      hd,
      hw,
      -hh,
      hd,
      hw,
      hh,
      hd,
      -hw,
      hh,
      hd,
      // 后面
      -hw,
      -hh,
      -hd,
      hw,
      -hh,
      -hd,
      hw,
      hh,
      -hd,
      -hw,
      hh,
      -hd,
    ]);

    // 定义每个面的三角形索引（正方体由 12 个三角形组成）
    const indices = new Uint16Array([
      // 正面
      0, 1, 2, 2, 3, 0,
      // 背面
      4, 7, 6, 6, 5, 4,
      // 上面
      3, 2, 6, 6, 7, 3,
      // 下面
      0, 4, 5, 5, 1, 0,
      // 右面
      1, 5, 6, 6, 2, 1,
      // 左面
      0, 3, 7, 7, 4, 0,
    ]);

    // 根据索引重组为顶点数组（每个三角形 3 个顶点）
    const triangleVertices = new Float32Array(indices.length * 3);
    for (let i = 0; i < indices.length; i++) {
      const a = indices[i] * 3;

      triangleVertices[i * 3] = vertices[a];
      triangleVertices[i * 3 + 1] = vertices[a + 1];
      triangleVertices[i * 3 + 2] = vertices[a + 2];
    }

    // 为每个面定义颜色（RGBA）
    const colors = new Float32Array([
      // 正面 - 红色
      1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0,
      1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0,
      // 背面 - 红色
      1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0,
      1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0,
      // 上面 - 红色
      1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0,
      1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0,
      // 下面 - 红色
      1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0,
      1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0,
      // 右面 - 红色
      1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0,
      1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0,
      // 左面 - 红色
      1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0,
      1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0,
    ]);

    // 为每个面定义法线
    const normals = new Float32Array([
      // 正面 - 法线方向：z轴正方向
      0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
      0.0, 0.0, 1.0,
      // 背面 - 法线方向：z轴负方向
      0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
      -1.0, 0.0, 0.0, -1.0,
      // 上面 - 法线方向：y轴正方向
      0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
      0.0, 1.0, 0.0,
      // 下面 - 法线方向：y轴负方向
      0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
      0.0, 0.0, -1.0, 0.0,
      // 右面 - 法线方向：x轴正方向
      1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
      1.0, 0.0, 0.0,
      // 左面 - 法线方向：x轴负方向
      -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
      0.0, -1.0, 0.0, 0.0,
    ]);

    super(triangleVertices, shader, colors, normals);
  }

  protected draw(gl: WebGL2RenderingContext) {
    gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length / 3);
  }
}

export {
  Geometry,
  PointGeometry,
  LineGeometry,
  TriangleGeometry,
  WireframeBoxGeometry,
  BoxGeometry,
};
