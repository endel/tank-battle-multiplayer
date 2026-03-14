package schema;

import io.colyseus.serializer.schema.Schema;

class TankState extends Schema {
	@:type("string")
	public var name:String = "";

	@:type("uint8")
	public var team:Int = 0;

	@:type("float32")
	public var x:Float = 0;

	@:type("float32")
	public var y:Float = 0;

	@:type("float32")
	public var angle:Float = 0;

	@:type("int8")
	public var hp:Int = 0;

	@:type("int8")
	public var shield:Int = 0;

	@:type("boolean")
	public var dead:Bool = false;

	@:type("string")
	public var killer:String = "";

	@:type("uint16")
	public var score:Int = 0;
}
