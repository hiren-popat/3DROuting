# 360° Turnaround Hero — Next.js

A scroll-driven hero section with a sticky 360° character turnaround animation.

## Project Structure

```
turnaround-hero/
├── public/
│   └── frames/                  ← 240 JPEG frames (frame_0001.jpg … frame_0240.jpg)
│       ├── frame_0001.jpg
│       ├── frame_0002.jpg
│       └── ...
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── components/
│       └── TurnaroundHero.tsx   ← main component
└── ...
```

## How It Works

- **Frames** live in `public/frames/` — Next.js serves them as static assets at `/frames/frame_XXXX.jpg`
- **Preloading**: on mount, all 240 images are eagerly loaded into a cache array
- **Scroll scrubbing**: a `400vh` scroll stage wraps a `position: sticky` viewport canvas; scroll progress maps linearly to frame index
- **rAF-gated**: scroll events are debounced through `requestAnimationFrame` for smooth 60fps updates

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Customising

- **Swap frames**: replace files in `public/frames/` — keep the `frame_XXXX.jpg` naming convention and update `TOTAL_FRAMES` in `TurnaroundHero.tsx`
- **Scroll distance**: change `height: "400vh"` on the stage div to make the animation faster (shorter) or slower (taller)
- **Headline copy**: edit the `<h1>` in `TurnaroundHero.tsx`
