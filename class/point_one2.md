## 颜色传递流程

### 1. 创建颜色数据（第22行）
```
const colorData = new Float32Array([0.0, 1.0, 0.0, 1.0]);
```
创建了一个包含RGBA值的Float32Array：

- R（红）= 0.0
- G（绿）= 1.0
- B（蓝）= 0.0
- A（透明度）= 1.0
  
### 2. 顶点着色器接收颜色（第44-46行）
```
attribute vec4 aColor;  // 声明顶点属性，接收颜色数据
varying vec4 vColor;    // 声明varying变量，用于传递给片段着色器
void main() {
  vColor = aColor;      // 将颜色值传递给片段着色器
}
```

### 3. 片段着色器使用颜色（第52-56行）
```
precision mediump float;
varying vec4 vColor;    // 接收从顶点着色器传来的颜色
void main() {
  gl_FragColor = vColor; // 设置最终像素颜色
}
```

### 4. 创建颜色缓冲区（第93-95行）
```
const colorBuffer = gl.createBuffer();           // 创建缓冲区
对象
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);     // 绑定缓冲区
gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.
STATIC_DRAW); // 上传颜色数据到GPU
```

### 5. 连接着色器属性（第96-98行）
```
const colorLocation = gl.getAttribLocation(program, 
"aColor"); // 获取着色器中aColor属性的位置
gl.enableVertexAttribArray
(colorLocation);                    // 启用该属性
gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 
0); // 设置属性指针
```

## 完整数据流
```
JavaScript颜色数据 (colorData)
    ↓
WebGL缓冲区 (colorBuffer)
    ↓
顶点着色器属性 (attribute vec4 aColor)
    ↓
顶点着色器varying变量 (varying vec4 vColor)
    ↓
片段着色器varying变量 (varying vec4 vColor)
    ↓
最终像素颜色 (gl_FragColor)
```
这样就实现了从JavaScript到WebGL着色器的颜色传递，最终在屏幕上渲染出一个绿色的点。