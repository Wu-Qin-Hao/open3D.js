# 无框架原生 WebGL 入门：把颜色从 JavaScript 传进着色器

上一篇我们已经完成了一件很关键的事：

**把点的位置从 JavaScript 传给了 GPU。**

当时我们第一次建立起了这条数据通路：

```text
JavaScript -> Buffer -> attribute -> 顶点着色器
```

这已经不再是“把图画出来”那么简单，而是开始真正接触 WebGL 的数据输入系统。

不过上一篇还有一个限制：

- 点的位置可以由 JavaScript 控制
- 但点的颜色仍然写死在片元着色器里

也就是说，位置是动态的，颜色还是固定的。

所以这一篇，我们继续往前走一步：

**不只把位置传给 GPU，也把颜色从 JavaScript 传进去。**

学完这一篇，你会搞清楚这些概念：

1. 为什么颜色也可以作为顶点属性传入
2. 什么是第二个 `attribute`
3. 什么是 `varying`
4. 为什么颜色要先经过顶点着色器，再传给片元着色器
5. 多个缓冲区和多个属性是怎么协同工作的

## 一、这一篇解决什么问题

第二篇里，颜色是在片元着色器中写死的：

```glsl
gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
```

这意味着无论 JavaScript 传什么数据，最终都会画成固定的红色。

而这一篇改成了下面这种写法：

```glsl
attribute vec4 aColor;
varying vec4 vColor;

void main() {
  vColor = aColor;
}
```

以及：

```glsl
precision mediump float;
varying vec4 vColor;

void main() {
  gl_FragColor = vColor;
}
```

注意这里已经发生了一个重要变化：

- 颜色不再写死在片元着色器里
- 颜色从 JavaScript 传给顶点着色器
- 顶点着色器再把颜色传给片元着色器
- 最终片元着色器使用这个颜色输出到屏幕

这就是本篇的核心目标。

## 二、先看这次运行后的效果

这次案例运行后，你应该看到：

- 页面背景仍然是黑色
- 屏幕右侧仍然有一个点
- 但这个点不再是红色，而是绿色

为什么变成绿色？

因为这次新增了一份颜色数据：

```js
const colorData = new Float32Array([0.0, 1.0, 0.0, 1.0]);
```

这 4 个值分别表示：

- 红色通道 `0.0`
- 绿色通道 `1.0`
- 蓝色通道 `0.0`
- 透明度 `1.0`

所以最终显示出来的是一个完全不透明的绿色点。

## 三、先把完整代码跑起来

先和前两篇一样，先把完整代码运行起来，再逐步拆解它：

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
    const pointData = new Float32Array([0.5, 0.0, 0.0]);
    // 创建颜色数据(0.0, 1.0, 0.0, 1.0 是绿色)
    const colorData = new Float32Array([0.0, 1.0, 0.0, 1.0]);

    // ------------------------------------------着色器运行固定流水线----------------------------------------
    // 编写顶点着色器源码
    const vertexShaderSource = `
      attribute vec3 aPosition;
      attribute vec4 aColor;
      varying vec4 vColor;
      void main() {
        gl_Position = vec4(aPosition, 1.0); // 设置坐标
        gl_PointSize = 10.0; // 设置尺寸
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
    // ---------------------------------------传递数据到着色器固定流水线--------------------------------------

    // 绘制点
    gl.drawArrays(gl.POINT, 0, 1);
  </script>
</html>
```

## 四、先和上一篇对比：这次新增了什么

和第二篇相比，这次真正新增的变化主要有 3 个：

### 1. JavaScript 里新增了一份颜色数据

```js
const colorData = new Float32Array([0.0, 1.0, 0.0, 1.0]);
```

### 2. 顶点着色器里新增了颜色属性

```glsl
attribute vec4 aColor;
varying vec4 vColor;
```

### 3. JavaScript 里新增了一套颜色缓冲区绑定流程

```js
const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.STATIC_DRAW);
const colorLocation = gl.getAttribLocation(program, "aColor");
gl.enableVertexAttribArray(colorLocation);
gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
```

如果把它总结成一句话，就是：

**上一篇只把位置传进了顶点着色器，这一篇把颜色也按同样思路传了进去。**

## 五、第 1 步：先在 JavaScript 里准备颜色数据

先看这行代码：

```js
const colorData = new Float32Array([0.0, 1.0, 0.0, 1.0]);
```

这是一份 RGBA 颜色数据，4 个分量分别表示：

- `0.0` 红色
- `1.0` 绿色
- `0.0` 蓝色
- `1.0` alpha

也就是说，这是一份绿色数据。

### 为什么颜色要用 4 个值

因为 WebGL 常用 `vec4` 表示颜色，通常顺序是：

```text
R, G, B, A
```

其中：

- `R` 是红色通道
- `G` 是绿色通道
- `B` 是蓝色通道
- `A` 是透明度

### 你可以立刻试一下

把它改成红色：

```js
const colorData = new Float32Array([1.0, 0.0, 0.0, 1.0]);
```

或者改成蓝色：

```js
const colorData = new Float32Array([0.0, 0.0, 1.0, 1.0]);
```

你会马上发现，这次颜色已经不再由片元着色器硬编码控制，而是掌握在 JavaScript 数据手里了。

## 六、第 2 步：在顶点着色器里声明第二个 `attribute`

先看顶点着色器中的这一段：

```glsl
attribute vec3 aPosition;
attribute vec4 aColor;
varying vec4 vColor;
```

上一篇我们只有一个顶点属性：

```glsl
attribute vec3 aPosition;
```

这一篇新增了：

```glsl
attribute vec4 aColor;
```

这表示顶点着色器除了接收位置数据，还要接收颜色数据。

### 你现在要知道什么

- `aPosition` 表示每个顶点的位置
- `aColor` 表示每个顶点的颜色
- 顶点着色器现在同时拥有两个输入属性

这件事很重要，因为它让你第一次接触到：

**一个顶点不只有位置，还可以带着其他属性一起进入 GPU。**

后面你还会看到更多类似属性：

- 法线
- 纹理坐标
- 顶点权重
- 切线

而本篇的颜色，就是你接触“多属性顶点”的第一步。

## 七、第 3 步：为什么要引入 `varying`

这一篇最重要的新知识点，是这句：

```glsl
varying vec4 vColor;
```

它在顶点着色器和片元着色器里各写了一次：

### 顶点着色器里

```glsl
varying vec4 vColor;
```

### 片元着色器里

```glsl
varying vec4 vColor;
```

这表示：`vColor` 是一个在两个着色器阶段之间传递的数据通道。

你可以把它先理解成：

- `attribute` 是 JavaScript 传进顶点着色器的入口
- `varying` 是顶点着色器传给片元着色器的桥梁

也就是说，这篇的完整颜色通路是：

```text
JavaScript -> aColor -> vColor -> gl_FragColor
```

这个通路是本篇最需要记住的内容。

## 八、第 4 步：顶点着色器把颜色交给 `varying`

继续看顶点着色器主体：

```glsl
void main() {
  gl_Position = vec4(aPosition, 1.0); // 设置坐标
  gl_PointSize = 10.0; // 设置尺寸
  vColor = aColor; // 设置颜色
}
```

前两句你已经很熟悉了：

- `gl_Position` 决定位置
- `gl_PointSize` 决定点大小

这一篇新增的是：

```glsl
vColor = aColor;
```

它的意思是：

- 从顶点属性 `aColor` 读取颜色
- 再把这个颜色写入 `vColor`
- 让后面的片元着色器可以继续使用

### 为什么不能在片元着色器里直接读 `aColor`

因为 `attribute` 是顶点着色器阶段的输入，不是片元着色器阶段的输入。

所以你必须：

1. 先把颜色传给顶点着色器
2. 再通过 `varying` 往后传
3. 最终让片元着色器读取

这就是 WebGL 着色器阶段之间的数据流动方式。

## 九、第 5 步：片元着色器使用传过来的颜色

再看片元着色器：

```glsl
precision mediump float;
varying vec4 vColor;

void main() {
  gl_FragColor = vColor; // 设置颜色
}
```

这里的逻辑很直接：

- 接收顶点着色器传过来的 `vColor`
- 把它直接输出给 `gl_FragColor`

### 你现在要知道什么

- 片元着色器最终决定像素颜色
- 它现在不再自己写死颜色
- 它只是消费前面传过来的颜色数据

这说明当前系统已经形成了一个完整的颜色传输链路。

## 十、第 6 步：创建第二个缓冲区

上一篇我们已经创建过位置缓冲区：

```js
const vertexBuffer = gl.createBuffer();
```

这一篇又新增了一个颜色缓冲区：

```js
const colorBuffer = gl.createBuffer();
```

这表示我们不只给 GPU 准备一份位置数据仓库，还额外准备了一份颜色数据仓库。

### 这说明了什么

说明 WebGL 完全可以：

- 用一个缓冲区存位置
- 用另一个缓冲区存颜色
- 然后让不同属性去读取不同缓冲区中的数据

这就是多个 attribute 和多个 buffer 的基本协作模式。

## 十一、第 7 步：把颜色数据上传到 GPU

颜色缓冲区的处理流程和位置缓冲区非常像：

```js
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.STATIC_DRAW);
```

这两句的意思分别是：

1. 把 `colorBuffer` 设为当前操作的 `ARRAY_BUFFER`
2. 把 `colorData` 上传到这个缓冲区

到这里，GPU 侧已经有了一份可读取的颜色数据。

## 十二、第 8 步：找到 `aColor` 的位置并启用它

接下来和上一篇的位置属性处理完全平行：

```js
const colorLocation = gl.getAttribLocation(program, "aColor");
gl.enableVertexAttribArray(colorLocation);
```

这两步表示：

- 找到 `aColor` 在程序中的属性位置
- 启用这个属性，让它可以从缓冲区读取数据

你可以把它和位置属性放在一起对照着看：

```js
const positionLocation = gl.getAttribLocation(program, "aPosition");
gl.enableVertexAttribArray(positionLocation);

const colorLocation = gl.getAttribLocation(program, "aColor");
gl.enableVertexAttribArray(colorLocation);
```

看到这里，你应该能逐渐建立一种规律感：

**每增加一个顶点属性，基本都会重复一套“找位置 + 启用属性 + 指定读取方式”的流程。**

## 十三、第 9 步：告诉 GPU 如何读取颜色数据

最后再看这一句：

```js
gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
```

这和上一篇的位置属性指针非常像，只是这里有一个关键区别：

- 位置用的是 `3`
- 颜色用的是 `4`

为什么？

因为：

- 位置数据是 `x, y, z`
- 颜色数据是 `r, g, b, a`

也就是说，每个颜色顶点属性由 4 个浮点值组成。

把它翻成大白话就是：

```js
gl.vertexAttribPointer(
  colorLocation, // aColor 的位置编号
  4,             // 每次读取 4 个值
  gl.FLOAT,      // 每个值是浮点数
  false,         // 不做归一化
  0,             // 数据紧密排列
  0              // 从缓冲区开头读取
);
```

### 你要特别留意这一点

这句不是在告诉 GPU “颜色是什么”，而是在告诉 GPU：

**应该怎样从当前绑定的颜色缓冲区里，把数据解释成 `aColor`。**

这和上一篇理解 `aPosition` 的方式完全一致，只是这次换成了颜色。

## 十四、把颜色数据流完整串起来

现在我们把这次新增的颜色流程完整串起来：

1. JavaScript 创建颜色数据 `colorData`
2. 创建颜色缓冲区 `colorBuffer`
3. 把缓冲区绑定到 `gl.ARRAY_BUFFER`
4. 用 `bufferData()` 把颜色上传到 GPU
5. 用 `getAttribLocation()` 找到 `aColor`
6. 用 `enableVertexAttribArray()` 启用 `aColor`
7. 用 `vertexAttribPointer()` 指定 `aColor` 的读取规则
8. 顶点着色器通过 `aColor` 读取颜色
9. 顶点着色器把颜色写入 `vColor`
10. 片元着色器读取 `vColor`
11. 片元着色器用 `gl_FragColor = vColor` 输出最终颜色

如果把上一篇和这一篇结合起来看，你现在其实已经掌握了两条并行的数据链路：

```text
位置: JavaScript -> Buffer -> aPosition -> gl_Position
颜色: JavaScript -> Buffer -> aColor -> vColor -> gl_FragColor
```

这就是本篇的核心成果。

## 十五、这篇为什么特别关键

这一篇的重要性，不只是“点变成了绿色”，而是你开始真正理解：

- 顶点可以同时携带多种属性
- 不同属性可以来自不同缓冲区
- 顶点着色器和片元着色器之间可以传值

这三个认知一建立，后面很多图形学内容都会顺畅很多。

因为后面你学习：

- 多点绘制
- 渐变颜色
- 纹理坐标
- 法线光照

本质上都是在继续扩展这套“属性输入 + 着色器传递”的体系。

## 十六、初学者最容易卡住的几个地方

### 1. 为什么点还是红色

优先检查：

- 片元着色器是否还在使用写死颜色
- 是否已经改成 `gl_FragColor = vColor`
- `vColor` 是否在两个 shader 中都声明了
- 顶点着色器里是否写了 `vColor = aColor`

### 2. 为什么 `varying` 要在两个 shader 中都写

因为它是两个着色器阶段共享的一条数据通道，声明必须对应起来，数据才能正确传递。

### 3. 为什么颜色也可以用 `attribute`

因为颜色本质上也是“每个顶点都可能不同的一份输入数据”。只要它属于每顶点属性，就可以通过 `attribute` 传入。

### 4. 为什么颜色缓冲区也要重新 `bindBuffer`

因为 WebGL 的缓冲区操作始终是针对“当前绑定对象”生效。你切换到颜色缓冲区后，后续的 `bufferData()` 和 `vertexAttribPointer()` 才会针对颜色这份数据工作。

### 5. 为什么片元着色器里要写 `precision mediump float`

因为在片元着色器中使用浮点数时，通常需要显式声明精度，否则在不少环境下会直接报错。

## 十七、这一篇和前两篇的关系

你可以把前三篇连起来理解成一个非常自然的学习台阶：

### 第一篇解决的是

怎么让 WebGL 第一次画出一个点。

### 第二篇解决的是

怎么把位置从 JavaScript 传给 GPU。

### 第三篇解决的是

怎么把更多顶点属性继续传给 GPU，并在两个着色器阶段之间传递数据。

这三个阶段串起来，其实就是 WebGL 最基础的数据与渲染模型：

1. 先建立渲染闭环
2. 再建立位置数据输入
3. 再建立多属性输入和阶段间传值

