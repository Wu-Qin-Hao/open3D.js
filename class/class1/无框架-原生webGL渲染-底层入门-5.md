# 无框架原生 WebGL 入门：一次绘制多个点

上一篇我们已经完成了一件非常关键的事：

**用 `uniform` 从 JavaScript 控制点大小。**

到第四篇为止，这个小系列已经把 WebGL 初学阶段最核心的三种数据角色都摸到了：

- `attribute`：每个顶点不同的数据
- `varying`：着色器阶段之间传递的数据
- `uniform`：整次绘制共享的数据

但前四篇有一个共同点：

**每次都只画了一个点。**

这当然适合入门，因为你可以把注意力放在渲染流程、数据传输和变量分工上。但如果一直只画一个点，你会很难真正建立“顶点数组”和“批量绘制”的直觉。

所以这一篇，我们继续往前走一步：

**不再只传一个顶点，而是一次传入多个顶点，并用一次 `drawArrays` 直接画出多个点。**

学完这一篇，你会搞清楚这些问题：

1. 什么叫“多个顶点”
2. 为什么位置数据和颜色数据都要按顶点一一对应
3. `pointCount = pointData.length / 3` 为什么能算出顶点数量
4. `gl.drawArrays(gl.POINT, 0, pointCount)` 为什么能一次画出多个点
5. 从“画一个点”走向“画一批顶点”，思维上发生了什么变化

## 一、这一篇解决什么问题

第四篇里，位置数据只有一个点：

```js
const pointData = new Float32Array([0.5, 0.0, 0.0]);
```

这表示只有一组坐标：

```text
(0.5, 0.0, 0.0)
```

所以最后只能画出一个点。

而这一篇把位置数据改成了：

```js
const pointData = new Float32Array([0.5, 0.0, 0.0, 0.0, 0.5, 0.0]);
```

这就不再是一组坐标，而是两组坐标：

```text
第 1 个点: (0.5, 0.0, 0.0)
第 2 个点: (0.0, 0.5, 0.0)
```

同时，颜色数据也从一组变成了两组：

```js
const colorData = new Float32Array([
  0.0, 1.0, 0.0, 1.0,
  1.0, 0.0, 0.0, 1.0,
]);
```

它表示：

```text
第 1 个点: 绿色
第 2 个点: 红色
```

所以这一篇的核心目标，就是让你第一次真正理解：

**WebGL 不是只能画一个点，而是可以一次把一批顶点送进 GPU，再批量画出来。**

## 二、先看这次运行后的效果

这次案例运行后，你应该看到：

- 页面背景仍然是黑色
- 屏幕上不再只有一个点，而是有两个点
- 一个点在右边，是绿色
- 一个点在上方，是红色
- 两个点的大小相同，都是 `40px`

为什么两个点大小相同？

因为这次点大小仍然由：

```js
const pointSize = 40.0;
```

配合：

```glsl
uniform float uPointSize;
```

统一控制。也就是说：

- 位置是每个顶点各自不同的
- 颜色是每个顶点各自不同的
- 点大小是这次绘制统一共享的

这正好把前几篇学到的角色分工串起来了。

## 三、先把完整代码跑起来

先不要急着拆细节，先运行完整代码，看看和上一篇最直观的区别：

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
    const pointData = new Float32Array([0.5, 0.0, 0.0, 0.0, 0.5, 0.0]);
    // 创建颜色数据(0.0, 1.0, 0.0, 1.0 是绿色)
    const colorData = new Float32Array([
      0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0,
    ]);
    // 设置点大小
    const pointSize = 40.0;

    // ------------------------------------------着色器运行固定流水线----------------------------------------
    // 编写顶点着色器源码
    const vertexShaderSource = `
      attribute vec3 aPosition;
      attribute vec4 aColor;
      uniform float uPointSize;
      varying vec4 vColor;
      void main() {
        gl_Position = vec4(aPosition, 1.0); // 设置坐标
        gl_PointSize = uPointSize; // 设置尺寸
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

    // 获取uniform变量位置
    const pointSizeLocation = gl.getUniformLocation(program, "uPointSize");
    // 将 JavaScript 中的值传递给 GPU
    gl.uniform1f(pointSizeLocation, pointSize);
    // ---------------------------------------传递数据到着色器固定流水线--------------------------------------

    // 绘制点
    const pointCount = pointData.length / 3;
    gl.drawArrays(gl.POINT, 0, pointCount);
  </script>
</html>
```

## 四、先和上一篇对比：这次新增了什么

和第四篇相比，这一篇真正新增的变化主要有 3 个：

### 1. 位置数据从 1 个点变成了 2 个点

```js
const pointData = new Float32Array([0.5, 0.0, 0.0, 0.0, 0.5, 0.0]);
```

### 2. 颜色数据也从 1 组颜色变成了 2 组颜色

```js
const colorData = new Float32Array([
  0.0, 1.0, 0.0, 1.0,
  1.0, 0.0, 0.0, 1.0,
]);
```

### 3. `drawArrays` 的绘制数量不再写死为 `1`

```js
const pointCount = pointData.length / 3;
gl.drawArrays(gl.POINT, 0, pointCount);
```

如果把这一篇的变化总结成一句话，就是：

**我们开始不再只关心“一个顶点怎么画”，而是开始关心“一组顶点怎么批量画”。**

## 五、第 1 步：先理解位置数组里到底装了什么

看这段代码：

```js
const pointData = new Float32Array([0.5, 0.0, 0.0, 0.0, 0.5, 0.0]);
```

这不是 6 个毫无关系的数字，而是两组顶点坐标，每组 3 个值：

```text
第 1 个顶点: 0.5, 0.0, 0.0
第 2 个顶点: 0.0, 0.5, 0.0
```

也可以写成更容易读的形式：

```text
第 1 个点 -> (0.5, 0.0, 0.0)
第 2 个点 -> (0.0, 0.5, 0.0)
```

### 你现在要知道什么

- `aPosition` 仍然是 `vec3`
- 所以每个顶点位置仍然由 3 个分量组成
- 顶点数组只是把多个顶点连续排在一起

也就是说，现在不是“位置格式变了”，而是“位置数量变多了”。

## 六、第 2 步：为什么 `pointData.length / 3` 能算出点的数量

接着看这句：

```js
const pointCount = pointData.length / 3;
```

很多初学者看到这里会觉得很神奇，但其实逻辑非常直接。

### 先看 `pointData.length`

当前数组是：

```js
[0.5, 0.0, 0.0, 0.0, 0.5, 0.0]
```

一共 6 个数字，所以：

```js
pointData.length === 6
```

### 再看每个点要占几个数字

因为位置属性是：

```glsl
attribute vec3 aPosition;
```

说明每个顶点位置由 3 个浮点数组成：

- `x`
- `y`
- `z`

所以：

```text
顶点数量 = 数组总长度 / 每个顶点的分量数
```

也就是：

```js
6 / 3 = 2
```

所以最终：

```js
const pointCount = 2;
```

### 这个写法为什么比直接写 `2` 更好

因为它更通用。

如果你后面继续往数组里新增点，例如 3 个点、4 个点、10 个点，这句代码依然成立，不需要每次手动改绘制数量。

这就是数据驱动写法的价值。

## 七、第 3 步：颜色数组为什么也要按顶点一一对应

再看颜色数据：

```js
const colorData = new Float32Array([
  0.0, 1.0, 0.0, 1.0,
  1.0, 0.0, 0.0, 1.0,
]);
```

它同样不是 8 个随便写的数字，而是两组颜色，每组 4 个分量：

```text
第 1 个点: (0.0, 1.0, 0.0, 1.0) -> 绿色
第 2 个点: (1.0, 0.0, 0.0, 1.0) -> 红色
```

### 为什么颜色数量必须和顶点数量对应

因为顶点着色器里是这样声明的：

```glsl
attribute vec3 aPosition;
attribute vec4 aColor;
```

这意味着对于每一个顶点，GPU 都要同时拿到：

- 一份位置
- 一份颜色

你可以把它理解成按序配对：

```text
第 1 个位置 <-> 第 1 组颜色
第 2 个位置 <-> 第 2 组颜色
```

如果位置有 2 个点，但颜色只有 1 组，或者颜色数量对不上，就会出现数据理解错误。

### 你要建立的直觉

当多个 `attribute` 同时存在时，它们通常都要围绕“同一批顶点”展开，并保持数量和顺序上的对应关系。

这件事在后面做三角形、法线、纹理坐标时会越来越重要。

## 八、第 4 步：位置、颜色、大小三种数据现在怎么分工

到第五篇为止，这个示例里已经有了 3 种不同类型的数据：

### 1. 位置数据

```js
const pointData = new Float32Array([0.5, 0.0, 0.0, 0.0, 0.5, 0.0]);
```

特点：

- 每个顶点都不同
- 数量随顶点数增加
- 通过 `aPosition` 输入

### 2. 颜色数据

```js
const colorData = new Float32Array([
  0.0, 1.0, 0.0, 1.0,
  1.0, 0.0, 0.0, 1.0,
]);
```

特点：

- 每个顶点都可能不同
- 也要和顶点数量一一对应
- 通过 `aColor` 输入，再传给 `vColor`

### 3. 点大小

```js
const pointSize = 40.0;
```

特点：

- 所有点共享同一个值
- 不随顶点数量增加
- 通过 `uPointSize` 输入

### 这 3 类分工正好对应前三篇学到的 3 个角色

```text
attribute -> 每顶点不同的数据
varying   -> shader 阶段间传递的数据
uniform   -> 整次绘制共享的数据
```

这也是为什么第五篇特别适合拿来复习前几篇。

## 九、第 5 步：为什么着色器代码几乎不用改

这一篇有一个很值得注意的地方：

虽然我们从“画 1 个点”升级到了“画 2 个点”，但着色器代码几乎没有变化。

顶点着色器还是：

```glsl
attribute vec3 aPosition;
attribute vec4 aColor;
uniform float uPointSize;
varying vec4 vColor;

void main() {
  gl_Position = vec4(aPosition, 1.0);
  gl_PointSize = uPointSize;
  vColor = aColor;
}
```

片元着色器也还是：

```glsl
precision mediump float;
varying vec4 vColor;

void main() {
  gl_FragColor = vColor;
}
```

### 这说明了什么

说明着色器描述的是“每个顶点怎么处理”“每个片元怎么处理”，而不是“总共有几个顶点”。

顶点有几个，是由：

- 你传进去的数据量
- 以及 `drawArrays` 的数量参数

共同决定的。

这就是 GPU 批处理思维的一部分：

**同一套着色器逻辑，可以重复作用在很多个顶点上。**

## 十、第 6 步：`gl.drawArrays(gl.POINT, 0, pointCount)` 到底做了什么

再看这次的绘制命令：

```js
gl.drawArrays(gl.POINT, 0, pointCount);
```

和前几篇相比，前两个参数没变：

- `gl.POINT`：还是按“点”来绘制
- `0`：还是从第 0 个顶点开始

真正变化的是第三个参数：

```js
pointCount
```

也就是：

```js
2
```

### 这意味着什么

意味着 WebGL 会连续取出 2 个顶点来执行顶点着色器，并最终绘制出 2 个点。

你可以把它理解成：

```text
第 0 个顶点 -> 画出第 1 个点
第 1 个顶点 -> 画出第 2 个点
```

所以这一篇真正的升级，不只是数组里多了几个数字，而是：

**一次 draw call 开始服务于多个顶点。**

这件事非常关键。

## 十一、第 7 步：把这次的数据流完整串起来

现在我们把第五篇完整流程串一次：

1. JavaScript 中准备两组位置数据
2. JavaScript 中准备两组颜色数据
3. JavaScript 中准备一个共享的点大小
4. 位置数据通过位置缓冲区传给 `aPosition`
5. 颜色数据通过颜色缓冲区传给 `aColor`
6. 点大小通过 `uniform` 传给 `uPointSize`
7. 顶点着色器对第 1 个顶点执行一次，得到第 1 个点的位置、大小和颜色
8. 顶点着色器对第 2 个顶点再执行一次，得到第 2 个点的位置、大小和颜色
9. 片元着色器分别输出对应颜色
10. `gl.drawArrays(gl.POINT, 0, pointCount)` 一次性把两个点绘制出来

### 这一篇你最该记住的一句话

**WebGL 真正擅长的不是“画一个点”，而是“让同一套着色器逻辑批量处理很多顶点”。**

## 十二、这一步为什么特别关键

从学习路径上看，第五篇是一个很重要的转折点。

前几篇你学的是：

- 一个顶点怎么定义
- 一份颜色怎么传
- 一个共享参数怎么控制

而这一篇你开始学的是：

- 多个顶点怎么放进数组
- 多个属性怎么围绕同一批顶点对齐
- 一次 draw call 怎么批量处理多个顶点

这意味着你已经开始从“单个样例思维”进入“图形批处理思维”。

这对后面学习下面这些内容非常重要：

- 多个点
- 点云
- 线段
- 三角形
- 网格模型

因为它们本质上都建立在“很多顶点一起处理”的思路之上。

## 十三、初学者最容易卡住的几个地方

### 1. 为什么我明明传了两个点，却只看到一个

优先检查：

- `pointCount` 是否计算正确
- `drawArrays` 的第三个参数是否真的是 `pointCount`
- `pointData.length / 3` 是否得到正确结果

### 2. 为什么两个点颜色不对

优先检查：

- `colorData` 是否真的有两组颜色
- 每组颜色是否都是 4 个分量
- 颜色顺序是否和位置顺序一一对应

### 3. 为什么位置数组除以 3，颜色数组却不是除以 3

因为：

- 位置属性是 `vec3`
- 颜色属性是 `vec4`

它们每个顶点占用的分量数本来就不同。

### 4. 为什么点大小只传一次，却两个点都生效

因为点大小来自 `uniform`，它表示的是这次绘制共享的一份参数，而不是每个顶点独有的数据。

### 5. 为什么着色器不用改成“支持两个点”的版本

因为着色器本来就是逐顶点执行的。只要数据和绘制数量变多，它就会自动重复执行多次。

## 十五、这一篇和前几篇的关系

你可以把前五篇连起来理解成一条非常自然的学习台阶：

### 第一篇解决的是

怎么让 WebGL 第一次画出一个点。

### 第二篇解决的是

怎么把位置从 JavaScript 传给 GPU。

### 第三篇解决的是

怎么把颜色也作为顶点属性传进去，并理解 `varying`。

### 第四篇解决的是

怎么用 `uniform` 传入整次绘制共享的参数。

### 第五篇解决的是

怎么把前几篇学到的输入机制扩展到多个顶点，并完成一次批量点绘制。

所以第五篇并不是简单“多加了一个点”，而是你第一次真正把：

- `attribute`
- `varying`
- `uniform`
- `drawArrays`

这几件事放到“多个顶点”的真实场景里一起用了。
