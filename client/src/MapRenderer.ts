import * as THREE from "three";

// Same level data as server
const LEVEL = [
  [13.5, 2, 1, 4], [13.5, 12, 1, 2], [12.5, 13.5, 3, 1], [2, 13.5, 4, 1],
  [11.5, 15, 1, 2], [11.5, 23.5, 1, 5],
  [10, 26.5, 4, 1], [6, 26.5, 4, 1],
  [2, 34.5, 4, 1], [12.5, 34.5, 3, 1], [13.5, 36, 1, 2], [15, 36.5, 2, 1],
  [13.5, 46, 1, 4],
  [23.5, 36.5, 5, 1], [26.5, 38, 1, 4], [26.5, 42, 1, 4],
  [34.5, 46, 1, 4], [34.5, 36, 1, 2], [35.5, 34.5, 3, 1], [36.5, 33, 1, 2],
  [46, 34.5, 4, 1],
  [36.5, 24.5, 1, 5], [38, 21.5, 4, 1], [42, 21.5, 4, 1],
  [46, 13.5, 4, 1], [35.5, 13.5, 3, 1], [34.5, 12, 1, 2], [33, 11.5, 2, 1],
  [34.5, 2, 1, 4],
  [24.5, 11.5, 5, 1], [21.5, 10, 1, 4], [21.5, 6, 1, 4],
  // center
  [18.5, 22, 1, 6], [19, 18.5, 2, 1], [26, 18.5, 6, 1], [29.5, 19, 1, 2],
  [29.5, 26, 1, 6], [29, 29.5, 2, 1], [22, 29.5, 6, 1], [18.5, 29, 1, 2],
];

export class MapRenderer {
  group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    this.buildGround();
    this.buildBlocks();
    this.buildBoundary();
    scene.add(this.group);
  }

  private buildGround() {
    // Floor: white-to-blue gradient via vertex colors
    const geo = new THREE.PlaneGeometry(48, 48, 1, 48);
    geo.rotateX(-Math.PI / 2);

    const colors = new Float32Array(geo.attributes.position.count * 3);
    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const z = posAttr.getZ(i);
      // t=0 at north edge (z=0), t=1 at south edge (z=48)
      const t = (z + 24) / 48;
      // White (0.92, 0.94, 0.96) to soft blue (0.2, 0.35, 0.6)
      colors[i * 3] = 0.92 - t * 0.72;
      colors[i * 3 + 1] = 0.94 - t * 0.59;
      colors[i * 3 + 2] = 0.96 - t * 0.36;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.4,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.position.set(24, -0.01, 24);
    ground.receiveShadow = true;
    this.group.add(ground);

    // Grid overlay — blue wireframe
    const gridGeo = new THREE.PlaneGeometry(48, 48, 48, 48);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x4488cc,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.set(24, 0.01, 24);
    this.group.add(grid);
  }

  private buildBlocks() {
    const blockMat = new THREE.MeshStandardMaterial({
      color: 0x2266aa,
      roughness: 0.3,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85,
    });
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x66bbff,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });

    for (const [bx, by, bw, bh] of LEVEL) {
      const geo = new THREE.BoxGeometry(bw, 1.2, bh);

      // Solid block
      const mesh = new THREE.Mesh(geo, blockMat);
      mesh.position.set(bx, 0.6, by);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);

      // Wireframe overlay
      const wire = new THREE.Mesh(geo, wireMat);
      wire.position.set(bx, 0.6, by);
      this.group.add(wire);
    }
  }

  private buildBoundary() {
    const thickness = 1.5;
    const height = 2.0;

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1a4488,
      roughness: 0.3,
      metalness: 0.3,
      transparent: true,
      opacity: 0.8,
    });
    const wallWire = new THREE.MeshBasicMaterial({
      color: 0x55aaff,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });

    const walls: [number, number, number, number, number][] = [
      // [posX, posZ, sizeX, sizeZ] — North, South, East, West
      [24, -thickness / 2, 48 + thickness * 2, thickness, height],
      [24, 48 + thickness / 2, 48 + thickness * 2, thickness, height],
      [-thickness / 2, 24, thickness, 48 + thickness * 2, height],
      [48 + thickness / 2, 24, thickness, 48 + thickness * 2, height],
    ];

    for (const [x, z, sx, sz, h] of walls) {
      const geo = new THREE.BoxGeometry(sx, h, sz);

      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(x, h / 2, z);
      mesh.castShadow = true;
      this.group.add(mesh);

      const wire = new THREE.Mesh(geo, wallWire);
      wire.position.set(x, h / 2, z);
      this.group.add(wire);
    }
  }
}
