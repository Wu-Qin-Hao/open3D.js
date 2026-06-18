# 无框架原生 WebGL 入门：手把手绘制第一个红色点

如果你刚开始学 WebGL，最容易卡住的问题通常不是语法，而是：

“我到底要先写什么，页面上才能真正出现图形？”

这篇文章不讲抽象概念，直接用一个最小案例，带你一步一步把一个红色点画到浏览器里。你可以把它理解成 WebGL 的第一节实战课。

学完这一篇，你至少会搞清楚 4 件事：

1. `canvas` 和 `webgl2` 上下文分别是什么
2. 顶点着色器和片元着色器各自负责什么
3. 为什么着色器要先编译，再链接
4. 为什么一行 `drawArrays` 就能触发 GPU 绘制

## 一、先看最终效果

这个案例运行后，你应该看到：

- 页面背景是黑色
- 屏幕中央有一个红色的小点
- 点的大小大约是 `10px`

如果你能看到这个结果，说明最基础的 WebGL 渲染链路已经跑通了。

## 二、先把完整代码跑起来

建议你先不要急着理解每一行代码，先把结果跑出来，再回头拆解。完整代码如下：

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

    // -------------------------------------------着色器运行流水线-------------------------------------------
    // 编写顶点着色器源码
    const vertexShaderSource = `
      void main() {
        gl_Position = vec4(0.0, 0.0, 0.0, 1.0); // 设置坐标
        gl_PointSize = 10.0; // 设置尺寸
      }
    `;
    // 编写片段着色器源码
    const fragmentShaderSource = `
      void main() {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // 设置颜色
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
    // -------------------------------------------着色器运行流水线-------------------------------------------

    // 绘制点
    gl.drawArrays(gl.POINT, 0, 1);
  </script>
</html>
```

## 三、读这篇教程的正确方式

这一篇适合边看边试，你可以按照下面的节奏学习：

1. 先运行完整代码，确认页面上真的有一个红点
2. 再按步骤理解每一段代码的作用
3. 每学完一步，就回到页面看结果有没有变化
4. 最后自己改几个参数，验证是不是已经理解了

这样比一口气看完所有概念更容易入门。

## 四、第 1 步：先准备一块能画图的画布

先看 HTML 里的这一段：

```html
<canvas id="canvas"></canvas>
```

这就是 WebGL 的绘图载体。你可以先把它理解成浏览器页面里的一块“画布”。

接着在 JavaScript 里拿到它：

```js
const canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
```

这一步做了两件事：

- 找到页面中的 `canvas`
- 把它的尺寸设置成整个浏览器窗口大小

### 你现在要知道什么

- 没有 `canvas`，WebGL 就没有地方输出画面
- `canvas` 的显示大小和实际绘图大小不是一回事
- 如果不设置 `width` 和 `height`，画布默认尺寸通常不是你想要的

### 你可以自己试一下

把这两行改掉：

```js
canvas.width = 300;
canvas.height = 150;
```

你会发现绘制区域变小了，这能帮助你理解 `canvas` 的真实像素尺寸确实影响渲染结果。

## 五、第 2 步：获取 WebGL 的操作入口

有了 `canvas` 之后，还不能直接绘图。你必须先拿到 WebGL 上下文：

```js
const gl = canvas.getContext("webgl2");
```

这里的 `gl` 可以理解成 WebGL 的总控制台。后面所有操作，比如创建着色器、创建程序、发起绘制，都是通过它完成的。

紧接着还有一行：

```js
gl.viewport(0, 0, canvas.width, canvas.height);
```

它的意思是：把渲染结果映射到整个画布区域。

### 你现在要知道什么

- `canvas` 是载体
- `gl` 是 WebGL 的 API 入口
- `viewport` 决定最终画到画布的哪一块区域

### 如果这一步出问题，会发生什么

如果 `getContext("webgl2")` 返回 `null`，说明当前环境拿不到 WebGL2 上下文，常见原因有：

- 浏览器不支持 WebGL2
- 当前设备或驱动不支持
- 运行环境受限制

真实项目里最好写成这样：

```js
const gl = canvas.getContext("webgl2");

if (!gl) {
  throw new Error("当前环境不支持 WebGL2");
}
```

## 六、第 3 步：告诉 GPU 点应该画在哪里

WebGL 不是直接用 JavaScript 画图，而是要把一段程序交给 GPU 执行。第一段程序叫顶点着色器：

```js
const vertexShaderSource = `
  void main() {
    gl_Position = vec4(0.0, 0.0, 0.0, 1.0); // 设置坐标
    gl_PointSize = 10.0; // 设置尺寸
  }
`;
```

虽然看起来像字符串，但里面其实是一段 GLSL 代码，也就是给 GPU 执行的着色器语言。

这一段里最关键的是两个内置变量。

### 1. `gl_Position`

```glsl
gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
```

它决定这个点最终出现在哪里。

这里的坐标不是浏览器像素坐标，而是 WebGL 的裁剪空间坐标：

- `x` 范围是 `-1` 到 `1`
- `y` 范围是 `-1` 到 `1`
- `(0, 0)` 表示屏幕中心

所以这个点会被画在屏幕中央。

### 2. `gl_PointSize`

```glsl
gl_PointSize = 10.0;
```

它决定点的大小。这里设置成 `10.0`，所以最后看到的是一个 10 像素左右的小点。

### 你可以立刻做个实验

把位置改成下面这样：

```glsl
gl_Position = vec4(0.5, 0.5, 0.0, 1.0);
```

你会看到点移动到右上区域。

再把大小改成：

```glsl
gl_PointSize = 30.0;
```

你会看到点明显变大。

这两个实验非常重要，因为它们能帮你马上建立“坐标”和“尺寸”的直觉。

## 七、第 4 步：告诉 GPU 这个点是什么颜色

光有位置还不够，还要告诉 GPU 颜色怎么出。这个工作由片元着色器负责：

```js
const fragmentShaderSource = `
  void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // 设置颜色
  }
`;
```

这里的意思很直接：把颜色设成红色。

`vec4(1.0, 0.0, 0.0, 1.0)` 是 RGBA：

- 第 1 个值是红色
- 第 2 个值是绿色
- 第 3 个值是蓝色
- 第 4 个值是透明度

所以这组值表示“纯红色，且完全不透明”。

### 你可以立刻做个实验

把它改成绿色：

```glsl
gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
```

或者改成蓝色：

```glsl
gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
```

你会立刻明白片元着色器控制的是最终显示颜色。

## 八、第 5 步：把字符串着色器编译成 GPU 能执行的程序

到这里你只是写了两段“源码字符串”，GPU 还不能直接执行。接下来要编译。

先编译顶点着色器：

```js
const vsType = gl.VERTEX_SHADER;
const vsShader = gl.createShader(vsType);
gl.shaderSource(vsShader, vertexShaderSource);
gl.compileShader(vsShader);
```

这几行可以按顺序理解成：

1. 创建一个顶点着色器对象
2. 把源码塞进去
3. 让 WebGL 编译它

片元着色器完全一样：

```js
const fsType = gl.FRAGMENT_SHADER;
const fsShader = gl.createShader(fsType);
gl.shaderSource(fsShader, fragmentShaderSource);
gl.compileShader(fsShader);
```

### 为什么这里一定要编译

因为着色器不是 JavaScript，而是运行在 GPU 上的 GLSL 程序。只有编译成功，GPU 才能识别并执行。

### 初学者最容易忽略的一点

如果你的着色器写错了，页面经常不会报明显错误，而是直接黑屏或者什么都不显示。

所以实际开发中建议立刻加上编译检查：

```js
if (!gl.getShaderParameter(vsShader, gl.COMPILE_STATUS)) {
  console.error(gl.getShaderInfoLog(vsShader));
}
```

## 九、第 6 步：把两个着色器组装成一个程序

顶点着色器和片元着色器各自编译成功后，还不能马上绘制。你要把它们组合起来：

```js
const program = gl.createProgram();
gl.attachShader(program, vsShader);
gl.attachShader(program, fsShader);
gl.linkProgram(program);
gl.useProgram(program);
```

这一步可以理解成：

1. 创建一个 WebGL 程序对象
2. 把顶点着色器挂上去
3. 把片元着色器挂上去
4. 链接成一个完整的 GPU 程序
5. 告诉 WebGL，接下来就用这个程序来渲染

如果你把这一步类比成前端工程，会比较像：

- 顶点着色器是一个模块
- 片元着色器是另一个模块
- `linkProgram` 是把它们组合成最终可运行结果

## 十、第 7 步：真正发出绘制命令

前面的步骤都还是准备工作，真正让 GPU 干活的是这一行：

```js
gl.drawArrays(gl.POINT, 0, 1);
```

这一行的意思是：

- 用“点”这种图元类型绘制
- 从第 `0` 个顶点开始
- 总共绘制 `1` 个顶点

### 这一步为什么这么关键

很多初学者写完前面所有代码，忘了调用绘制命令，结果页面什么都没有。

你要记住：

- `createShader` 不是绘制
- `compileShader` 不是绘制
- `linkProgram` 不是绘制
- `useProgram` 也不是绘制
- 只有 `drawArrays` 或 `drawElements` 这类 draw call，才会真正触发 GPU 输出图形

## 十一、为什么这个例子没有顶点缓冲区也能画出来

这是本例最适合入门的地方，也是最容易让人疑惑的地方。

通常 WebGL 会从顶点缓冲区中读取顶点数据，比如位置、颜色、法线、UV 等。但这个例子没有用 `attribute`，也没有创建 VBO，而是直接在顶点着色器内部写死了位置：

```glsl
gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
```

也就是说，这个点的位置不是 CPU 传进去的，而是 GPU 程序自己写死的。

这带来的好处是：

- 你不用一上来就理解缓冲区
- 你可以先专注于最核心的渲染流程
- 先把“能出图”这件事学会，再去学数据传输

对于入门来说，这种顺序非常友好。

## 十二、把整段代码串起来理解一遍

现在你已经看完了所有局部步骤，我们再把完整流程串一次：

1. 创建 `canvas`，让页面上有一块可以渲染的区域
2. 通过 `getContext("webgl2")` 拿到 WebGL 操作入口
3. 设置 `viewport`，让渲染范围覆盖整个画布
4. 编写顶点着色器，决定点的位置和大小
5. 编写片元着色器，决定点的颜色
6. 编译两个着色器
7. 创建并链接程序对象
8. 激活程序
9. 调用 `gl.drawArrays(gl.POINT, 0, 1)` 完成绘制

如果你能顺着这 9 步复述下来，说明你已经真正理解了这个最小案例。

## 十三、初学者常见问题

### 1. 为什么我页面上什么都没有

优先检查这几项：

- `canvas` 是否成功获取
- `gl` 是否为 `null`
- 着色器是否编译成功
- 程序是否链接成功
- 是否调用了 `gl.useProgram(program)`
- 是否调用了 `gl.drawArrays(...)`

### 2. 为什么点不在我想象的位置

因为 `gl_Position` 使用的是裁剪空间坐标，不是 DOM 像素坐标。

要记住：

- 左边是 `x = -1`
- 右边是 `x = 1`
- 下边是 `y = -1`
- 上边是 `y = 1`
- 中心是 `(0, 0)`

### 3. 为什么这个例子不用 `attribute`

因为这个例子是最小闭环示例，目的是先让你理解渲染链路，而不是一开始就把所有概念堆上来。
