"use client";

import { useEffect, useMemo, useRef } from "react";
import { LoopOnce, LoopRepeat, MathUtils, Raycaster, Vector3, type AnimationAction, type Group } from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { DRACO_PATH } from "./IslandScene";
import route from "./avatarRoute.json";

/**
 * Life on the island: the developer avatar tours the whole island along its own paths and stairs
 * (scripts/build_paths.py computes the loop over the walkable terrain and writes avatarRoute.json),
 * stopping to wave from the fountain, sit by the campfire, visit the portal, the lab racks, a project
 * station and the crystal altar, work at the desk and stop by the cabin. The Shiba Inu trots behind, a deer,
 * a stag and a fox graze or rest by the paths, and an eagle circles overhead. Clicking the avatar makes
 * it wave. The avatar's clips are Quaternius "Universal Animation Library" mocap retargeted onto its rig
 * (island-assets/scripts/build_avatar_ual.py); the animals are Quaternius "Ultimate Animated Animals"
 * (build_wildlife.py), exported at real size facing +Z.
 */

const AVATAR_MODEL = "/models/avatar.glb";
const DOG_MODEL = "/models/shiba.glb";
const EAGLE_MODEL = "/models/eagle.glb";

const WALK_SPEED = 1.1; // u/s
const WALK_CLIP_SPEED = 0.975; // u/s the UAL walk covers at timeScale 1 (measured on its root-motion twin)
const FADE = 0.35;
const ONCE = new Set(["sit", "wave"]); // stop clips that play once and hold their last pose
const DOG_SPEED = 1.6;

/**
 * Animals that stay put: x/z on open, flat grass clear of the paths and buildings (picked by raycasting the
 * terrain), dropped onto the ground once the island has loaded.
 */
const WILDLIFE = [
  { model: "/models/deer.glb", x: 9.2, z: -5.1, yaw: 2.2, clips: ["eating", "idle", "eating", "idle_headlow"] },
  { model: "/models/stag.glb", x: 8, z: -8.2, yaw: 0.9, clips: ["idle", "eating", "idle_2", "eating"] },
  { model: "/models/fox.glb", x: -8, z: 8, yaw: -2.4, clips: ["idle", "idle_2", "idle_2_headlow"] },
] as const;
const EAGLE_SCALE = 2.4 / 12.46; // 2.4 u wingspan
const EAGLE_ORBIT = { radius: 30, height: 21, speed: 0.07 };

type Stop = { index: number; clip: string; duration: number; name: string; face: number[] };

/** The route as a closed polyline with cumulative distances, sampled by distance travelled. */
function useRoute() {
  return useMemo(() => {
    const points = route.points.map(([x, y, z]) => new Vector3(x, y, z));
    const cum = [0];
    for (let i = 1; i <= points.length; i++) cum.push(cum[i - 1] + points[i - 1].distanceTo(points[i % points.length]));
    const length = cum[points.length];
    const stops = (route.stops as Stop[]).map((s) => ({ ...s, at: cum[s.index] }));
    const sample = (s: number, out: Vector3, tangent?: Vector3) => {
      const d = ((s % length) + length) % length;
      let lo = 0;
      let hi = points.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (cum[mid] <= d) lo = mid;
        else hi = mid - 1;
      }
      const a = points[lo];
      const b = points[(lo + 1) % points.length];
      const t = (d - cum[lo]) / Math.max(cum[lo + 1] - cum[lo], 1e-6);
      out.lerpVectors(a, b, t);
      if (tangent) tangent.subVectors(b, a).setY(0).normalize();
      return out;
    };
    return { length, stops, sample };
  }, []);
}

/** Shortest-way damped turn towards `target` (radians). */
function dampAngle(current: number, target: number, lambda: number, dt: number) {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * (1 - Math.exp(-lambda * dt));
}

function play(actions: Record<string, AnimationAction | null>, current: { name: string }, name: string, once = false) {
  const next = actions[name];
  if (!next || current.name === name) return;
  next.reset();
  next.setLoop(once ? LoopOnce : LoopRepeat, Infinity);
  next.clampWhenFinished = once;
  next.fadeIn(FADE).play();
  actions[current.name]?.fadeOut(FADE);
  current.name = name;
}

/** One grazing / resting animal: cycles through its idle clips and settles onto the terrain under it. */
function Wildlife({ spot }: { spot: (typeof WILDLIFE)[number] }) {
  const gltf = useGLTF(spot.model, DRACO_PATH);
  const group = useRef<Group>(null);
  const { actions } = useAnimations(gltf.animations, group);
  const scene = useThree((s) => s.scene);
  const st = useRef({ clip: { name: "" }, k: 0, timer: 0, grounded: false });
  const ray = useMemo(() => new Raycaster(new Vector3(spot.x, 30, spot.z), new Vector3(0, -1, 0)), [spot]);

  /* eslint-disable react-hooks/immutability -- per-frame animation of three.js objects and refs, not React state */
  useFrame(({ camera }, rawDelta) => {
    const g = group.current;
    if (!g) return;
    const a = st.current;
    if (!a.grounded) {
      // the island streams in on its own; keep trying until there is ground under the animal
      ray.camera = camera; // sprites (the stars, glows) need it even though they never count as ground
      const hit = ray
        .intersectObjects(scene.children, true)
        .find((h) => h.object.type !== "SkinnedMesh" && h.face && h.face.normal.y > 0.5); // skip the avatar and animals
      if (hit) g.position.set(spot.x, hit.point.y, spot.z);
      a.grounded = !!hit;
    }
    a.timer -= Math.min(rawDelta, 0.1);
    if (a.timer <= 0) {
      const name = spot.clips[a.k++ % spot.clips.length];
      play(actions, a.clip, name);
      a.timer = 4 + Math.random() * 5;
    }
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <group ref={group} position={[spot.x, -100, spot.z]} rotation={[0, spot.yaw, 0]}>
      <primitive object={gltf.scene} />
    </group>
  );
}

export function Companions() {
  const avatarGltf = useGLTF(AVATAR_MODEL, DRACO_PATH);
  const dogGltf = useGLTF(DOG_MODEL, DRACO_PATH);
  const eagleGltf = useGLTF(EAGLE_MODEL, DRACO_PATH);
  const avatar = useRef<Group>(null);
  const dog = useRef<Group>(null);
  const eagle = useRef<Group>(null);
  const avatarAnims = useAnimations(avatarGltf.animations, avatar);
  const dogAnims = useAnimations(dogGltf.animations, dog);
  const eagleAnims = useAnimations(eagleGltf.animations, eagle);
  const path = useRoute();

  // Walker state lives in a ref: it changes every frame and nothing in React renders from it.
  const state = useRef({
    s: path.stops[0].at, // distance travelled along the loop (never wrapped, so the dog can trail it)
    mode: "stop" as "walk" | "stop",
    next: 0, // stop we are at / heading to
    timer: 1.5,
    clip: { name: "" },
    yaw: 0,
    dogS: path.stops[0].at - 1.4,
    dogYaw: 0,
    dogClip: { name: "" },
    wave: false,
    advance: true, // when the current pause ends, head for the following stop (false after a wave mid-walk)
    clipTime: 0, // seconds into the current stop clip
    standing: false, // getting up from the campfire before walking on
    theta: 0,
  });
  const tmp = useMemo(() => ({ p: new Vector3(), t: new Vector3(), d: new Vector3(), side: new Vector3() }), []);

  useEffect(() => {
    // only the very first time: on a remount (e.g. hot reload) the walker keeps its current clip
    if (!state.current.clip.name) play(avatarAnims.actions, state.current.clip, "Avatar_idle");
    if (!state.current.dogClip.name) play(dogAnims.actions, state.current.dogClip, "idle");
    eagleAnims.actions.fly?.play();
  }, [avatarAnims.actions, dogAnims.actions, eagleAnims.actions]);

  /* eslint-disable react-hooks/immutability -- per-frame animation of three.js objects and refs, not React state */
  useFrame(({ camera }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1);
    const st = state.current;
    const { p, t, d, side } = tmp;

    // ---------------------------------------------------------------- avatar: walk the loop, pause at stops
    if (st.wave) {
      st.wave = false;
      st.advance = st.mode === "stop"; // waved mid-walk: afterwards keep heading for the same stop
      st.mode = "stop";
      st.timer = 2.4;
      play(avatarAnims.actions, st.clip, "Avatar_wave", true);
    } else if (st.mode === "walk") {
      const stop = path.stops[st.next];
      const ahead = (((stop.at - st.s) % path.length) + path.length) % path.length;
      const step = WALK_SPEED * dt;
      if (step >= ahead) {
        st.s += ahead;
        st.mode = "stop";
        st.advance = true;
        st.timer = stop.duration;
        st.clipTime = 0;
        play(avatarAnims.actions, st.clip, `Avatar_${stop.clip}`, ONCE.has(stop.clip));
      } else st.s += step;
    } else {
      st.timer -= dt;
      st.clipTime += dt;
      // sitting down plays once, then settles into the seated loop; leaving, the avatar stands up first
      const sit = avatarAnims.actions.Avatar_sit;
      if (st.clip.name === "Avatar_sit" && sit && st.clipTime >= sit.getClip().duration - FADE)
        play(avatarAnims.actions, st.clip, "Avatar_sit_idle");
      if (st.timer <= 0 && !st.standing && st.clip.name.startsWith("Avatar_sit")) {
        play(avatarAnims.actions, st.clip, "Avatar_stand", true);
        st.standing = true;
        st.timer = (avatarAnims.actions.Avatar_stand?.getClip().duration ?? 1) - FADE;
      } else if (st.timer <= 0) {
        st.standing = false;
        if (st.advance) st.next = (st.next + 1) % path.stops.length;
        st.mode = "walk";
        play(avatarAnims.actions, st.clip, "Avatar_walk");
      }
    }
    const avatarWalk = avatarAnims.actions.Avatar_walk;
    if (avatarWalk) avatarWalk.timeScale = WALK_SPEED / WALK_CLIP_SPEED;
    path.sample(st.s, p, t);
    if (avatar.current) {
      avatar.current.position.copy(p);
      let targetYaw = Math.atan2(t.x, t.z);
      if (st.mode === "stop") {
        if (st.clip.name === "Avatar_wave" && !st.advance) targetYaw = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
        else {
          const f = path.stops[st.next].face;
          targetYaw = Math.atan2(f[0] - p.x, f[1] - p.z);
        }
      }
      st.yaw = dampAngle(st.yaw, targetYaw, 6, dt);
      avatar.current.rotation.y = st.yaw;
    }

    // ---------------------------------------------------------------- dog: trail behind, a little to the side
    const goal = st.s - (st.mode === "walk" ? 1.6 : 1.1);
    const gap = goal - st.dogS;
    const dogStep = MathUtils.clamp(gap, -0.2, DOG_SPEED * dt);
    st.dogS += Math.max(dogStep, 0);
    const moving = dogStep > 0.004;
    path.sample(st.dogS, d, t);
    d.addScaledVector(side.set(t.z, 0, -t.x), 0.55); // walk on the avatar's right
    if (dog.current) {
      dog.current.position.copy(d);
      const toAvatar = Math.atan2(p.x - d.x, p.z - d.z);
      st.dogYaw = dampAngle(st.dogYaw, moving ? Math.atan2(t.x, t.z) : toAvatar, 5, dt);
      dog.current.rotation.y = st.dogYaw;
    }
    play(dogAnims.actions, st.dogClip, moving ? "walk" : "idle");
    const walkAction = dogAnims.actions.walk;
    if (walkAction) walkAction.timeScale = moving ? MathUtils.clamp(dogStep / dt / 1.1, 0.6, 1.6) : 1;

    // ---------------------------------------------------------------- eagle: wide banked circles above the island
    st.theta += EAGLE_ORBIT.speed * dt;
    if (eagle.current) {
      const th = st.theta;
      eagle.current.position.set(
        Math.cos(th) * EAGLE_ORBIT.radius,
        EAGLE_ORBIT.height + Math.sin(th * 1.7) * 1.5,
        Math.sin(th) * EAGLE_ORBIT.radius,
      );
      // the eagle's beak points down -Z: yaw it onto the orbit tangent (-sin, cos), then bank the
      // right wing (+X, towards the centre) down into the turn
      eagle.current.rotation.set(0, Math.PI - th, -0.35, "YXZ");
    }
  });
  /* eslint-enable react-hooks/immutability */

  const onAvatarClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    state.current.wave = true;
  };

  return (
    <>
      <group
        ref={avatar}
        onClick={onAvatarClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <primitive object={avatarGltf.scene} />
      </group>
      <group ref={dog}>
        <primitive object={dogGltf.scene} />
      </group>
      {WILDLIFE.map((spot) => (
        <Wildlife key={spot.model} spot={spot} />
      ))}
      <group ref={eagle}>
        <group scale={EAGLE_SCALE}>
          <primitive object={eagleGltf.scene} />
        </group>
      </group>
    </>
  );
}
