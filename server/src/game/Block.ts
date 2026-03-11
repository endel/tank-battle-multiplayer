import { SpatialItem } from "./World";

export class Block implements SpatialItem {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number = 0;
  node: any = null;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  collideCircle(
    itemX: number,
    itemY: number,
    itemRadius: number
  ): { x: number; y: number } | null {
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    const dx = itemX - this.x;
    const dy = itemY - this.y;

    if (Math.abs(dx) > halfW + itemRadius) return null;
    if (Math.abs(dy) > halfH + itemRadius) return null;

    let sx = dx < 0 ? -1 : 1;
    let sy = dy < 0 ? -1 : 1;

    const centerInsideX = Math.abs(dx) < halfW;
    const centerInsideY = Math.abs(dy) < halfH;

    let offset: number;

    if (centerInsideX && centerInsideY) {
      if (halfW - Math.abs(dx) < halfH - Math.abs(dy)) {
        sy = 0;
        offset = halfW - Math.abs(dx) + itemRadius;
      } else {
        sx = 0;
        offset = halfH - Math.abs(dy) + itemRadius;
      }
      return { x: sx * offset, y: sy * offset };
    } else if (!centerInsideX && !centerInsideY) {
      const cx = dx - sx * halfW;
      const cy = dy - sy * halfH;
      const dist = Math.sqrt(cx * cx + cy * cy);
      if (dist > itemRadius) return null;
      return {
        x: (cx / dist) * (itemRadius - dist),
        y: (cy / dist) * (itemRadius - dist),
      };
    } else {
      if (centerInsideX) {
        sx = 0;
        offset = itemRadius - (Math.abs(dy) - halfH);
      } else {
        sy = 0;
        offset = itemRadius - (Math.abs(dx) - halfW);
      }
      return { x: sx * offset, y: sy * offset };
    }
  }
}
