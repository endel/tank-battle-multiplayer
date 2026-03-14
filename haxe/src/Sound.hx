// Stub — procedural audio requires platform-specific backends.
// TODO: implement via hxd.snd with generated waveform buffers.

class Sound {
	public function new() {}

	public function shoot() {}
	public function shootSpecial() {}
	public function hit(volume:Float = 0.25) {}
	public function explosion() {}
	public function pickupRepair() {}
	public function pickupShield() {}
	public function pickupDamage() {}
}
