"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const DESKTOP_FRAMES_COUNT = 166;
const MOBILE_FRAMES_COUNT = 56; // 1/3 of desktop frames to prevent mobile memory crashes

// Generate frame paths from /frames/frame_0001.jpg ... frame_0166.jpg
function getFramePath(index: number): string {
  const padded = String(index + 1).padStart(4, "0");
  return `/frames/frame_${padded}.jpg`;
}

// Map mobile step (0..55) to actual frame index (0..165)
function getFrameIndex(step: number, isMobile: boolean): number {
  if (isMobile) {
    return Math.min(step * 3, DESKTOP_FRAMES_COUNT - 1);
  }
  return step;
}

interface Beat {
  id: number;
  peak: number;
  range: number;
  label: string;
  title: string;
  description: string;
  positionClass: string;
}

interface RingTransform {
  transform: string;
  filter: string;
}

const BEATS: Beat[] = [
  {
    id: 0,
    peak: 0.0,
    range: 0.16,
    label: "Full-Stack Software Engineer",
    title: "Hi, I'm Hiren.",
    description: "Building premium, high-performance web applications and interactive digital experiences with absolute precision.",
    positionClass: "items-center justify-end pb-[12vh] text-center px-6 w-full"
  },
  {
    id: 1,
    peak: 0.32,
    range: 0.20,
    label: "Modern Toolkit",
    title: "Crafting the Modern Web.",
    description: "Specialized in React, Next.js, TypeScript, and Tailwind CSS. Designing performant architectures and fluid interactive states.",
    positionClass: "items-center justify-end pb-[12vh] text-center px-6 w-full md:items-start md:justify-center md:text-left md:px-0 md:pl-[8vw] md:w-[35%]"
  },
  {
    id: 2,
    peak: 0.58,
    range: 0.20,
    label: "Engineering Philosophy",
    title: "Clean code. Premium UX.",
    description: "Believing that software should not just compile, but feel alive. Optimizing for speed, clean code standards, and accessibility.",
    positionClass: "items-center justify-end pb-[12vh] text-center px-6 w-full md:items-end md:justify-center md:text-right md:px-0 md:pr-[8vw] md:w-[35%] md:ml-auto"
  },
  {
    id: 3,
    peak: 0.80,
    range: 0.16,
    label: "Production Scale",
    title: "Shipped to scale.",
    description: "Experienced in shipping products from concept to production, focusing on pixel-perfect UI execution and robust backends.",
    positionClass: "items-center justify-end pb-[14vh] text-center px-6 w-full"
  },
  {
    id: 4,
    peak: 1.0,
    range: 0.16,
    label: "Let's Collaborate",
    title: "Let's build together.",
    description: "Open to senior engineering roles, consulting, and building next-generation web platforms. Get in touch to discuss details.",
    positionClass: "items-center justify-center text-center px-6 w-full pb-[10vh] md:pb-0"
  }
];

function getRingTransform(progress: number, isMobile: boolean, prefersReducedMotion: boolean): RingTransform {
  const keys = [
    { p: 0.00, x: 0, y: 0, s: 0.95, b: 0 },
    { p: 0.32, x: 20, y: 0, s: 1.10, b: 0 },
    { p: 0.58, x: -20, y: 0, s: 1.30, b: 0.6 },
    { p: 0.80, x: 0, y: -6, s: 1.10, b: 0 },
    { p: 1.00, x: 0, y: 0, s: 0.80, b: 0 }
  ];

  let idx = 0;
  for (let i = 0; i < keys.length - 1; i++) {
    if (progress >= keys[i].p && progress <= keys[i + 1].p) {
      idx = i;
      break;
    }
  }

  const k1 = keys[idx];
  const k2 = keys[idx + 1];
  const tRaw = (progress - k1.p) / (k2.p - k1.p);
  const t = prefersReducedMotion ? tRaw : (Math.sin(tRaw * Math.PI - Math.PI / 2) + 1) / 2;

  const x = k1.x + (k2.x - k1.x) * t;
  const y = k1.y + (k2.y - k1.y) * t;
  const s = k1.s + (k2.s - k1.s) * t;
  const b = k1.b + (k2.b - k1.b) * t;

  const xOffset = isMobile ? 0 : x;
  const yOffset = isMobile ? -6 : y;
  const finalScale = isMobile ? s * 0.70 : s;

  return {
    transform: `translate(${xOffset}vw, ${yOffset}vh) scale(${finalScale})`,
    filter: prefersReducedMotion ? "none" : `blur(${b}px)`,
  };
}

export default function TurnaroundHero() {
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const beatRefs = useRef<Array<HTMLDivElement | null>>([]);
  const cacheRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef<number>(-1);
  const hudFrameRef = useRef<number>(1);
  const angleRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const [hudFrame, setHudFrame] = useState(1);
  const [angleDeg, setAngleDeg] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loadCount, setLoadCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  const targetProgressRef = useRef<number>(0);
  const smoothProgressRef = useRef<number>(0);

  // Check responsive sizing & user motion preferences
  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionFrame = requestAnimationFrame(() => {
      setPrefersReducedMotion(mediaQuery.matches);
    });

    const onMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);

    // Safely add media query listeners for older mobile browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", onMotionChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(onMotionChange);
    }

    const mountFrame = requestAnimationFrame(() => {
      setHasMounted(true);
    });

    return () => {
      window.removeEventListener("resize", checkViewport);
      cancelAnimationFrame(motionFrame);
      cancelAnimationFrame(mountFrame);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", onMotionChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(onMotionChange);
      }
    };
  }, []);

  // Preload frames based on device profile
  useEffect(() => {
    if (!hasMounted) return;

    const framesCount = isMobile ? MOBILE_FRAMES_COUNT : DESKTOP_FRAMES_COUNT;
    const images: HTMLImageElement[] = [];
    let count = 0;
    const resetFrame = requestAnimationFrame(() => {
      setLoaded(false);
      setLoadCount(0);
    });

    for (let i = 0; i < framesCount; i++) {
      const frameIdx = getFrameIndex(i, isMobile);
      const im = new window.Image();
      im.onload = () => {
        count++;
        setLoadCount(count);
        if (count === framesCount) setLoaded(true);
      };
      im.onerror = () => {
        count++;
        setLoadCount(count);
        if (count === framesCount) setLoaded(true);
      };
      im.src = getFramePath(frameIdx);
      images.push(im);
    }

    cacheRef.current = images;

    if (imgRef.current) {
      imgRef.current.src = getFramePath(getFrameIndex(0, isMobile));
    }

    return () => {
      cancelAnimationFrame(resetFrame);
      images.forEach((im) => { im.src = ""; });
    };
  }, [hasMounted, isMobile]);

  // Update target progress based on current scroll position
  const updateTargetProgress = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    const stageH = stage.offsetHeight;
    const viewH = window.innerHeight;

    const scrolled = -rect.top;
    const scrollable = stageH - viewH;
    const prog = Math.max(0, Math.min(1, scrolled / scrollable));
    targetProgressRef.current = prog;
  }, []);

  // Scroll and Resize Event Listeners
  useEffect(() => {
    const onScroll = () => {
      updateTargetProgress();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    updateTargetProgress();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [updateTargetProgress]);

  // RequestAnimationFrame Tick Loop for smooth momentum interpolation
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;

      const target = targetProgressRef.current;
      const current = smoothProgressRef.current;
      const diff = target - current;

      if (prefersReducedMotion) {
        smoothProgressRef.current = target;
      } else {
        if (Math.abs(diff) > 0.0001) {
          smoothProgressRef.current += diff * 0.07;
        } else {
          smoothProgressRef.current = target;
        }
      }

      const currentProgress = smoothProgressRef.current;

      const ring = ringRef.current;
      if (ring) {
        const ringStyle = getRingTransform(currentProgress, isMobile, prefersReducedMotion);
        ring.style.transform = ringStyle.transform;
        ring.style.filter = ringStyle.filter;
      }

      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${currentProgress * 100}%`;
      }

      if (scrollHintRef.current) {
        scrollHintRef.current.style.opacity = currentProgress < 0.015 ? "1" : "0";
      }

      BEATS.forEach((beat, index) => {
        const node = beatRefs.current[index];
        if (!node) return;

        const delta = currentProgress - beat.peak;
        const absDelta = Math.abs(delta);
        const weight = absDelta >= beat.range
          ? 0
          : (Math.cos((absDelta / beat.range) * Math.PI) + 1) / 2;

        if (weight <= 0.002) {
          node.style.opacity = "0";
          node.style.pointerEvents = "none";
          return;
        }

        const translateY = prefersReducedMotion
          ? 0
          : Math.max(-50, Math.min(50, -delta * 200));
        const blur = prefersReducedMotion ? 0 : (1 - weight) * 16;
        const scale = prefersReducedMotion ? 1 : 0.96 + weight * 0.04;

        node.style.opacity = String(weight);
        node.style.transform = `translateY(${translateY}px) scale(${scale})`;
        node.style.filter = `blur(${blur}px)`;
      });

      // Render the correct frame
      const img = imgRef.current;
      if (img && cacheRef.current.length > 0) {
        const framesCount = isMobile ? MOBILE_FRAMES_COUNT : DESKTOP_FRAMES_COUNT;
        const stepIdx = Math.min(
          Math.floor(currentProgress * (framesCount - 1)),
          framesCount - 1
        );

        if (stepIdx !== currentFrameRef.current) {
          currentFrameRef.current = stepIdx;
          const cached = cacheRef.current[stepIdx];
          const actualFrameIdx = getFrameIndex(stepIdx, isMobile);
          img.src = cached?.complete && cached.src ? cached.src : getFramePath(actualFrameIdx);
          const nextHudFrame = Math.min(Math.floor(currentProgress * (DESKTOP_FRAMES_COUNT - 1)) + 1, DESKTOP_FRAMES_COUNT);
          const nextAngle = Math.round(currentProgress * 360);

          if (nextHudFrame !== hudFrameRef.current) {
            hudFrameRef.current = nextHudFrame;
            setHudFrame(nextHudFrame);
          }

          if (nextAngle !== angleRef.current) {
            angleRef.current = nextAngle;
            setAngleDeg(nextAngle);
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [prefersReducedMotion, isMobile]);

  const framesTotal = isMobile ? MOBILE_FRAMES_COUNT : DESKTOP_FRAMES_COUNT;
  const loadPercent = Math.round((loadCount / framesTotal) * 100);
  const initialRingStyle = getRingTransform(0, isMobile, prefersReducedMotion);
  const frameNumStr = String(hudFrame).padStart(3, "0");
  const angleStr = String(angleDeg).padStart(3, "0");

  if (!hasMounted) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  return (
    <div className="relative bg-zinc-950 text-zinc-100 selection:bg-zinc-800">

      {/* ── Ambient loading progress bar (non-blocking) ── */}
      {!loaded && (
        <div className="fixed top-0 left-0 w-full h-[2px] bg-zinc-950 z-[150] pointer-events-none">
          <div
            className="h-full bg-gradient-to-r from-zinc-800 to-zinc-400 transition-all duration-300 ease-out"
            style={{ width: `${loadPercent}%` }}
          />
        </div>
      )}

      {/* ── Scroll Hint ── */}
      <div
        ref={scrollHintRef}
        className="fixed bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-[80] pointer-events-none transition-opacity duration-700 ease-in-out"
        style={{ opacity: 1 }}
      >
        <span className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase font-light">
          Scroll to explore
        </span>
        <div className="w-[1px] h-9 bg-gradient-to-b from-zinc-500 to-transparent relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-zinc-300 animate-[dropArrow_1.8s_ease-in-out_infinite]" />
        </div>
      </div>

      {/* ── Scroll Stage Container ── */}
      <div ref={stageRef} className="relative h-[480vh]">
        {/* Sticky Viewport Canvas */}
        <div className="sticky top-0 left-0 w-full h-screen overflow-hidden bg-zinc-950">

          {/* Subtle Ambient Glows */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.015)_0%,transparent_60%)] pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-zinc-950 to-transparent pointer-events-none z-[20]" />
          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none z-[20]" />

          {/* ── 3D Image Container ── */}
          <div
            ref={ringRef}
            className="w-full h-full flex items-center justify-center transition-all duration-75 ease-out"
            style={{
              willChange: "transform, filter",
              ...initialRingStyle,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              alt="Hiren Thakkar — Full-Stack Software Engineer Turntable Profile"
              className="w-full h-full object-cover object-center block select-none pointer-events-none"
              style={{
                willChange: "contents",
              }}
            />
          </div>

          {/* Subtle Vignette Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(9,9,11,0.55)_100%)] pointer-events-none z-10" />

          {/* ── Dynamic Storytelling Text Overlays ── */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            {BEATS.map((beat, index) => (
                <div
                  key={beat.id}
                  ref={(node) => {
                    beatRefs.current[index] = node;
                  }}
                  className={`absolute inset-0 flex flex-col p-6 md:p-12 pointer-events-none ${beat.positionClass}`}
                  style={{
                    opacity: beat.id === 0 ? 1 : 0,
                    transform: "translateY(0px) scale(1)",
                    filter: "blur(0px)",
                    willChange: "transform, opacity, filter",
                  }}
                >
                  <div className="max-w-[480px]">
                    <span className="text-[10px] md:text-[11px] font-semibold tracking-[0.25em] text-zinc-500 uppercase block mb-3 md:mb-4 select-none">
                      {beat.label}
                    </span>
                    <h2 className="text-[36px] md:text-[60px] font-extralight tracking-tight leading-[1.05] text-zinc-100 mb-4 md:mb-6 text-wrap-balance">
                      {beat.title}
                    </h2>
                    <p className="text-[13px] md:text-[15px] leading-relaxed text-zinc-400 font-light text-wrap-pretty">
                      {beat.description}
                    </p>
                  </div>
                </div>
            ))}
          </div>

          {/* ── Permanent HUD (Heads-Up Display) UI ── */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 md:p-12 z-30 select-none">
            {/* Top Row */}
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-bold tracking-[0.3em] text-zinc-300 uppercase">
                  HIREN THAKKAR
                </span>
                <span className="text-[8px] tracking-[0.1em] text-zinc-600 font-mono hidden md:inline">
                  PORTFOLIO 360°
                </span>
              </div>
              <div className="text-[9px] font-mono tracking-widest text-zinc-500">
                FRAME <span className="text-zinc-300 tabular-nums">{frameNumStr}</span> / {DESKTOP_FRAMES_COUNT}
              </div>
            </div>

            {/* Bottom Row (Hidden on mobile to avoid overlapping with text overlays) */}
            <div className="hidden md:flex justify-between items-end w-full">
              <div>
                <span className="text-[8px] tracking-[0.2em] text-zinc-600 uppercase block font-mono">
                  Developer Telemetry
                </span>
                <span className="text-[10px] tracking-[0.1em] text-zinc-400 font-light mt-1 block">
                  3D Profile Scan
                </span>
              </div>

              {/* Degrees Counter */}
              <div className="text-right">
                <div className="text-[36px] md:text-[56px] font-extralight tracking-tighter leading-none text-zinc-200 tabular-nums">
                  {angleStr}°
                </div>
                <span className="text-[8px] text-zinc-600 tracking-[0.25em] uppercase font-mono block mt-1">
                  DEGREES
                </span>
              </div>
            </div>
          </div>

          {/* ── Circular Progress bar ── */}
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-zinc-900/60 z-30">
            <div
              ref={progressBarRef}
              className="h-full bg-zinc-600/80 transition-all duration-75 ease-out"
              style={{ width: "0%" }}
            />
          </div>

        </div>
      </div>

      {/* ── Below-fold Premium Specs Showcase (Bento Grid) ── */}
      <section className="bg-zinc-950 min-h-screen py-32 px-6 relative z-50 border-t border-zinc-900/60">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-20">

          {/* Header */}
          <div className="text-center max-w-xl flex flex-col gap-4">
            <span className="text-[10px] font-semibold tracking-[0.25em] text-zinc-500 uppercase">
              Core Capabilities
            </span>
            <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-zinc-100 text-wrap-balance">
              Redefining engineering quality.
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400 font-light text-wrap-pretty">
              Every project is an opportunity to design responsive architectures, optimize backend data structures, and deliver outstanding interactive visual experiences.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">

            {/* Card 1: Systems Architecture (Large - Spans 2 Cols) */}
            <div className="md:col-span-2 bg-zinc-900/20 border border-zinc-900/80 hover:border-zinc-800/40 rounded-3xl p-8 flex flex-col justify-between overflow-hidden relative group transition-all duration-500 min-h-[300px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.02),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="flex justify-between items-start">
                <span className="text-[8px] font-mono tracking-[0.2em] text-zinc-600 uppercase border border-zinc-900 px-2.5 py-1 rounded-full">
                  SYSTEMS ARCHITECTURE
                </span>
                <svg className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors duration-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
              </div>
              <div className="mt-12">
                <h3 className="text-2xl font-light tracking-tight text-zinc-200 mb-3">
                  Full-Stack Architecture & API Design
                </h3>
                <p className="text-xs leading-relaxed text-zinc-500 font-light max-w-md">
                  Building resilient backends, scalable REST/GraphQL APIs, and server-rendered Next.js/React architectures. Optimized for high concurrency, reliable database schemas, and minimal execution overhead on modern serverless edges.
                </p>
              </div>
            </div>

            {/* Card 2: Performance (Small) */}
            <div className="bg-zinc-900/20 border border-zinc-900/80 hover:border-zinc-800/40 rounded-3xl p-8 flex flex-col justify-between overflow-hidden relative group transition-all duration-500 min-h-[300px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.02),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="flex justify-between items-start">
                <span className="text-[8px] font-mono tracking-[0.2em] text-zinc-600 uppercase border border-zinc-900 px-2.5 py-1 rounded-full">
                  PERFORMANCE
                </span>
                <svg className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors duration-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <div className="mt-12">
                <div className="text-5xl font-extralight tracking-tight text-zinc-300 mb-2">
                  99+
                </div>
                <h3 className="text-lg font-light tracking-tight text-zinc-300 mb-2">
                  Lighthouse Optimizations
                </h3>
                <p className="text-[11px] leading-relaxed text-zinc-500 font-light">
                  Obsessed with Core Web Vitals. Expert in optimizing TTFB, resolving bundle bloating, tree-shaking, static generation, caching strategies, and compositor-only animations.
                </p>
              </div>
            </div>

            {/* Card 3: Toolbox (Small - row-span-2) */}
            <div className="md:row-span-2 bg-zinc-900/20 border border-zinc-900/80 hover:border-zinc-800/40 rounded-3xl p-8 flex flex-col justify-between overflow-hidden relative group transition-all duration-500 min-h-[400px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.02),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="flex justify-between items-start">
                <span className="text-[8px] font-mono tracking-[0.2em] text-zinc-600 uppercase border border-zinc-900 px-2.5 py-1 rounded-full">
                  THE TOOLBOX
                </span>
                <svg className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors duration-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <div className="mt-16">
                <h3 className="text-2xl font-light tracking-tight text-zinc-200 mb-4">
                  Engineering Stack
                </h3>
                <ul className="flex flex-col gap-3 font-light">
                  {[
                    "Next.js (App Router, Server Actions)",
                    "React 19 & React Server Components",
                    "TypeScript & JavaScript (ESNext)",
                    "Tailwind CSS v4 & PostCSS configurations",
                    "PostgreSQL, Prisma ORM & Redis caching",
                    "Docker, AWS Cloud Services & Vercel Edge"
                  ].map((spec, i) => (
                    <li key={i} className="text-xs flex items-center gap-3 text-zinc-400 py-1.5 border-b border-zinc-900/60 last:border-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                      {spec}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-[10px] text-zinc-600 font-mono tracking-wider mt-6">
                DEVELOPMENT STACK TELEMETRY
              </div>
            </div>

            {/* Card 4: UI/UX (Large - Spans 2 Cols) */}
            <div className="md:col-span-2 bg-zinc-900/20 border border-zinc-900/80 hover:border-zinc-800/40 rounded-3xl p-8 flex flex-col justify-between overflow-hidden relative group transition-all duration-500 min-h-[300px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.02),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="flex justify-between items-start">
                <span className="text-[8px] font-mono tracking-[0.2em] text-zinc-600 uppercase border border-zinc-900 px-2.5 py-1 rounded-full">
                  INTERFACE DESIGN
                </span>
                <svg className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors duration-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m0-18L8 7m4-4l4 4m-4 14l-4-4m4 4l4-4" />
                </svg>
              </div>
              <div className="mt-12 flex justify-between items-end">
                <div>
                  <h3 className="text-2xl font-light tracking-tight text-zinc-200 mb-3">
                    Pixel-Perfect UX Execution
                  </h3>
                  <p className="text-xs leading-relaxed text-zinc-500 font-light max-w-sm">
                    Crafting interfaces that look stunning and feel responsive. Skilled in micro-interactions, responsive frameworks, and strict web accessibility (WCAG AA compliance) with complete reduced motion adaptation.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-5xl md:text-7xl font-extralight tracking-tighter text-zinc-300 block">
                    60 FPS
                  </span>
                  <span className="text-[8px] font-mono tracking-[0.1em] text-zinc-500 block mt-1 uppercase">
                    ANIMATION STANDARD
                  </span>
                </div>
              </div>
            </div>

            {/* Card 5: Security / Connectivity (Large - Spans 3 Cols) */}
            <div className="md:col-span-3 bg-zinc-900/20 border border-zinc-900/80 hover:border-zinc-800/40 rounded-3xl p-8 flex flex-col justify-between overflow-hidden relative group transition-all duration-500 min-h-[260px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.02),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="flex justify-between items-start">
                <span className="text-[8px] font-mono tracking-[0.2em] text-zinc-600 uppercase border border-zinc-900 px-2.5 py-1 rounded-full">
                  TEAM COLLABORATION & INTEGRITY
                </span>
                <svg className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors duration-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div className="mt-8 flex flex-col md:flex-row justify-between md:items-end gap-6">
                <div className="max-w-xl">
                  <h3 className="text-2xl font-light tracking-tight text-zinc-200 mb-3">
                    Shipped with Security, Clarity, and Speed.
                  </h3>
                  <p className="text-xs leading-relaxed text-zinc-500 font-light">
                    Writing maintainable, clean code covered by comprehensive unit/integration testing suites. Well-versed in Agile methodologies, Git-driven CI/CD deployment pipelines, and building secure platforms that protect user privacy and project integrity.
                  </p>
                </div>
                <div className="flex gap-4 border-t border-zinc-900/60 pt-4 md:border-0 md:pt-0 font-mono text-[10px] tracking-wide text-zinc-400">
                  <div className="flex items-center gap-2 border border-zinc-900 px-3 py-1.5 rounded-xl bg-zinc-950/40">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    CI/CD BUILD CHECK
                  </div>
                  <div className="flex items-center gap-2 border border-zinc-900 px-3 py-1.5 rounded-xl bg-zinc-950/40">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    TESTS: 100% PASSING
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* CSS Animations */}
      <style>{`
        @keyframes dropArrow {
          0%   { transform: translateY(-100%); opacity: 0; }
          45%  { transform: translateY(0);    opacity: 1; }
          55%  { transform: translateY(0);    opacity: 1; }
          100% { transform: translateY(100%);  opacity: 0; }
        }
      `}</style>
    </div>
  );
}
