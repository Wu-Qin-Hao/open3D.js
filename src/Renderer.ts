import { Geometry } from './Geometry';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private geometries: Geometry[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
    if (!this.gl) {
      throw new Error('WebGL2 not supported');
    }
  }

  addGeometry(geometry: Geometry) {
    this.geometries.push(geometry);
  }

  render() {
    const gl = this.gl;
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for (const geometry of this.geometries) {
      geometry.render(gl);
    }
  }

  setSize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }
}