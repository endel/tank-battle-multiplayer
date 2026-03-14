import io.colyseus.Client;
import io.colyseus.Room;
import schema.BattleState;

class Network {
	var client:Client;

	public var room:Room<BattleState>;

	public function new(serverUrl:String) {
		client = new Client(serverUrl);
	}

	public function connect(onJoin:(Room<BattleState>) -> Void, onError:(Dynamic) -> Void) {
		client.joinOrCreate("battle", [], BattleState, function(err, room) {
			if (err != null) {
				onError(err);
				return;
			}
			this.room = room;
			onJoin(room);
		});
	}

	public function sendMove(x:Float, y:Float) {
		if (room != null)
			room.send("move", {x: x, y: y});
	}

	public function sendTarget(angle:Float) {
		if (room != null)
			room.send("target", angle);
	}

	public function sendShoot(shooting:Bool) {
		if (room != null)
			room.send("shoot", shooting);
	}

	public function sendName(name:String) {
		if (room != null)
			room.send("name", name);
	}
}
