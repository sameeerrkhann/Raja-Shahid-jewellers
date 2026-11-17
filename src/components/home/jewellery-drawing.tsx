type Drawing = "ring" | "bangle" | "signet" | "necklace";

// Original, code-native line studies. Illustrations are not photographed products or CAD.
export function JewelleryDrawing({ kind, className = "" }: { kind: Drawing; className?: string }) {
  return <svg viewBox="0 0 480 480" className={`jewellery-drawing ${className}`} fill="none" stroke="currentColor" strokeWidth="1.15" aria-hidden="true">
    <circle cx="240" cy="240" r="202" strokeDasharray="1 10" opacity=".35" />
    {kind === "ring" && <>
      <ellipse cx="240" cy="290" rx="100" ry="109" /><ellipse cx="240" cy="290" rx="81" ry="91" /><path d="m240 95 62 67-62 65-62-65 62-67Zm-62 67h124m-62-67-23 67 23 65 23-65-23-67M166 215l-20-31m168 31 20-31M132 268l-26-4m242 4 26-4" />
      <path d="m205 135 35 10 35-10m-65 52 30-10 30 10" opacity=".7" />
    </>}
    {kind === "bangle" && <>
      <ellipse cx="240" cy="244" rx="143" ry="161" transform="rotate(-28 240 244)" /><ellipse cx="240" cy="244" rx="122" ry="141" transform="rotate(-28 240 244)" /><ellipse cx="240" cy="244" rx="132" ry="151" transform="rotate(-28 240 244)" strokeDasharray="2 7" />
      {Array.from({ length: 12 }, (_, i) => <path key={i} d="m240 85 6 13-6 13-6-13 6-13Z" transform={`rotate(${i * 30} 240 244)`} />)}
    </>}
    {kind === "signet" && <>
      <path d="M155 182c-38 43-45 137-5 188 43 52 137 46 178-3 42-50 32-146-5-187M168 238c-24 43-22 91 3 119 31 35 103 33 135-6 25-30 27-75 5-116" />
      <path d="m155 130 74-33 94 35v102l-85 40-83-36V130Zm0 0 83 34 85-32M238 164v110m-55-132 46-21 65 24-55 25-56-28Z" /><path d="M192 190v30l46 19 47-22v-29" opacity=".7" />
    </>}
    {kind === "necklace" && <>
      <path d="M74 128c25 135 71 211 166 217 95-6 141-82 166-217M89 122c27 125 68 198 151 205 83-7 124-80 151-205" />
      {Array.from({ length: 13 }, (_, i) => {
        const angle = (i * 11 - 66) * Math.PI / 180;
        const x = 240 + Math.sin(angle) * 165;
        const y = 157 + Math.cos(angle) * 182;
        return <g key={i} transform={`translate(${x} ${y}) rotate(${-i * 11 + 66})`}><path d="m0-14 9 7 3 10-6 10-6 6-6-6-6-10 3-10 9-7Z" /><circle cy="3" r="4" /><path d="M0 20v10m-4-4 4 7 4-7" /></g>;
      })}
      <path d="m240 349 14 19-14 25-14-25 14-19Z" /><path d="M62 100h35m-18-17v35m304-18h35m-17-17v35" opacity=".45" />
    </>}
  </svg>;
}
