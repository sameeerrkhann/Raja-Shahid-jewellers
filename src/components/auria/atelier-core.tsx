export type CoreState = "idle" | "processing" | "responding" | "attention" | "listening" | "speaking";

const labels: Record<CoreState, string> = {
  idle: "At rest",
  processing: "Preparing a response",
  responding: "Response streaming",
  attention: "Needs attention",
  listening: "Listening",
  speaking: "Reading aloud",
};

export function AtelierCore({ state, compact = false }: { state: CoreState; compact?: boolean }) {
  return <div className={compact ? "atelier-core atelier-core--compact" : "atelier-core"} data-state={state} aria-hidden="true">
    <div className="atelier-orb">
      <div className="atelier-orb__halo" />
      <div className="atelier-orb__track" />
      <div className="atelier-orb__track atelier-orb__track--cross" />
      <div className="atelier-orb__sphere"><span /></div>
      <div className="atelier-orb__rim" />
      <i className="atelier-orb__spark atelier-orb__spark--one" />
      <i className="atelier-orb__spark atelier-orb__spark--two" />
    </div>
    {!compact && <div className="atelier-core__caption"><span />{labels[state]}</div>}
  </div>;
}
