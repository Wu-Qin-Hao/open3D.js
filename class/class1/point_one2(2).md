在某些情况下可以不使用 `varying`。

## 不需要 varying 的情况

### 1. **片段着色器不使用任何顶点数据**

如果片段颜色完全由 uniform 决定：

```javascript
const colorData = new Float32Array([0.0, 1.0, 0.0, 1.0]);
```

```glsl
// 顶点着色器
attribute vec3 aPosition;
void main() {
  gl_Position = vec4(aPosition, 1.0);
  gl_PointSize = 10.0;
}
```

```glsl
// 片段着色器
precision mediump float;
uniform vec4 uColor;  // 直接使用uniform
void main() {
  gl_FragColor = uColor;  // 所有像素都是同一颜色
}
```

```javascript
// JavaScript设置uniform
const colorLocation = gl.getUniformLocation(program, "uColor");
gl.uniform4f(colorLocation, 0.0, 1.0, 0.0, 1.0);
```

### 2. **使用 WebGL2 的现代语法**

WebGL2 用 `in`/`out` 替代了 `attribute`/`varying`，但概念上仍然是必须的：

```glsl
// WebGL2 写法
// 顶点着色器
#version 300 es
in vec3 aPosition;
out vec3 vColor;  // 仍然是必须的传递机制

// 片段着色器  
#version 300 es
in vec3 vColor;   // 接收插值后的数据
out vec4 fragColor;
```

## 什么时候必须使用传递机制

| 场景                                 | 是否需要传递 |
| ------------------------------------ | ------------ |
| 片段只使用 uniform                   | ❌ 不需要     |
| 片段需要顶点属性（如颜色、纹理坐标） | ✅ 需要       |
| 需要颜色插值/渐变效果                | ✅ 需要       |

## 完整对比

### ❌ 不需要 varying 的情况
```glsl
// 顶点着色器
attribute vec3 aPosition;
void main() {
  gl_Position = vec4(aPosition, 1.0);
  gl_PointSize = 10.0;
}

// 片段着色器
precision mediump float;
uniform vec4 uColor;
void main() {
  gl_FragColor = uColor;
}
```

### ✅ 需要 varying/ out 的情况
```glsl
// 顶点着色器
attribute vec4 aColor;
varying vec4 vColor;  // 必须，因为要传递到片段着色器
void main() {
  gl_Position = vec4(aPosition, 1.0);
  vColor = aColor;
}

// 片段着色器
precision mediump float;
varying vec4 vColor;  // 必须，因为要从顶点着色器接收
void main() {
  gl_FragColor = vColor;
}
```

## 核心原因

**顶点着色器和片段着色器是独立的程序**，它们之间没有直接的变量共享。必须通过 `varying`（WebGL1）或 `in`/`out`（WebGL2）作为桥梁来传递数据。

如果片段着色器不需要来自顶点着色器的任何信息，就完全不需要 `varying`。