(function(t,s){typeof exports=="object"&&typeof module<"u"?s(exports):typeof define=="function"&&define.amd?define(["exports"],s):(t=typeof globalThis<"u"?globalThis:t||self,s(t.Open3D={}))})(this,function(t){"use strict";class s{constructor(e){if(this.geometries=[],this.canvas=e,this.gl=e.getContext("webgl2"),!this.gl)throw new Error("WebGL2 not supported")}addGeometry(e){this.geometries.push(e)}render(){const e=this.gl;e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT|e.DEPTH_BUFFER_BIT);for(const r of this.geometries)r.render(e)}setSize(e,r){this.canvas.width=e,this.canvas.height=r,this.gl.viewport(0,0,e,r)}}class h{constructor(e,r,o){this.x=e,this.y=r,this.z=o}toArray(){return[this.x,this.y,this.z]}static fromArray(e){return new h(e[0],e[1],e[2])}}class d{constructor(e,r){this.vertexBuffer=null,this.vertices=e,this.shader=r}init(e){this.vertexBuffer=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,this.vertexBuffer),e.bufferData(e.ARRAY_BUFFER,this.vertices,e.STATIC_DRAW)}render(e){this.vertexBuffer||this.init(e),this.shader.use(e),e.bindBuffer(e.ARRAY_BUFFER,this.vertexBuffer);const r=e.getAttribLocation(this.shader.program,"aPosition");e.enableVertexAttribArray(r),e.vertexAttribPointer(r,3,e.FLOAT,!1,0,0),this.draw(e)}draw(e){throw new Error("Method not implemented.")}}class f extends d{constructor(e,r,o=5){super(e,r),this.pointSize=o}render(e){super.render(e),e.uniform1f(e.getUniformLocation(this.shader.program,"uPointSize"),this.pointSize)}draw(e){e.drawArrays(e.POINTS,0,this.vertices.length/3)}setPointSize(e){this.pointSize=e}}class c{constructor(e,r,o){const i=this.createShader(e,e.VERTEX_SHADER,r),a=this.createShader(e,e.FRAGMENT_SHADER,o);if(this.program=e.createProgram(),e.attachShader(this.program,i),e.attachShader(this.program,a),e.linkProgram(this.program),!e.getProgramParameter(this.program,e.LINK_STATUS)){const m=e.getProgramInfoLog(this.program);throw e.deleteProgram(this.program),e.deleteShader(a),e.deleteShader(i),new Error(`Could not compile WebGL program. 
${m}`)}}createShader(e,r,o){const i=e.createShader(r);if(e.shaderSource(i,o),e.compileShader(i),!e.getShaderParameter(i,e.COMPILE_STATUS)){const a=e.getShaderInfoLog(i);throw e.deleteShader(i),new Error(`Could not compile shader. 
${a}`)}return i}use(e){e.useProgram(this.program)}}function u(n){const e=`
    attribute vec3 aPosition;
    uniform float uPointSize;
    
    void main() {
      gl_Position = vec4(aPosition, 1.0);
      gl_PointSize = uPointSize;
    }
  `,r=`
    void main() {
      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
  `;return new c(n,e,r)}t.Geometry=d,t.Point=h,t.PointGeometry=f,t.Renderer=s,t.Shader=c,t.createPointShader=u,Object.defineProperty(t,Symbol.toStringTag,{value:"Module"})});
