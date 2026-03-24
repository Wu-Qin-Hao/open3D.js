/**
 * WebGL着色器管理类
 * 负责编译、链接和管理WebGL着色器程序
 *
 * 核心功能：
 * 1. 编译顶点着色器和片段着色器
 * 2. 创建和链接WebGL程序对象
 * 3. 提供程序使用接口
 * 4. 完善的错误处理机制
 */
class Shader {
  /** WebGL程序对象，存储编译链接后的着色器程序 */
  public program: WebGLProgram;

  /**
   * 构造函数 - 创建并初始化WebGL着色器程序
   * @param gl WebGL2渲染上下文
   * @param vertexShaderSource 顶点着色器源代码
   * @param fragmentShaderSource 片段着色器源代码
   */
  constructor(
    gl: WebGL2RenderingContext,
    vertexShaderSource: string,
    fragmentShaderSource: string,
  ) {
    // 创建并编译顶点着色器
    const vertexShader = this.createShader(
      gl,
      gl.VERTEX_SHADER,
      vertexShaderSource,
    );

    // 创建并编译片段着色器
    const fragmentShader = this.createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource,
    );

    // 创建WebGL程序对象
    this.program = gl.createProgram() as WebGLProgram;

    // 将着色器附加到程序
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);

    // 链接程序
    gl.linkProgram(this.program);

    // 检查链接状态
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(this.program);
      gl.deleteProgram(this.program);
      gl.deleteShader(fragmentShader);
      gl.deleteShader(vertexShader);
      throw new Error(`Could not compile WebGL program. \n${info}`);
    }
  }

  /**
   * 创建并编译着色器
   * @param gl WebGL2渲染上下文
   * @param type 着色器类型（顶点着色器或片段着色器）
   * @param source 着色器源代码
   * @returns 编译好的WebGL着色器对象
   */
  private createShader(
    gl: WebGL2RenderingContext,
    type: number,
    source: string,
  ): WebGLShader {
    // 创建着色器对象
    const shader = gl.createShader(type) as WebGLShader;

    // 设置着色器源代码
    gl.shaderSource(shader, source);

    // 编译着色器
    gl.compileShader(shader);

    // 检查编译状态
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Could not compile shader. \n${info}`);
    }

    return shader;
  }

  /**
   * 使用当前着色器程序
   * @param gl WebGL2渲染上下文
   */
  use(gl: WebGL2RenderingContext) {
    gl.useProgram(this.program);
  }
}

export { Shader };
