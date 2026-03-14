using UnityEngine;

public class TankEntity
{
    public GameObject root;
    public GameObject body;
    public GameObject turret;
    public GameObject barrel;
    public GameObject ring;
    public GameObject shieldBubble;

    public float targetX, targetZ, targetAngle;
    public float currentBodyAngle, currentTurretAngle;
    public sbyte hp = 10;
    public sbyte shieldValue = 0;
    public bool dead;
    public byte team;

    private Color teamColor;

    public Vector3 Position => root.transform.position;

    public TankEntity(TankState state, Color color)
    {
        teamColor = color;
        team = state.team;
        hp = state.hp;
        dead = state.dead;

        root = new GameObject("Tank");

        // Body
        body = GameObject.CreatePrimitive(PrimitiveType.Cube);
        body.transform.SetParent(root.transform);
        body.transform.localPosition = new Vector3(0, 0.3f, 0);
        body.transform.localScale = new Vector3(1f, 0.4f, 1.4f);
        body.GetComponent<Renderer>().material.color = color * 0.6f + Color.white * 0.1f;
        Object.Destroy(body.GetComponent<Collider>());

        // Tracks
        for (int side = -1; side <= 1; side += 2)
        {
            var track = GameObject.CreatePrimitive(PrimitiveType.Cube);
            track.transform.SetParent(body.transform);
            track.transform.localPosition = new Vector3(side * 0.55f, -0.15f, 0);
            track.transform.localScale = new Vector3(0.2f, 0.5f, 1.1f);
            track.GetComponent<Renderer>().material.color = new Color(0.27f, 0.27f, 0.27f);
            Object.Destroy(track.GetComponent<Collider>());
        }

        // Turret base
        turret = new GameObject("Turret");
        turret.transform.SetParent(root.transform);

        var tBase = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        tBase.transform.SetParent(turret.transform);
        tBase.transform.localPosition = new Vector3(0, 0.55f, 0);
        tBase.transform.localScale = new Vector3(0.75f, 0.125f, 0.75f);
        tBase.GetComponent<Renderer>().material.color = color * 0.5f + Color.white * 0.1f;
        Object.Destroy(tBase.GetComponent<Collider>());

        // Barrel
        barrel = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        barrel.transform.SetParent(turret.transform);
        barrel.transform.localPosition = new Vector3(0, 0.55f, 0.5f);
        barrel.transform.localEulerAngles = new Vector3(90, 0, 0);
        barrel.transform.localScale = new Vector3(0.14f, 0.5f, 0.14f);
        barrel.GetComponent<Renderer>().material.color = new Color(0.33f, 0.33f, 0.33f);
        Object.Destroy(barrel.GetComponent<Collider>());

        // Team ring
        ring = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        ring.transform.SetParent(root.transform);
        ring.transform.localPosition = new Vector3(0, 0.02f, 0);
        ring.transform.localScale = new Vector3(2.4f, 0.01f, 2.4f);
        var ringMat = ring.GetComponent<Renderer>().material;
        ringMat.color = new Color(color.r, color.g, color.b, 0.5f);
        GameManager.SetMaterialTransparent(ringMat);
        Object.Destroy(ring.GetComponent<Collider>());

        // Shield bubble (hidden by default)
        shieldBubble = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        shieldBubble.transform.SetParent(root.transform);
        shieldBubble.transform.localPosition = new Vector3(0, 0.35f, 0);
        shieldBubble.transform.localScale = new Vector3(2.2f, 2f, 2.2f);
        var shieldMat = new Material(Shader.Find("Standard"));
        shieldMat.color = new Color(0.27f, 0.8f, 1f, 0.4f);
        shieldMat.SetColor("_EmissionColor", new Color(0.2f, 0.5f, 0.8f));
        shieldMat.EnableKeyword("_EMISSION");
        GameManager.SetMaterialTransparent(shieldMat);
        shieldBubble.GetComponent<Renderer>().material = shieldMat;
        Object.Destroy(shieldBubble.GetComponent<Collider>());
        shieldBubble.SetActive(false);
    }

    public void SetPosition(float x, float z)
    {
        targetX = x;
        targetZ = z;
        root.transform.position = new Vector3(x, 0, z);
    }

    public void SetDead(bool val)
    {
        dead = val;
    }

    public void SetShield(sbyte val)
    {
        shieldValue = val;
        shieldBubble.SetActive(val > 0);
    }

    // Convert a per-frame lerp factor (designed for 60fps) to frame-rate independent
    private static float Smooth(float baseFactor, float dt)
    {
        return 1f - Mathf.Pow(1f - baseFactor, dt * 60f);
    }

    public void Update(float dt)
    {
        var pos = root.transform.position;
        float moveX = targetX - pos.x;
        float moveZ = targetZ - pos.z;

        // Frame-rate independent position interpolation
        float posSmooth = Smooth(0.2f, dt);
        float newX = Mathf.Lerp(pos.x, targetX, posSmooth);
        float newZ = Mathf.Lerp(pos.z, targetZ, posSmooth);
        root.transform.position = new Vector3(newX, 0, newZ);

        // Body rotation toward movement
        if (Mathf.Abs(moveX) > 0.02f || Mathf.Abs(moveZ) > 0.02f)
        {
            float targetBody = Mathf.Atan2(moveX, moveZ) * Mathf.Rad2Deg;
            currentBodyAngle = Mathf.LerpAngle(currentBodyAngle, targetBody, Smooth(0.15f, dt));
        }
        body.transform.rotation = Quaternion.Euler(0, currentBodyAngle, 0);

        // Turret rotation (absolute)
        float targetTurret = targetAngle;
        currentTurretAngle = Mathf.LerpAngle(currentTurretAngle, targetTurret, Smooth(0.25f, dt));
        turret.transform.rotation = Quaternion.Euler(0, currentTurretAngle, 0);

        // Shield pulse + spin (matches Three.js/PlayCanvas behavior)
        if (shieldBubble.activeSelf)
        {
            float pulse = 0.3f + Mathf.Sin(Time.time * 4) * 0.15f;
            var mat = shieldBubble.GetComponent<Renderer>().material;
            mat.color = new Color(0.27f, 0.8f, 1f, pulse);
            mat.SetColor("_EmissionColor", new Color(0.2f, 0.5f, 0.8f) * (0.6f + Mathf.Sin(Time.time * 4) * 0.4f));
            shieldBubble.transform.Rotate(0, dt * 30f, 0);
        }

        // Dead blink
        bool visible = !dead || (Mathf.FloorToInt(Time.time * 4) % 2 == 0);
        body.SetActive(visible);
        turret.gameObject.SetActive(visible);
    }

    public void Destroy()
    {
        Object.Destroy(root);
    }
}
