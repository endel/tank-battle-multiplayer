package schema;

import io.colyseus.serializer.schema.Schema;

class TeamState extends Schema {
	@:type("uint16")
	public var score:Int = 0;

	@:type("uint8")
	public var tanks:Int = 0;
}
