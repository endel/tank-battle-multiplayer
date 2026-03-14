package schema;

import io.colyseus.serializer.schema.Schema;

class PickableState extends Schema {
	@:type("string")
	public var type:String = "";

	@:type("float32")
	public var x:Float = 0;

	@:type("float32")
	public var y:Float = 0;
}
