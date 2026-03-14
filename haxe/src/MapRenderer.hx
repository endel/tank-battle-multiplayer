class MapRenderer {
	public var root:h3d.scene.Object;

	var s3d:h3d.scene.Scene;

	// Same level data as server
	static final LEVEL:Array<Array<Float>> = [
		[13.5, 2, 1, 4], [13.5, 12, 1, 2], [12.5, 13.5, 3, 1], [2, 13.5, 4, 1],
		[11.5, 15, 1, 2], [11.5, 23.5, 1, 5],
		[10, 26.5, 4, 1], [6, 26.5, 4, 1],
		[2, 34.5, 4, 1], [12.5, 34.5, 3, 1], [13.5, 36, 1, 2], [15, 36.5, 2, 1],
		[13.5, 46, 1, 4],
		[23.5, 36.5, 5, 1], [26.5, 38, 1, 4], [26.5, 42, 1, 4],
		[34.5, 46, 1, 4], [34.5, 36, 1, 2], [35.5, 34.5, 3, 1], [36.5, 33, 1, 2],
		[46, 34.5, 4, 1],
		[36.5, 24.5, 1, 5], [38, 21.5, 4, 1], [42, 21.5, 4, 1],
		[46, 13.5, 4, 1], [35.5, 13.5, 3, 1], [34.5, 12, 1, 2], [33, 11.5, 2, 1],
		[34.5, 2, 1, 4],
		[24.5, 11.5, 5, 1], [21.5, 10, 1, 4], [21.5, 6, 1, 4],
		// center
		[18.5, 22, 1, 6], [19, 18.5, 2, 1], [26, 18.5, 6, 1], [29.5, 19, 1, 2],
		[29.5, 26, 1, 6], [29, 29.5, 2, 1], [22, 29.5, 6, 1], [18.5, 29, 1, 2],
	];

	public function new(s3d:h3d.scene.Scene) {
		this.s3d = s3d;
		root = new h3d.scene.Object(s3d);
		buildGround();
		buildBlocks();
		buildBoundary();
	}

	function buildGround() {
		// Ground plane in XY (Z-up). Gradient white north -> blue south.
		var segsX = 1;
		var segsY = 48;
		var cols = segsX + 1;
		var rows = segsY + 1;

		var points = new Array<h3d.col.Point>();
		var normals = new Array<h3d.col.Point>();
		var colors = new Array<h3d.col.Point>();
		var indices = new hxd.IndexBuffer();

		for (iy in 0...rows) {
			for (ix in 0...cols) {
				var xp = (ix / segsX - 0.5) * 48;
				var yp = (iy / segsY - 0.5) * 48;
				points.push(new h3d.col.Point(xp, yp, 0));
				normals.push(new h3d.col.Point(0, 0, 1)); // Z-up normal

				var t = iy / segsY;
				var r = 0.92 - t * 0.72;
				var g = 0.94 - t * 0.59;
				var b = 0.96 - t * 0.36;
				colors.push(new h3d.col.Point(r, g, b));
			}
		}

		for (iy in 0...segsY) {
			for (ix in 0...segsX) {
				var a = iy * cols + ix;
				var b = a + 1;
				var c = a + cols;
				var d = c + 1;
				// CCW winding for Z-up facing normals
				indices.push(a);
				indices.push(b);
				indices.push(c);
				indices.push(b);
				indices.push(d);
				indices.push(c);
			}
		}

		var prim = new h3d.prim.Polygon(points, indices);
		prim.normals = normals;
		prim.colors = colors;

		var ground = new h3d.scene.Mesh(prim, root);
		ground.material.mainPass.enableLights = true;
		ground.material.shadows = false;
		ground.x = 24;
		ground.y = 24;
		ground.z = -0.01;
	}

	function buildBlocks() {
		for (block in LEVEL) {
			var bx = block[0];
			var by = block[1];
			var bw = block[2];
			var bh = block[3];

			// Cube(x-width, y-depth, z-height) — Z is up in Heaps
			var prim = new h3d.prim.Cube(bw, bh, 1.2, true);
			prim.addNormals();
			prim.addUVs();

			var mesh = new h3d.scene.Mesh(prim, root);
			mesh.material.color.setColor(0xFF226AAA);
			mesh.material.mainPass.enableLights = true;
			mesh.material.shadows = true;
			mesh.material.blendMode = Alpha;
			mesh.material.color.a = 0.85;
			mesh.x = bx;
			mesh.y = by;
			mesh.z = 0.6;
		}
	}

	function buildBoundary() {
		var thickness = 1.5;
		var height = 2.0;

		var walls:Array<Array<Float>> = [
			// [posX, posY, sizeX, sizeY]
			[24, -thickness / 2, 48 + thickness * 2, thickness],
			[24, 48 + thickness / 2, 48 + thickness * 2, thickness],
			[-thickness / 2, 24, thickness, 48 + thickness * 2],
			[48 + thickness / 2, 24, thickness, 48 + thickness * 2],
		];

		for (w in walls) {
			// Cube(x-width, y-depth, z-height)
			var prim = new h3d.prim.Cube(w[2], w[3], height, true);
			prim.addNormals();
			prim.addUVs();

			var mesh = new h3d.scene.Mesh(prim, root);
			mesh.material.color.setColor(0xFF1A4488);
			mesh.material.mainPass.enableLights = true;
			mesh.material.shadows = true;
			mesh.material.blendMode = Alpha;
			mesh.material.color.a = 0.8;
			mesh.x = w[0];
			mesh.y = w[1];
			mesh.z = height / 2;
		}
	}
}
