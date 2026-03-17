# open3D.js 光照系统实现技术文档

## 1. 项目概述

open3D.js 是一个基于 WebGL2 的轻量级 3D 渲染库，专注于提供简洁易用的 3D 渲染能力。本次修改主要实现了完整的 Phong 光照模型，为 3D 场景添加了更加真实的光照效果。

## 2. 技术栈

- **编程语言**: TypeScript
- **渲染技术**: WebGL2
- **构建工具**: Vite
- **开发环境**: 支持 ES6+ 的现代浏览器

## 3. 本次修改内容

本次修改主要在 `Shader.ts` 文件中实现了 Phong 光照模型，具体包括：

1. **创建了 `createPhongShader` 函数**，用于生成支持 Phong 光照的着色器程序
2. **实现了完整的顶点着色器**，处理顶点位置、法向量和颜色的传递
3. **实现了完整的片段着色器**，包含环境光、漫反射和镜面反射的计算

## 4. 技术实现细节

### 4.1 Phong 光照模型原理

Phong 光照模型是一种经典的光照计算方法，由环境光、漫反射和镜面反射三部分组成：

1. **环境光 (Ambient Light)**: 模拟环境中无处不在的基础光照
2. **漫反射 (Diffuse Reflection)**: 模拟光线照射到物体表面后向各个方向散射的效果
3. **镜面反射 (Specular Reflection)**: 模拟光线照射到物体表面后向特定方向反射的高光效果

### 4.2 着色器实现

#### 顶点着色器

```typescript
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
```

**关键点**：
- 使用 `uMVP` 矩阵将顶点位置转换到裁剪空间
- 计算顶点在世界空间中的位置 `vFragPosition`
- 对法向量进行模型矩阵变换，确保光照计算的正确性
- 将颜色、法向量和片段位置传递给片段着色器

#### 片段着色器

```typescript
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
```

**关键点**：
- 环境光计算：使用固定强度的白色光
- 漫反射计算：基于法向量和光线方向的点积
- 镜面反射计算：基于视线方向和反射方向的点积，使用 Shininess 参数控制高光的锐利程度
- 最终颜色计算：将环境光、漫反射和镜面反射按比例混合，再与物体本身的颜色相乘

### 4.3 着色器管理

`Shader` 类负责着色器的创建、编译和链接：

```typescript
export class Shader {
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
```

## 5. 应用场景

Phong 光照模型适用于以下场景：

1. **3D 模型渲染**：为模型添加真实的光照效果，增强视觉表现力
2. **交互式 3D 应用**：如 3D 编辑器、游戏等需要实时光照效果的应用
3. **数据可视化**：通过光照效果突出数据的空间结构

## 6. 性能考虑

1. **计算复杂度**：Phong 光照模型的计算相对简单，适合实时渲染
2. ** uniforms 管理**：光照位置、视角位置等 uniforms 应该在需要时才更新，避免不必要的计算
3. **着色器优化**：可以通过预计算某些值或使用更简单的光照模型来进一步优化性能

## 7. 代码示例

以下是使用 Phong 着色器的示例代码：

```typescript
// 创建 Phong 着色器
const shader = createPhongShader(gl);

// 使用着色器
shader.use(gl);

// 设置 uniform 变量
const mvpLocation = gl.getUniformLocation(shader.program, 'uMVP');
const modelLocation = gl.getUniformLocation(shader.program, 'uModel');
const lightPositionLocation = gl.getUniformLocation(shader.program, 'uLightPosition');
const viewPositionLocation = gl.getUniformLocation(shader.program, 'uViewPosition');
const shininessLocation = gl.getUniformLocation(shader.program, 'uShininess');

// 设置光照参数
gl.uniform3fv(lightPositionLocation, [1.0, 1.0, 1.0]);
gl.uniform3fv(viewPositionLocation, [0.0, 0.0, 3.0]);
gl.uniform1f(shininessLocation, 32.0);

// 绘制物体
// ...
```

## 8. 总结

本次修改为 open3D.js 库添加了完整的 Phong 光照模型实现，通过顶点着色器和片段着色器的配合，实现了环境光、漫反射和镜面反射的计算，为 3D 场景提供了更加真实的光照效果。

该实现采用了标准的 WebGL2 着色器语法，代码结构清晰，易于理解和扩展。通过 Shader 类的封装，使用起来也非常方便。

未来可以考虑添加更多光照特性，如多光源支持、阴影效果、PBR (Physically Based Rendering) 等，进一步提升渲染质量。

## 9. 技术亮点

1. **完整的 Phong 光照模型**：实现了环境光、漫反射和镜面反射的计算
2. **正确的法向量变换**：使用 `mat3(transpose(inverse(uModel)))` 确保法向量在模型变换后仍然正确
3. **模块化设计**：通过 `Shader` 类封装着色器的创建和管理，提供了简洁的 API
4. **TypeScript 类型安全**：使用 TypeScript 提供了良好的类型检查和代码提示

通过这次修改，open3D.js 库的渲染能力得到了显著提升，能够为 3D 场景提供更加真实和生动的光照效果。