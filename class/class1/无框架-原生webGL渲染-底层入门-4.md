# 无框架原生 WebGL 入门：用 uniform 从 JavaScript 控制点大小

上一篇我们已经把颜色从 JavaScript 传进了着色器，并建立起了这样一条完整链路：

```text
JavaScript -> Buffer -> aColor -> vColor -> gl_FragColor
```

到那一步，我们已经接触到了两个非常重要的输入角色：

- `aPosition`：每个顶点各自拥有的位置
- `aColor`：每个顶点各自拥有的颜色

这类数据有一个共同点：

**它们通常是“每个顶点都可能不同”的数据。**

但这次示例又往前走了一步。它新增了这样一个变量：

```glsl
uniform float uPointSize;
```

并且在 JavaScript 里这样传值：

```js
const pointSize = 40.0;
const pointSizeLocation = gl.getUniformLocation(program, "uPointSize");
gl.uniform1f(pointSizeLocation, pointSize);
```

这意味着这次我们要学习的，不再只是“每顶点属性”，而是另一类完全不同的输入：

**整次绘制过程共享的一份参数。**

这类参数，在 WebGL 里就叫 `uniform`。

学完这一篇，你会搞清楚这些问题：

1. 什么是 `uniform`
2. `uniform` 和 `attribute` 的区别是什么
3. 为什么点大小更适合用 `uniform`
4. `getUniformLocation()` 和 `uniform1f()` 分别在做什么
5. WebGL 中“每顶点数据”和“全局共享参数”应该怎么区分

## 一、这一篇解决什么问题

第三篇里，点大小还是直接写死在顶点着色器中的：

```glsl
gl_PointSize = 10.0;
```

这种写法当然能工作，但它有一个明显问题：

- 如果你想把点变大或变小
- 就必须改 shader 代码
- 改完还要重新编译、重新链接

这在学习阶段还能接受，但从“如何组织渲染参数”的角度看，这并不优雅。

于是这一篇把它改成了这样：

```glsl
uniform float uPointSize;

void main() {
  gl_PointSize = uPointSize;
}
```

这样做之后：

- shader 逻辑不需要改
- JavaScript 可以动态控制点大小
- GPU 每次绘制时都读取当前传入的统一参数

这就是本篇的核心变化。

## 二、先看这次运行后的效果

这次案例运行后，你应该看到：

- 页面背景仍然是黑色
- 右侧仍然有一个绿色点
- 但点明显比上一篇更大

为什么更大？

因为这次 JavaScript 里新增了：

```js
const pointSize = 40.0;
```

然后通过 `uniform` 传给了顶点着色器，所以最终：

```glsl
gl_PointSize = uPointSize;
```

也就等价于把点大小设成了 `40.0`。

## 三、先把完整代码跑起来

先和前几篇一样，先运行完整代码，再一点点拆它：

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
    gl.drawArrays(gl.POINT, 0, 1);
  </script>
</html>
```

## 四、先和上一篇对比：这次新增了什么

和第三篇相比，这次真正新增的内容主要有 3 处：

### 1. JavaScript 中新增了一个普通变量

```js
const pointSize = 40.0;
```

### 2. 顶点着色器中新增了一个 `uniform`

```glsl
uniform float uPointSize;
```

### 3. JavaScript 中新增了一套 `uniform` 传值流程

```js
const pointSizeLocation = gl.getUniformLocation(program, "uPointSize");
gl.uniform1f(pointSizeLocation, pointSize);
```

如果把这一篇的变化总结成一句话，就是：

**上一篇我们学会了传“每个顶点不同的数据”，这一篇开始学传“整次绘制共享的数据”。**

## 五、第 1 步：先理解为什么点大小适合用 `uniform`

先看现在的点大小变量：

```js
const pointSize = 40.0;
```

这个值有一个很重要的特点：

- 当前只有一个点
- 即使后面有多个点，你也可能希望它们先共用同一个尺寸
- 这个值不是“每个顶点各不相同”的数据
- 而是“这次绘制统一使用”的参数

这正是 `uniform` 最适合处理的场景。

### 什么时候该用 `attribute`

当数据是“每个顶点都可能不同”的时候，比如：

- 顶点位置
- 顶点颜色
- 顶点法线
- 纹理坐标

### 什么时候该用 `uniform`

当数据是“整次绘制共享一份”的时候，比如：

- 点大小
- 平移量
- 缩放系数
- 时间参数
- 投影矩阵
- 统一颜色

### 你先记住一句话

`attribute` 面向“每个顶点”，`uniform` 面向“整次绘制”。

这句话非常重要，后面会一直用到。

## 六、第 2 步：在顶点着色器中声明 `uniform`

看顶点着色器新增的这一句：

```glsl
uniform float uPointSize;
```

可以拆成三部分理解：

- `uniform`：表示这是一个统一变量
- `float`：说明它是浮点数
- `uPointSize`：变量名

### 为什么变量名前面习惯加 `u`

这不是 WebGL 强制要求，而是一种常见命名约定：

- `a` 开头一般表示 `attribute`
- `v` 开头一般表示 `varying`
- `u` 开头一般表示 `uniform`

所以：

- `aPosition` 一看就是顶点属性
- `vColor` 一看就是阶段间传值
- `uPointSize` 一看就是统一变量

这种命名方式在工程里非常有帮助。

## 七、第 3 步：用 `uniform` 控制 `gl_PointSize`

再看顶点着色器主体：

```glsl
void main() {
  gl_Position = vec4(aPosition, 1.0); // 设置坐标
  gl_PointSize = uPointSize; // 设置尺寸
  vColor = aColor; // 设置颜色
}
```

这里最关键的变化是：

```glsl
gl_PointSize = uPointSize;
```

之前写的是：

```glsl
gl_PointSize = 10.0;
```

现在改成从 `uniform` 里读取。

这意味着：

- shader 本身不再写死尺寸
- JavaScript 传什么值，点就用什么尺寸
- 你可以在不改 shader 的前提下，灵活调整显示效果

从架构角度看，这就是“把配置从 shader 代码里剥离出来”的开始。

## 八、第 4 步：为什么这里不用 `attribute`

很多初学者看到这里会自然产生一个问题：

既然位置和颜色都可以通过 `attribute` 传，那点大小为什么不也用 `attribute`？

答案是：可以，但当前这个场景下没必要。

### 因为这次点大小不是“每顶点不同”

当前位置和颜色都有“每个顶点可能不同”的含义，所以它们非常适合做成 `attribute`。

但当前示例里，点大小只是整次绘制共享的一份值。

如果你也把它做成 `attribute`，就会显得有点绕：

- 还得再建一个 buffer
- 还得再绑定一次
- 还得再启用一次 attribute
- 但最终只传一个全局共享值

这就不划算了。

### 所以这里用 `uniform` 更合理

因为它正好表达了：

**“这是一份所有顶点都共享的参数。”**

这就是 `uniform` 的职责。

## 九、第 5 步：在 JavaScript 里找到 `uniform` 的位置

接着看这句代码：

```js
const pointSizeLocation = gl.getUniformLocation(program, "uPointSize");
```

它的作用和之前的 `getAttribLocation()` 有点像，但对象不一样。

你可以这样对比理解：

### 之前找 `attribute`

```js
const positionLocation = gl.getAttribLocation(program, "aPosition");
```

### 现在找 `uniform`

```js
const pointSizeLocation = gl.getUniformLocation(program, "uPointSize");
```

两者本质上都在做一件事：

- 根据变量名
- 去当前程序对象里查找对应的 GPU 位置

只是：

- `attribute` 用 `getAttribLocation()`
- `uniform` 用 `getUniformLocation()`

## 十、第 6 步：把 JavaScript 中的数值传给 `uniform`

找到位置之后，就可以真正传值了：

```js
gl.uniform1f(pointSizeLocation, pointSize);
```

这是本篇最重要的 API 之一。

它可以拆成两部分理解：

- `uniform1f`
- `(pointSizeLocation, pointSize)`

### `uniform1f` 是什么意思

这个名字可以拆开看：

- `uniform`：给 uniform 传值
- `1`：传 1 个值
- `f`：这个值是 float

所以这一句的意思就是：

**向 `uPointSize` 这个 uniform 传入一个浮点数值。**

### 当前传进去的是什么

```js
const pointSize = 40.0;
```

所以等价于告诉 GPU：

```text
uPointSize = 40.0
```

这样顶点着色器执行时，`gl_PointSize` 就会使用这个值。

## 十一、第 7 步：把这次的数据角色重新分工

到第四篇为止，这个小例子里已经出现了 3 类不同角色的数据：

### 1. 顶点位置

```glsl
attribute vec3 aPosition;
```

特点：

- 每个顶点都可能不同
- 通过 buffer 传入

### 2. 顶点颜色

```glsl
attribute vec4 aColor;
varying vec4 vColor;
```

特点：

- 每个顶点都可能不同
- 先通过 buffer 传给顶点着色器
- 再通过 `varying` 传给片元着色器

### 3. 点大小

```glsl
uniform float uPointSize;
```

特点：

- 整次绘制共享一份值
- 不需要 buffer
- 直接用 `uniform` 传入

### 到这里你应该能形成一个很清晰的分工感

```text
attribute: 处理每个顶点不同的数据
varying:   处理着色器阶段之间传递的数据
uniform:   处理整次绘制共享的数据
```

这 3 个角色，是 WebGL 入门阶段最核心的概念之一。

## 十二、把这次的完整链路串起来

现在把第四篇完整流程再串一次：

1. JavaScript 中准备位置数据 `pointData`
2. JavaScript 中准备颜色数据 `colorData`
3. JavaScript 中准备共享参数 `pointSize`
4. 位置通过 buffer 传给 `aPosition`
5. 颜色通过 buffer 传给 `aColor`
6. 点大小通过 `uniform` 传给 `uPointSize`
7. 顶点着色器使用 `aPosition` 设置 `gl_Position`
8. 顶点着色器使用 `uPointSize` 设置 `gl_PointSize`
9. 顶点着色器把 `aColor` 写入 `vColor`
10. 片元着色器读取 `vColor`
11. 片元着色器输出最终颜色
12. `gl.drawArrays()` 触发绘制

如果用一句话总结第四篇：

**你已经开始同时掌握 attribute、varying、uniform 这三种核心数据通路。**

## 十三、这篇为什么特别关键

这一篇看起来只是把点从 `10px` 改成了 `40px`，但真正重要的不是视觉变化，而是思维变化。

因为你现在第一次开始理解：

- 哪些数据应该做成顶点属性
- 哪些数据应该做成统一参数
- shader 代码和外部配置应该如何分工

这个分工一旦理解透彻，后面学习下面这些内容时会轻松很多：

- 位移偏移量
- 旋转角度
- 时间驱动动画
- 变换矩阵
- 相机和投影

这些内容里，很多核心输入都会以 `uniform` 的形式出现。

## 十四、初学者最容易卡住的几个地方

### 1. 为什么我改了 `pointSize`，点大小没变化

优先检查这些地方：

- 顶点着色器是否已经写成 `gl_PointSize = uPointSize`
- 是否正确获取了 `uPointSize` 的位置
- 是否调用了 `gl.uniform1f(pointSizeLocation, pointSize)`
- 是否在 `gl.useProgram(program)` 之后设置 uniform

### 2. 为什么 `uniform` 不需要缓冲区

因为它不是“每个顶点一份数据”的输入，而是当前程序使用的一份统一参数，所以不走 buffer 那条顶点属性通路。

### 3. 为什么这里是 `uniform1f`，不是别的名字

因为这次传的是一个浮点数：

- `1` 表示 1 个值
- `f` 表示 float

这是 WebGL 统一变量传值函数的一种命名模式。

### 4. 为什么点大小写在顶点着色器里，不写在片元着色器里

因为 `gl_PointSize` 属于顶点着色器阶段控制的内置变量，片元着色器不负责设置它。

### 5. `uniform` 会不会对每个顶点都不同

当前一次 draw call 中，`uniform` 通常表示这次绘制共享的一份值。它的核心语义就是“统一”，而不是“每顶点不同”。

## 十五、这一篇和前几篇的关系

到第四篇为止，这套入门路线已经很完整了：

### 第一篇解决的是

怎么让 WebGL 第一次把点画出来。

### 第二篇解决的是

怎么把位置从 JavaScript 传给 GPU。

### 第三篇解决的是

怎么把颜色作为第二个顶点属性传入，并理解 `varying`。

### 第四篇解决的是

怎么把一份整次绘制共享的参数传入着色器，也就是正式理解 `uniform`。

如果把这四篇连起来看，你已经掌握了 WebGL 初学阶段最核心的三种数据角色：

1. `attribute`
2. `varying`
3. `uniform`

这比单纯记 API 更重要，因为这是后续所有渲染逻辑的基础认知框架。
