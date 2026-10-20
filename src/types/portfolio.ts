export type ZoneId =
  | "base-camp"
  | "project-outpost"
  | "skill-crystals"
  | "systems-lab"
  | "contact-portal";

export type Vec3 = [number, number, number];

/** Camera placement read from the EMPTY_Cam_* / EMPTY_Target_* nodes of island-nav.glb. */
export interface CameraView {
  position: Vec3;
  target: Vec3;
}

/**
 * What the visitor clicked. Mirrors the glTF `extras` written in Blender
 * (zone, role, project, category, link) on every interactive object.
 */
export interface Selection {
  zone: ZoneId;
  role?: string;
  project?: string;
  category?: string;
  link?: string;
}

export interface ZoneInfo {
  id: ZoneId;
  title: string;
  label: string;
  description: string;
}

export interface Project {
  slug: string;
  name: string;
  summary: string;
  stack: string[];
  /** Live app / store page. */
  live?: string;
  /** Source repository. */
  source?: string;
  /** Has its own station in Project Outpost. */
  featured: boolean;
}

export interface Profile {
  name: string;
  headline: string;
  tagline: string;
  about: string;
  roles: string[];
  email: string;
  cv: string;
  /** Existing FormSubmit endpoint used by the contact form. */
  formEndpoint: string;
}

export interface Experience {
  role: string;
  company: string;
  period: string;
  points: string[];
}

export interface SkillCategory {
  id: string;
  name: string;
  skills: string[];
}

/** Systems Lab topics, keyed by the `role` extras of the lab objects. */
export interface EngineeringTopic {
  role: string;
  title: string;
  description: string;
  items: string[];
}

export interface ContactLink {
  id: string;
  label: string;
  /** null = not provided yet (shown disabled). */
  href: string | null;
}
