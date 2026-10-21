"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  IcosahedronGeometry,
  MathUtils,
  Vector3,
  type Group,
  type Mesh,
} from "three";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useTheme, type Theme } from "@/features/theme/useTheme";

/**
 * Sun (light theme) and moon (dark theme) hanging in the top-left of the sky. On a theme change the
 * current one sets along a curved arc behind the island while the other rises, slightly overlapped.
 *
 * They're placed from the camera every frame (a screen-anchored point pushed far behind the island),
 * so they stay in view from every zone camera and at any aspect ratio, and the island hides them as
 * they set.
 */

const DISTANCE = 180; // behind the island, inside the camera's far plane
const SIZE = 0.075; // body diameter as a fraction of the screen height
// Paths in normalised device coordinates, all ending top-left (risen). The setting body drops low
// towards the centre and slips behind the island; the rising one comes up from the left horizon,
// arching upwards. Separate paths so the two never cross while they overlap in time.
type Path = { x: number; y: number; bowX: number; bowY: number };
const UP = { x: -0.62, y: 0.6 };
const SETTING: Path = { x: -0.3, y: -1.0, bowX: -0.12, bowY: 0 };
const RISING: Path = { x: -1.2, y: -0.25, bowX: 0.05, bowY: 0.16 };

const SET = { duration: 1.5, ease: "sine.in" };
const RISE = { duration: 1.9, ease: "power3.out", overlap: 0.75 };

/** Point on `path` for progress p (0 = below the horizon, 1 = risen), bowed mid-way like a real sun path. */
function arc(path: Path, p: number, out: { x: number; y: number }) {
  const bow = Math.sin(Math.PI * p);
  out.x = MathUtils.lerp(path.x, UP.x, p) + path.bowX * bow;
  out.y = MathUtils.lerp(path.y, UP.y, p) + path.bowY * bow;
  return out;
}

/** Soft radial glow used by both halos (white, tinted by the sprite colour). */
function glowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(0.6, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

/** Flat ring of tapered rays around the sun (in the XY plane, facing the camera). */
function raysGeometry(count = 14) {
  const pos: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const long = i % 2 === 0 ? 1.95 : 1.6;
    const w = 0.13;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    const [cl, sl] = [Math.cos(a - w), Math.sin(a - w)];
    const [cr, sr] = [Math.cos(a + w), Math.sin(a + w)];
    pos.push(1.12 * cl, 1.12 * sl, 0, long * c, long * s, 0, 1.12 * cr, 1.12 * sr, 0);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  return geo;
}

/** Low-poly moon: dented craters and a baked crescent shading in vertex colours (unlit, so it reads at night). */
function moonGeometry() {
  const geo = new IcosahedronGeometry(1, 3);
  const p = geo.attributes.position as BufferAttribute;
  const craters = [
    [0.4, 0.5, 0.75, 0.32],
    [-0.5, 0.2, 0.85, 0.24],
    [0.1, -0.55, 0.83, 0.28],
    [-0.2, 0.75, 0.6, 0.18],
    [0.65, -0.2, 0.72, 0.2],
    [-0.7, -0.45, 0.55, 0.22],
  ].map(([x, y, z, r]) => ({ dir: new Vector3(x, y, z).normalize(), r }));
  const light = new Vector3(-0.55, 0.45, 0.7).normalize();
  const base = new Color("#eef2fb");
  const floor = new Color("#aeb9cf");
  const colors = new Float32Array(p.count * 3);
  const v = new Vector3();
  const c = new Color();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    let dent = 0;
    for (const cr of craters) {
      const d = v.angleTo(cr.dir) / cr.r;
      if (d < 1) dent = Math.max(dent, 1 - d * d);
    }
    v.multiplyScalar(1 - 0.08 * dent);
    p.setXYZ(i, v.x, v.y, v.z);
    const shade = 0.42 + 0.58 * Math.max(0, v.clone().normalize().dot(light));
    c.copy(base).lerp(floor, dent * 0.85).multiplyScalar(shade);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export function CelestialBodies() {
  const theme = useTheme();
  const sun = useRef<Group>(null);
  const moon = useRef<Group>(null);
  const rays = useRef<Mesh>(null);
  // 0 = set, 1 = risen; tweened by GSAP, read every frame.
  const progress = useRef({ sun: 1, moon: 0 });
  // Which path each body is travelling; swapped at the start of every transition.
  const paths = useRef<{ sun: Path; moon: Path }>({ sun: RISING, moon: RISING });
  const shown = useRef<Theme | null>(null);

  const glow = useMemo(() => glowTexture(), []);
  const rayGeo = useMemo(() => raysGeometry(), []);
  const moonGeo = useMemo(() => moonGeometry(), []);
  useEffect(
    () => () => {
      glow.dispose();
      rayGeo.dispose();
      moonGeo.dispose();
    },
    [glow, rayGeo, moonGeo],
  );

  useEffect(() => {
    // First run: place the right body instantly, read from the DOM (the hydration snapshot can say
    // "light" for one render even when the page starts dark).
    if (shown.current === null) {
      const initial: Theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      progress.current = { sun: initial === "dark" ? 0 : 1, moon: initial === "dark" ? 1 : 0 };
      shown.current = initial;
    }
    if (theme === shown.current) return;
    shown.current = theme;

    const [setting, rising] = theme === "dark" ? (["sun", "moon"] as const) : (["moon", "sun"] as const);
    paths.current = { [setting]: SETTING, [rising]: RISING } as { sun: Path; moon: Path };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tl = gsap.timeline();
    tl.to(progress.current, { [setting]: 0, duration: reduced ? 0 : SET.duration, ease: SET.ease }, 0);
    tl.to(
      progress.current,
      { [rising]: 1, duration: reduced ? 0 : RISE.duration, ease: RISE.ease },
      reduced ? 0 : SET.duration - RISE.overlap,
    );
    return () => {
      tl.kill();
    };
  }, [theme]);

  const ndc = useMemo(() => ({ x: 0, y: 0 }), []);
  const tmp = useMemo(() => new Vector3(), []);

  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    const halfHeight = DISTANCE * Math.tan(MathUtils.degToRad((camera as { fov?: number }).fov ?? 40) / 2);
    const radius = halfHeight * SIZE;

    const place = (group: Group | null, path: Path, p: number, wobble: number) => {
      if (!group) return;
      group.visible = p > 0.001;
      if (!group.visible) return;
      arc(path, p, ndc);
      tmp.set(ndc.x, ndc.y, 0.5).unproject(camera).sub(camera.position).normalize();
      group.position.copy(camera.position).addScaledVector(tmp, DISTANCE);
      group.lookAt(camera.position);
      // shrinks away near the horizon (never pops), grows as it clears it, gentle breathing once up
      const fade = MathUtils.smoothstep(p, 0, 0.18);
      group.scale.setScalar(radius * fade * (0.82 + 0.18 * p) * (1 + wobble * Math.sin(t * 1.3)));
    };
    place(sun.current, paths.current.sun, progress.current.sun, 0.02);
    place(moon.current, paths.current.moon, progress.current.moon, 0.01);
    if (rays.current) rays.current.rotation.z = t * 0.12;
    if (moon.current) moon.current.children[0].rotation.z = Math.sin(t * 0.2) * 0.08;
  });

  return (
    <>
      <group ref={sun}>
        <sprite scale={4.6} renderOrder={-1}>
          <spriteMaterial map={glow} color="#ffb347" transparent opacity={0.85} depthWrite={false} blending={AdditiveBlending} fog={false} toneMapped={false} />
        </sprite>
        <mesh ref={rays} geometry={rayGeo}>
          <meshBasicMaterial color="#ffc861" transparent opacity={0.9} side={DoubleSide} depthWrite={false} fog={false} toneMapped={false} />
        </mesh>
        <mesh>
          <icosahedronGeometry args={[1, 3]} />
          <meshBasicMaterial color="#ffd978" fog={false} toneMapped={false} />
        </mesh>
      </group>
      <group ref={moon}>
        <mesh geometry={moonGeo}>
          <meshBasicMaterial vertexColors fog={false} toneMapped={false} />
        </mesh>
        <sprite scale={4} renderOrder={-1}>
          <spriteMaterial map={glow} color="#7f9dff" transparent opacity={0.55} depthWrite={false} blending={AdditiveBlending} fog={false} toneMapped={false} />
        </sprite>
      </group>
    </>
  );
}
