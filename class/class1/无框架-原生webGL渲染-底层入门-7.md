# 无框架原生 WebGL 入门：点击画布动态添加点

前六篇我们一直在做一件事：

**先把一组准备好的数据交给 GPU，再一次性绘制出来。**

这条路线非常适合入门，因为你可以先把 WebGL 最核心的几个知识点逐步吃透：

1. `canvas` 和 WebGL 上下文
2. 顶点着色器和片元着色器
3. `attribute`、`varying`、`uniform`
4. 顶点缓冲区与颜色缓冲区
5. 单点绘制、多点绘制、每顶点大小

但前六篇还有一个共同点：

**所有点数据都是在程序开始时就写好的。**

也就是说，画面虽然已经能显示多个点、多个颜色、多个大小，但它还是“静态”的。用户点一下画布，画面不会自己新增内容。

所以这一篇，我们继续往前走一步：

**让用户点击画布时，动态往 WebGL 场景里添加新的点。**

学完这一篇，你会搞清楚这些问题：

1. WebGL 如何响应鼠标点击
2. 浏览器坐标为什么不能直接拿来当 `gl_Position`
3. 屏幕坐标怎么转换成 WebGL 坐标
4. 为什么要扩展 `pointData`、`colorData`、`pointSizeData`
5. 为什么数据更新后要重新上传到 GPU
6. 为什么这里要用 `gl.DYNAMIC_DRAW`

## 一、这一篇解决什么问题

第六篇里，数据是在初始化时写死的：

```js
let pointData = new Float32Array([0.5, 0.0, 0.0, 0.0, 0.5, 0.0]);
let colorData = new Float32Array([0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0]);
let pointSizeData = new Float32Array([40.0, 10.0]);
```

然后调用一次：

```js
gl.drawArrays(gl.POINT, 0, pointCount);
```

就把所有点画出来了。

这种写法没有问题，但它有一个明显限制：

- 点的数量是固定的
- 点的位置是固定的
- 点的颜色和大小也是固定的

这次做的关键升级是：

- 初始先画出已有的点
- 然后监听用户点击
- 每点击一次，就新增一个点
- 新点拥有新的位置、随机颜色、随机大小
- 再把新数据重新上传给 GPU 并重绘

这就意味着我们开始从“静态数据渲染”走向“交互式数据驱动渲染”。

## 二、先看这次运行后的效果

这次案例运行后，你应该看到：

- 页面背景仍然是黑色
- 一开始先显示两个点
- 当你点击画布任意位置时，会在点击位置附近新增一个点
- 新点的颜色是随机的
- 新点的大小也是随机的
- 你点击越多，画布上的点就越多

这次最关键的变化不是“又多了一个 buffer”，而是：

**你的 WebGL 画面第一次真正和用户输入连起来了。**

## 三、先把完整代码跑起来

先和前几篇一样，先把完整代码跑起来，再逐步拆解每个步骤。

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

    // 创建点数据(0.5, 0.0, 0.0 是点的坐标)
    let pointData = new Float32Array([0.5, 0.0, 0.0, 0.0, 0.5, 0.0]);
    // 创建颜色数据(0.0, 1.0, 0.0, 1.0 是绿色)
    let colorData = new Float32Array([0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0]);
    // 创建点大小数据
    let pointSizeData = new Float32Array([40.0, 10.0]);

    // ------------------------------------------着色器运行固定流水线----------------------------------------
    // 编写顶点着色器源码
    const vertexShaderSource = `
      attribute vec3 aPosition;
      attribute vec4 aColor;
      attribute float aPointSize;
      varying vec4 vColor;
      void main() {
        gl_Position = vec4(aPosition, 1.0); // 设置坐标
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

    // 绘制点
    function drawPoints() {
      const pointCount = pointData.length / 3;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINT, 0, pointCount);
    }

    // 初始绘制
    drawPoints();

    // 添加鼠标点击事件监听器
    canvas.addEventListener("click", (event) => {
      // 获取点击位置
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // 将屏幕坐标转换为WebGL坐标
      const webglX = (x / canvas.width) * 2 - 1;
      const webglY = 1 - (y / canvas.height) * 2;

      // 生成随机颜色和点大小
      const r = Math.random();
      const g = Math.random();
      const b = Math.random();
      const pointSize = Math.random() * 30 + 10; // 10-40之间的随机大小

      // 扩展点数据
      const newPointData = new Float32Array(pointData.length + 3);
      newPointData.set(pointData);
      newPointData[pointData.length] = webglX;
      newPointData[pointData.length + 1] = webglY;
      newPointData[pointData.length + 2] = 0.0; // z坐标设为0

      // 扩展颜色数据
      const newColorData = new Float32Array(colorData.length + 4);
      newColorData.set(colorData);
      newColorData[colorData.length] = r;
      newColorData[colorData.length + 1] = g;
      newColorData[colorData.length + 2] = b;
      newColorData[colorData.length + 3] = 1.0; // 透明度设为1

      // 扩展点大小数据
      const newPointSizeData = new Float32Array(pointSizeData.length + 1);
      newPointSizeData.set(pointSizeData);
      newPointSizeData[pointSizeData.length] = pointSize;

      // 更新数据
      pointData = newPointData;
      colorData = newColorData;
      pointSizeData = newPointSizeData;

      // 重新上传点数据
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, pointData, gl.DYNAMIC_DRAW);

      // 重新上传颜色数据
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.DYNAMIC_DRAW);

      // 重新上传点大小数据
      gl.bindBuffer(gl.ARRAY_BUFFER, pointSizeBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, pointSizeData, gl.DYNAMIC_DRAW);

      // 重新绘制
      drawPoints();
    });
  </script>
</html>
```

## 四、先和上一篇对比：这次真正新增了什么

和第六篇相比，这次真正新增的内容主要有 5 处：

### 1. 新增了绘制函数

```js
function drawPoints() {
  const pointCount = pointData.length / 3;
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.POINT, 0, pointCount);
}
```

### 2. 新增了鼠标点击事件监听

```js
canvas.addEventListener("click", (event) => {
  ...
});
```

### 3. 新增了屏幕坐标转 WebGL 坐标的逻辑

```js
const webglX = (x / canvas.width) * 2 - 1;
const webglY = 1 - (y / canvas.height) * 2;
```

### 4. 新增了数组扩容逻辑

```js
const newPointData = new Float32Array(pointData.length + 3);
const newColorData = new Float32Array(colorData.length + 4);
const newPointSizeData = new Float32Array(pointSizeData.length + 1);
```

### 5. 新增了动态重传 GPU 数据的逻辑

```js
gl.bufferData(gl.ARRAY_BUFFER, pointData, gl.DYNAMIC_DRAW);
```

如果把这一篇的变化总结成一句话，就是：

**我们第一次让 WebGL 中的顶点数据不再是“写死的”，而是随着用户操作不断增长。**

## 五、第 1 步：为什么这里要先封装一个 `drawPoints()`

先看这个函数：

```js
function drawPoints() {
  const pointCount = pointData.length / 3;
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.POINT, 0, pointCount);
}
```

这一步非常重要，因为现在绘制不只发生一次了。

前几篇里通常是初始化完后直接：

```js
gl.drawArrays(gl.POINT, 0, pointCount);
```

但这一篇里，画面会在每次点击后重新更新，所以你不能只在初始化阶段画一次。你需要一个可重复调用的函数。

### 这个函数做了两件事

#### 1. 根据当前数据计算点数量

```js
const pointCount = pointData.length / 3;
```

#### 2. 清屏并重新绘制

```js
gl.clear(gl.COLOR_BUFFER_BIT);
gl.drawArrays(gl.POINT, 0, pointCount);
```

### 为什么要 `gl.clear`

因为如果你每次都直接重绘而不清屏，旧内容会残留，画面逻辑会变得混乱。

这一篇的数据模式是：

- 更新完整数据集
- 清空当前颜色缓冲
- 按最新数据重新画整帧

这其实已经非常接近真实渲染循环的思路了。

## 六、第 2 步：为什么要监听 `click` 事件

新增的交互入口是：

```js
canvas.addEventListener("click", (event) => {
  ...
});
```

这表示当用户点击画布时，执行回调函数。

也就是说，WebGL 本身并不会自动帮你“加点”，真正触发数据变化的是浏览器事件系统。

这里你可以把整个流程理解成：

```text
用户点击 -> JavaScript 拿到点击信息 -> 更新数组 -> 重新上传 GPU -> 重绘
```

这条链路是本篇最重要的主线。

## 七、第 3 步：为什么鼠标坐标不能直接拿来当 `gl_Position`

先看事件里获取到的坐标：

```js
const rect = canvas.getBoundingClientRect();
const x = event.clientX - rect.left;
const y = event.clientY - rect.top;
```

这里得到的 `x` 和 `y` 是：

- 相对于画布左上角的屏幕像素坐标

但你前几篇已经学过，`gl_Position` 使用的不是屏幕像素坐标，而是 WebGL 裁剪空间坐标。

也就是说：

- 浏览器点击坐标的原点在左上角
- WebGL 坐标的原点在中心

如果你直接把 `x`、`y` 塞进：

```glsl
gl_Position
```

结果一定不对。

所以必须先做坐标转换。

## 八、第 4 步：屏幕坐标是怎么转成 WebGL 坐标的

看这两句：

```js
const webglX = (x / canvas.width) * 2 - 1;
const webglY = 1 - (y / canvas.height) * 2;
```

这一步是本篇最值得讲透的内容之一。

### 先看 `x`

```js
const webglX = (x / canvas.width) * 2 - 1;
```

拆开看：

1. `x / canvas.width`

把像素坐标归一化到 `0 ~ 1`

2. `* 2`

扩展到 `0 ~ 2`

3. `- 1`

平移到 `-1 ~ 1`

这样就把横向坐标转换到了 WebGL 常用的裁剪空间范围。

### 再看 `y`

```js
const webglY = 1 - (y / canvas.height) * 2;
```

它和 `x` 最大的不同是，多了一个上下翻转。

为什么？

因为：

- 浏览器坐标的 `y` 轴是向下增大
- WebGL 坐标的 `y` 轴是向上增大

所以这里必须反过来。

### 你可以先记一个结果

- 画布左边接近 `x = -1`
- 画布右边接近 `x = 1`
- 画布上边接近 `y = 1`
- 画布下边接近 `y = -1`

这一步一旦理解，后面所有鼠标交互都会轻松很多。

## 九、第 5 步：为什么要生成随机颜色和随机大小

接着看：

```js
const r = Math.random();
const g = Math.random();
const b = Math.random();
const pointSize = Math.random() * 30 + 10;
```

这一段的目的，不只是让画面更有趣，而是帮你更直观地看到：

- 每次新加的点，确实是一个新的顶点
- 它拥有自己独立的颜色
- 它也拥有自己独立的大小

### 为什么 `pointSize` 是 `10 ~ 40`

因为：

```js
Math.random() * 30 + 10
```

会得到一个 `10` 到 `40` 左右的随机数。

这样大小变化明显，但又不会小到几乎看不见，也不会大到过于夸张。

## 十、第 6 步：为什么要扩展 `pointData`

先看位置数据扩展：

```js
const newPointData = new Float32Array(pointData.length + 3);
newPointData.set(pointData);
newPointData[pointData.length] = webglX;
newPointData[pointData.length + 1] = webglY;
newPointData[pointData.length + 2] = 0.0;
```

这里发生了 3 件事：

1. 创建一个更长的新数组
2. 把旧数据整体复制进去
3. 在末尾追加新点的位置

### 为什么是 `+ 3`

因为一个位置顶点是：

```text
x, y, z
```

也就是 3 个分量。

### 这一段的本质

其实就是在做：

```text
旧的所有点 + 新点击生成的一个点
```

## 十一、第 7 步：为什么还要同步扩展颜色和大小数组

位置扩展完还不够，还必须同步扩展：

```js
const newColorData = new Float32Array(colorData.length + 4);
const newPointSizeData = new Float32Array(pointSizeData.length + 1);
```

这一步和前面几篇的核心原则完全一致：

**所有每顶点属性，都必须围绕同一批顶点保持一一对应。**

### 颜色为什么是 `+ 4`

因为每个颜色是：

```text
r, g, b, a
```

所以一个新点要新增 4 个分量。

### 点大小为什么是 `+ 1`

因为每个点大小只需要 1 个浮点值。

### 你可以把这三个数组并排看

新增一个点时，本质上你是在同时新增：

- 一组位置
- 一组颜色
- 一个大小

所以这 3 个数组必须同步增长。

## 十二、第 8 步：为什么更新 JavaScript 数组之后还不够

看这一步：

```js
pointData = newPointData;
colorData = newColorData;
pointSizeData = newPointSizeData;
```

这只是把 JavaScript 里的变量更新了。

但 GPU 并不会因为你改了 JS 变量就自动知道新数据。

这是很多初学者第一次做交互时最容易踩的坑：

- CPU 侧数据变了
- 不代表 GPU 侧缓冲区也变了

所以你必须手动重新上传。

## 十三、第 9 步：为什么要重新 `bufferData`

这一步是交互更新最关键的环节：

```js
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, pointData, gl.DYNAMIC_DRAW);

gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.DYNAMIC_DRAW);

gl.bindBuffer(gl.ARRAY_BUFFER, pointSizeBuffer);
gl.bufferData(gl.ARRAY_BUFFER, pointSizeData, gl.DYNAMIC_DRAW);
```

它的含义很明确：

- 重新绑定位置缓冲区并上传新位置
- 重新绑定颜色缓冲区并上传新颜色
- 重新绑定大小缓冲区并上传新大小

### 为什么不用重新 `vertexAttribPointer`

因为顶点属性的读取规则没有变：

- 位置仍然是每顶点 3 个 float
- 颜色仍然是每顶点 4 个 float
- 大小仍然是每顶点 1 个 float

变的只是缓冲区里的数据内容，不是属性格式。

所以这里只需要重新上传数据，不需要重新定义读取方式。

## 十四、第 10 步：为什么这里要改成 `gl.DYNAMIC_DRAW`

你应该已经注意到，这里重新上传时写成了：

```js
gl.bufferData(gl.ARRAY_BUFFER, pointData, gl.DYNAMIC_DRAW);
```

而不是前几篇常见的：

```js
gl.STATIC_DRAW
```

### 它们的语义差别

#### `gl.STATIC_DRAW`

更适合：

- 数据设置一次
- 后面很少改

#### `gl.DYNAMIC_DRAW`

更适合：

- 数据会频繁更新
- 后面会反复重新上传

当前这个案例里，每次点击都会新增点并重传数据，所以用 `gl.DYNAMIC_DRAW` 更符合语义。

这不是“必须绝对这样写”，但从表达 intent 的角度看，这是更合理的选择。

## 十五、第 11 步：为什么最后只需要再次调用 `drawPoints()`

完成数据扩容和重传之后，最后执行：

```js
drawPoints();
```

这一步的含义是：

- 用最新的数组数据重新计算 `pointCount`
- 清空当前画面
- 按最新数据重新画出所有点

所以当前绘制模式不是“只画刚刚新增的那个点”，而是：

**每次都按最新完整数据重新绘制整个点集合。**

这也是很多实时渲染系统常见的工作方式。

## 十六、把这一篇的完整链路串起来

现在把整篇文章最核心的链路完整串一次：

1. 页面初始化，先准备初始点数据、颜色数据、大小数据
2. 首次上传这些数据到 GPU
3. 调用 `drawPoints()` 绘制初始画面
4. 用户点击画布
5. JavaScript 拿到点击位置
6. 把浏览器坐标转换成 WebGL 坐标
7. 生成随机颜色和随机大小
8. 扩展位置数组、颜色数组、大小数组
9. 用新数组替换旧数组
10. 重新把新数据上传到 GPU
11. 再次调用 `drawPoints()`
12. 画面出现新点

如果你能完整复述这 12 步，说明你已经真正理解了这一篇。

## 十七、这一篇为什么特别关键

从学习路径上看，这一篇是一个非常明显的转折点。

前六篇更多是在学习：

- WebGL 的基础渲染机制
- 顶点数据怎么组织
- 不同变量角色如何分工

而这一篇开始进入：

- 数据会变化
- 数据由用户输入驱动
- 画面会随着交互实时更新

这意味着你已经从“静态渲染示例”开始迈向“交互式绘图程序”了。

这一步特别重要，因为后面无论你要做：

- 拾取
- 拖拽
- 绘制工具
- 简单编辑器
- 粒子交互

底层思路都离不开这条链路。

## 十八、初学者最容易卡住的几个地方

### 1. 为什么我点击了画布，但点没有出现在点击位置

优先检查：

- 点击坐标是否正确获取
- 是否做了 WebGL 坐标转换
- `webglY` 是否正确做了上下翻转

### 2. 为什么数组明明更新了，画面却没变化

因为只改 JavaScript 数组还不够，你必须重新调用 `bufferData()` 上传到 GPU。

### 3. 为什么我新增了位置，但颜色或大小出错了

因为位置、颜色、大小都属于每顶点数据，必须保持同步增长和顺序对应。

### 4. 为什么重绘前要清屏

因为当前策略是“根据最新完整数据重新绘制整个结果”，而不是在旧画面上胡乱叠加。

### 5. 为什么不直接 `push` 到 `Float32Array`

因为 `Float32Array` 不是普通 JS 数组，它长度固定，所以这里采用的是“新建更大数组 + 复制旧数据 + 追加新数据”的方式。

## 二十、这一篇和前六篇的关系

你可以把前七篇连起来理解成这样一条很自然的入门路径：

### 第一篇解决的是

怎么画出第一个点。

### 第二篇解决的是

怎么把位置传给 GPU。

### 第三篇解决的是

怎么把颜色传给 GPU，并理解 `varying`。

### 第四篇解决的是

怎么用 `uniform` 控制共享参数。

### 第五篇解决的是

怎么一次绘制多个点。

### 第六篇解决的是

怎么让每个点拥有不同大小。

### 第七篇解决的是

怎么让数据随着用户点击实时增长，并把这套变化重新同步到 GPU。

到这里，你已经不只是会“渲染一些静态点”，而是已经开始具备构建交互式 WebGL 小工具的雏形能力了。
