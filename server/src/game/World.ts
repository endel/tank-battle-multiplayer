export interface SpatialItem {
  x: number;
  y: number;
  radius: number;
  node: ClusterNode | null;
}

export class ClusterNode {
  items: SpatialItem[] = [];
  nx: number;
  ny: number;
  ind: number;

  constructor(x: number, y: number, ind: number) {
    this.nx = x;
    this.ny = y;
    this.ind = ind;
  }
}

export class Cluster {
  size: number;
  width: number;
  height: number;
  nodes: ClusterNode[] = [];

  constructor(size: number, width: number, height: number) {
    this.size = size;
    this.width = width;
    this.height = height;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        this.nodes.push(new ClusterNode(x, y, this.nodes.length));
      }
    }
  }

  pick(x: number, y: number): ClusterNode {
    const ix = Math.max(0, Math.min(this.width - 1, Math.floor(x / this.size)));
    const iy = Math.max(0, Math.min(this.height - 1, Math.floor(y / this.size)));
    return this.nodes[iy * this.width + ix];
  }

  add(item: SpatialItem) {
    const node = this.pick(item.x, item.y);
    node.items.push(item);
    item.node = node;
  }

  remove(item: SpatialItem): boolean {
    if (!item.node) return false;
    const ind = item.node.items.indexOf(item);
    if (ind === -1) {
      item.node = null;
      return false;
    }
    item.node.items.splice(ind, 1);
    item.node = null;
    return true;
  }

  updateItem(item: SpatialItem) {
    const r = item.radius || 0;
    item.x = Math.max(r, Math.min(this.width * this.size - r, item.x));
    item.y = Math.max(r, Math.min(this.height * this.size - r, item.y));
    const node = this.pick(item.x, item.y);
    if (node === item.node) return;
    this.remove(item);
    node.items.push(item);
    item.node = node;
  }

  forEach(fn: (item: SpatialItem) => void) {
    const list: SpatialItem[] = [];
    for (const node of this.nodes) {
      for (const item of node.items) list.push(item);
    }
    list.forEach(fn);
  }

  forEachAround(
    x: number,
    y: number,
    range: number,
    exclude: SpatialItem | null,
    fn: (item: SpatialItem) => void
  ) {
    const node = this.pick(x, y);
    const list: SpatialItem[] = [];
    for (
      let ny = Math.max(0, node.ny - range);
      ny <= Math.min(this.height - 1, node.ny + range);
      ny++
    ) {
      for (
        let nx = Math.max(0, node.nx - range);
        nx <= Math.min(this.width - 1, node.nx + range);
        nx++
      ) {
        const around = this.nodes[ny * this.width + nx];
        for (const item of around.items) {
          if (item !== exclude) list.push(item);
        }
      }
    }
    list.forEach(fn);
  }
}

export class World {
  width: number;
  height: number;
  clusters: Map<string, Cluster>;

  constructor(
    width: number,
    height: number,
    clusterSize: number,
    indexes: string[]
  ) {
    const clusterW = Math.floor(width / clusterSize);
    const clusterH = Math.floor(height / clusterSize);
    this.width = clusterW * clusterSize;
    this.height = clusterH * clusterSize;
    this.clusters = new Map();
    for (const name of indexes) {
      this.clusters.set(name, new Cluster(clusterSize, clusterW, clusterH));
    }
  }

  add(cluster: string, item: SpatialItem) {
    this.clusters.get(cluster)!.add(item);
  }

  remove(cluster: string, item: SpatialItem) {
    this.clusters.get(cluster)!.remove(item);
  }

  forEach(cluster: string, fn: (item: any) => void) {
    this.clusters.get(cluster)!.forEach(fn);
  }

  forEachAround(
    cluster: string,
    item: SpatialItem,
    fn: (item: any) => void,
    excludeSelf: SpatialItem | null = item
  ) {
    this.clusters
      .get(cluster)!
      .forEachAround(item.x, item.y, 1, excludeSelf, fn);
  }

  updateItem(cluster: string, item: SpatialItem) {
    this.clusters.get(cluster)!.updateItem(item);
  }
}
