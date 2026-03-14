class Main extends hxd.App {
	var game:Game;

	override function init() {
		game = new Game(s3d, s2d);
	}

	override function update(dt:Float) {
		if (game != null)
			game.update(dt);
	}

	static function main() {
		new Main();
	}
}
