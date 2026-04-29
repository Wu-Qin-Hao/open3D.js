WebGL 本质是一个**全局、隐式、持续生效的状态机**：所有绘制行为都依赖当前上下文（`gl`）里的一堆“状态变量”，一旦设置就一直有效，直到你主动修改。下面从核心概念、常见状态、工作机制、典型陷阱与优化实践五方面系统说明。

---

### 一、核心概念：什么是WebGL状态机
- **状态（State）**：WebGL上下文（`WebGLRenderingContext`）保存的一组**全局变量/开关/绑定对象**，决定后续绘制如何执行。
- **状态机（State Machine）**：
  1. **有记忆**：记住当前所有状态，跨绘制调用保持不变。
  2. **隐式依赖**：`drawArrays`/`drawElements` 本身不传“当前着色器/纹理/混合模式”，**完全靠当前状态决定行为**。
  3. **全局可变**：任何 `gl.xxx()` 都可能改状态，**污染后续绘制**。

类比：像画笔——选好颜色、粗细、混合模式后，**后续所有画线都用这些设置，直到你重设**。

---

### 二、WebGL核心状态分类（高频）
#### 1. 全局开关（Enable/Disable）
- `gl.DEPTH_TEST`：深度测试（遮挡关系）
- `gl.BLEND`：颜色混合（透明/叠加）
- `gl.CULL_FACE`：面剔除（不画背面）
- `gl.SCISSOR_TEST`：裁剪测试（限定绘制区域）
- 控制：`gl.enable(cap)` / `gl.disable(cap)`

#### 2. 绑定对象（当前“活动”资源）
- **着色器程序**：`gl.useProgram(program)`
- **顶点缓冲区（VBO）**：`gl.bindBuffer(gl.ARRAY_BUFFER, buffer)`
- **元素缓冲区（EBO）**：`gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer)`
- **纹理**：`gl.activeTexture(gl.TEXTURE0)` + `gl.bindTexture(gl.TEXTURE_2D, tex)`
- **帧缓冲区（FBO）**：`gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)`

#### 3. 顶点属性配置
- `gl.vertexAttribPointer(index, size, type, normalized, stride, offset)`：数据格式
- `gl.enableVertexAttribArray(index)`：启用该属性

#### 4. 渲染参数（直接赋值）
- 清除色：`gl.clearColor(r,g,b,a)`
- 清除深度：`gl.clearDepth(1.0)`
- 视口：`gl.viewport(x,y,w,h)`
- 混合函数：`gl.blendFunc(src,dst)`
- 深度函数：`gl.depthFunc(gl.LEQUAL)`

#### 5. Uniform变量（着色器全局参数）
- `gl.uniform1f/2f/3f/4f(...)`：浮点值
- `gl.uniformMatrix4fv(...)`：矩阵（MVP等）

---

### 三、工作机制：状态如何影响绘制
典型绘制流程（状态设置 → 绘制）：
```javascript
// 1. 设置状态（全局生效）
gl.useProgram(program); // 绑定着色器
gl.bindBuffer(gl.ARRAY_BUFFER, vbo); // 绑定顶点数据
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); // 顶点位置格式
gl.enableVertexAttribArray(0); // 启用位置属性
gl.uniformMatrix4fv(mvpLoc, false, mvpMatrix); // 传矩阵
gl.enable(gl.DEPTH_TEST); // 开深度测试

// 2. 绘制（完全依赖上述状态）
gl.drawArrays(gl.TRIANGLES, 0, 3);
```
- 关键点：**`drawArrays` 不接收任何“当前资源/模式”参数，全靠状态机**。
- 状态延续：上述状态会**一直保持**，直到你显式修改（如再 `useProgram` 另一个程序）。

---

### 四、典型陷阱：状态污染（最常见Bug）
#### 1. 忘记恢复状态
```javascript
// 模块A：开混合、绑定纹理T1
gl.enable(gl.BLEND);
gl.bindTexture(gl.TEXTURE_2D, T1);
drawObjectA();

// 模块B：直接绘制，没关混合、没解绑T1
drawObjectB(); // ❌ B意外用了混合+T1，结果错乱
```
后果：透明物体变成不透明、纹理串色、深度测试失效、黑屏。

#### 2. 绑定对象后忘记配置属性
```javascript
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
// 忘记 gl.vertexAttribPointer + enable
gl.drawArrays(...); // ❌ 顶点数据解析错误，几何体消失
```

#### 3. 用Uniform前没绑定程序
```javascript
gl.uniformMatrix4fv(mvpLoc, false, matrix); // ❌ 没useProgram，值设到“无程序”，无效
gl.useProgram(program);
gl.drawArrays(...);
```

---

### 五、状态管理最佳实践（避坑+高效）
#### 1. 最小化状态切换（性能核心）
- 按材质/着色器分组绘制：**先画所有用程序P+纹理T的物体，再切状态**，减少 `useProgram`/`bindTexture` 次数（GPU切换状态开销大）。

#### 2. 状态栈：保存+恢复（防污染）
```javascript
// 封装：保存关键状态
function saveState() {
  return {
    program: gl.getParameter(gl.CURRENT_PROGRAM),
    blend: gl.isEnabled(gl.BLEND),
    depth: gl.isEnabled(gl.DEPTH_TEST),
    texture: gl.getParameter(gl.TEXTURE_BINDING_2D)
  };
}

// 封装：恢复状态
function restoreState(state) {
  gl.useProgram(state.program);
  state.blend ? gl.enable(gl.BLEND) : gl.disable(gl.BLEND);
  state.depth ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST);
  gl.bindTexture(gl.TEXTURE_2D, state.texture);
}

// 使用：临时改状态，用完恢复
const prevState = saveState();
gl.enable(gl.BLEND);
gl.bindTexture(gl.TEXTURE_2D, TmpTex);
drawTmpObject();
restoreState(prevState); // ✅ 不影响后续绘制
```

#### 3. 状态缓存：避免重复设置
```javascript
let currentProgram = null;
function useProgramSafe(program) {
  if (currentProgram !== program) { // 仅当变化时才设
    gl.useProgram(program);
    currentProgram = program;
  }
}
```

#### 4. 调试工具：可视化状态
- **Spector.js**：捕获所有WebGL调用，**实时查看每步状态（程序/纹理/开关）**，快速定位污染点。
- **Chrome WebGL Inspector**：帧快照+状态树。

---

### 六、总结
WebGL状态机的本质是**“一次设置，全局生效，隐式依赖，易被污染”**。理解它是写对、写稳WebGL代码的前提：
- ✅ 所有绘制行为由**当前状态**决定，而非函数参数
- ✅ 高频状态：**程序、绑定对象、开关、顶点属性、Uniform**
- ✅ 核心痛点：**状态污染**（忘记恢复）
- ✅ 优化方向：**最小化切换、状态栈、缓存、调试工具**
