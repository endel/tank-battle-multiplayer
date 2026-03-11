import { Room, Client } from "colyseus";
import {
  BattleState,
  TankState,
  BulletState,
  PickableState,
  TeamState,
} from "../schema/BattleState";
import { World, SpatialItem } from "../game/World";
import { Block } from "../game/Block";

// ── Level data ──────────────────────────────────────────────
export const LEVEL = [
  [13.5, 2, 1, 4],
  [13.5, 12, 1, 2],
  [12.5, 13.5, 3, 1],
  [2, 13.5, 4, 1],
  [11.5, 15, 1, 2],
  [11.5, 23.5, 1, 5],
  [10, 26.5, 4, 1],
  [6, 26.5, 4, 1],
  [2, 34.5, 4, 1],
  [12.5, 34.5, 3, 1],
  [13.5, 36, 1, 2],
  [15, 36.5, 2, 1],
  [13.5, 46, 1, 4],
  [23.5, 36.5, 5, 1],
  [26.5, 38, 1, 4],
  [26.5, 42, 1, 4],
  [34.5, 46, 1, 4],
  [34.5, 36, 1, 2],
  [35.5, 34.5, 3, 1],
  [36.5, 33, 1, 2],
  [46, 34.5, 4, 1],
  [36.5, 24.5, 1, 5],
  [38, 21.5, 4, 1],
  [42, 21.5, 4, 1],
  [46, 13.5, 4, 1],
  [35.5, 13.5, 3, 1],
  [34.5, 12, 1, 2],
  [33, 11.5, 2, 1],
  [34.5, 2, 1, 4],
  [24.5, 11.5, 5, 1],
  [21.5, 10, 1, 4],
  [21.5, 6, 1, 4],
  // center
  [18.5, 22, 1, 6],
  [19, 18.5, 2, 1],
  [26, 18.5, 6, 1],
  [29.5, 19, 1, 2],
  [29.5, 26, 1, 6],
  [29, 29.5, 2, 1],
  [22, 29.5, 6, 1],
  [18.5, 29, 1, 2],
];

const PICKABLE_SPAWNS = [
  { x: 23.5, y: 9.5, type: "repair", delay: 5000 },
  { x: 38.5, y: 23.5, type: "repair", delay: 5000 },
  { x: 24.5, y: 38.5, type: "repair", delay: 5000 },
  { x: 9.5, y: 24.5, type: "repair", delay: 5000 },
  { x: 13.5, y: 15.5, type: "damage", delay: 10000 },
  { x: 32.5, y: 13.5, type: "damage", delay: 10000 },
  { x: 34.5, y: 32.5, type: "damage", delay: 10000 },
  { x: 15.5, y: 34.5, type: "damage", delay: 10000 },
  { x: 24, y: 24, type: "shield", delay: 30000 },
];

// ── Constants ───────────────────────────────────────────────
const TANK_SPEED = 0.3;
const TANK_RANGE = 16;
const TANK_RADIUS = 0.75;
const BULLET_SPEED = 0.7;
const BULLET_RADIUS = 0.25;
const BULLET_DAMAGE = 3;
const PICKABLE_RADIUS = 0.3;
const RESPAWN_TIME = 5000;
const INVULN_TIME = 2000;
const RELOAD_TIME = 400;
const RECOVERY_DELAY = 3000;
const RECOVERY_INTERVAL = 1000;
const WIN_SCORE = 10;

// ── Internal data types ─────────────────────────────────────
interface TankData extends SpatialItem {
  sessionId: string;
  teamId: number;
  angle: number;
  dirX: number;
  dirY: number;
  shooting: boolean;
  reloading: boolean;
  lastShot: number;
  tHit: number;
  tRecover: number;
  ammo: number;
  hp: number;
  shield: number;
  score: number;
  dead: boolean;
  died: number;
  respawned: number;
  deleted: boolean;
  killer: string;
}

interface BulletData extends SpatialItem {
  id: string;
  ownerSid: string;
  owner: TankData;
  tx: number;
  ty: number;
  speed: number;
  damage: number;
  special: boolean;
  hit: boolean;
}

interface PickData extends SpatialItem {
  id: string;
  type: string;
  ind: number;
}

interface PickSpawn {
  x: number;
  y: number;
  type: string;
  delay: number;
  picked: number;
  activeId: string | null;
}

// ── Room ────────────────────────────────────────────────────
export class BattleRoom extends Room {
  maxClients = 12;
  state = new BattleState();

  private world!: World;
  private tanks = new Map<string, TankData>();
  private bullets = new Map<string, BulletData>();
  private pickItems = new Map<string, PickData>();
  private blocks: Block[] = [];
  private pickSpawns: PickSpawn[] = [];
  private bulletCounter = 0;
  private pickCounter = 0;

  onCreate() {
    // 4 teams
    for (let i = 0; i < 4; i++) {
      this.state.teams.push(new TeamState());
    }

    // Spatial world
    this.world = new World(48, 48, 4, [
      "tank",
      "bullet",
      "pickable",
      "block",
    ]);

    // Blocks
    for (const [bx, by, bw, bh] of LEVEL) {
      const block = new Block(bx, by, bw, bh);
      this.blocks.push(block);
      this.world.add("block", block);
    }

    // Pickable spawn points
    this.pickSpawns = PICKABLE_SPAWNS.map((s) => ({
      ...s,
      picked: 0,
      activeId: null,
    }));

    // ── Message handlers ──
    this.onMessage("move", (client, data: { x: number; y: number }) => {
      const tank = this.tanks.get(client.sessionId);
      if (!tank || tank.deleted) return;
      if (typeof data?.x === "number" && typeof data?.y === "number") {
        tank.dirX = data.x;
        tank.dirY = data.y;
      }
    });

    this.onMessage("target", (client, angle: number) => {
      const tank = this.tanks.get(client.sessionId);
      if (!tank || tank.deleted) return;
      if (typeof angle === "number") {
        tank.angle = angle;
        this.state.tanks.get(client.sessionId)!.angle = angle;
      }
    });

    this.onMessage("shoot", (client, shooting: boolean) => {
      const tank = this.tanks.get(client.sessionId);
      if (!tank || tank.deleted || tank.dead) return;
      tank.shooting = !!shooting;
    });

    this.onMessage("name", (client, name: string) => {
      if (typeof name === "string" && /^[a-z0-9\-_]{4,8}$/i.test(name)) {
        const s = this.state.tanks.get(client.sessionId);
        if (s) s.name = name;
      }
    });

    // Game loop at 20 FPS
    this.setSimulationInterval(() => this.update(), 1000 / 20);
  }

  // ── Join / Leave ──────────────────────────────────────────
  onJoin(client: Client) {
    const teamId = this.pickWeakestTeam();
    this.state.teams[teamId].tanks++;

    // Schema
    const schema = new TankState();
    schema.team = teamId;
    schema.dead = true;
    this.state.tanks.set(client.sessionId, schema);

    // Internal
    const tank: TankData = {
      sessionId: client.sessionId,
      teamId,
      x: 0,
      y: 0,
      radius: TANK_RADIUS,
      angle: Math.random() * 360,
      dirX: 0,
      dirY: 0,
      shooting: false,
      reloading: false,
      lastShot: 0,
      tHit: 0,
      tRecover: 0,
      ammo: 0,
      hp: 10,
      shield: 0,
      score: 0,
      dead: true,
      died: Date.now(),
      respawned: Date.now(),
      deleted: false,
      killer: "",
      node: null,
    };
    this.spawnPosition(tank);
    this.tanks.set(client.sessionId, tank);
    this.world.add("tank", tank);
    this.syncTank(tank);
  }

  onLeave(client: Client) {
    const tank = this.tanks.get(client.sessionId);
    if (!tank) return;
    this.state.teams[tank.teamId].tanks--;
    this.world.remove("tank", tank);
    tank.deleted = true;
    this.tanks.delete(client.sessionId);
    this.state.tanks.delete(client.sessionId);
  }

  // ── Helpers ───────────────────────────────────────────────
  private spawnPosition(tank: TankData) {
    tank.x =
      2.5 + (tank.teamId % 2) * 35 + Math.floor(Math.random() * 9);
    tank.y =
      2.5 + Math.floor(tank.teamId / 2) * 35 + Math.floor(Math.random() * 9);
  }

  private syncTank(tank: TankData) {
    const s = this.state.tanks.get(tank.sessionId);
    if (!s) return;
    s.x = parseFloat(tank.x.toFixed(3));
    s.y = parseFloat(tank.y.toFixed(3));
    s.angle = Math.floor(tank.angle);
    s.hp = tank.hp;
    s.shield = tank.shield;
    s.dead = tank.dead;
    s.score = tank.score;
    s.killer = tank.killer;
  }

  private pickWeakestTeam(): number {
    let candidates = this.state.teams
      .map((t, i) => ({ id: i, tanks: t.tanks, score: t.score }))
      .filter((t) => t.tanks < 4);

    if (candidates.length === 0) {
      candidates = this.state.teams.map((t, i) => ({
        id: i,
        tanks: t.tanks,
        score: t.score,
      }));
    }

    candidates.sort((a, b) => a.tanks - b.tanks || a.score - b.score);
    const best = candidates.filter(
      (c) => c.tanks === candidates[0].tanks && c.score === candidates[0].score
    );
    return best[Math.floor(Math.random() * best.length)].id;
  }

  // ── Update loop ───────────────────────────────────────────
  private update() {
    const now = Date.now();
    let winner: number | null = null;

    // ── Tanks ──
    for (const [sid, tank] of this.tanks) {
      if (tank.deleted) continue;

      if (!tank.dead) {
        // Movement
        const len = Math.sqrt(
          tank.dirX * tank.dirX + tank.dirY * tank.dirY
        );
        if (len > 0) {
          tank.x += (tank.dirX / len) * TANK_SPEED;
          tank.y += (tank.dirY / len) * TANK_SPEED;
        }

        // Reloading
        if (tank.reloading && now - tank.lastShot > RELOAD_TIME) {
          tank.reloading = false;
        }

        // Auto recovery
        if (
          tank.hp < 10 &&
          now - tank.tHit > RECOVERY_DELAY &&
          now - tank.tRecover > RECOVERY_INTERVAL
        ) {
          tank.hp = Math.min(tank.hp + 1, 10);
          tank.tRecover = now;
        }

        // Tank-tank collision
        this.world.forEachAround("tank", tank, (other: TankData) => {
          if (other.dead) return;
          const dx = tank.x - other.x;
          const dy = tank.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0 && dist < TANK_RADIUS * 2) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = TANK_RADIUS * 2 - dist;
            tank.x += nx * overlap;
            tank.y += ny * overlap;
            other.x -= nx * overlap;
            other.y -= ny * overlap;
          }
        });

        // Tank-block collision
        this.world.forEachAround(
          "block",
          tank,
          (block: Block) => {
            const pt = block.collideCircle(tank.x, tank.y, TANK_RADIUS);
            if (pt) {
              tank.x += pt.x;
              tank.y += pt.y;
            }
          },
          null
        );

        // Tank-pickable collision
        this.world.forEachAround(
          "pickable",
          tank,
          (pick: PickData) => {
            const dx = tank.x - pick.x;
            const dy = tank.y - pick.y;
            if (
              Math.sqrt(dx * dx + dy * dy) >
              TANK_RADIUS + PICKABLE_RADIUS
            )
              return;

            switch (pick.type) {
              case "repair":
                if (tank.hp >= 10) return;
                tank.hp = Math.min(10, tank.hp + 3);
                break;
              case "damage":
                tank.ammo += 3;
                break;
              case "shield":
                if (tank.shield >= 10) return;
                tank.shield = 10;
                break;
            }

            this.world.remove("pickable", pick);
            this.pickSpawns[pick.ind].picked = now;
            this.pickSpawns[pick.ind].activeId = null;
            this.pickItems.delete(pick.id);
            this.state.pickables.delete(pick.id);
          },
          null
        );
      } else {
        // Dead — respawn after delay
        if (now - tank.died > RESPAWN_TIME) {
          tank.dead = false;
          tank.hp = 10;
          tank.shield = 0;
          tank.ammo = 0;
          tank.respawned = now;
          this.spawnPosition(tank);
        }
      }

      // Update spatial index
      this.world.updateItem("tank", tank);

      // Shoot
      if (!tank.dead && tank.shooting && !tank.reloading) {
        this.createBullet(tank);
      }

      // Sync to schema
      this.syncTank(tank);
    }

    // ── Respawn pickables ──
    for (let i = 0; i < this.pickSpawns.length; i++) {
      const spawn = this.pickSpawns[i];
      if (!spawn.activeId && now - spawn.picked > spawn.delay) {
        const id = `p${++this.pickCounter}`;
        const pick: PickData = {
          id,
          type: spawn.type,
          x: spawn.x,
          y: spawn.y,
          radius: PICKABLE_RADIUS,
          ind: i,
          node: null,
        };
        this.pickItems.set(id, pick);
        this.world.add("pickable", pick);
        spawn.activeId = id;

        const ps = new PickableState();
        ps.type = spawn.type;
        ps.x = spawn.x;
        ps.y = spawn.y;
        this.state.pickables.set(id, ps);
      }
    }

    // ── Bullets ──
    const bulletsToRemove: string[] = [];

    for (const [bid, bullet] of this.bullets) {
      // Move toward target
      const dx = bullet.tx - bullet.x;
      const dy = bullet.ty - bullet.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        bullet.x += (dx / dist) * bullet.speed;
        bullet.y += (dy / dist) * bullet.speed;
      }

      let deleting = false;

      // Reached target?
      const distToTarget = Math.sqrt(
        (bullet.x - bullet.tx) ** 2 + (bullet.y - bullet.ty) ** 2
      );
      if (distToTarget < 1) {
        deleting = true;
      } else if (
        bullet.x <= 0 ||
        bullet.y <= 0 ||
        bullet.x >= this.world.width ||
        bullet.y >= this.world.height
      ) {
        deleting = true;
      } else {
        // Bullet-tank collision
        this.world.forEachAround(
          "tank",
          bullet,
          (tank: TankData) => {
            if (
              deleting ||
              tank.dead ||
              tank.sessionId === bullet.ownerSid ||
              tank.teamId === bullet.owner.teamId ||
              now - tank.respawned <= INVULN_TIME
            )
              return;

            const tdx = tank.x - bullet.x;
            const tdy = tank.y - bullet.y;
            if (
              Math.sqrt(tdx * tdx + tdy * tdy) >
              TANK_RADIUS + BULLET_RADIUS
            )
              return;

            // Hit!
            bullet.hit = true;

            if (!bullet.owner.deleted) {
              let damage = bullet.damage;
              tank.tHit = now;

              if (tank.shield > 0) {
                if (tank.shield >= damage) {
                  tank.shield -= damage;
                  damage = 0;
                } else {
                  damage -= tank.shield;
                  tank.shield = 0;
                }
              }

              if (damage > 0) {
                tank.hp -= damage;

                if (tank.hp <= 0) {
                  bullet.owner.score++;
                  this.state.teams[bullet.owner.teamId].score++;
                  if (
                    this.state.teams[bullet.owner.teamId].score >= WIN_SCORE
                  ) {
                    winner = bullet.owner.teamId;
                  }
                  this.state.totalScore++;
                  tank.killer = bullet.ownerSid;
                  // Respawn tank
                  tank.dead = true;
                  tank.died = now;
                  tank.shooting = false;
                }
              }
            }

            deleting = true;
          },
          null
        );

        // Bullet-block collision
        if (!deleting) {
          this.world.forEachAround(
            "block",
            bullet,
            (block: Block) => {
              if (deleting) return;
              const pt = block.collideCircle(
                bullet.x,
                bullet.y,
                BULLET_RADIUS
              );
              if (pt) {
                bullet.x += pt.x;
                bullet.y += pt.y;
                deleting = true;
              }
            },
            null
          );
        }
      }

      if (!deleting) {
        this.world.updateItem("bullet", bullet);
        // Sync bullet position
        const bs = this.state.bullets.get(bid);
        if (bs) {
          bs.x = parseFloat(bullet.x.toFixed(2));
          bs.y = parseFloat(bullet.y.toFixed(2));
        }
      } else {
        bulletsToRemove.push(bid);
      }
    }

    // Remove bullets after iteration
    for (const bid of bulletsToRemove) {
      const bullet = this.bullets.get(bid);
      if (bullet) {
        this.world.remove("bullet", bullet);
        this.bullets.delete(bid);
        this.state.bullets.delete(bid);
      }
    }

    // ── Winner? ──
    if (winner !== null) {
      this.state.winnerTeam = winner;

      // Reset
      for (let i = 0; i < 4; i++) {
        this.state.teams[i].score = 0;
      }
      for (const [, tank] of this.tanks) {
        tank.score = 0;
        tank.killer = "";
        if (!tank.dead) {
          tank.dead = true;
          tank.died = now;
          tank.shooting = false;
        }
      }
      this.state.totalScore = 0;

      // Clear winner after a brief moment (clients can read it)
      setTimeout(() => {
        this.state.winnerTeam = -1;
      }, 3000);
    }
  }

  // ── Create bullet ─────────────────────────────────────────
  private createBullet(tank: TankData) {
    tank.tHit = Date.now();
    tank.reloading = true;
    tank.lastShot = Date.now();

    const rad = (-tank.angle + 90) * (Math.PI / 180);
    const bx = parseFloat(tank.x.toFixed(3));
    const by = parseFloat(tank.y.toFixed(3));
    const tx = parseFloat((Math.cos(rad) * TANK_RANGE + bx).toFixed(3));
    const ty = parseFloat((Math.sin(rad) * TANK_RANGE + by).toFixed(3));

    let speed = BULLET_SPEED;
    let damage = BULLET_DAMAGE;
    let special = false;

    if (tank.ammo > 0) {
      tank.ammo--;
      special = true;
      damage += 2;
      speed += 0.2;
    }

    const id = `b${++this.bulletCounter}`;
    const bullet: BulletData = {
      id,
      ownerSid: tank.sessionId,
      owner: tank,
      x: bx,
      y: by,
      tx,
      ty,
      speed,
      damage,
      radius: BULLET_RADIUS,
      special,
      hit: false,
      node: null,
    };

    this.bullets.set(id, bullet);
    this.world.add("bullet", bullet);

    const bs = new BulletState();
    bs.owner = tank.sessionId;
    bs.x = bx;
    bs.y = by;
    bs.tx = tx;
    bs.ty = ty;
    bs.speed = speed;
    bs.special = special;
    this.state.bullets.set(id, bs);
  }
}
