"use client";

import { useEffect, type ReactNode } from "react";
import {
  CONTACT_LINKS,
  ENGINEERING_TOPICS,
  EXPERIENCE,
  PROFILE,
  PROJECTS,
  SKILL_CATEGORIES,
  ZONE_BY_ID,
} from "@/features/projects/projectData";
import { islandNavigation, useIslandNavigation } from "@/features/navigation/useIslandNavigation";
import type { Project, Selection } from "@/types/portfolio";
import { ContactForm } from "./ContactForm";

const chip = "rounded-full border border-ui-border bg-ui-tag px-2.5 py-0.5 text-xs text-ui-muted";
const heading = "mb-2 mt-5 text-xs uppercase tracking-widest text-ui-subtle";

function Tags({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <li key={s} className={chip}>{s}</li>
      ))}
    </ul>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="nav-chip">
      {children}
    </a>
  );
}

function BaseCamp({ selection }: { selection: Selection }) {
  return (
    <>
      <p className="text-sm font-medium text-ui-accent">{PROFILE.headline}</p>
      <p className="mt-2 text-sm leading-relaxed text-ui-muted">{PROFILE.about}</p>
      <div className="mt-3"><Tags items={PROFILE.roles} /></div>
      <div className="mt-4">
        <a
          href={PROFILE.cv}
          target="_blank"
          rel="noopener noreferrer"
          className="nav-chip"
          aria-current={selection.role === "cv" ? "true" : undefined}
        >
          View CV
        </a>
      </div>
      <h3 className={heading}>Experience</h3>
      <ol className="space-y-4 border-l border-ui-border pl-4">
        {EXPERIENCE.map((x) => (
          <li key={`${x.company}-${x.period}`}>
            <p className="text-sm font-semibold">{x.role} · <span className="text-ui-accent">{x.company}</span></p>
            <p className="text-xs text-ui-subtle">{x.period}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-ui-muted">
              {x.points.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </li>
        ))}
      </ol>
    </>
  );
}

function ProjectDetail({ project }: { project: Project }) {
  return (
    <article>
      <h3 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
        {project.name}
        {project.status && (
          <span className="rounded-full border border-ui-badge px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ui-badge">
            {project.status}
          </span>
        )}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-ui-muted">{project.summary}</p>
      <div className="mt-3"><Tags items={project.stack} /></div>
      <div className="mt-4 flex flex-wrap gap-2">
        {project.live && <ExternalLink href={project.live}>{project.live.includes("play.google") ? "View on Google Play" : "Live demo"}</ExternalLink>}
        {project.source && <ExternalLink href={project.source}>Source code</ExternalLink>}
      </div>
    </article>
  );
}

function ProjectOutpost({ selection }: { selection: Selection }) {
  const current = PROJECTS.find((p) => p.slug === selection.project);
  const featured = PROJECTS.filter((p) => p.featured);
  const others = PROJECTS.filter((p) => !p.featured);
  return (
    <>
      {current && <ProjectDetail project={current} />}
      <h3 className={heading}>Featured</h3>
      <ul className="flex flex-wrap gap-2">
        {featured.map((p) => (
          <li key={p.slug}>
            <button
              type="button"
              className="nav-chip"
              aria-pressed={p.slug === current?.slug}
              onClick={() => islandNavigation.focusZone("project-outpost", { zone: "project-outpost", project: p.slug })}
            >
              {p.name}
            </button>
          </li>
        ))}
      </ul>
      <h3 className={heading}>More projects</h3>
      <ul className="space-y-3">
        {others.map((p) => (
          <li key={p.slug}>
            <p className="text-sm font-medium">{p.name}</p>
            <p className="text-xs text-ui-subtle">{p.summary}</p>
            <p className="mt-1 flex gap-3 text-xs">
              {p.live && <a className="text-ui-accent hover:underline" href={p.live} target="_blank" rel="noopener noreferrer">Demo</a>}
              {p.source && <a className="text-ui-accent hover:underline" href={p.source} target="_blank" rel="noopener noreferrer">Code</a>}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}

function SkillCrystals({ selection }: { selection: Selection }) {
  const ordered = [...SKILL_CATEGORIES].sort((a, b) => Number(b.id === selection.category) - Number(a.id === selection.category));
  return (
    <ul className="space-y-4">
      {ordered.map((c) => (
        <li key={c.id} className={c.id === selection.category ? "rounded-xl border border-ui-accent p-3" : ""}>
          <h3 className="mb-2 text-sm font-semibold">{c.name}</h3>
          <Tags items={c.skills} />
        </li>
      ))}
    </ul>
  );
}

function SystemsLab({ selection }: { selection: Selection }) {
  const topics = ENGINEERING_TOPICS.filter((t) => t.items.length > 0);
  const current = topics.find((t) => t.role === selection.role) ?? topics[0];
  return (
    <>
      <h3 className="text-lg font-semibold">{current.title}</h3>
      <p className="mt-1 text-sm text-ui-muted">{current.description}</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ui-muted">
        {current.items.map((i) => <li key={i}>{i}</li>)}
      </ul>
      <h3 className={heading}>More from the lab</h3>
      <ul className="flex flex-wrap gap-2">
        {topics.map((t) => (
          <li key={t.role}>
            <button
              type="button"
              className="nav-chip"
              aria-pressed={t.role === current.role}
              onClick={() => islandNavigation.focusZone("systems-lab", { zone: "systems-lab", role: t.role })}
            >
              {t.title}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function ContactPortal({ selection }: { selection: Selection }) {
  return (
    <>
      <ul className="flex flex-wrap gap-2">
        {CONTACT_LINKS.map((l) =>
          l.href ? (
            <li key={l.id}>
              <a
                href={l.href}
                target={l.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="nav-chip"
                aria-current={selection.link === l.id ? "true" : undefined}
              >
                {l.label}
              </a>
            </li>
          ) : null,
        )}
      </ul>
      <p className="mt-2 text-xs text-ui-subtle">{PROFILE.email}</p>
      <ContactForm />
    </>
  );
}

const BODY = {
  "base-camp": BaseCamp,
  "project-outpost": ProjectOutpost,
  "skill-crystals": SkillCrystals,
  "systems-lab": SystemsLab,
  "contact-portal": ContactPortal,
} as const;

/** HTML panel for the focused zone. Escape or the close button returns to the overview. */
export function ProjectPanel() {
  const { selection } = useIslandNavigation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") islandNavigation.backToOverview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Shown right away (not after the camera tween) so content never depends on the 3D scene.
  if (!selection) return null;
  const zone = ZONE_BY_ID[selection.zone];
  if (!zone) return null;
  const Body = BODY[zone.id];

  return (
    <aside
      aria-labelledby="panel-title"
      className="pointer-events-auto fixed inset-x-4 bottom-20 z-20 max-h-[55vh] overflow-y-auto rounded-2xl border border-ui-border bg-ui-bg p-5 text-ui-fg shadow-xl backdrop-blur md:inset-x-auto md:bottom-6 md:right-6 md:top-20 md:max-h-none md:w-[26rem]"
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-ui-accent">{zone.title}</p>
          <h2 id="panel-title" className="text-xl font-semibold">{zone.label}</h2>
          <p className="mt-1 text-xs text-ui-subtle">{zone.description}</p>
        </div>
        <button type="button" onClick={() => islandNavigation.backToOverview()} className="nav-chip" aria-label="Back to the island">
          ✕
        </button>
      </div>
      <Body selection={selection} />
    </aside>
  );
}
