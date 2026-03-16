export class Camera {
  private position: Float32Array;
  private target: Float32Array;
  private up: Float32Array;
  private fov: number;
  private aspect: number;
  private near: number;
  private far: number;
  private viewMatrix: Float32Array;
  private projectionMatrix: Float32Array;
  private modelMatrix: Float32Array;
  private mvpMatrix: Float32Array;

  constructor(
    position: [number, number, number] = [0, 0, 5],
    target: [number, number, number] = [0, 0, 0],
    up: [number, number, number] = [0, 1, 0],
    fov: number = 45,
    aspect: number = 1,
    near: number = 0.1,
    far: number = 1000
  ) {
    this.position = new Float32Array(position);
    this.target = new Float32Array(target);
    this.up = new Float32Array(up);
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    this.viewMatrix = new Float32Array(16);
    this.projectionMatrix = new Float32Array(16);
    this.modelMatrix = new Float32Array(16);
    this.mvpMatrix = new Float32Array(16);
    this.updateViewMatrix();
    this.updateProjectionMatrix();
    this.updateModelMatrix();
  }

  setPosition(x: number, y: number, z: number) {
    this.position[0] = x;
    this.position[1] = y;
    this.position[2] = z;
    this.updateViewMatrix();
  }

  setTarget(x: number, y: number, z: number) {
    this.target[0] = x;
    this.target[1] = y;
    this.target[2] = z;
    this.updateViewMatrix();
  }

  setAspect(aspect: number) {
    this.aspect = aspect;
    this.updateProjectionMatrix();
  }

  updateViewMatrix() {
    const [eyeX, eyeY, eyeZ] = this.position;
    const [centerX, centerY, centerZ] = this.target;
    const [upX, upY, upZ] = this.up;

    const fx = centerX - eyeX;
    const fy = centerY - eyeY;
    const fz = centerZ - eyeZ;
    const fLength = Math.sqrt(fx * fx + fy * fy + fz * fz);
    const fX = fx / fLength;
    const fY = fy / fLength;
    const fZ = fz / fLength;

    const sx = fY * upZ - fZ * upY;
    const sy = fZ * upX - fX * upZ;
    const sz = fX * upY - fY * upX;
    const sLength = Math.sqrt(sx * sx + sy * sy + sz * sz);
    const sX = sx / sLength;
    const sY = sy / sLength;
    const sZ = sz / sLength;

    const uX = sY * fZ - sZ * fY;
    const uY = sZ * fX - sX * fZ;
    const uZ = sX * fY - sY * fX;

    this.viewMatrix[0] = sX;
    this.viewMatrix[1] = uX;
    this.viewMatrix[2] = -fX;
    this.viewMatrix[3] = 0;
    this.viewMatrix[4] = sY;
    this.viewMatrix[5] = uY;
    this.viewMatrix[6] = -fY;
    this.viewMatrix[7] = 0;
    this.viewMatrix[8] = sZ;
    this.viewMatrix[9] = uZ;
    this.viewMatrix[10] = -fZ;
    this.viewMatrix[11] = 0;
    this.viewMatrix[12] = -(sX * eyeX + sY * eyeY + sZ * eyeZ);
    this.viewMatrix[13] = -(uX * eyeX + uY * eyeY + uZ * eyeZ);
    this.viewMatrix[14] = fX * eyeX + fY * eyeY + fZ * eyeZ;
    this.viewMatrix[15] = 1;
  }

  updateProjectionMatrix() {
    const f = 1.0 / Math.tan(this.fov * Math.PI / 360);
    const rangeInv = 1.0 / (this.near - this.far);

    this.projectionMatrix[0] = f / this.aspect;
    this.projectionMatrix[1] = 0;
    this.projectionMatrix[2] = 0;
    this.projectionMatrix[3] = 0;
    this.projectionMatrix[4] = 0;
    this.projectionMatrix[5] = f;
    this.projectionMatrix[6] = 0;
    this.projectionMatrix[7] = 0;
    this.projectionMatrix[8] = 0;
    this.projectionMatrix[9] = 0;
    this.projectionMatrix[10] = (this.near + this.far) * rangeInv;
    this.projectionMatrix[11] = -1;
    this.projectionMatrix[12] = 0;
    this.projectionMatrix[13] = 0;
    this.projectionMatrix[14] = this.near * this.far * rangeInv * 2;
    this.projectionMatrix[15] = 0;
  }

  updateModelMatrix() {
    this.modelMatrix[0] = 1;
    this.modelMatrix[1] = 0;
    this.modelMatrix[2] = 0;
    this.modelMatrix[3] = 0;
    this.modelMatrix[4] = 0;
    this.modelMatrix[5] = 1;
    this.modelMatrix[6] = 0;
    this.modelMatrix[7] = 0;
    this.modelMatrix[8] = 0;
    this.modelMatrix[9] = 0;
    this.modelMatrix[10] = 1;
    this.modelMatrix[11] = 0;
    this.modelMatrix[12] = 0;
    this.modelMatrix[13] = 0;
    this.modelMatrix[14] = 0;
    this.modelMatrix[15] = 1;
  }

  getViewMatrix(): Float32Array {
    return this.viewMatrix;
  }

  getProjectionMatrix(): Float32Array {
    return this.projectionMatrix;
  }

  getModelMatrix(): Float32Array {
    return this.modelMatrix;
  }

  getMVPMatrix(): Float32Array {
    this.multiplyMatrices(this.projectionMatrix, this.viewMatrix, this.mvpMatrix);
    const temp = new Float32Array(16);
    this.multiplyMatrices(this.mvpMatrix, this.modelMatrix, temp);
    this.mvpMatrix.set(temp);
    return this.mvpMatrix;
  }

  getPosition(): Float32Array {
    return this.position;
  }

  private multiplyMatrices(a: Float32Array, b: Float32Array, result: Float32Array) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    const b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    result[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    result[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    result[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    result[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    const b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7];
    result[4] = b4 * a00 + b5 * a10 + b6 * a20 + b7 * a30;
    result[5] = b4 * a01 + b5 * a11 + b6 * a21 + b7 * a31;
    result[6] = b4 * a02 + b5 * a12 + b6 * a22 + b7 * a32;
    result[7] = b4 * a03 + b5 * a13 + b6 * a23 + b7 * a33;

    const b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11];
    result[8] = b8 * a00 + b9 * a10 + b10 * a20 + b11 * a30;
    result[9] = b8 * a01 + b9 * a11 + b10 * a21 + b11 * a31;
    result[10] = b8 * a02 + b9 * a12 + b10 * a22 + b11 * a32;
    result[11] = b8 * a03 + b9 * a13 + b10 * a23 + b11 * a33;

    const b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
    result[12] = b12 * a00 + b13 * a10 + b14 * a20 + b15 * a30;
    result[13] = b12 * a01 + b13 * a11 + b14 * a21 + b15 * a31;
    result[14] = b12 * a02 + b13 * a12 + b14 * a22 + b15 * a32;
    result[15] = b12 * a03 + b13 * a13 + b14 * a23 + b15 * a33;
  }
}