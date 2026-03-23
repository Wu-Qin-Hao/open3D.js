import { Shader } from "../core/Shader";
import { Camera } from "../cameras/Camera";

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

export { Geometry };
