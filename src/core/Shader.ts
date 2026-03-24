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

export { Shader };
