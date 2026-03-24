import { Shader } from "../core/Shader";

function createPointShader(gl: WebGL2RenderingContext): Shader {
  const vertexShaderSource = `
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
  `;

  const fragmentShaderSource = `
    precision mediump float;
    varying vec4 vColor;
    void main() {
      gl_FragColor = vColor;
    }
  `;

  return new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

export { createPointShader };
