在 point_one3.html 文件中，点大小是通过以下步骤传递的：

1. 定义点大小值 ：
   在 JavaScript 中定义了点大小变量：
   
   ```
   const pointSize = 40.0;
   ```
2. 在顶点着色器中声明 uniform 变量 ：
   顶点着色器中使用 uniform float uPointSize 声明了一个 uniform 变量来接收点大小：
   
   ```
   uniform float uPointSize;
   ```
3. 在顶点着色器中使用点大小 ：
   在顶点着色器的 main 函数中，将 uniform 变量的值赋给内置变量 gl_PointSize ：
   
   ```
   gl_PointSize = uPointSize; // 设置尺寸
   ```
4. 获取 uniform 变量位置 ：
   在 JavaScript 中，通过 getUniformLocation 方法获取 uniform 变量在着色器程序中的位置：
   
   ```
   const pointSizeLocation = gl.getUniformLocation(program, 
   "uPointSize");
   ```
5. 传递点大小值到 GPU ：
   使用 uniform1f 方法将 JavaScript 中的点大小值传递给 GPU：
   
   ```
   gl.uniform1f(pointSizeLocation, pointSize);
   ```
这样，点大小就从 JavaScript 代码传递到了 GPU 中的顶点着色器，最终应用到绘制的点上。

为什么使用 Uniform 变量？

WebGL 中，从 CPU 向 GPU 传递数据主要有三种方式：

- Attribute ：每个顶点都不同的数据（如顶点位置、颜色）
- Uniform ：所有顶点共享的全局数据（如点大小、变换矩阵）
- Texture ：通过纹理传递大量数据

对于点大小这种所有顶点都相同的参数， Uniform 变量是最合适的选择 ，因为：

- 它在整个绘制过程中保持不变
- 可以在运行时动态修改
- 访问效率高，适合频繁更新的参数