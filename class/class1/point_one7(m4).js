// 矩阵工具函数
function createIdentityMatrix() {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function createTranslationMatrix(x, y, z) {
  return new Float32Array([1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1]);
}

function createPerspectiveMatrix(fov, aspect, near, far) {
  const f = 1.0 / Math.tan(fov * 0.5);
  const rangeInv = 1.0 / (near - far);

  return new Float32Array([
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (near + far) * rangeInv,
    -1,
    0,
    0,
    near * far * rangeInv * 2,
    0,
  ]);
}

function createRotationMatrix(angleX, angleY, angleZ) {
  const cosX = Math.cos(angleX);
  const sinX = Math.sin(angleX);
  const cosY = Math.cos(angleY);
  const sinY = Math.sin(angleY);
  const cosZ = Math.cos(angleZ);
  const sinZ = Math.sin(angleZ);

  const rotationX = new Float32Array([
    1,
    0,
    0,
    0,
    0,
    cosX,
    -sinX,
    0,
    0,
    sinX,
    cosX,
    0,
    0,
    0,
    0,
    1,
  ]);

  const rotationY = new Float32Array([
    cosY,
    0,
    sinY,
    0,
    0,
    1,
    0,
    0,
    -sinY,
    0,
    cosY,
    0,
    0,
    0,
    0,
    1,
  ]);

  const rotationZ = new Float32Array([
    cosZ,
    -sinZ,
    0,
    0,
    sinZ,
    cosZ,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
  ]);

  return multiplyMatrices(multiplyMatrices(rotationZ, rotationY), rotationX);
}

function multiplyMatrices(a, b) {
  const result = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result[i * 4 + j] =
        a[i * 4 + 0] * b[0 * 4 + j] +
        a[i * 4 + 1] * b[1 * 4 + j] +
        a[i * 4 + 2] * b[2 * 4 + j] +
        a[i * 4 + 3] * b[3 * 4 + j];
    }
  }
  return result;
}
