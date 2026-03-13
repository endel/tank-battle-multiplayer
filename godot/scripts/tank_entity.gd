class_name TankEntity
extends Node3D

const TEAM_COLORS: Array[Color] = [
	Color(1.0, 0.267, 0.267),   # Red
	Color(0.267, 0.533, 1.0),   # Blue
	Color(0.267, 1.0, 0.267),   # Green
	Color(1.0, 1.0, 0.267),     # Yellow
]

static func preload_model() -> void:
	pass

var body: Node3D
var turret: Node3D  # only used for fallback mesh
var team_indicator: MeshInstance3D
var health_pct: float = 1.0
var shield_bubble: MeshInstance3D
var target_x: float = 0.0
var target_z: float = 0.0
var target_angle: float = 0.0
var current_turret_angle: float = 0.0
var target_body_angle: float = 0.0
var current_body_angle: float = 0.0
var is_dead: bool = false
var shield_active: bool = false
var shield_break_time: float = 0.0
var explosion_time: float = 0.0
var team: int = 0

# Explosion parts
var explosion_parts: Array[Dictionary] = []
var shield_fragments: Array[Dictionary] = []


func _init() -> void:
	body = Node3D.new()
	body.name = "Body"
	turret = Node3D.new()
	turret.name = "Turret"


func setup(p_team: int) -> void:
	team = p_team

	_create_tank_mesh()

	add_child(body)
	add_child(turret)

	_create_team_indicator()
	_create_shield_bubble()


func _create_tank_mesh() -> void:
	_create_fallback_mesh()


func _create_fallback_mesh() -> void:
	var team_color := TEAM_COLORS[team] if team < TEAM_COLORS.size() else Color.WHITE

	# Body
	var body_mat := StandardMaterial3D.new()
	body_mat.albedo_color = team_color.darkened(0.3)
	body_mat.roughness = 0.7

	var body_mesh := BoxMesh.new()
	body_mesh.size = Vector3(1.0, 0.4, 1.4)
	var body_instance := MeshInstance3D.new()
	body_instance.mesh = body_mesh
	body_instance.material_override = body_mat
	body_instance.position.y = 0.3
	body_instance.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	body.add_child(body_instance)

	# Tracks
	var track_mat := StandardMaterial3D.new()
	track_mat.albedo_color = Color(0.267, 0.267, 0.267)

	for side in [-0.55, 0.55]:
		var track_mesh := BoxMesh.new()
		track_mesh.size = Vector3(0.2, 0.25, 1.5)
		var track := MeshInstance3D.new()
		track.mesh = track_mesh
		track.material_override = track_mat
		track.position = Vector3(side, 0.2, 0)
		track.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		body.add_child(track)

	# Turret base
	var turret_mat := StandardMaterial3D.new()
	turret_mat.albedo_color = team_color.darkened(0.15)

	var turret_base_mesh := CylinderMesh.new()
	turret_base_mesh.top_radius = 0.35
	turret_base_mesh.bottom_radius = 0.4
	turret_base_mesh.height = 0.25
	turret_base_mesh.radial_segments = 8
	var turret_base := MeshInstance3D.new()
	turret_base.mesh = turret_base_mesh
	turret_base.material_override = turret_mat
	turret_base.position.y = 0.55
	turret.add_child(turret_base)

	# Barrel
	var barrel_mat := StandardMaterial3D.new()
	barrel_mat.albedo_color = Color(0.333, 0.333, 0.333)

	var barrel_mesh := CylinderMesh.new()
	barrel_mesh.top_radius = 0.06
	barrel_mesh.bottom_radius = 0.08
	barrel_mesh.height = 1.0
	barrel_mesh.radial_segments = 6
	var barrel := MeshInstance3D.new()
	barrel.mesh = barrel_mesh
	barrel.material_override = barrel_mat
	barrel.position = Vector3(0, 0.55, 0.5)
	barrel.rotation.x = PI / 2.0
	turret.add_child(barrel)


func _create_team_indicator() -> void:
	var team_color := TEAM_COLORS[team] if team < TEAM_COLORS.size() else Color.WHITE

	var ring_mesh := CylinderMesh.new()
	ring_mesh.top_radius = 1.0
	ring_mesh.bottom_radius = 1.0
	ring_mesh.height = 0.02
	ring_mesh.radial_segments = 24

	var ring_mat := StandardMaterial3D.new()
	ring_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	ring_mat.albedo_color = Color(team_color.r, team_color.g, team_color.b, 0.4)
	ring_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	ring_mat.cull_mode = BaseMaterial3D.CULL_DISABLED

	team_indicator = MeshInstance3D.new()
	team_indicator.mesh = ring_mesh
	team_indicator.material_override = ring_mat
	team_indicator.position.y = 0.02
	add_child(team_indicator)



func _create_shield_bubble() -> void:
	var shield_mesh := CylinderMesh.new()
	shield_mesh.top_radius = 1.4
	shield_mesh.bottom_radius = 1.4
	shield_mesh.height = 2.6
	shield_mesh.radial_segments = 20
	shield_mesh.rings = 1

	var shield_mat := StandardMaterial3D.new()
	shield_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	shield_mat.albedo_color = Color(0.267, 0.8, 1.0, 0.12)
	shield_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	shield_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	shield_mat.no_depth_test = true

	shield_bubble = MeshInstance3D.new()
	shield_bubble.mesh = shield_mesh
	shield_bubble.material_override = shield_mat
	shield_bubble.position.y = 1.3
	shield_bubble.visible = false
	add_child(shield_bubble)


func update_tank(delta: float) -> void:
	# Compute movement delta before lerping
	var move_x := target_x - position.x
	var move_z := target_z - position.z
	var move_dist := sqrt(move_x * move_x + move_z * move_z)

	# Smooth position interpolation
	position.x = lerpf(position.x, target_x, 0.2)
	position.z = lerpf(position.z, target_z, 0.2)

	# Rotate body toward movement direction
	if move_dist > 0.02:
		target_body_angle = atan2(move_x, move_z)

	var body_diff := target_body_angle - current_body_angle
	while body_diff > PI:
		body_diff -= PI * 2.0
	while body_diff < -PI:
		body_diff += PI * 2.0
	current_body_angle += body_diff * 0.15
	body.rotation.y = current_body_angle

	# Turret aim
	var target_turret_rad := deg_to_rad(target_angle)
	var turret_diff := target_turret_rad - current_turret_angle
	while turret_diff > PI:
		turret_diff -= PI * 2.0
	while turret_diff < -PI:
		turret_diff += PI * 2.0
	current_turret_angle += turret_diff * 0.25

	# Turret is always a sibling of body — set absolute rotation around center
	turret.rotation.y = current_turret_angle

	# Shield bubble pulse
	if shield_active:
		shield_bubble.visible = true
		var pulse: float = 0.10 + sin(Time.get_ticks_msec() * 0.004) * 0.05
		var mat := shield_bubble.material_override as StandardMaterial3D
		mat.albedo_color.a = pulse
		mat.albedo_color = Color(0.267, 0.8, 1.0, pulse)
		shield_bubble.scale = Vector3.ONE
		shield_bubble.rotation.y += 0.008
	elif shield_break_time > 0:
		_update_shield_break()
	else:
		shield_bubble.visible = false

	# Explosion animation
	if explosion_time > 0:
		_update_explosion()

	# Dead state - blink
	var tank_visible := not is_dead or (int(Time.get_ticks_msec()) % 500 < 250)
	body.visible = tank_visible
	turret.visible = tank_visible
	team_indicator.visible = tank_visible


func set_dead(val: bool) -> void:
	var was_dead := is_dead
	is_dead = val

	if val and not was_dead:
		explosion_time = Time.get_ticks_msec()
		_spawn_explosion()


func set_shield(val: int) -> void:
	var was_active := shield_active
	shield_active = val > 0

	if was_active and not shield_active:
		shield_break_time = Time.get_ticks_msec()
		_spawn_shield_fragments()


func set_health(hp: int) -> void:
	health_pct = maxf(0.0, float(hp) / 10.0)


func _spawn_explosion() -> void:
	# Fireball
	var fb_mesh := SphereMesh.new()
	fb_mesh.radius = 0.5
	fb_mesh.height = 1.0
	fb_mesh.radial_segments = 10
	fb_mesh.rings = 10

	var fb_mat := StandardMaterial3D.new()
	fb_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	fb_mat.albedo_color = Color(1.0, 0.667, 0.133, 0.8)
	fb_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	fb_mat.no_depth_test = true

	var fireball := MeshInstance3D.new()
	fireball.mesh = fb_mesh
	fireball.material_override = fb_mat
	fireball.position.y = 1.0
	add_child(fireball)
	explosion_parts.append({"node": fireball, "type": "fireball"})

	# Shockwave ring
	var ring_mesh := TorusMesh.new()
	ring_mesh.inner_radius = 0.4
	ring_mesh.outer_radius = 0.7
	ring_mesh.rings = 4
	ring_mesh.ring_segments = 20

	var ring_mat := StandardMaterial3D.new()
	ring_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	ring_mat.albedo_color = Color(1.0, 0.4, 0.0, 0.5)
	ring_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	ring_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	ring_mat.no_depth_test = true

	var ring := MeshInstance3D.new()
	ring.mesh = ring_mesh
	ring.material_override = ring_mat
	ring.position.y = 0.05
	ring.rotation.x = -PI / 2.0
	add_child(ring)
	explosion_parts.append({"node": ring, "type": "ring"})

	# Debris chunks
	for i in range(10):
		var angle := (float(i) / 10.0) * PI * 2.0 + randf() * 0.5
		var sz := 0.1 + randf() * 0.15

		var debris_mesh := BoxMesh.new()
		debris_mesh.size = Vector3(sz, sz, sz)

		var debris_mat := StandardMaterial3D.new()
		debris_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		debris_mat.albedo_color = Color(0.267, 0.267, 0.267, 0.9) if randf() > 0.5 else Color(0.533, 0.4, 0.2, 0.9)
		debris_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		debris_mat.no_depth_test = true

		var debris := MeshInstance3D.new()
		debris.mesh = debris_mesh
		debris.material_override = debris_mat
		debris.position = Vector3(cos(angle) * 0.4, 0.5 + randf() * 1.0, sin(angle) * 0.4)
		add_child(debris)

		var spd := 0.15 + randf() * 0.15
		explosion_parts.append({
			"node": debris,
			"type": "debris",
			"vel": Vector3(cos(angle) * spd, 0.12 + randf() * 0.15, sin(angle) * spd),
			"spin": Vector3((randf() - 0.5) * 0.3, 0, (randf() - 0.5) * 0.3),
		})


func _update_explosion() -> void:
	var elapsed := Time.get_ticks_msec() - explosion_time
	var duration := 600.0
	var t := minf(elapsed / duration, 1.0)
	var e := 1.0 - (1.0 - t) * (1.0 - t)  # ease-out

	for part in explosion_parts:
		var node: MeshInstance3D = part["node"]
		var mat := node.material_override as StandardMaterial3D
		match part["type"]:
			"fireball":
				var s := 1.0 + e * 3.0
				node.scale = Vector3(s, s, s)
				var r := 1.0 - t * 0.6
				var g := maxf(0.0, 0.6 - t * 0.6)
				var b := maxf(0.0, 0.1 * (1.0 - t))
				mat.albedo_color = Color(r, g, b, 0.9 * (1.0 - t * t))
			"debris":
				var vel: Vector3 = part["vel"]
				node.position += vel * 0.016
				vel.y -= 0.08
				part["vel"] = vel
				var spin: Vector3 = part["spin"]
				node.rotation.x += spin.x
				node.rotation.z += spin.z
				mat.albedo_color.a = 0.9 * (1.0 - t)
			"ring":
				var s := 1.0 + e * 4.0
				node.scale = Vector3(s, 1, s)
				mat.albedo_color.a = 0.5 * (1.0 - t)

	if t >= 1.0:
		explosion_time = 0.0
		for part in explosion_parts:
			var node: MeshInstance3D = part["node"]
			remove_child(node)
			node.queue_free()
		explosion_parts.clear()


func _spawn_shield_fragments() -> void:
	for i in range(8):
		var angle := (float(i) / 8.0) * PI * 2.0

		var frag_mesh := QuadMesh.new()
		frag_mesh.size = Vector2(0.25, 0.35)

		var frag_mat := StandardMaterial3D.new()
		frag_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		frag_mat.albedo_color = Color(0.267, 0.8, 1.0, 0.7)
		frag_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		frag_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
		frag_mat.no_depth_test = true

		var frag := MeshInstance3D.new()
		frag.mesh = frag_mesh
		frag.material_override = frag_mat
		frag.position = Vector3(cos(angle) * 1.4, 1.0 + randf() * 1.2, sin(angle) * 1.4)
		frag.rotation = Vector3(randf() * PI, angle, randf() * PI)
		add_child(frag)

		var spd := 0.12 + randf() * 0.08
		shield_fragments.append({
			"node": frag,
			"vel": Vector3(cos(angle) * spd, 0.06 + randf() * 0.1, sin(angle) * spd),
		})


func _update_shield_break() -> void:
	var elapsed := Time.get_ticks_msec() - shield_break_time
	var duration := 250.0
	var t := minf(elapsed / duration, 1.0)

	# Bubble expands and flashes
	shield_bubble.visible = true
	var s := 1.0 + t * 0.5
	shield_bubble.scale = Vector3(s, 1.0 + t * 0.15, s)
	var mat := shield_bubble.material_override as StandardMaterial3D
	mat.albedo_color = Color(1.0, 1.0, 1.0, 0.35 * (1.0 - t))

	# Animate fragments outward
	for frag_data in shield_fragments:
		var node: MeshInstance3D = frag_data["node"]
		var vel: Vector3 = frag_data["vel"]
		node.position += vel * 0.016
		vel.y -= 0.06
		frag_data["vel"] = vel
		var frag_mat := node.material_override as StandardMaterial3D
		frag_mat.albedo_color.a = 0.7 * (1.0 - t)
		node.rotation.x += 0.1
		node.rotation.z += 0.15

	if t >= 1.0:
		shield_break_time = 0.0
		shield_bubble.visible = false
		for frag_data in shield_fragments:
			var node: MeshInstance3D = frag_data["node"]
			remove_child(node)
			node.queue_free()
		shield_fragments.clear()


func dispose() -> void:
	for part in explosion_parts:
		var node: Node = part["node"]
		if node.get_parent():
			node.get_parent().remove_child(node)
		node.queue_free()
	explosion_parts.clear()

	for frag_data in shield_fragments:
		var node: Node = frag_data["node"]
		if node.get_parent():
			node.get_parent().remove_child(node)
		node.queue_free()
	shield_fragments.clear()
