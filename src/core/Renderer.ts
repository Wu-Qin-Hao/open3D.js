import { Geometry } from "../geometries/Geometry";
import { Camera } from "../cameras/Camera";

class Renderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private geometries: Geometry[] = [];
  private camera: Camera;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2") as WebGL2RenderingContext;
    if (!this.gl) {
      throw new Error("WebGL2 not supported");
    }
    this.camera = new Camera();
    this.camera.setAspect(canvas.width / canvas.height);

    // 启用深度测试
    this.gl.enable(this.gl.DEPTH_TEST);
    // 启用背面剔除
    this.gl.enable(this.gl.CULL_FACE);
    // 设置剔除模式为剔除背面
    this.gl.cullFace(this.gl.BACK);
  }

  addGeometry(geometry: Geometry) {
    this.geometries.push(geometry);
  }

  render() {
    const gl = this.gl;
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for (const geometry of this.geometries) {
      geometry.render(gl, this.camera);
    }
  }

  setSize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
    this.camera.setAspect(width / height);
  }

  getCamera(): Camera {
    return this.camera;
  }
}

export { Renderer };
