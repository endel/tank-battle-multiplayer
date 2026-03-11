import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

const TEAM_COLORS = [0xff4444, 0x4488ff, 0x44ff44, 0xffff44];
const TEAM_TEXTURES_PATHS = [
  "/models/T_pixelTank_red.png",
  "/models/T_pixelTank_blue.png",
  "/models/T_pixelTank_green.png",
  "/models/T_pixelTank_yellow.png",
];

let tankModelTemplate: THREE.Group | null = null;
let teamTextures: THREE.Texture[] = [];
let modelLoadPromise: Promise<THREE.Group> | null = null;

export function preloadTankModel(): Promise<THREE.Group> {
  if (modelLoadPromise) return modelLoadPromise;
  modelLoadPromise = new Promise((resolve, reject) => {
    const loader = new FBXLoader();
    const texLoader = new THREE.TextureLoader();

    // Load all team textures
    teamTextures = TEAM_TEXTURES_PATHS.map((path) => {
      const tex = texLoader.load(path);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    });

    loader.load(
      "/models/pixelTank.fbx",
      (fbx) => {
        fbx.scale.setScalar(0.012);
        fbx.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
          }
        });
        tankModelTemplate = fbx;
        resolve(fbx);
      },
      undefined,
      reject
    );
  });
  return modelLoadPromise;
}

function makeTeamMaterial(team: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: teamTextures[team] || teamTextures[2],
    roughness: 0.8,
    metalness: 0.1,
  });
}

export class TankEntity {
  group = new THREE.Group();
  body = new THREE.Group();
  turret = new THREE.Group();
  teamIndicator: THREE.Mesh;
  healthBar: THREE.Sprite;
  healthBg: THREE.Sprite;

  targetX = 0;
  targetZ = 0;
  targetAngle = 0;
  currentTurretAngle = 0;
  targetBodyAngle = 0;
  currentBodyAngle = 0;
  dead = false;
  team = 0;

  constructor(team: number) {
    this.team = team;

    if (tankModelTemplate) {
      // Clone model twice: one for body, one for turret
      // Each hides the other's part — keeps transforms/scale/axis identical
      const bodyModel = tankModelTemplate.clone();
      const turretModel = tankModelTemplate.clone();

      const teamMat = makeTeamMaterial(team);

      // Body clone: apply team texture, hide turret parts
      bodyModel.traverse((child) => {
        if (child.name.toLowerCase().includes("turret")) {
          child.visible = false;
        } else if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).material = teamMat;
        }
      });

      // Turret clone: apply team texture, hide body parts
      turretModel.traverse((child) => {
        if (
          (child as THREE.Mesh).isMesh &&
          !child.name.toLowerCase().includes("turret")
        ) {
          (child as THREE.Mesh).material = new THREE.MeshBasicMaterial({
            visible: false,
          });
        } else if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).material = teamMat;
        }
      });

      this.body.add(bodyModel);

      // Turret mesh sits at (0, 1.125, -0.3) after scale.
      // Move turret group pivot to that Z so it rotates in place.
      this.turret.position.set(0, 0, -0.3);
      turretModel.position.z += 0.3; // counter-offset the model
      this.turret.add(turretModel);
    } else {
      this.createFallbackTank();
    }

    this.group.add(this.body);
    this.group.add(this.turret);

    // Team color indicator (ring under tank)
    const ringGeo = new THREE.RingGeometry(0.9, 1.2, 20);
    ringGeo.rotateX(-Math.PI / 2);
    this.teamIndicator = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: TEAM_COLORS[team] || 0xffffff,
        transparent: true,
        opacity: 0.7,
      })
    );
    this.teamIndicator.position.y = 0.02;
    this.group.add(this.teamIndicator);

    // Health bar (floating above tank, billboard sprites)
    const hbBgMat = new THREE.SpriteMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.6,
    });
    this.healthBg = new THREE.Sprite(hbBgMat);
    this.healthBg.scale.set(1.4, 0.15, 1);
    this.healthBg.position.y = 2.2;
    this.group.add(this.healthBg);

    const hbMat = new THREE.SpriteMaterial({ color: 0x44ff44 });
    this.healthBar = new THREE.Sprite(hbMat);
    this.healthBar.scale.set(1.4, 0.15, 1);
    this.healthBar.position.y = 2.2;
    this.group.add(this.healthBar);
  }

  private createFallbackTank() {
    // Body
    const bodyGeo = new THREE.BoxGeometry(1.0, 0.4, 1.4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x668866,
      roughness: 0.7,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.3;
    bodyMesh.castShadow = true;
    this.body.add(bodyMesh);

    // Tracks
    for (const side of [-0.55, 0.55]) {
      const trackGeo = new THREE.BoxGeometry(0.2, 0.25, 1.5);
      const track = new THREE.Mesh(
        trackGeo,
        new THREE.MeshStandardMaterial({ color: 0x444444 })
      );
      track.position.set(side, 0.2, 0);
      track.castShadow = true;
      this.body.add(track);
    }

    // Turret (sibling of body, rotates independently)
    const tBaseGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.25, 8);
    const tBase = new THREE.Mesh(
      tBaseGeo,
      new THREE.MeshStandardMaterial({ color: 0x557755 })
    );
    tBase.position.y = 0.55;
    this.turret.add(tBase);

    const barrelGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.0, 6);
    barrelGeo.rotateX(Math.PI / 2);
    barrelGeo.translate(0, 0, 0.5);
    const barrel = new THREE.Mesh(
      barrelGeo,
      new THREE.MeshStandardMaterial({ color: 0x555555 })
    );
    barrel.position.y = 0.55;
    this.turret.add(barrel);
  }

  update(dt: number) {
    // Compute movement delta before lerping
    const moveX = this.targetX - this.group.position.x;
    const moveZ = this.targetZ - this.group.position.z;
    const moveDist = Math.sqrt(moveX * moveX + moveZ * moveZ);

    // Smooth position interpolation
    this.group.position.x = THREE.MathUtils.lerp(
      this.group.position.x,
      this.targetX,
      0.2
    );
    this.group.position.z = THREE.MathUtils.lerp(
      this.group.position.z,
      this.targetZ,
      0.2
    );

    // Rotate body toward movement direction
    if (moveDist > 0.02) {
      this.targetBodyAngle = Math.atan2(moveX, moveZ);
    }
    let bodyDiff = this.targetBodyAngle - this.currentBodyAngle;
    while (bodyDiff > Math.PI) bodyDiff -= Math.PI * 2;
    while (bodyDiff < -Math.PI) bodyDiff += Math.PI * 2;
    this.currentBodyAngle += bodyDiff * 0.15;
    this.body.rotation.y = this.currentBodyAngle;

    // Turret aim (absolute — turret is sibling of body, not a child)
    const targetTurretRad = this.targetAngle * (Math.PI / 180);
    let turretDiff = targetTurretRad - this.currentTurretAngle;
    while (turretDiff > Math.PI) turretDiff -= Math.PI * 2;
    while (turretDiff < -Math.PI) turretDiff += Math.PI * 2;
    this.currentTurretAngle += turretDiff * 0.25;
    this.turret.rotation.y = this.currentTurretAngle;

    // Keep turret pivot aligned with the body's mount point as body rotates
    const mountZ = -0.3;
    this.turret.position.x = mountZ * Math.sin(this.currentBodyAngle);
    this.turret.position.z = mountZ * Math.cos(this.currentBodyAngle);

    // Dead state
    if (this.dead) {
      this.group.visible = Date.now() % 500 < 250;
    } else {
      this.group.visible = true;
    }
  }

  setHealth(hp: number) {
    const pct = Math.max(0, hp / 10);
    this.healthBar.scale.set(1.4 * pct, 0.15, 1);
    this.healthBar.position.x = -(1.4 * (1 - pct)) / 2;

    const mat = this.healthBar.material as THREE.SpriteMaterial;
    if (pct > 0.5) {
      mat.color.setHex(0x44ff44);
    } else if (pct > 0.25) {
      mat.color.setHex(0xffaa44);
    } else {
      mat.color.setHex(0xff4444);
    }
  }

  dispose() {
    this.group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).geometry?.dispose();
      }
    });
  }
}
