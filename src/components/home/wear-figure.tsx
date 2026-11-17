import type { WearPlacement } from "@/lib/catalogue/showcase";

/** Where the piece lands on each figure, as a percentage of the 400×500 drawing. */
export const wearAnchor: Record<WearPlacement, { x: number; y: number; size: number }> = {
  neck: { x: 50, y: 60, size: 46 },
  finger: { x: 49, y: 31, size: 24 },
  wrist: { x: 51, y: 67, size: 40 },
};

// Original single-line figure studies, drawn in code. They show placement only; they are not
// photographs of a person and make no claim about fit, scale or comfort.
export function WearFigure({ kind }: { kind: WearPlacement }) {
  return <svg viewBox="0 0 400 500" className="wear-figure" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
    {kind === "neck" ? <>
      <path d="M120 0c-8 80-24 150-60 210M280 0c8 80 24 150 60 210" opacity=".45" />
      <path d="M128 0c4 60 22 104 48 124 10 8 18 12 24 12s14-4 24-12c26-20 44-64 48-124" />
      <path d="M168 118c2 42-2 78-14 104M232 118c-2 42 2 78 14 104" />
      <path d="M154 222c-34 14-84 24-114 46C20 284 8 320 0 360M246 222c34 14 84 24 114 46 20 16 32 52 40 92" />
      <path d="M96 262c36-10 72-4 96 12m112-12c-36-10-72-4-96 12m-16 0c4 6 12 6 16 0" opacity=".7" />
      <path d="M118 440c30-22 60-20 82-2m82 2c-30-22-60-20-82-2" opacity=".35" />
    </> : <>
      <path d="M150 500c2-60 6-120 10-170M262 500c-4-60-10-120-14-170" />
      <path d="M160 330c-4-30-12-60-14-90m102 90c6-30 18-56 24-80" />
      <path d="M272 250c18-14 34-38 40-64 4-16-6-24-16-16-10 12-20 26-34 34" />
      <path d="M262 204c0-44 2-84 0-112-1-14-16-16-18 0-2 28-4 66-6 90" />
      <path d="M238 182c0-42-2-92-4-124-1-16-18-16-19 0-2 34-3 82-3 120" />
      <path d="M212 178c0-38-4-78-6-102-2-14-18-14-19 2-1 28-1 68-1 104" />
      <path d="M186 182c-2-26-6-52-9-68-3-14-17-12-17 2 0 24-2 52-4 80-4 20-8 32-10 44" />
      <path d="M170 268c20 8 50 8 70 0" opacity=".35" />
    </>}
  </svg>;
}
