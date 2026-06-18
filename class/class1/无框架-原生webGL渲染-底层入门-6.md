# 无框架原生 WebGL 入门：让每个点拥有不同的大小

上一篇我们已经从“画一个点”正式进入了“批量绘制多个点”的阶段。

当时我们已经能做到：

- 一次传入多个顶点位置
- 一次传入多组顶点颜色
- 用一次 `drawArrays` 把多个点一起画出来

同时，第五篇里点大小仍然使用的是：

```glsl
uniform float uPointSize;
```

这意味着虽然我们已经能画多个点，但它们仍然共享同一个尺寸。

换句话说，上一篇的效果是：

- 点的位置可以不同
- 点的颜色可以不同
- 但点的大小还是统一的

这次示例继续往前走了一步，它把点大小从：

- 第五篇的 `uniform`

改成了：

- 第六篇的 `attribute`

也就是说，这一篇要解决的是：

**如何让每个顶点拥有自己独立的点大小。**

学完这一篇，你会搞清楚这些问题：

1. 为什么点大小这次不再适合用 `uniform`
2. 为什么 `aPointSize` 要声明成 `attribute float`
3. 点大小数组为什么和顶点数量一一对应
4. `vertexAttribPointer(pointSizeLocation, 1, gl.FLOAT, false, 0, 0)` 为什么这里是 `1`
5. “共享参数”与“每顶点参数”到底应该怎么区分

## 一、这一篇解决什么问题

第五篇里，点大小是这样传入的：

```js
const pointSize = 40.0;
const pointSizeLocation = gl.getUniformLocation(program, "uPointSize");
gl.uniform1f(pointSizeLocation, pointSize);
```

然后在顶点着色器里这样使用：

```glsl
uniform float uPointSize;
gl_PointSize = uPointSize;
```

这种方式的特点是：

- 所有点共享同一个值
- 一个点是 `40.0`
- 两个点也是 `40.0`
- 十个点还是 `40.0`

这在“统一控制所有点大小”的场景里非常合适。

但这次我们想要的效果不一样了：

- 第一个点比较大
- 第二个点比较小

这就意味着点大小不再是“整次绘制共享的一份参数”，而是“每个顶点都可能不同的一份数据”。

一旦语义变成“每顶点不同”，它就不该继续用 `uniform`，而应该改成 `attribute`。

这就是本篇最核心的知识点。

## 二、先看这次运行后的效果

这次案例运行后，你应该看到：

- 页面背景仍然是黑色
- 屏幕上仍然有两个点
- 右边那个点是绿色，而且更大
- 上边那个点是红色，而且更小

为什么会出现两个不同大小的点？

因为这次新增了一组点大小数据：

```js
const pointSizeData = new Float32Array([40.0, 10.0]);
```

这表示：

```text
第 1 个点的大小: 40.0
第 2 个点的大小: 10.0
```

也就是说，这次点大小已经不再是“所有点共用一个值”，而是“每个点自己有一个值”。

## 三、先把完整代码跑起来

先和前几篇一样，先运行完整代码，再逐步拆解：

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
    // 创建点大小数据
    const pointSizeData = new Float32Array([40.0, 10.0]);

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
    const pointCount = pointData.length / 3;
    gl.drawArrays(gl.POINT, 0, pointCount);
  </script>
</html>
```

## 四、先和上一篇对比：这次新增了什么

和第五篇相比，这一篇最关键的变化主要有 4 处：

### 1. `uniform` 点大小被移除了

第五篇里是：

```glsl
uniform float uPointSize;
```

这一篇不再使用它。

### 2. 新增了点大小数组

```js
const pointSizeData = new Float32Array([40.0, 10.0]);
```

### 3. 顶点着色器里新增了尺寸属性

```glsl
attribute float aPointSize;
```

### 4. JavaScript 里新增了一套点大小缓冲区传值流程

```js
const pointSizeBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, pointSizeBuffer);
gl.bufferData(gl.ARRAY_BUFFER, pointSizeData, gl.STATIC_DRAW);
const pointSizeLocation = gl.getAttribLocation(program, "aPointSize");
gl.enableVertexAttribArray(pointSizeLocation);
gl.vertexAttribPointer(pointSizeLocation, 1, gl.FLOAT, false, 0, 0);
```

如果把这篇文章的变化总结成一句话，就是：

**第五篇是“多个点共享一个尺寸”，第六篇是“多个点各自拥有自己的尺寸”。**

## 五、第 1 步：先理解为什么这里不能继续用 `uniform`

先回忆一下 `uniform` 的含义。

上一篇我们已经总结过：

```text
uniform -> 整次绘制共享的数据
```

所以第五篇里的：

```glsl
uniform float uPointSize;
```

适合这种场景：

- 所有点大小都一样
- 一次绘制只需要一份尺寸参数

但现在我们要的是：

- 第一个点 `40.0`
- 第二个点 `10.0`

这已经不是“共享一份参数”了，而是“每个顶点都有自己的值”。

### 这时候就必须改用 `attribute`

因为 `attribute` 的职责正是：

**为每个顶点提供各自独立的数据。**

所以这一篇不是随便换个写法，而是在根据数据语义重新选择正确的输入角色。

## 六、第 2 步：为什么 `aPointSize` 是 `attribute float`

先看顶点着色器新增的这一句：

```glsl
attribute float aPointSize;
```

这个声明非常值得拆开理解：

- `attribute`：说明它是每个顶点独立的一份输入
- `float`：说明每个顶点只需要 1 个浮点值
- `aPointSize`：变量名

### 为什么这里不是 `vec2`、`vec3` 或 `vec4`

因为点大小本身只需要一个数值，例如：

- `40.0`
- `10.0`
- `25.0`

它不像位置需要 `x y z`
也不像颜色需要 `r g b a`

它只是一个标量，所以类型就是：

```glsl
float
```

这也是后面 `vertexAttribPointer(..., 1, ...)` 中那个 `1` 的原因。

## 七、第 3 步：点大小数组里到底装了什么

先看这行代码：

```js
const pointSizeData = new Float32Array([40.0, 10.0]);
```

这表示一共传入了两个顶点尺寸：

```text
第 1 个点的尺寸: 40.0
第 2 个点的尺寸: 10.0
```

### 你可以把三组属性并排理解

当前位置数组：

```text
第 1 个点 -> (0.5, 0.0, 0.0)
第 2 个点 -> (0.0, 0.5, 0.0)
```

颜色数组：

```text
第 1 个点 -> 绿色
第 2 个点 -> 红色
```

点大小数组：

```text
第 1 个点 -> 40.0
第 2 个点 -> 10.0
```

这样你就会发现，这篇其实是在继续强化第五篇的一个重要概念：

**所有每顶点属性，都必须围绕“同一批顶点”按顺序一一对应。**

## 八、第 4 步：为什么点大小数组也要和顶点数量对齐

这是本篇最重要的理解点之一。

现在顶点着色器里有 3 个 `attribute`：

```glsl
attribute vec3 aPosition;
attribute vec4 aColor;
attribute float aPointSize;
```

这意味着对于每个顶点，GPU 都会尝试拿到：

- 一份位置
- 一份颜色
- 一份点大小

你可以把当前数据关系理解成：

```text
第 1 个顶点 -> 第 1 组位置 + 第 1 组颜色 + 第 1 个大小
第 2 个顶点 -> 第 2 组位置 + 第 2 组颜色 + 第 2 个大小
```

所以如果：

- 有 2 个位置
- 有 2 组颜色
- 但只有 1 个大小

那这批顶点的数据就不完整了。

### 你现在要建立的直觉

只要某个数据属于“每顶点属性”，它就要随着顶点数量一起增长。

这就是 `attribute` 和 `uniform` 最大的本质区别之一。

## 九、第 5 步：顶点着色器里是怎么使用 `aPointSize` 的

再看顶点着色器主体：

```glsl
void main() {
  gl_Position = vec4(aPosition, 1.0); // 设置坐标
  gl_PointSize = aPointSize; // 设置尺寸
  vColor = aColor; // 设置颜色
}
```

这次最关键的变化是：

```glsl
gl_PointSize = aPointSize;
```

第五篇写的是：

```glsl
gl_PointSize = uPointSize;
```

这两句表面看只改了一个变量名，但背后语义完全不同：

### 第五篇

```text
所有顶点共享同一个点大小
```

### 第六篇

```text
每个顶点使用自己对应的点大小
```

这就是为什么两个点最终会显示成一大一小。

## 十、第 6 步：点大小缓冲区这次是怎么建立的

新增的 JavaScript 流程如下：

```js
const pointSizeBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, pointSizeBuffer);
gl.bufferData(gl.ARRAY_BUFFER, pointSizeData, gl.STATIC_DRAW);
const pointSizeLocation = gl.getAttribLocation(program, "aPointSize");
gl.enableVertexAttribArray(pointSizeLocation);
gl.vertexAttribPointer(pointSizeLocation, 1, gl.FLOAT, false, 0, 0);
```

你会发现，这套流程和前面的位置、颜色几乎一模一样。

这非常重要，因为它说明：

**只要某个数据变成“每顶点属性”，它几乎都会走同一套 attribute 缓冲区流程。**

也就是说，现在你已经见过三套平行结构了：

### 位置

```js
buffer -> aPosition -> vec3
```

### 颜色

```js
buffer -> aColor -> vec4
```

### 点大小

```js
buffer -> aPointSize -> float
```

这个规律一旦看懂，后面学别的顶点属性就会轻松很多。

## 十一、第 7 步：为什么 `vertexAttribPointer` 这里是 `1`

这一句是本篇最容易忽略、但非常重要的细节：

```js
gl.vertexAttribPointer(pointSizeLocation, 1, gl.FLOAT, false, 0, 0);
```

这里第二个参数是：

```js
1
```

为什么不是 `3` 或 `4`？

因为每个顶点的点大小只占一个值。

### 回忆前几篇的写法

位置属性：

```js
gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
```

因为位置是：

```text
x, y, z
```

颜色属性：

```js
gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
```

因为颜色是：

```text
r, g, b, a
```

点大小属性：

```js
gl.vertexAttribPointer(pointSizeLocation, 1, gl.FLOAT, false, 0, 0);
```

因为点大小只是：

```text
size
```

### 你可以把这个参数理解成

“每个顶点在这个属性上，要连续读取几个分量”。

所以这里是 `1`，非常合理。

## 十二、第 8 步：现在三个 `attribute` 是怎么协同工作的

到第六篇为止，顶点着色器里已经有 3 个输入属性：

```glsl
attribute vec3 aPosition;
attribute vec4 aColor;
attribute float aPointSize;
```

它们各自的职责是：

### `aPosition`

- 决定点画在哪

### `aColor`

- 决定点是什么颜色

### `aPointSize`

- 决定点有多大

也就是说，对于每一个顶点，现在 GPU 会同时组装出这样一份完整描述：

```text
位置 + 颜色 + 大小
```

### 第 1 个顶点

```text
位置: (0.5, 0.0, 0.0)
颜色: 绿色
大小: 40.0
```

### 第 2 个顶点

```text
位置: (0.0, 0.5, 0.0)
颜色: 红色
大小: 10.0
```

这样你就可以非常直观地理解，为什么最终屏幕上会出现两个颜色不同、大小也不同的点。

## 十三、第五篇和第六篇最本质的区别

这一篇最容易看起来“只是多加了一个 buffer”，但真正重要的是你对数据语义的理解变了。

### 第五篇

点大小属于：

```text
整次绘制共享的数据
```

所以应该用：

```text
uniform
```

### 第六篇

点大小属于：

```text
每个顶点各自不同的数据
```

所以应该用：

```text
attribute
```

### 这一点比记 API 更重要

因为你以后做图形系统时，不是先问“该写哪个函数”，而是先问：

**这份数据到底是共享的，还是逐顶点变化的？**

这个判断一旦准确，很多 API 选择都会自然顺下来。

## 十四、把这次的完整数据流串起来

现在把第六篇完整流程串一次：

1. JavaScript 中准备两组位置数据
2. JavaScript 中准备两组颜色数据
3. JavaScript 中准备两组点大小数据
4. 位置数据通过位置缓冲区传给 `aPosition`
5. 颜色数据通过颜色缓冲区传给 `aColor`
6. 点大小数据通过点大小缓冲区传给 `aPointSize`
7. 顶点着色器处理第 1 个顶点时，读取第 1 组位置、第 1 组颜色、第 1 个大小
8. 顶点着色器处理第 2 个顶点时，读取第 2 组位置、第 2 组颜色、第 2 个大小
9. 顶点着色器分别设置 `gl_Position`、`gl_PointSize` 和 `vColor`
10. 片元着色器根据 `vColor` 输出最终颜色
11. `gl.drawArrays(gl.POINT, 0, pointCount)` 一次性绘制出两个大小不同的点

### 这一篇你最该记住的一句话

**只要某个值需要“每个顶点都可能不同”，它就应该优先考虑走 `attribute` 通路。**

## 十五、初学者最容易卡住的几个地方

### 1. 为什么两个点大小还是一样

优先检查：

- 顶点着色器是否已经改成 `gl_PointSize = aPointSize`
- 是否已经删除了旧的 `uniform` 点大小逻辑
- `pointSizeData` 是否真的传入了两个不同的值

### 2. 为什么点大小数组只有两个值也能工作

因为当前只有两个顶点，而每个顶点的点大小只需要 1 个浮点值，所以两个顶点一共只需要两个值。

### 3. 为什么这里也要单独建一个 buffer

因为只要它是 `attribute`，就通常意味着它要作为“每顶点输入数据”进入 GPU，这时就需要走缓冲区通路。

### 4. 为什么 `aPointSize` 是 `float` 而不是 `vec4`

因为点大小只需要一个数字，不需要多个分量。

### 5. 为什么第五篇用 `uniform`，第六篇却必须改成 `attribute`

因为两篇的需求语义已经变了：

- 第五篇是“共享同一个大小”
- 第六篇是“每个点有自己的大小”

语义变了，数据角色自然也应该变。
