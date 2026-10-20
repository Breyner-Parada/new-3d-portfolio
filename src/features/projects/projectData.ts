import type {
  ContactLink,
  EngineeringTopic,
  Experience,
  Profile,
  Project,
  SkillCategory,
  ZoneId,
  ZoneInfo,
} from "@/types/portfolio";

// Content taken from the current breyner-parada.dev.

export const ZONES: ZoneInfo[] = [
  { id: "base-camp", title: "Base Camp", label: "About", description: "Who I am, what I do and where I've worked." },
  { id: "project-outpost", title: "Project Outpost", label: "Projects", description: "Published apps and featured web projects." },
  { id: "skill-crystals", title: "Skill Crystals", label: "Skills", description: "Technologies I work with, by category." },
  { id: "systems-lab", title: "Systems Lab", label: "Engineering", description: "Backend, APIs, databases and deployments." },
  { id: "contact-portal", title: "Contact Portal", label: "Contact", description: "Let's talk: email, LinkedIn, GitHub or the form." },
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z])) as Record<ZoneId, ZoneInfo>;

export const PROFILE: Profile = {
  name: "Breyner Parada",
  headline: "Full Stack & Mobile Developer",
  tagline: "I'm a self-taught Full Stack Developer.",
  about:
    "I'm a Metallurgical Engineer from Colombia and Full Stack Developer who is passionate about making open-source more accessible, creating technology to elevate people, and building community. Some technologies I enjoy working with include ReactJS, TypeScript, NodeJS, NextJS, Tailwind, ThreeJs, React Native and much more.",
  roles: ["Web Developer", "React Native Developer", "Backend Developer", "MERN Stack Developer"],
  email: "libritania95@gmail.com",
  cv: "https://drive.google.com/file/d/1ncu84ENtxZ_MI9hQA_ejhS13cmffoZu4/view?usp=sharing",
  formEndpoint: "https://formsubmit.co/ajax/libritania95@gmail.com",
};

export const EXPERIENCE: Experience[] = [
  {
    role: "Frontend Developer",
    company: "QuePar Solutions",
    period: "Mar 2023 – Present",
    points: [
      "Developing and maintaining web applications using React.js, NextJs and other related technologies.",
      "Collaborating with cross-functional teams including designers, product managers, and other developers to create high-quality products.",
      "Implementing responsive design and ensuring cross-browser compatibility.",
      "Participating in code reviews and providing constructive feedback to other developers.",
    ],
  },
  {
    role: "Web Developer and Mobile Developer",
    company: "appXcale",
    period: "Oct 2022 – Mar 2023",
    points: [
      "Developing and maintaining web applications and mobile apps using NextJs, React Native and other related technologies.",
      "Collaborating with cross-functional teams including designers, product managers, and other developers to create high-quality products.",
      "Participating in code reviews and providing constructive feedback to other developers.",
    ],
  },
  {
    role: "Backend Developer",
    company: "Un Toque Digital",
    period: "Sep 2022 – Oct 2022",
    points: [
      "Connect the application with the database through the API and WebSockets.",
      "Build microservices using Node.js and Express.js.",
      "Build reusable code and libraries for future use.",
    ],
  },
  {
    role: "Freelancer",
    company: "Self-employed",
    period: "Oct 2021 – Sep 2022",
    points: [
      "Doing research and identifying new opportunities and potential new markets.",
      "Implementing responsive design and ensuring cross-browser compatibility.",
      "In continuous learning and improvement of my skills and knowledge in web and mobile development.",
    ],
  },
];

export const PROJECTS: Project[] = [
  {
    slug: "huellitas",
    name: "Huellitas",
    summary:
      "Community-driven pet safety platform featuring lost pet alerts, QR identification, vaccination records, safe walk mode, and Pro subscription. Published on Google Play.",
    stack: ["React Native", "Expo", "Firebase", "AdMob"],
    live: "https://play.google.com/store/apps/details?id=com.breyner.huellitas",
    featured: true,
  },
  {
    slug: "neuronote",
    name: "NeuroNote",
    summary:
      "AI-powered productivity app for capturing ideas, organizing notes, and managing tasks — smart note-taking, AI assistance, and a clean intuitive UI. Published on Google Play.",
    stack: ["React Native", "Expo", "Firebase", "AI"],
    live: "https://play.google.com/store/apps/details?id=com.breyner.neuronote",
    featured: true,
  },
  {
    slug: "metalcal",
    name: "MetalCal",
    summary:
      "Web tool for quick metallurgical process calculations — deformation, diffusion, energy, mass balance, phase diagrams, and solidification. Bridges engineering domain knowledge with modern web UI.",
    stack: ["Next.js", "React", "Tailwind CSS", "GSAP"],
    live: "https://metal-calc-green.vercel.app/",
    source: "https://github.com/Breyner-Parada/metalCalc",
    featured: true,
  },
  {
    slug: "toctoc",
    name: "Toc Toc App",
    summary: "Full-featured TikTok-style social video platform — sign up, upload, share, comment, search, and like videos. Deployed on Vercel.",
    stack: ["Next.js", "Sanity", "Tailwind CSS"],
    live: "https://toctoc-ten.vercel.app/",
    source: "https://github.com/Breyner-Parada/toctoc",
    featured: false,
  },
  {
    slug: "flashback",
    name: "FlashBack App",
    summary: "Full-stack mini social media platform for sharing memories. MERN stack with a custom REST API.",
    stack: ["React", "Node.js", "MongoDB", "Material UI", "Sass"],
    live: "https://breyner-parada.github.io/flashback",
    source: "https://github.com/Breyner-Parada/flashback",
    featured: false,
  },
  {
    slug: "threejs-examples",
    name: "Three.js Examples",
    summary: "Showcase of 3D animations, shaders, and interactive objects built with Three.js and WebGL.",
    stack: ["Three.js", "React", "Tailwind CSS"],
    live: "https://threejsexamples.vercel.app/",
    source: "https://github.com/Breyner-Parada/threejsexamples",
    featured: false,
  },
  {
    slug: "zentry-clone",
    name: "Awwwards Zentry Clone",
    summary: "Pixel-accurate clone of the Zentry website with advanced scroll animations and GSAP timelines.",
    stack: ["Next.js", "React", "Tailwind CSS", "GSAP"],
    live: "https://zentry-clone-example.vercel.app/",
    source: "https://github.com/Breyner-Parada/awwward-site-example",
    featured: false,
  },
];

// Grouping of the skills listed on the current site (plus the stacks of the projects above).
export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: "frontend",
    name: "Frontend",
    skills: ["HTML5", "CSS3", "JavaScript", "TypeScript", "React", "Next.js", "Redux Toolkit", "Tailwind CSS", "Material UI", "Sass"],
  },
  { id: "backend", name: "Backend", skills: ["Node.js", "Express", "REST API", "WebSockets", "MongoDB", "PostgreSQL", "Docker", "Git"] },
  { id: "mobile", name: "Mobile", skills: ["React Native", "Expo", "Firebase", "AdMob"] },
  { id: "3d", name: "3D & Motion", skills: ["Three.js", "React Three Fiber", "GSAP", "Blender"] },
  { id: "ai-automation", name: "AI & Automation", skills: ["AI features in apps (NeuroNote)"] },
];

export const ENGINEERING_TOPICS: EngineeringTopic[] = [
  {
    role: "engineering",
    title: "Software engineering",
    description: "How I build the systems behind the interfaces.",
    items: ["REST APIs and WebSockets", "Microservices with Node.js and Express", "SQL and NoSQL databases", "Deployments to Vercel and Google Play"],
  },
  {
    role: "infra",
    title: "Data & infrastructure",
    description: "Persistence and cloud services.",
    items: ["MongoDB", "PostgreSQL", "Firebase", "Docker"],
  },
  {
    role: "architecture",
    title: "Architecture & APIs",
    description: "Services that connect apps to their data.",
    items: ["Custom REST API (FlashBack)", "WebSockets and microservices (Un Toque Digital)", "Serverless backend with Firebase (Huellitas, NeuroNote)"],
  },
  {
    role: "deploy",
    title: "Deployments",
    description: "From the repository to production.",
    items: ["Vercel (Toc Toc, MetalCal, Three.js Examples)", "GitHub Pages (FlashBack)", "Google Play (Huellitas, NeuroNote)"],
  },
  {
    role: "automation",
    title: "Automation",
    description: "Processes that run on their own.",
    items: [],
  },
];

export const CONTACT_LINKS: ContactLink[] = [
  { id: "github", label: "GitHub", href: "https://github.com/Breyner-Parada" },
  { id: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/breyner-parada-bepg9508" },
  { id: "email", label: "Email", href: `mailto:${PROFILE.email}` },
];
