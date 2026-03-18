import { Room, Client } from "colyseus";
import {
  BattleState,
  TankState,
  BulletState,
  PickableState,
  TeamState,
} from "../schema/BattleState";
import { World } from "../game/World";
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

// ── Internal types ─────────────────────────────────────────
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
      const tank = this.state.tanks.get(client.sessionId);
      if (!tank || tank.deleted) return;
      if (typeof data?.x === "number" && typeof data?.y === "number") {
        tank.dirX = data.x;
        tank.dirY = data.y;
      }
    });

    this.onMessage("target", (client, angle: number) => {
      const tank = this.state.tanks.get(client.sessionId);
      if (!tank || tank.deleted) return;
      if (typeof angle === "number") {
        tank.angle = angle;
      }
    });

    this.onMessage("shoot", (client, shooting: boolean) => {
      const tank = this.state.tanks.get(client.sessionId);
      if (!tank || tank.deleted || tank.dead) return;
      tank.shooting = !!shooting;
    });

    this.onMessage("name", (client, name: string) => {
      if (typeof name === "string" && /^[a-z0-9\-_]{4,8}$/i.test(name)) {
        const tank = this.state.tanks.get(client.sessionId);
        if (tank) tank.name = name;
      }
    });

    // Game loop at 20 FPS
    this.setSimulationInterval(() => this.update(), 1000 / 20);
  }

  // ── Join / Leave ──────────────────────────────────────────
  onJoin(client: Client) {
    const teamId = this.pickWeakestTeam();
    this.state.teams[teamId].tanks++;

    const tank = new TankState();
    tank.sessionId = client.sessionId;
    tank.team = teamId;
    tank.dead = true;
    tank.died = Date.now();
    tank.respawned = Date.now();
    tank.spawnPosition();

    this.state.tanks.set(client.sessionId, tank);
    this.world.add("tank", tank);
  }

  onLeave(client: Client) {
    const tank = this.state.tanks.get(client.sessionId);
    if (!tank) return;
    this.state.teams[tank.team].tanks--;
    this.world.remove("tank", tank);
    tank.deleted = true;
    this.state.tanks.delete(client.sessionId);
  }

  // ── Helpers ───────────────────────────────────────────────
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
    for (const [sid, tank] of this.state.tanks) {
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
        this.world.forEachAround("tank", tank, (other: TankState) => {
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
          (pick: PickableState) => {
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
          tank.spawnPosition();
        }
      }

      // Update spatial index
      this.world.updateItem("tank", tank);

      // Shoot
      if (!tank.dead && tank.shooting && !tank.reloading) {
        this.createBullet(tank);
      }
    }

    // ── Respawn pickables ──
    for (let i = 0; i < this.pickSpawns.length; i++) {
      const spawn = this.pickSpawns[i];
      if (!spawn.activeId && now - spawn.picked > spawn.delay) {
        const id = `p${++this.pickCounter}`;

        const pick = new PickableState();
        pick.id = id;
        pick.type = spawn.type;
        pick.x = spawn.x;
        pick.y = spawn.y;
        pick.ind = i;

        this.world.add("pickable", pick);
        spawn.activeId = id;
        this.state.pickables.set(id, pick);
      }
    }

    // ── Bullets ──
    const bulletsToRemove: string[] = [];

    for (const [bid, bullet] of this.state.bullets) {
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
          (tank: TankState) => {
            if (
              deleting ||
              tank.dead ||
              tank.sessionId === bullet.owner ||
              tank.team === bullet.ownerTank.team ||
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

            if (!bullet.ownerTank.deleted) {
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
                  bullet.ownerTank.score++;
                  this.state.teams[bullet.ownerTank.team].score++;
                  if (
                    this.state.teams[bullet.ownerTank.team].score >= WIN_SCORE
                  ) {
                    winner = bullet.ownerTank.team;
                  }
                  this.state.totalScore++;
                  tank.killer = bullet.owner;
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
      } else {
        bulletsToRemove.push(bid);
      }
    }

    // Remove bullets after iteration
    for (const bid of bulletsToRemove) {
      const bullet = this.state.bullets.get(bid);
      if (bullet) {
        this.world.remove("bullet", bullet);
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
      for (const [, tank] of this.state.tanks) {
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
  private createBullet(tank: TankState) {
    tank.tHit = Date.now();
    tank.reloading = true;
    tank.lastShot = Date.now();

    const rad = (-tank.angle + 90) * (Math.PI / 180);

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

    const bullet = new BulletState();
    bullet.owner = tank.sessionId;
    bullet.ownerTank = tank;
    bullet.x = tank.x;
    bullet.y = tank.y;
    bullet.tx = Math.cos(rad) * TANK_RANGE + tank.x;
    bullet.ty = Math.sin(rad) * TANK_RANGE + tank.y;
    bullet.speed = speed;
    bullet.damage = damage;
    bullet.special = special;

    this.state.bullets.set(id, bullet);
    this.world.add("bullet", bullet);
  }
}
