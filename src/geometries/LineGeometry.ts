import { Geometry } from "./Geometry";
import { Shader } from "../core/Shader";
import { Camera } from "../cameras/Camera";

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

export { LineGeometry };
