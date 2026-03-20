class Shader {
  public program: WebGLProgram;

  constructor(
    gl: WebGL2RenderingContext,
    vertexShaderSource: string,
    fragmentShaderSource: string,
  ) {
    const vertexShader = this.createShader(
      gl,
      gl.VERTEX_SHADER,
      vertexShaderSource,
    );
    const fragmentShader = this.createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource,
    );

    this.program = gl.createProgram() as WebGLProgram;
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(this.program);
      gl.deleteProgram(this.program);
      gl.deleteShader(fragmentShader);
      gl.deleteShader(vertexShader);
      throw new Error(`Could not compile WebGL program. \n${info}`);
    }
  }

  private createShader(
    gl: WebGL2RenderingContext,
    type: number,
    source: string,
  ): WebGLShader {
    const shader = gl.createShader(type) as WebGLShader;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Could not compile shader. \n${info}`);
    }

    return shader;
  }

  use(gl: WebGL2RenderingContext) {
    gl.useProgram(this.program);
  }
}

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

function createPhongShader(gl: WebGL2RenderingContext): Shader {
  const vertexShaderSource = `#version 300 es
    in vec3 aPosition;
    in vec3 aNormal;
    in vec4 aColor;
    uniform mat4 uMVP;
    uniform mat4 uModel;
    uniform vec3 uLightPosition;
    uniform vec3 uViewPosition;
    out vec4 vColor;
    out vec3 vNormal;
    out vec3 vFragPosition;
    
    void main() {
      gl_Position = uMVP * vec4(aPosition, 1.0);
      vFragPosition = vec3(uModel * vec4(aPosition, 1.0));
      vNormal = mat3(transpose(inverse(uModel))) * aNormal;
      vColor = aColor;
    }
  `;

  const fragmentShaderSource = `#version 300 es
    precision mediump float;
    in vec4 vColor;
    in vec3 vNormal;
    in vec3 vFragPosition;
    uniform vec3 uLightPosition;
    uniform vec3 uViewPosition;
    uniform float uShininess;
    out vec4 fragColor;
    
    void main() {
      // 环境光
      float ambientStrength = 0.1;
      vec3 ambient = ambientStrength * vec3(1.0, 1.0, 1.0);
      
      // 漫反射
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(uLightPosition - vFragPosition);
      float diff = max(dot(normal, lightDir), 0.0);
      vec3 diffuse = diff * vec3(1.0, 1.0, 1.0);
      
      // 镜面反射
      vec3 viewDir = normalize(uViewPosition - vFragPosition);
      vec3 reflectDir = reflect(-lightDir, normal);
      float spec = pow(max(dot(viewDir, reflectDir), 0.0), uShininess);
      vec3 specular = 0.5 * spec * vec3(1.0, 1.0, 1.0);
      
      // 最终颜色
      vec3 result = (ambient + diffuse + specular) * vec3(vColor);
      fragColor = vec4(result, vColor.a);
    }
  `;

  return new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

export { Shader, createPointShader, createColorShader, createPhongShader };
