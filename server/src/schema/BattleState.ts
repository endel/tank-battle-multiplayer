import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class TankState extends Schema {
  @type("string") name: string = "guest";
  @type("uint8") team: number = 0;
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("float32") angle: number = 0;
  @type("int8") hp: number = 10;
  @type("int8") shield: number = 0;
  @type("boolean") dead: boolean = true;
  @type("string") killer: string = "";
  @type("uint16") score: number = 0;

  // Non-synced game state
  sessionId: string = "";
  radius: number = 0.75;
  dirX: number = 0;
  dirY: number = 0;
  shooting: boolean = false;
  reloading: boolean = false;
  lastShot: number = 0;
  tHit: number = 0;
  tRecover: number = 0;
  ammo: number = 0;
  died: number = 0;
  respawned: number = 0;
  deleted: boolean = false;
  node: any = null;

  spawnPosition() {
    this.x = 2.5 + (this.team % 2) * 35 + Math.floor(Math.random() * 9);
    this.y = 2.5 + Math.floor(this.team / 2) * 35 + Math.floor(Math.random() * 9);
  }
}

export class BulletState extends Schema {
  @type("string") owner: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("float32") tx: number = 0;
  @type("float32") ty: number = 0;
  @type("float32") speed: number = 0.7;
  @type("boolean") special: boolean = false;

  // Non-synced game state
  ownerTank!: TankState;
  damage: number = 3;
  radius: number = 0.25;
  hit: boolean = false;
  node: any = null;
}

export class PickableState extends Schema {
  @type("string") type: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;

  // Non-synced game state
  id: string = "";
  radius: number = 0.3;
  ind: number = 0;
  node: any = null;
}

export class TeamState extends Schema {
  @type("uint16") score: number = 0;
  @type("uint8") tanks: number = 0;
}

export class BattleState extends Schema {
  @type("uint16") totalScore: number = 0;
  @type("int8") winnerTeam: number = -1;
  @type([TeamState]) teams = new ArraySchema<TeamState>();
  @type({ map: TankState }) tanks = new MapSchema<TankState>();
  @type({ map: BulletState }) bullets = new MapSchema<BulletState>();
  @type({ map: PickableState }) pickables = new MapSchema<PickableState>();
}
