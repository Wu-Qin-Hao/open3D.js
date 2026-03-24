import { Shader } from "../core/Shader";

function createColorShader(gl: WebGL2RenderingContext): Shader {
  const vertexShaderSource = `
    attribute vec3 aPosition;
    attribute vec4 aColor;
    uniform mat4 uMVP;
    varying vec4 vColor;
    
    void main() {
      gl_Position = uMVP * vec4(aPosition, 1.0);
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

export { createColorShader };
