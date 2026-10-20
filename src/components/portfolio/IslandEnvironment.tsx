"use client";

const SKY = "#5d7fa8";

/** Sky colour, fog and the two lights that stand in for the Blender sun + world. */
export function IslandEnvironment() {
  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, 70, 160]} />
      <hemisphereLight args={["#bcd4ff", "#2f3b33", 1.1]} />
      {/* Direction matches the Blender sun (52°, 0, -35°) converted to Y-up. */}
      <directionalLight position={[-18, 25, 26]} intensity={2.4} color="#ffdcb8" />
    </>
  );
}
