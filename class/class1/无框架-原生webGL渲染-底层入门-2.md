# 无框架原生 WebGL 入门：把点坐标从 JavaScript 传给 GPU

上一篇我们完成了 WebGL 的第一个最小闭环：在屏幕中间绘制一个红色点。

那一篇有一个非常重要的特点：**点的位置是直接写死在顶点着色器里的。**

也就是说，GPU 不是从外部读取顶点数据，而是自己在 shader 里直接写了：

```glsl
gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
```

这种方式很适合入门，因为你可以先专注理解渲染流程本身。但它也有一个明显问题：

- 点的位置不能灵活变化
- 如果你要画多个点，写法会越来越别扭
- JavaScript 侧的数据无法真正参与渲染

所以这一篇，我们继续往前走一步：

**不再把点的位置写死在着色器里，而是从 JavaScript 创建顶点数据，再传给 GPU 使用。**

学完这一篇，你会搞清楚这些概念：

1. 什么是顶点数据
2. 什么是顶点缓冲区
3. 什么是 `attribute`
4. `bufferData`、`getAttribLocation`、`vertexAttribPointer` 分别在做什么
5. 为什么这一步是从“能画图”走向“能组织数据”的关键

## 一、这篇文章解决什么问题

上一篇的点画在屏幕中心，是因为顶点着色器里写死了：

```glsl
gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
```

这一篇改成了：

```glsl
attribute vec3 aPosition;

void main() {
  gl_Position = vec4(aPosition, 1.0);
  gl_PointSize = 10.0;
}
```

注意这次不再直接写 `(0.0, 0.0, 0.0)`，而是从 `aPosition` 读取位置。

这意味着：

- 顶点坐标不再写死在 shader 里
- 顶点坐标可以从 JavaScript 传入
- GPU 会按你传入的数据来渲染

这就是本篇的核心变化。

## 二、先看这次运行后的效果

这次案例运行后，你应该看到：

- 页面背景仍然是黑色
- 屏幕上仍然只有一个红色点
- 但这个点不在中心，而是偏右一点

为什么会偏右？

因为这次传入的点数据是：

```js
const pointData = new Float32Array([0.5, 0.0, 0.0]);
```

其中 `x = 0.5`，说明点会出现在屏幕右半边。

## 三、先把完整代码跑起来

先不要急着拆细节，先把完整代码运行一下，感受和上一篇的区别：

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

    // ------------------------------------------着色器运行固定流水线----------------------------------------
    // 编写顶点着色器源码
    const vertexShaderSource = `
      attribute vec3 aPosition;
      void main() {
        gl_Position = vec4(aPosition, 1.0); // 设置坐标
        gl_PointSize = 10.0; // 设置尺寸
      }
    `;
    // 编写片段着色器源码
    const fragmentShaderSource = `
      precision mediump float;
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
    // ---------------------------------------传递数据到着色器固定流水线--------------------------------------

    // 绘制点
    gl.drawArrays(gl.POINT, 0, 1);
  </script>
</html>
```

## 四、先和上一篇对比：这次到底多了什么

和上一篇相比，这次真正新增的内容主要有两部分：

### 1. 新增了顶点数据

```js
const pointData = new Float32Array([0.5, 0.0, 0.0]);
```

这表示我们在 JavaScript 里先准备了一个点的位置。

### 2. 新增了数据传输流程

```js
const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, pointData, gl.STATIC_DRAW);
const positionLocation = gl.getAttribLocation(program, "aPosition");
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
```

这一整段代码的目标只有一个：

**把 `pointData` 里的坐标传给顶点着色器中的 `aPosition`。**

你可以先记住这句话，后面再一步一步理解。

## 五、第 1 步：先在 JavaScript 里准备顶点数据

先看这行代码：

```js
const pointData = new Float32Array([0.5, 0.0, 0.0]);
```

这表示我们创建了一段浮点型数组数据，里面有 3 个值：

- `0.5` 表示 `x`
- `0.0` 表示 `y`
- `0.0` 表示 `z`

也就是说，这个点的坐标是：

```js
(0.5, 0.0, 0.0)
```

### 为什么要用 `Float32Array`

因为 WebGL 很多底层数据接口都要求使用类型化数组，这样浏览器可以更高效地把数据传给 GPU。

你可以先把它理解成：

- 普通数组更像通用 JavaScript 数据
- `Float32Array` 更像适合图形计算的数据格式

### 你可以立刻试一下

把它改成：

```js
const pointData = new Float32Array([-0.5, 0.0, 0.0]);
```

你会看到点移动到左边。

再改成：

```js
const pointData = new Float32Array([0.0, 0.5, 0.0]);
```

你会看到点移动到上方。

这一步的目的，是让你明确感受到：

**现在点的位置已经掌握在 JavaScript 数据手里了。**

## 六、第 2 步：让顶点着色器接收外部传入的位置

上一篇的顶点着色器是直接写死坐标，这次改成了：

```js
const vertexShaderSource = `
  attribute vec3 aPosition;
  void main() {
    gl_Position = vec4(aPosition, 1.0); // 设置坐标
    gl_PointSize = 10.0; // 设置尺寸
  }
`;
```

这里最关键的是这一行：

```glsl
attribute vec3 aPosition;
```

它表示：顶点着色器声明了一个名叫 `aPosition` 的顶点属性变量，这个变量会从外部接收每个顶点的位置数据。

### 你现在要知道什么

- `attribute` 用来接收每个顶点的输入数据
- `vec3` 表示这个属性由 3 个浮点数组成
- `aPosition` 是变量名，后面 JavaScript 会按这个名字找到它

接下来这句：

```glsl
gl_Position = vec4(aPosition, 1.0);
```

表示把传进来的三维坐标补成四维坐标，再交给 `gl_Position`。

也就是说：

- 以前是 shader 自己决定位置
- 现在是 shader 读取外部传进来的位置

这是一个非常重要的变化。

## 七、第 3 步：创建顶点缓冲区

数据已经在 JavaScript 里准备好了，但 GPU 不会自动知道它的存在。你还需要创建一个缓冲区对象：

```js
const vertexBuffer = gl.createBuffer();
```

你可以把缓冲区理解成 GPU 侧的一块“数据仓库”，专门用来存放顶点数据。

### 为什么需要缓冲区

因为 WebGL 不会直接拿 JavaScript 变量当顶点输入。你必须：

1. 先创建一个 GPU 可管理的缓冲区对象
2. 再把数据上传进去
3. 最后告诉 shader 该怎么读取它

这就是顶点数据通路的基本思路。

## 八、第 4 步：绑定缓冲区到当前上下文

创建完缓冲区之后，还要把它绑定到当前目标上：

```js
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
```

这句的意思可以理解成：

- 告诉 WebGL：接下来我操作的是这个顶点缓冲区
- 并且它属于 `ARRAY_BUFFER` 这个目标类型

这里的 `gl.ARRAY_BUFFER` 通常用于存储顶点属性数据。

### 你可以这样理解这一步

如果 `createBuffer()` 是“买了一个仓库”，那么 `bindBuffer()` 就像“把这个仓库指定为当前正在使用的仓库”。

## 九、第 5 步：把顶点数据上传到 GPU

现在轮到真正把数据送进缓冲区：

```js
gl.bufferData(gl.ARRAY_BUFFER, pointData, gl.STATIC_DRAW);
```

这句很关键，建议你记住它的三个核心部分：

- 第一个参数：数据上传到哪个目标，这里是 `gl.ARRAY_BUFFER`
- 第二个参数：真正要上传的数据，这里是 `pointData`
- 第三个参数：数据的使用方式，这里是 `gl.STATIC_DRAW`

### `gl.STATIC_DRAW` 是什么意思

它表示这批数据通常只设置一次，但会被绘制多次。

在这个案例里虽然只画一次，但用它作为入门示例完全没问题。

### 到这一步发生了什么

你可以把当前流程理解成：

1. JavaScript 里有一份 `pointData`
2. 调用 `bufferData()` 后，这份数据被上传到了 GPU 可读取的缓冲区里

但现在还差最后一步：**GPU 还不知道这块数据应该喂给 shader 里的哪个变量。**

## 十、第 6 步：找到 shader 里的 `aPosition`

接下来这一句非常重要：

```js
const positionLocation = gl.getAttribLocation(program, "aPosition");
```

它的作用是：在当前程序对象 `program` 里，找到顶点属性 `aPosition` 的位置编号。

你可以把它理解成“查地址”：

- JavaScript 知道变量名字叫 `aPosition`
- GPU 真正使用的是一个内部位置编号
- `getAttribLocation()` 就是把名字映射成这个编号

如果这一步拿不到正确位置，后面就无法把缓冲区数据和 shader 属性对应起来。

## 十一、第 7 步：启用这个顶点属性

找到位置之后，还要启用它：

```js
gl.enableVertexAttribArray(positionLocation);
```

这句表示：允许这个顶点属性从缓冲区中读取数据。

如果你不启用它，哪怕缓冲区里有数据、位置也找到了，shader 也不一定会按你预期去取值。

这一步经常是初学者容易漏掉的地方。

## 十二、第 8 步：告诉 GPU 该如何读取这段数据

这一篇最容易让人第一次看懵的，通常就是这句：

```js
gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
```

它的作用是：

**定义 `aPosition` 应该如何从当前绑定的缓冲区中读取数据。**

先把每个参数翻成大白话：

```js
gl.vertexAttribPointer(
  positionLocation, // 这个属性的位置编号
  3,                // 每个顶点读取 3 个值
  gl.FLOAT,         // 每个值的类型是 float
  false,            // 不做归一化
  0,                // 步长为 0，表示数据是紧密排列
  0                 // 从缓冲区开头开始读
);
```

### 为什么这里是 `3`

因为我们定义的顶点数据是：

```js
[0.5, 0.0, 0.0]
```

也就是每个顶点由 3 个分量组成：`x`、`y`、`z`。

### 为什么这里是 `gl.FLOAT`

因为 `pointData` 是 `Float32Array`，所以每个分量都是浮点数。

### 为什么 `stride` 和 `offset` 都是 `0`

因为当前数据结构非常简单，只有一个点，且数据连续排列，没有夹杂别的属性。

所以 WebGL 可以直接从头开始，按紧密排列的方式读取。

### 你先不用死记所有参数

入门阶段你只要记住一句话就够了：

`vertexAttribPointer()` 就是在告诉 GPU，应该按什么规则把缓冲区数据解释成顶点属性。

## 十三、第 9 步：发出绘制命令

前面的所有事情，本质上都在做“数据准备”。最后还是要靠 draw call 触发真正绘制：

```js
gl.drawArrays(gl.POINT, 0, 1);
```

它的含义和上一篇一样：

- 绘制类型是点
- 从第 0 个顶点开始
- 一共绘制 1 个顶点

不同的是，这次这个顶点的位置不是 shader 内部写死的，而是来自外部传入的 `pointData`。

所以这一次的学习重点，不是“画了一个点”，而是：

**你第一次完成了 JavaScript -> Buffer -> Attribute -> Shader 的数据传输链路。**

## 十四、把整段流程串起来理解一遍

到这里，建议你再把这次代码按完整顺序重新理解一遍：

1. 创建 `canvas` 和 WebGL 上下文
2. 准备一份顶点数据 `pointData`
3. 在顶点着色器里声明 `attribute vec3 aPosition`
4. 创建缓冲区对象
5. 绑定这个缓冲区到 `gl.ARRAY_BUFFER`
6. 用 `bufferData()` 把 `pointData` 上传到 GPU
7. 用 `getAttribLocation()` 找到 `aPosition` 的位置
8. 用 `enableVertexAttribArray()` 启用这个属性
9. 用 `vertexAttribPointer()` 指定读取规则
10. 调用 `drawArrays()` 完成绘制

如果上一篇是“WebGL 最小渲染闭环”，那么这一篇就是“WebGL 最小数据传输闭环”。

## 十五、这一步为什么特别重要

从学习路径上看，这一篇是一个明显的分水岭。

上一篇你学到的是：

- WebGL 需要着色器
- WebGL 需要程序对象
- WebGL 需要 draw call

这一篇你开始学到的是：

- 图形数据可以由 JavaScript 动态提供
- GPU 会从缓冲区中读取顶点属性
- shader 不只是写逻辑，还会消费外部输入数据

这意味着你已经不再停留在“把图画出来”，而是开始进入“如何组织图形数据”的阶段了。

后面无论你要画：

- 多个点
- 一条线
- 一个三角形
- 一个立方体

本质上都离不开这套思路。

## 十六、初学者最容易卡住的几个地方

### 1. 为什么页面上还是没有点

优先检查这些地方：

- `gl` 是否获取成功
- shader 是否编译成功
- `program` 是否链接成功
- `aPosition` 名字是否写对
- 是否执行了 `gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)`
- 是否执行了 `gl.enableVertexAttribArray(positionLocation)`
- 是否执行了 `gl.vertexAttribPointer(...)`
- 是否调用了 `gl.drawArrays(...)`

### 2. 为什么 `Float32Array` 不能随便换成字符串数组

因为 WebGL 底层需要明确的数据类型，顶点坐标本质上是数值型的 GPU 输入，不是普通文本。

### 3. 为什么要先 `bindBuffer`，再 `bufferData`

因为 WebGL 的很多 API 都是对“当前绑定对象”生效。你不先绑定，后续数据就不知道该送到哪个缓冲区。

### 4. 为什么 `aPosition` 要写成 `vec3`

因为当前点坐标使用了三个分量：`x`、`y`、`z`。如果你只传二维位置，也可以按你的数据结构设计成别的形式，但当前示例是三维写法。

## 十七、这一篇和上一篇的关系

你可以把这两篇连起来理解：

### 上一篇解决的是

怎么让 WebGL 跑起来，并完成第一次绘制。

### 这一篇解决的是

怎么把 JavaScript 里的顶点数据，真正交给 GPU 使用。

所以学习顺序非常合理：

1. 先学“怎么出图”
2. 再学“数据怎么进 GPU”

这其实就是很多图形课程最自然的入门路径。
