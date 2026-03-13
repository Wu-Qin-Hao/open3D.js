export class Point {
  constructor(public x: number, public y: number, public z: number) {}

  toArray(): number[] {
    return [this.x, this.y, this.z];
  }

  static fromArray(array: number[]): Point {
    return new Point(array[0], array[1], array[2]);
  }
}