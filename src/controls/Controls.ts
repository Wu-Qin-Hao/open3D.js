import { Camera } from "../cameras/Camera";

class Controls {
  private camera: Camera;
  private canvas: HTMLCanvasElement;
  private isDragging: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;
  private rotationSpeed: number = 0.01;
  private zoomSpeed: number = 0.1;
  private panSpeed: number = 0.01;

  constructor(camera: Camera, canvas: HTMLCanvasElement) {
    this.camera = camera;
    this.canvas = canvas;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this));
    this.canvas.addEventListener("wheel", this.onWheel.bind(this));
  }

  private onMouseDown(event: MouseEvent) {
    console.log("Mouse down:", event.clientX, event.clientY);
    this.isDragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  }

  private onMouseMove(event: MouseEvent) {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.lastX;
    const deltaY = event.clientY - this.lastY;
    console.log("Mouse move:", deltaX, deltaY);

    // 旋转逻辑
    this.rotateCamera(deltaX, deltaY);

    this.lastX = event.clientX;
    this.lastY = event.clientY;
  }

  private onMouseUp() {
    console.log("Mouse up");
    this.isDragging = false;
  }

  private onWheel(event: WheelEvent) {
    event.preventDefault();
    console.log("Wheel:", event.deltaY);
    // 缩放逻辑
    this.zoomCamera(event.deltaY);
  }

  private rotateCamera(deltaX: number, deltaY: number) {
    // 获取相机位置和目标点
    const position = this.camera.getPosition();
    const eye = [position[0], position[1], position[2]];
    const center = [0, 0, 0]; // 简化处理，假设目标点为原点
    console.log("Before rotation - Camera position:", eye);

    // 计算相机到目标点的向量
    const dx = eye[0] - center[0];
    const dy = eye[1] - center[1];
    const dz = eye[2] - center[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // 计算当前的俯仰角和偏航角
    let pitch = Math.asin(dy / distance);
    let yaw = Math.atan2(dx, dz);
    console.log("Before rotation - Pitch:", pitch, "Yaw:", yaw);

    // 根据鼠标移动更新角度
    yaw -= deltaX * this.rotationSpeed;
    pitch -= deltaY * this.rotationSpeed;
    console.log("After rotation - Pitch:", pitch, "Yaw:", yaw);

    // 限制俯仰角范围，避免过度旋转
    pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));

    // 计算新的相机位置
    const newX = center[0] + distance * Math.sin(yaw) * Math.cos(pitch);
    const newY = center[1] + distance * Math.sin(pitch);
    const newZ = center[2] + distance * Math.cos(yaw) * Math.cos(pitch);
    console.log("After rotation - New camera position:", newX, newY, newZ);

    // 更新相机位置
    this.camera.setPosition(newX, newY, newZ);
  }

  private zoomCamera(deltaY: number) {
    // 获取相机位置
    const position = this.camera.getPosition();
    const eye = [position[0], position[1], position[2]];
    const center = [0, 0, 0]; // 简化处理，假设目标点为原点
    console.log("Before zoom - Camera position:", eye);

    // 计算相机到目标点的向量
    const dx = eye[0] - center[0];
    const dy = eye[1] - center[1];
    const dz = eye[2] - center[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    console.log("Before zoom - Distance:", distance);

    // 计算缩放因子
    const zoomFactor = 1 - deltaY * this.zoomSpeed * 0.01;
    const newDistance = Math.max(1, Math.min(100, distance * zoomFactor));
    console.log("After zoom - New distance:", newDistance);

    // 计算单位向量
    const unitX = dx / distance;
    const unitY = dy / distance;
    const unitZ = dz / distance;

    // 计算新的相机位置
    const newX = center[0] + unitX * newDistance;
    const newY = center[1] + unitY * newDistance;
    const newZ = center[2] + unitZ * newDistance;
    console.log("After zoom - New camera position:", newX, newY, newZ);

    // 更新相机位置
    this.camera.setPosition(newX, newY, newZ);
  }
}

export { Controls };
