import { Geometry } from "./Geometry";
import { Shader } from "../core/Shader";

class TriangleGeometry extends Geometry {
  constructor(vertices: Float32Array, shader: Shader, colors?: Float32Array) {
    super(vertices, shader, colors);
  }

  protected draw(gl: WebGL2RenderingContext) {
    gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length / 3);
  }
}

export { TriangleGeometry };
