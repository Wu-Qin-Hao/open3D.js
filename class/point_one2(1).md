为什么这里使用 `attribute` 而不是 `uniform`。

## attribute vs uniform 的区别

### **attribute（顶点属性）**
- **每个顶点可以有不同的值**
- 用于逐顶点变化的数据
- 例如：位置、颜色、纹理坐标、法线等

### **uniform（统一变量）**
- **所有顶点/片段共享相同的值**
- 用于整个绘制调用中不变的数据
- 例如：变换矩阵、光照参数、时间等

## 当前代码为什么用 attribute

虽然这个例子只渲染一个点，但使用 `attribute` 是因为：

```javascript
// 如果将来要渲染多个点，每个点可以有不同颜色
const colorData = new Float32Array([
  0.0, 1.0, 0.0, 1.0,  // 点1：绿色
  1.0, 0.0, 0.0, 1.0,  // 点2：红色
  0.0, 0.0, 1.0, 1.0   // 点3：蓝色
]);
```

## 如果使用 uniform 会怎样

使用 uniform 的方式：

```glsl
// 顶点着色器
uniform vec4 uColor;  // 使用uniform
varying vec4 vColor;
void main() {
  vColor = uColor;    // 所有点都是同一个颜色
}
```

```javascript
// JavaScript中设置uniform
const colorLocation = gl.getUniformLocation(program, "uColor");
gl.uniform4f(colorLocation, 0.0, 1.0, 0.0, 1.0);  // 设置统一颜色
```

## 什么时候用 uniform

**适合使用 uniform 的场景：**
- 所有点/三角形使用相同颜色
- 传递变换矩阵（模型视图矩阵、投影矩阵）
- 传递光照参数（光源位置、光照强度）
- 传递全局参数（时间、用户输入等）

## 总结

| 特性     | attribute            | uniform          |
| -------- | -------------------- | ---------------- |
| 数据范围 | 每个顶点不同         | 所有顶点相同     |
| 设置方式 | vertexAttribPointer  | uniform*         |
| 典型用途 | 位置、颜色、纹理坐标 | 矩阵、光照参数   |
| 性能     | 适合大量顶点数据     | 适合少量全局数据 |

在这个例子中，虽然只有一个点，但使用 `attribute` 更符合WebGL的最佳实践，为将来扩展（渲染多个不同颜色的点）提供了灵活性。如果确定所有点都是相同颜色，使用 `uniform` 会更高效。