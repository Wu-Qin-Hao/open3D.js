# 无框架原生 WebGL 入门：从平面点阵到可旋转的 3D 点云

前 7 篇我们一直在逐步扩展 WebGL 的基础能力：

1. 画出第一个点
2. 把位置传给 GPU
3. 把颜色传给 GPU
4. 用 `uniform` 传共享参数
5. 一次绘制多个点
6. 让每个点拥有不同大小
7. 让点数据随用户点击动态增长

这条路线解决的是“数据怎么进入 GPU”和“画面怎么根据数据变化”。

但到第 7 篇为止，我们的点仍然主要停留在一个很重要的限制里：

**它们本质上还是在 2D 平面里观察和操作。**

虽然你已经开始往数组里塞 `x`、`y`、`z` 三个分量，但画面上还没有真正建立起强烈的 3D 空间感。你不会明显感觉到：

- 哪些点更远
- 哪些点更近
- 物体在空间里如何旋转
- 相机从哪里观察这个场景

所以这一篇，我们继续往前走一步：

**把之前的“平面点集合”升级成一个真正具有空间感、可自动旋转、可鼠标拖拽观察的 3D 点云场景。**

学完这一篇，你会搞清楚这些问题：

1. 为什么前面的点看起来更像 2D，而这一篇会有 3D 感
2. `uModelMatrix`、`uViewMatrix`、`uProjectionMatrix` 分别是什么
3. 为什么 `gl_Position` 现在变成了矩阵连乘结果
4. 什么是相机、视图矩阵、透视投影
5. 为什么自动旋转和鼠标拖拽能增强空间感
6. 为什么窗口缩放时要更新投影矩阵

## 一、这一篇解决什么问题

第 7 篇里，我们已经实现了点击画布动态加点。

那一篇的重点是：

- 用户输入如何改变数据
- 数据如何重新上传到 GPU
- 画面如何重新绘制

但那一篇的观察方式仍然比较“平”：

- 没有透视投影
- 没有真正的相机观察模型
- 没有围绕物体的旋转观察

而这次做的核心升级有 5 个：

1. 生成一个更丰富的 3D 点云，而不只是几个平面点
2. 在顶点着色器中加入模型矩阵、视图矩阵、投影矩阵
3. 使用透视投影，让远近关系更自然
4. 使用自动旋转，让点云持续运动
5. 加入鼠标拖拽，让用户手动调整观察角度

如果把这一篇的变化总结成一句话，就是：

**前 7 篇主要在讲“怎么画点”，第 8 篇开始讲“怎么在 3D 空间里观察这些点”。**

## 二、先看这次运行后的效果

这次案例运行后，你应该看到：

- 页面背景仍然是黑色
- 画面中不再只是几个简单点，而是一团具有空间分布感的点云
- 点云中还有三组颜色明显的结构线索：
- 红色点大致沿 X 轴分布
- 绿色点大致沿 Y 轴分布
- 蓝色点大致沿 Z 轴分布
- 场景会自动缓慢旋转
- 当你按住鼠标拖动画布时，可以手动改变观察角度
- 浏览器窗口大小变化时，画面视角比例会自动调整

这一篇最重要的变化不是“点更多了”，而是：

**你第一次真正开始从“3D 观察”的角度去看 WebGL 场景。**

## 三、先把完整代码理解成 4 个模块

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Point Rendering Example</title>
    <style>
      body {
        margin: 0;
        overflow: hidden;
        background-color: #000;
      }
      canvas {
        display: block;
      }
    </style>
  </head>
  <body>
    <canvas id="canvas"></canvas>
  </body>

  <script src="point_one7(m4).js"></script>

  <script>
    // 获取canvas元素
    const canvas = document.getElementById("canvas");
    // 设置canvas尺寸
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 获取WebGL上下文
    const gl = canvas.getContext("webgl2");
    // 设置视口大小
    gl.viewport(0, 0, canvas.width, canvas.height);

    // 创建点数据 - 生成一个3D点云
    function generatePointCloud() {
      const points = [];
      const colors = [];
      const sizes = [];

      // 生成随机点
      for (let i = 0; i < 100; i++) {
        // 随机坐标 (-2 到 2)
        const x = (Math.random() - 0.5) * 4;
        const y = (Math.random() - 0.5) * 4;
        const z = (Math.random() - 0.5) * 4;
        points.push(x, y, z);

        // 随机颜色
        const r = Math.random();
        const g = Math.random();
        const b = Math.random();
        colors.push(r, g, b, 1.0);

        // 随机大小 (5 到 20)
        const size = Math.random() * 15 + 5;
        sizes.push(size);
      }

      // 添加一些固定点以形成结构
      for (let i = -2; i <= 2; i += 0.5) {
        points.push(i, 0, 0);
        colors.push(1.0, 0, 0, 1.0);
        sizes.push(10);

        points.push(0, i, 0);
        colors.push(0, 1.0, 0, 1.0);
        sizes.push(10);

        points.push(0, 0, i);
        colors.push(0, 0, 1.0, 1.0);
        sizes.push(10);
      }

      return {
        points: new Float32Array(points),
        colors: new Float32Array(colors),
        sizes: new Float32Array(sizes),
      };
    }

    // 生成点云数据
    const pointCloud = generatePointCloud();
    let pointData = pointCloud.points;
    let colorData = pointCloud.colors;
    let pointSizeData = pointCloud.sizes;

    // ------------------------------------------着色器运行固定流水线----------------------------------------
    // 编写顶点着色器源码
    const vertexShaderSource = `
      attribute vec3 aPosition;
      attribute vec4 aColor;
      attribute float aPointSize;
      uniform mat4 uModelMatrix;
      uniform mat4 uViewMatrix;
      uniform mat4 uProjectionMatrix;
      varying vec4 vColor;
      void main() {
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0); // 设置坐标
        gl_PointSize = aPointSize; // 设置尺寸
        vColor = aColor; // 设置颜色
      }
    `;
    // 编写片段着色器源码
    const fragmentShaderSource = `
      precision mediump float;
      varying vec4 vColor;
      void main() {
        gl_FragColor = vColor; // 设置颜色
      }
    `;

    // 顶点着色器类型
    const vsType = gl.VERTEX_SHADER;
    // 1.创建顶点着色器对象
    const vsShader = gl.createShader(vsType);
    // 2.设置顶点着色器源代码
    gl.shaderSource(vsShader, vertexShaderSource);
    // 3.编译顶点着色器
    gl.compileShader(vsShader);

    // 片元着色器类型
    const fsType = gl.FRAGMENT_SHADER;
    // 1.创建片段着色器对象
    const fsShader = gl.createShader(fsType);
    // 2.设置片段着色器源代码
    gl.shaderSource(fsShader, fragmentShaderSource);
    // 3.编译片段着色器
    gl.compileShader(fsShader);

    // 4.创建WebGL程序对象
    const program = gl.createProgram();
    // 5.将顶点着色器附加到程序
    gl.attachShader(program, vsShader);
    // 6.将片段着色器附加到程序
    gl.attachShader(program, fsShader);
    // 7.链接程序
    gl.linkProgram(program);
    // 8.使用程序
    gl.useProgram(program);
    // ------------------------------------------着色器运行固定流水线----------------------------------------

    // ---------------------------------------传递数据到着色器固定流水线--------------------------------------
    // 初始化顶点缓冲区
    const vertexBuffer = gl.createBuffer();
    // 绑定顶点缓冲区
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // 将顶点数据上传到GPU
    gl.bufferData(gl.ARRAY_BUFFER, pointData, gl.STATIC_DRAW);
    // 获取顶点着色器属性位置
    const positionLocation = gl.getAttribLocation(program, "aPosition");
    // 启用顶点着色器属性
    gl.enableVertexAttribArray(positionLocation);
    // 设置顶点着色器属性指针
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

    // 颜色缓冲区
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.STATIC_DRAW);
    const colorLocation = gl.getAttribLocation(program, "aColor");
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);

    // 点大小缓冲区
    const pointSizeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pointSizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, pointSizeData, gl.STATIC_DRAW);
    const pointSizeLocation = gl.getAttribLocation(program, "aPointSize");
    gl.enableVertexAttribArray(pointSizeLocation);
    gl.vertexAttribPointer(pointSizeLocation, 1, gl.FLOAT, false, 0, 0);
    // ---------------------------------------传递数据到着色器固定流水线--------------------------------------

    // 矩阵变量
    let modelMatrix = createIdentityMatrix();
    let viewMatrix = createIdentityMatrix();
    let projectionMatrix = createPerspectiveMatrix(
      Math.PI * 0.5,
      canvas.width / canvas.height,
      0.1,
      100.0,
    );

    // 获取uniform变量位置
    const modelMatrixLocation = gl.getUniformLocation(program, "uModelMatrix");
    const viewMatrixLocation = gl.getUniformLocation(program, "uViewMatrix");
    const projectionMatrixLocation = gl.getUniformLocation(
      program,
      "uProjectionMatrix",
    );

    updateViewMatrix();
    updateProjectionMatrix();

    // 更新视图矩阵
    function updateViewMatrix() {
      // 相机参数
      let cameraPosition = [0, 0, 5];
      let cameraTarget = [0, 0, 0];
      let cameraUp = [0, 1, 0];

      const [eyeX, eyeY, eyeZ] = cameraPosition;
      const [centerX, centerY, centerZ] = cameraTarget;
      const [upX, upY, upZ] = cameraUp;

      const zAxis = [eyeX - centerX, eyeY - centerY, eyeZ - centerZ];
      const zLength = Math.sqrt(
        zAxis[0] * zAxis[0] + zAxis[1] * zAxis[1] + zAxis[2] * zAxis[2],
      );
      const normalizedZ = [
        zAxis[0] / zLength,
        zAxis[1] / zLength,
        zAxis[2] / zLength,
      ];

      const xAxis = [
        upY * normalizedZ[2] - upZ * normalizedZ[1],
        upZ * normalizedZ[0] - upX * normalizedZ[2],
        upX * normalizedZ[1] - upY * normalizedZ[0],
      ];
      const xLength = Math.sqrt(
        xAxis[0] * xAxis[0] + xAxis[1] * xAxis[1] + xAxis[2] * xAxis[2],
      );
      const normalizedX = [
        xAxis[0] / xLength,
        xAxis[1] / xLength,
        xAxis[2] / xLength,
      ];

      const yAxis = [
        normalizedZ[1] * normalizedX[2] - normalizedZ[2] * normalizedX[1],
        normalizedZ[2] * normalizedX[0] - normalizedZ[0] * normalizedX[2],
        normalizedZ[0] * normalizedX[1] - normalizedZ[1] * normalizedX[0],
      ];

      viewMatrix = new Float32Array([
        normalizedX[0],
        yAxis[0],
        normalizedZ[0],
        0,
        normalizedX[1],
        yAxis[1],
        normalizedZ[1],
        0,
        normalizedX[2],
        yAxis[2],
        normalizedZ[2],
        0,
        -(
          normalizedX[0] * eyeX +
          normalizedX[1] * eyeY +
          normalizedX[2] * eyeZ
        ),
        -(yAxis[0] * eyeX + yAxis[1] * eyeY + yAxis[2] * eyeZ),
        -(
          normalizedZ[0] * eyeX +
          normalizedZ[1] * eyeY +
          normalizedZ[2] * eyeZ
        ),
        1,
      ]);

      gl.uniformMatrix4fv(viewMatrixLocation, false, viewMatrix);
    }
    // 更新投影矩阵
    function updateProjectionMatrix() {
      gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);
    }

    // 旋转参数
    let rotationX = 0;
    let rotationY = 0;
    let rotationZ = 0;
    let isDragging = false;

    // 绘制点
    function drawPoints() {
      const pointCount = pointData.length / 3;
      gl.clear(gl.COLOR_BUFFER_BIT);

      // 更新旋转
      if (!isDragging) {
        rotationX += 0.005;
        rotationY += 0.008;
        rotationZ += 0.003;
      }

      // 更新模型矩阵
      modelMatrix = createRotationMatrix(rotationX, rotationY, rotationZ);
      // 设置矩阵
      gl.uniformMatrix4fv(modelMatrixLocation, false, modelMatrix);

      gl.drawArrays(gl.POINT, 0, pointCount);

      // 动画循环
      requestAnimationFrame(drawPoints);
    }

    // 初始绘制
    drawPoints();

    // --------------------------------------------------窗口大小调整处理--------------------------------------------------
    function handleResize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      projectionMatrix = createPerspectiveMatrix(
        Math.PI * 0.5,
        canvas.width / canvas.height,
        0.1,
        100.0,
      );
      updateProjectionMatrix();
    }

    window.addEventListener("resize", handleResize);
    // --------------------------------------------------窗口大小调整处理--------------------------------------------------

    // ----------------------------------------------------鼠标事件处理----------------------------------------------------
    let lastMouseX = 0;
    let lastMouseY = 0;

    canvas.addEventListener("mousedown", (e) => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });

    canvas.addEventListener("mousemove", (e) => {
      if (isDragging) {
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;

        rotationY += deltaX * 0.01;
        rotationX += deltaY * 0.01;

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    });

    canvas.addEventListener("mouseup", () => {
      isDragging = false;
    });
    // ----------------------------------------------------鼠标事件处理----------------------------------------------------

    // ----------------------------------------------------矩阵工具函数----------------------------------------------------
    function createIdentityMatrix() {
      return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    }

    function createTranslationMatrix(x, y, z) {
      return new Float32Array([1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1]);
    }

    function createPerspectiveMatrix(fov, aspect, near, far) {
      const f = 1.0 / Math.tan(fov * 0.5);
      const rangeInv = 1.0 / (near - far);

      return new Float32Array([
        f / aspect,
        0,
        0,
        0,
        0,
        f,
        0,
        0,
        0,
        0,
        (near + far) * rangeInv,
        -1,
        0,
        0,
        near * far * rangeInv * 2,
        0,
      ]);
    }

    function createRotationMatrix(angleX, angleY, angleZ) {
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosZ = Math.cos(angleZ);
      const sinZ = Math.sin(angleZ);

      const rotationX = new Float32Array([
        1,
        0,
        0,
        0,
        0,
        cosX,
        -sinX,
        0,
        0,
        sinX,
        cosX,
        0,
        0,
        0,
        0,
        1,
      ]);

      const rotationY = new Float32Array([
        cosY,
        0,
        sinY,
        0,
        0,
        1,
        0,
        0,
        -sinY,
        0,
        cosY,
        0,
        0,
        0,
        0,
        1,
      ]);

      const rotationZ = new Float32Array([
        cosZ,
        -sinZ,
        0,
        0,
        sinZ,
        cosZ,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
      ]);

      return multiplyMatrices(
        multiplyMatrices(rotationZ, rotationY),
        rotationX,
      );
    }

    function multiplyMatrices(a, b) {
      const result = new Float32Array(16);
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          result[i * 4 + j] =
            a[i * 4 + 0] * b[0 * 4 + j] +
            a[i * 4 + 1] * b[1 * 4 + j] +
            a[i * 4 + 2] * b[2 * 4 + j] +
            a[i * 4 + 3] * b[3 * 4 + j];
        }
      }
      return result;
    }
    // ----------------------------------------------------矩阵工具函数----------------------------------------------------
  </script>
</html>
```

这次代码明显比前几篇更长，但如果你直接从头到尾硬啃，会比较累。建议先把它拆成 4 个模块：

### 1. 数据生成模块

负责生成：

- 随机 3D 点
- 对应颜色
- 对应点大小
- 额外的坐标轴参考点

### 2. 着色器与 buffer 模块

负责：

- 编译 shader
- 创建 program
- 上传位置、颜色、大小数据

### 3. 矩阵与相机模块

负责：

- 模型矩阵
- 视图矩阵
- 投影矩阵
- 把这 3 个矩阵传给 GPU

### 4. 动画与交互模块

负责：

- 自动旋转
- 鼠标拖拽旋转
- 窗口缩放后的投影更新
- 持续重绘

只要你先用这 4 块去理解，整篇代码就不会显得杂乱。

## 四、第 1 步：为什么这次先生成了一个 3D 点云

先看这段函数：

```js
function generatePointCloud() {
  const points = [];
  const colors = [];
  const sizes = [];

  for (let i = 0; i < 100; i++) {
    const x = (Math.random() - 0.5) * 4;
    const y = (Math.random() - 0.5) * 4;
    const z = (Math.random() - 0.5) * 4;
    points.push(x, y, z);

    const r = Math.random();
    const g = Math.random();
    const b = Math.random();
    colors.push(r, g, b, 1.0);

    const size = Math.random() * 15 + 5;
    sizes.push(size);
  }

  ...
}
```

这一段的核心目的，是先造出一批真正分布在三维空间里的点。

### 为什么说它是 3D 点云

因为这里生成的不是：

```text
(x, y)
```

而是：

```text
(x, y, z)
```

并且 `x`、`y`、`z` 都在一个范围内随机变化：

```js
(Math.random() - 0.5) * 4
```

这意味着每个点都会被散布在一个大致 `-2 ~ 2` 的立方体空间里。

### 为什么这一步很重要

如果你的点全部都落在同一个平面上，即使你加了旋转和投影，3D 感也不一定明显。

而随机分布在空间中的点，会更容易让你看到：

- 前后层次
- 深浅变化
- 旋转后的空间结构

这就是“点云”的直观价值。

## 五、第 2 步：为什么要额外加上三组固定点

随机点之外，代码还做了这一段：

```js
for (let i = -2; i <= 2; i += 0.5) {
  points.push(i, 0, 0);
  colors.push(1.0, 0, 0, 1.0);
  sizes.push(10);

  points.push(0, i, 0);
  colors.push(0, 1.0, 0, 1.0);
  sizes.push(10);

  points.push(0, 0, i);
  colors.push(0, 0, 1.0, 1.0);
  sizes.push(10);
}
```

这一步特别巧妙，它不是在“增加炫技效果”，而是在增加空间参考系。

### 这三组点分别代表什么

- 红色点沿 X 轴排开
- 绿色点沿 Y 轴排开
- 蓝色点沿 Z 轴排开

这相当于在点云里埋了一个简化版坐标轴提示。

### 为什么这样做有帮助

因为纯随机点云虽然看起来丰富，但对于初学者来说很容易“看成一团”。

一旦加入红绿蓝三条轴向结构，你就更容易分辨：

- 哪个方向是左右
- 哪个方向是上下
- 哪个方向是前后

这对理解旋转非常有帮助。

## 六、第 3 步：为什么这次顶点着色器突然多了 3 个矩阵

看顶点着色器：

```glsl
attribute vec3 aPosition;
attribute vec4 aColor;
attribute float aPointSize;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
varying vec4 vColor;
void main() {
  gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
  gl_PointSize = aPointSize;
  vColor = aColor;
}
```

前几篇里，你已经很熟悉：

```glsl
gl_Position = vec4(aPosition, 1.0);
```

但这次变成了：

```glsl
gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
```

这正是“2D 感”走向“3D 观察”的核心跳跃。

### 这句到底在做什么

它不是简单把位置交给 GPU，而是在说：

1. 先用模型矩阵处理物体自身变换
2. 再用视图矩阵把场景转换到相机视角下
3. 再用投影矩阵把 3D 空间投射到屏幕上

也就是说，这次 `gl_Position` 已经不再是“原始顶点位置”，而是“经过 3D 观察链路变换后的最终位置”。

## 七、第 4 步：先讲 `uModelMatrix`，它控制物体本身怎么变

`uModelMatrix` 的职责是：

**控制模型在世界中的变换。**

当前代码中，它主要用于旋转：

```js
modelMatrix = createRotationMatrix(rotationX, rotationY, rotationZ);
gl.uniformMatrix4fv(modelMatrixLocation, false, modelMatrix);
```

### 这意味着什么

表示点云本身不是静止不动的，而是在模型空间中不断旋转。

### 为什么自动旋转会带来空间感

因为当一个 3D 物体在旋转时，你会明显感受到：

- 哪些点前后穿插
- 哪些结构在绕着中心变化
- 物体不是贴在屏幕上的平面图，而是有立体关系

所以模型矩阵是“让物体动起来”的第一步。

## 八、第 5 步：再讲 `uViewMatrix`，它控制相机怎么看

`uViewMatrix` 的职责是：

**把世界空间转换到相机视角空间。**

在代码里，相机参数是这样定义的：

```js
let cameraPosition = [0, 0, 5];
let cameraTarget = [0, 0, 0];
let cameraUp = [0, 1, 0];
```

你可以先这样理解：

- 相机在 `(0, 0, 5)`
- 看向原点 `(0, 0, 0)`
- 上方向是 `(0, 1, 0)`

### 为什么这一步很重要

前几篇虽然有 3D 数据，但如果没有“相机”这个概念，你其实并没有真正建立观察关系。

而视图矩阵的存在，就是在回答：

**“我现在站在哪里看这个场景？”**

这是 3D 渲染和简单 2D 绘制之间的一个关键差别。

## 九、第 6 步：最后讲 `uProjectionMatrix`，它控制透视投影

`uProjectionMatrix` 的职责是：

**把 3D 空间中的点投影到最终屏幕上。**

代码里是这样创建的：

```js
projectionMatrix = createPerspectiveMatrix(
  Math.PI * 0.5,
  canvas.width / canvas.height,
  0.1,
  100.0,
);
```

这里使用的是透视投影。

### 什么叫透视投影

你可以先简单理解成：

- 近的东西看起来更大
- 远的东西看起来更小

这和人眼观察真实世界更接近，所以会更有空间感。

### 为什么前面几篇不强调它

因为前几篇重点在于：

- 数据怎么进 GPU
- shader 怎么写
- 多顶点数据怎么组织

而这一篇已经开始正式进入“3D 观察模型”，所以投影矩阵变得非常关键。

## 十、第 7 步：为什么 `gl_Position` 现在必须是矩阵连乘结果

现在你可以回头重新看这句最核心的代码：

```glsl
gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
```

它可以翻译成一句非常清楚的人话：

**先把模型放到世界里，再从相机视角去看，最后用透视规则投射到屏幕。**

这就是一个标准 3D 渲染链路的最小雏形。

如果没有这些矩阵：

- 你看到的仍然更像平面坐标摆放
- 很难建立真正的空间观察感

所以这句代码，是第 8 篇里最需要吃透的一句。

## 十一、第 8 步：为什么这次要持续动画重绘

看 `drawPoints()`：

```js
function drawPoints() {
  const pointCount = pointData.length / 3;
  gl.clear(gl.COLOR_BUFFER_BIT);

  if (!isDragging) {
    rotationX += 0.005;
    rotationY += 0.008;
    rotationZ += 0.003;
  }

  modelMatrix = createRotationMatrix(rotationX, rotationY, rotationZ);
  gl.uniformMatrix4fv(modelMatrixLocation, false, modelMatrix);

  gl.drawArrays(gl.POINT, 0, pointCount);

  requestAnimationFrame(drawPoints);
}
```

### 这里和前几篇最大的不同

前几篇更多是：

- 初始化后画一次
- 或用户点击时重画一次

而这一篇变成了：

- 每一帧都更新旋转角度
- 每一帧都更新模型矩阵
- 每一帧都重新绘制

这已经进入“动画渲染循环”的模式了。

### 为什么这能增强 3D 感

因为静态的三维数据，很多时候看起来还是不够直观。

一旦开始旋转，空间关系会立刻变得明显。

## 十二、第 9 步：为什么鼠标拖拽也能改变观察体验

新增的鼠标处理代码是：

```js
canvas.addEventListener("mousedown", (e) => {
  isDragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});

canvas.addEventListener("mousemove", (e) => {
  if (isDragging) {
    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;

    rotationY += deltaX * 0.01;
    rotationX += deltaY * 0.01;

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
});

canvas.addEventListener("mouseup", () => {
  isDragging = false;
});
```

### 这里本质上做了什么

它不是在“拖拽点”，而是在修改旋转角度：

- 鼠标左右移动，改变 `rotationY`
- 鼠标上下移动，改变 `rotationX`

也就是说，用户是在通过鼠标主动改变模型的观察角度。

### 为什么拖拽时要暂停自动旋转

代码里有：

```js
if (!isDragging) {
  rotationX += 0.005;
  rotationY += 0.008;
  rotationZ += 0.003;
}
```

这表示拖拽时停止自动旋转。

这样做的好处是：

- 用户操作时不会和自动动画“打架”
- 观察体验更稳定

这是一个很实用的交互细节。

## 十三、第 10 步：为什么窗口变化时要更新投影矩阵

看这段代码：

```js
function handleResize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
  projectionMatrix = createPerspectiveMatrix(
    Math.PI * 0.5,
    canvas.width / canvas.height,
    0.1,
    100.0,
  );
  updateProjectionMatrix();
}
```

### 为什么这里不只是改 `canvas`

因为投影矩阵里有一个很关键的参数：

```js
canvas.width / canvas.height
```

也就是画面的宽高比。

如果窗口尺寸变了，但你还沿用旧的宽高比，那么投影关系就会失真，画面可能被拉伸。

所以 resize 时必须同步：

- 更新 `canvas`
- 更新 `viewport`
- 更新投影矩阵

这一步是 3D 场景里很常见的基础操作。

## 十四、把这一篇的完整链路串起来

现在把第 8 篇的完整逻辑串一次：

1. 生成一批随机分布的 3D 点
2. 再额外生成红绿蓝三组参考轴点
3. 上传位置、颜色、大小数据到 GPU
4. 顶点着色器中引入模型、视图、投影三个矩阵
5. 用模型矩阵让点云旋转
6. 用视图矩阵建立相机观察关系
7. 用投影矩阵建立透视效果
8. 每一帧更新旋转后的模型矩阵
9. 每一帧重绘整个点云
10. 鼠标拖拽时手动修改旋转角度
11. 窗口缩放时更新投影矩阵

如果你能把这 11 步复述出来，说明你已经真正理解了这篇的结构。

## 十五、这一篇为什么特别关键

从学习路径上看，这一篇是一个非常重要的分水岭。

前 7 篇主要在解决：

- WebGL 的基础数据输入
- 不同 shader 变量的职责
- 多顶点渲染
- 动态数据更新

而第 8 篇正式开始解决：

**3D 场景到底是怎么被观察到的。**

这一步特别重要，因为后面你继续学习：

- 模型变换
- 相机系统
- 轨道控制器
- 透视与正交
- 真实 3D 几何体

本质上都会建立在这一篇的思想之上。

## 十六、你现在可以立刻做的 8 个实验

为了确保你真的理解了第 8 篇，建议你做下面这些实验。

### 实验 1：关闭自动旋转

注释掉：

```js
rotationX += 0.005;
rotationY += 0.008;
rotationZ += 0.003;
```

观察点云变成静态后，空间感会不会明显减弱。

### 实验 2：只保留某一个轴的参考点

例如只保留红色 X 轴点，看看没有完整参考结构后，你对空间方向的判断会不会变弱。

### 实验 3：改变相机位置

尝试修改：

```js
let cameraPosition = [0, 0, 5];
```

比如改成：

```js
let cameraPosition = [0, 0, 8];
```

观察物体整体看起来是否更远。

### 实验 4：改变透视参数

尝试修改：

```js
Math.PI * 0.5
```

观察视角大小变化会不会影响透视感。

### 实验 5：只绕一个轴旋转

例如只改 `rotationY`，观察点云围绕单轴转动的视觉效果。

### 实验 6：拖拽时不暂停自动旋转

去掉：

```js
if (!isDragging) { ... }
```

体验一下交互为什么会变得混乱。

### 实验 7：把随机点数量从 100 改成更多

比如改成 300 或 500，观察点云密度变化。

### 实验 8：修改颜色轴

尝试改变红绿蓝参考轴的颜色分配，观察自己是否还能快速辨认空间方向。

## 十七、初学者最容易卡住的几个地方

### 1. 为什么我明明传的是 3D 坐标，看起来却还是平的

因为“有 z 值”和“有 3D 空间感”不是一回事。真正的 3D 观察还需要相机和投影。

### 2. 为什么这次 `gl_Position` 不能再直接写 `vec4(aPosition, 1.0)`

因为现在你不仅仅是想把点摆出来，而是想让它经过模型变换、相机观察和透视投影之后再显示。

### 3. 为什么有了视图矩阵还要投影矩阵

视图矩阵解决的是“怎么看”，投影矩阵解决的是“怎么看到屏幕上”。

### 4. 为什么鼠标拖拽改的是旋转角度，不是直接改顶点

因为这里控制的是观察姿态，而不是点云原始数据本身。

### 5. 为什么 resize 时一定要更新投影矩阵

因为透视矩阵和宽高比有关，窗口尺寸变了，投影关系也要跟着更新。

## 十八、这一篇和前几篇的关系

你可以把前 8 篇连起来理解成一条非常完整的学习路径：

### 第一到第四篇

解决的是 WebGL 最基础的数据输入与着色器分工。

### 第五到第七篇

解决的是多点、动态数据、交互式更新。

### 第八篇

开始真正建立 3D 空间观察模型：

- 模型矩阵
- 视图矩阵
- 投影矩阵
- 动画旋转
- 鼠标拖拽观察

这意味着你已经从“会画点”走到了“会观察一个 3D 点云场景”。
