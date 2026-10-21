"use client";

import { useEffect, useMemo, useRef } from "react";
import { LoopOnce, LoopRepeat, MathUtils, Vector3, type AnimationAction, type Group } from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { DRACO_PATH } from "./IslandScene";
import route from "./avatarRoute.json";

/**
 * Life on the island: the developer avatar walks a loop through every zone (scripts/build_paths.py
 * computes it over the walkable terrain and writes avatarRoute.json), stopping to sit by the campfire,
 * work at the desk, check a project station… The dog trots behind, and an eagle circles overhead.
 * Clicking the avatar makes it wave.
 */

const AVATAR_MODEL = "/models/avatar.glb";
const DOG_MODEL = "/models/dog.glb";
const EAGLE_MODEL = "/models/eagle.glb";

const WALK_SPEED = 1.25; // u/s, matches the walk clip's stride
const FADE = 0.35;
// Quaternius models: measured in Blender (scripts/build_companions.py exports them at source size)
const DOG_SCALE = 0.95 / 6.9; // 0.95 u long
const DOG_YAW = -Math.PI / 2; // its nose points down +X; turn it to the +Z forward the avatar uses
const DOG_SPEED = 1.6;
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
        const once = stop.clip === "sit" || stop.clip === "wave";
        play(avatarAnims.actions, st.clip, `Avatar_${stop.clip}`, once);
      } else st.s += step;
    } else {
      st.timer -= dt;
      if (st.timer <= 0) {
        if (st.advance) st.next = (st.next + 1) % path.stops.length;
        st.mode = "walk";
        play(avatarAnims.actions, st.clip, "Avatar_walk");
      }
    }
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
      eagle.current.rotation.set(0, Math.atan2(-Math.sin(th), Math.cos(th)), -0.35, "YXZ");
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
        <group rotation={[0, DOG_YAW, 0]} scale={DOG_SCALE}>
          <primitive object={dogGltf.scene} />
        </group>
      </group>
      <group ref={eagle}>
        <group scale={EAGLE_SCALE}>
          <primitive object={eagleGltf.scene} />
        </group>
      </group>
    </>
  );
}
