import { Geometry } from "./Geometry";
import { Shader } from "../core/Shader";
import { Camera } from "../cameras/Camera";

class PointGeometry extends Geometry {
  private pointSize: number;

  constructor(vertices: Float32Array, shader: Shader, colors?: Float32Array) {
    super(vertices, shader, colors);
    this.pointSize = 5.0;
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

export { PointGeometry };
