// Heaps coordinate system: X=right, Y=forward, Z=up

class Tank {
	static final TEAM_COLORS:Array<Int> = [0xFF4444, 0x4488FF, 0x44FF44, 0xFFFF44];

	public var entity:h3d.scene.Object;
	public var body:h3d.scene.Object;
	public var turret:h3d.scene.Object;
	public var teamIndicator:h3d.scene.Mesh;
	public var shieldBubble:h3d.scene.Mesh;

	public var targetX:Float = 0;
	public var targetY:Float = 0; // forward axis (server's Y → Heaps Y)
	public var targetAngle:Float = 0;
	public var currentTurretAngle:Float = 0;
	public var targetBodyAngle:Float = 0;
	public var currentBodyAngle:Float = 0;
	public var dead:Bool = false;
	public var shieldActive:Bool = false;
	public var shieldBreakTime:Float = 0;
	public var explosionTime:Float = 0;
	public var team:Int = 0;

	var explosionParts:Array<ExplosionPart> = [];

	public function new(s3d:h3d.scene.Scene, team:Int) {
		this.team = team;
		entity = new h3d.scene.Object(s3d);

		body = new h3d.scene.Object(entity);
		turret = new h3d.scene.Object(entity);

		createFallbackBody(team);
		createFallbackTurret(team);
		createTeamRing(team);

		// Shield bubble (sphere)
		var spherePrim = new h3d.prim.Sphere(16, 12);
		spherePrim.addNormals();
		shieldBubble = new h3d.scene.Mesh(spherePrim, entity);
		shieldBubble.material.color.setColor(0xFF44CCFF);
		shieldBubble.material.color.a = 0.12;
		shieldBubble.material.blendMode = Alpha;
		shieldBubble.material.mainPass.depthWrite = false;
		shieldBubble.material.mainPass.culling = None;
		shieldBubble.material.mainPass.enableLights = false;
		shieldBubble.z = 0.08;
		shieldBubble.setScale(0.08);
		shieldBubble.scaleZ = 0.06;
		shieldBubble.visible = false;
	}

	function createTeamRing(team:Int) {
		var color = TEAM_COLORS[team];
		// Cylinder extends along Z (up) — flat disc on ground
		var outerPrim = new h3d.prim.Cylinder(20, 1.2, 0.04, true);
		outerPrim.addNormals();
		teamIndicator = new h3d.scene.Mesh(outerPrim, entity);
		teamIndicator.material.color.setColor(color);
		teamIndicator.material.color.a = 0.7;
		teamIndicator.material.blendMode = Alpha;
		teamIndicator.material.mainPass.depthWrite = false;
		teamIndicator.material.mainPass.enableLights = false;
		teamIndicator.z = 0.02;
	}

	function createFallbackBody(team:Int) {
		var color = TEAM_COLORS[team];
		var r = ((color >> 16) & 0xFF) / 255.0;
		var g = ((color >> 8) & 0xFF) / 255.0;
		var b = (color & 0xFF) / 255.0;

		// Body box: Cube(x-width, y-depth, z-height)
		var bodyPrim = new h3d.prim.Cube(1.0, 1.4, 0.4, true);
		bodyPrim.addNormals();
		bodyPrim.addUVs();
		var bodyMesh = new h3d.scene.Mesh(bodyPrim, body);
		bodyMesh.material.color.set(r * 0.6 + 0.1, g * 0.6 + 0.1, b * 0.6 + 0.1);
		bodyMesh.material.mainPass.enableLights = true;
		bodyMesh.material.shadows = true;
		bodyMesh.z = 0.3; // lift above ground

		// Tracks: Cube(x-width, y-depth, z-height)
		var trackPrim = new h3d.prim.Cube(0.2, 1.5, 0.25, true);
		trackPrim.addNormals();
		trackPrim.addUVs();

		for (side in [-0.55, 0.55]) {
			var track = new h3d.scene.Mesh(trackPrim, body);
			track.material.color.setColor(0xFF444444);
			track.material.mainPass.enableLights = true;
			track.material.shadows = true;
			track.x = side;
			track.z = 0.2;
		}
	}

	function createFallbackTurret(team:Int) {
		var color = TEAM_COLORS[team];
		var r = ((color >> 16) & 0xFF) / 255.0;
		var g = ((color >> 8) & 0xFF) / 255.0;
		var b = (color & 0xFF) / 255.0;

		// Turret base — centered at turret origin, no forward offset
		var basePrim = new h3d.prim.Cylinder(12, 0.375, 0.25, true);
		basePrim.addNormals();
		var tBase = new h3d.scene.Mesh(basePrim, turret);
		tBase.material.color.set(r * 0.5 + 0.1, g * 0.5 + 0.1, b * 0.5 + 0.1);
		tBase.material.mainPass.enableLights = true;
		tBase.material.shadows = true;
		tBase.z = 0.55;

		// Barrel — extends forward from turret center
		var barrelPrim = new h3d.prim.Cylinder(8, 0.07, 1.0, true);
		barrelPrim.addNormals();
		var barrel = new h3d.scene.Mesh(barrelPrim, turret);
		barrel.material.color.setColor(0xFF555555);
		barrel.material.mainPass.enableLights = true;
		barrel.material.shadows = true;
		barrel.setRotation(-Math.PI / 2, 0, 0);
		barrel.z = 0.55;
		barrel.y = 0.5; // barrel extends forward from center
	}

	public function update(dt:Float) {
		// Smooth position interpolation (XY plane, Z=0)
		var moveX = targetX - entity.x;
		var moveY = targetY - entity.y;
		var moveDist = Math.sqrt(moveX * moveX + moveY * moveY);

		entity.x = lerp(entity.x, targetX, 0.2);
		entity.y = lerp(entity.y, targetY, 0.2);
		entity.z = 0; // ground level

		// Rotate body toward movement direction (around Z-up)
		if (moveDist > 0.02) {
			targetBodyAngle = Math.atan2(moveX, moveY);
		}
		var bodyDiff = targetBodyAngle - currentBodyAngle;
		while (bodyDiff > Math.PI)
			bodyDiff -= Math.PI * 2;
		while (bodyDiff < -Math.PI)
			bodyDiff += Math.PI * 2;
		currentBodyAngle += bodyDiff * 0.15;
		body.setRotation(0, 0, -currentBodyAngle); // negate: Heaps Z-rot is CCW

		// Turret aim (absolute, around Z-up)
		var targetTurretRad = targetAngle * (Math.PI / 180);
		var turretDiff = targetTurretRad - currentTurretAngle;
		while (turretDiff > Math.PI)
			turretDiff -= Math.PI * 2;
		while (turretDiff < -Math.PI)
			turretDiff += Math.PI * 2;
		currentTurretAngle += turretDiff * 0.25;
		turret.setRotation(0, 0, -currentTurretAngle); // negate: Heaps Z-rot is CCW

		updateShield();
		updateExplosion();

		// Dead state — blink
		var now = haxe.Timer.stamp() * 1000;
		var tankVisible = !dead || (Std.int(now) % 500 < 250);
		body.visible = tankVisible;
		turret.visible = tankVisible;
		teamIndicator.visible = tankVisible;
	}

	function updateShield() {
		var now = haxe.Timer.stamp() * 1000;

		if (shieldActive) {
			shieldBubble.visible = true;
			var pulse = 0.10 + Math.sin(now * 0.004) * 0.05;
			shieldBubble.material.color.a = pulse;
		} else if (shieldBreakTime > 0) {
			// Simple expand + fade on break
			var elapsed = now - shieldBreakTime;
			var duration = 300.0;
			var t = Math.min(elapsed / duration, 1.0);

			shieldBubble.visible = true;
			var scale = 0.08 * (1.0 + t * 0.6);
			shieldBubble.setScale(scale);
			shieldBubble.scaleZ = 0.06 * (1.0 + t * 0.2);
			shieldBubble.material.color.a = 0.3 * (1.0 - t);

			if (t >= 1) {
				shieldBreakTime = 0;
				shieldBubble.visible = false;
			}
		} else {
			shieldBubble.visible = false;
		}
	}

	function updateExplosion() {
		if (explosionTime <= 0)
			return;

		var now = haxe.Timer.stamp() * 1000;
		var elapsed = now - explosionTime;
		var duration = 600.0;
		var t = Math.min(elapsed / duration, 1.0);
		var e = 1.0 - (1.0 - t) * (1.0 - t);

		for (part in explosionParts) {
			switch (part.type) {
				case Fireball:
					var s = 0.08 + e * 0.2;
					part.mesh.setScale(s);
					part.mesh.material.color.a = 0.9 * (1.0 - t * t);
				case Debris:
					part.mesh.x += part.velX * 0.005;
					part.mesh.y += part.velY * 0.005;
					part.mesh.z += part.velZ * 0.005;
					part.velZ -= 0.02;
					part.mesh.rotate(part.spinX * 0.1, 0, part.spinY * 0.15);
					part.mesh.material.color.a = 0.9 * (1.0 - t);
				case Ring:
					var s = 0.1 + e * 0.3;
					part.mesh.scaleX = s;
					part.mesh.scaleY = s;
					part.mesh.material.color.a = 0.5 * (1.0 - t);
			}
		}

		if (t >= 1) {
			explosionTime = 0;
			for (part in explosionParts)
				part.mesh.remove();
			explosionParts = [];
		}
	}

	public function setDead(val:Bool) {
		var wasDead = dead;
		dead = val;

		if (val && !wasDead) {
			explosionTime = haxe.Timer.stamp() * 1000;

			// Fireball
			var fbPrim = new h3d.prim.Sphere(12, 8);
			fbPrim.addNormals();
			var fireball = new h3d.scene.Mesh(fbPrim, entity);
			fireball.material.color.setColor(0xFFFFAA22);
			fireball.material.color.a = 0.8;
			fireball.material.blendMode = Alpha;
			fireball.material.mainPass.depthWrite = false;
			fireball.material.mainPass.enableLights = false;
			fireball.z = 0.3;
			fireball.setScale(0.08);
			explosionParts.push({mesh: fireball, type: Fireball, velX: 0, velY: 0, velZ: 0, spinX: 0, spinY: 0});

			// Ring — cylinder disc in XY plane
			var ringPrim = new h3d.prim.Cylinder(16, 0.7, 0.02, true);
			ringPrim.addNormals();
			var ring = new h3d.scene.Mesh(ringPrim, entity);
			ring.material.color.setColor(0xFFFF6600);
			ring.material.color.a = 0.5;
			ring.material.blendMode = Alpha;
			ring.material.mainPass.depthWrite = false;
			ring.material.mainPass.enableLights = false;
			ring.z = 0.05;
			ring.setScale(0.1);
			explosionParts.push({mesh: ring, type: Ring, velX: 0, velY: 0, velZ: 0, spinX: 0, spinY: 0});

			// Debris
			for (i in 0...10) {
				var angle = (i / 10) * Math.PI * 2 + Math.random() * 0.5;
				var size = 0.1 + Math.random() * 0.15;
				var debrisPrim = new h3d.prim.Cube(size, size, size, true);
				debrisPrim.addNormals();
				var debris = new h3d.scene.Mesh(debrisPrim, entity);
				var isGray = Math.random() > 0.5;
				debris.material.color.setColor(isGray ? 0xFF444444 : 0xFF886633);
				debris.material.color.a = 0.9;
				debris.material.blendMode = Alpha;
				debris.material.mainPass.depthWrite = false;
				debris.material.mainPass.enableLights = false;
				debris.x = Math.cos(angle) * 0.1;
				debris.y = Math.sin(angle) * 0.1;
				debris.z = 0.2 + Math.random() * 0.3;

				var speed = 0.05 + Math.random() * 0.05;
				explosionParts.push({
					mesh: debris,
					type: Debris,
					velX: Math.cos(angle) * speed,
					velY: Math.sin(angle) * speed, // forward
					velZ: 0.12 + Math.random() * 0.15, // up
					spinX: (Math.random() - 0.5) * 0.3,
					spinY: (Math.random() - 0.5) * 0.3
				});
			}
		}
	}

	public function setShield(val:Int) {
		var wasActive = shieldActive;
		shieldActive = val > 0;

		if (wasActive && !shieldActive) {
			shieldBreakTime = haxe.Timer.stamp() * 1000;
		}
	}

	public function dispose() {
		entity.remove();
	}

	static inline function lerp(a:Float, b:Float, t:Float):Float {
		return a + (b - a) * t;
	}
}

enum ExplosionType {
	Fireball;
	Debris;
	Ring;
}

typedef ExplosionPart = {
	mesh:h3d.scene.Mesh,
	type:ExplosionType,
	velX:Float,
	velY:Float, // forward
	velZ:Float, // up
	spinX:Float,
	spinY:Float
};

