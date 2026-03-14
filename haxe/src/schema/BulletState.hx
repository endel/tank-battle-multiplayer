package schema;

import io.colyseus.serializer.schema.Schema;

class BulletState extends Schema {
	@:type("string")
	public var owner:String = "";

	@:type("float32")
	public var x:Float = 0;

	@:type("float32")
	public var y:Float = 0;

	@:type("float32")
	public var tx:Float = 0;

	@:type("float32")
	public var ty:Float = 0;

	@:type("float32")
	public var speed:Float = 0;

	@:type("boolean")
	public var special:Bool = false;
}
