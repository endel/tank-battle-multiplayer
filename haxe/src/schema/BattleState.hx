package schema;

import io.colyseus.serializer.schema.Schema;
import io.colyseus.serializer.schema.types.ArraySchema;
import io.colyseus.serializer.schema.types.MapSchema;

class BattleState extends Schema {
	@:type("uint16")
	public var totalScore:Int = 0;

	@:type("int8")
	public var winnerTeam:Int = -1;

	@:type("array", TeamState)
	public var teams:ArraySchema<TeamState> = new ArraySchema<TeamState>();

	@:type("map", TankState)
	public var tanks:MapSchema<TankState> = new MapSchema<TankState>();

	@:type("map", BulletState)
	public var bullets:MapSchema<BulletState> = new MapSchema<BulletState>();

	@:type("map", PickableState)
	public var pickables:MapSchema<PickableState> = new MapSchema<PickableState>();
}
