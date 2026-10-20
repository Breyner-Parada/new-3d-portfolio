"use client";

import { useState, type FormEvent } from "react";
import { PROFILE } from "@/features/projects/projectData";

type Status = "idle" | "sending" | "sent" | "error";

/** Posts to the same FormSubmit endpoint the current site uses. */
export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus("sending");
    try {
      const res = await fetch(PROFILE.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  const field = "w-full rounded-lg border border-white/15 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-amber-400";

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-2">
      <input type="hidden" name="_subject" value="New message from Developer Island" />
      <label className="sr-only" htmlFor="cf-name">Name</label>
      <input id="cf-name" name="name" required placeholder="Your name" autoComplete="name" className={field} />
      <label className="sr-only" htmlFor="cf-email">Email</label>
      <input id="cf-email" name="email" type="email" required placeholder="Your email" autoComplete="email" className={field} />
      <label className="sr-only" htmlFor="cf-message">Message</label>
      <textarea id="cf-message" name="message" required rows={4} placeholder="How can I help you?" className={field} />
      <button type="submit" disabled={status === "sending"} className="nav-chip w-full disabled:opacity-60">
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
      <p role="status" className="min-h-5 text-xs text-slate-400">
        {status === "sent" && "Message sent! I'll get back to you soon."}
        {status === "error" && `Couldn't send it. Email me at ${PROFILE.email}.`}
      </p>
    </form>
  );
}
