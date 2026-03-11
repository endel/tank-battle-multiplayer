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
}

export class BulletState extends Schema {
  @type("string") owner: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("float32") tx: number = 0;
  @type("float32") ty: number = 0;
  @type("float32") speed: number = 0.7;
  @type("boolean") special: boolean = false;
}

export class PickableState extends Schema {
  @type("string") type: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
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
