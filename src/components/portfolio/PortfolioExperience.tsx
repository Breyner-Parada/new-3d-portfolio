"use client";

import dynamic from "next/dynamic";
import { Navbar } from "@/components/ui/Navbar";
import { ProjectPanel } from "@/components/ui/ProjectPanel";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

// WebGL only exists in the browser: skip prerendering the canvas.
const PortfolioCanvas = dynamic(() => import("./PortfolioCanvas"), { ssr: false });

export function PortfolioExperience() {
  return (
    <>
      <div className="fixed inset-0">
        <PortfolioCanvas />
      </div>
      <Navbar />
      <ProjectPanel />
      <LoadingScreen />
    </>
  );
}
