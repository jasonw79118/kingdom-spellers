import { useEffect, useId, useRef, useState } from "react";
import { KINGDOMS, PLOT, plotState } from "../../game/kingdom";
import { GREENWOOD_SITES, GREENWOOD_DESCRIPTIONS } from "../../game/greenwood";
import { GreenwoodBuilding, GreenwoodLandscape, GreenwoodStarter } from "./GreenwoodArt";
import PetArt from "./petArt";
import "./GreenwoodVillage.css";

const kingdom = KINGDOMS.find(k => k.id === 1);

export default function GreenwoodVillage({ built, gold, busy, onClear, onBuild, onPractice, companion }) {
  const id = useId().replace(/:/g, "");
  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const viewport = useRef(null);
  const detail = useRef(null);
  const count = kingdom.buildings.filter(b => plotState(built, b.id) === PLOT.BUILT).length;
  const selected = kingdom.buildings.find(b => b.id === selectedId);
  const selectedState = selected ? plotState(built, selected.id) : null;
  const price = selected ? (selectedState === PLOT.WILD ? selected.clearCost : selected.cost) : 0;
  const remaining = kingdom.buildings.find(b => plotState(built, b.id) !== PLOT.BUILT);

  useEffect(() => {
    const el = viewport.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [zoom]);

  function select(building, fromMap = false) {
    setSelectedId(building.id);
    if (fromMap) requestAnimationFrame(() => detail.current?.focus({ preventScroll: true }));
    else {
      const el = viewport.current;
      const site = GREENWOOD_SITES[building.id];
      if (el) el.scrollTo({ left: site.x / 1280 * el.scrollWidth - el.clientWidth / 2, top: Math.max(0, site.y / 780 * el.scrollHeight - el.clientHeight / 2) });
    }
  }

  function pan(x, y) {
    viewport.current?.scrollBy({ left: x, top: y });
  }

  return <section className="gw" aria-label="Greenwood Village restoration">
    <header className="gw-intro">
      <div><span className="gw-eyebrow">CHAPTER ONE · THE WOODLAND REALM</span><h2>A little clearing. A grand beginning.</h2><p>Every word you learn helps Greenwood grow.</p></div>
      <div className="gw-progress"><strong>{count}<span> / {kingdom.buildings.length}</span></strong><span>places restored</span><progress value={count} max={kingdom.buildings.length} aria-label="Greenwood restoration" /></div>
    </header>

    <div className="gw-layout">
      <div className="gw-world">
        <div className="gw-world-bar"><span><i aria-hidden="true" /> Greenwood Village</span><span>{count === 0 ? "An unwritten adventure" : count === 7 ? "A flourishing village" : "Your story is growing"}</span></div>
        <div className="gw-viewport" ref={viewport} tabIndex={0} role="region" aria-label="Village map. Use arrow keys to explore, or scroll and swipe." onKeyDown={event => {
          if (event.target !== event.currentTarget) return;
          const movement = { ArrowLeft: [-100,0], ArrowRight: [100,0], ArrowUp: [0,-100], ArrowDown: [0,100] }[event.key];
          if (movement) { event.preventDefault(); pan(...movement); }
          if (event.key === "Home") { event.preventDefault(); setZoom(1); event.currentTarget.scrollTo({left:0,top:0}); }
        }}>
          <div className="gw-canvas" style={{ width: `${zoom * 100}%`, minWidth: `${zoom * 760}px` }}>
            <GreenwoodLandscape id={id}>
              <GreenwoodStarter />
              {companion && <g transform="translate(225 570)"><PetArt id={companion} size={42} label="Your companion" /></g>}
              {kingdom.buildings.map(b => {
                const site = GREENWOOD_SITES[b.id], state = plotState(built,b.id);
                return <g key={b.id} data-building-id={b.id} data-state={state}>
                  {state === PLOT.BUILT && <path d={`M${site.x} ${site.y}Q${site.x} ${site.y+20} 575 ${site.y+25}`} stroke="#d8c18e" strokeWidth="15" fill="none" />}
                </g>;
              })}
              {[...kingdom.buildings].sort((a,b) => GREENWOOD_SITES[a.id].y-GREENWOOD_SITES[b.id].y).map(b => {
                const site = GREENWOOD_SITES[b.id], state = plotState(built,b.id);
                return <g key={b.id} transform={`translate(${site.x} ${site.y}) scale(${site.scale})`} data-art-id={b.id} data-art-state={state}>
                  {state === PLOT.BUILT ? <GreenwoodBuilding id={b.id} /> : <g>
                    <ellipse cy="-3" rx={b.castle ? 105 : 73} ry={b.castle ? 31 : 23} fill={state === PLOT.CLEARED ? "#c4af7c" : "#87a363"} opacity=".72" stroke="#6c8350" strokeWidth="2" strokeDasharray="5 7" />
                    {[-47,47].map(x => <g key={x}><path d={`M${x} 2v-22`} stroke="#8a6d45" strokeWidth="5"/><path d={`M${x-5}-21h10`} stroke="#d5bb7b" strokeWidth="3"/></g>)}
                    {state === PLOT.CLEARED ? <g stroke="#e4c388" strokeWidth="7"><path d="M-30-3 11-17M-17 3 25-11M12 8 39-2"/></g> : <g fill="#5d844f"><ellipse cx="-31" cy="-12" rx="14" ry="9"/><ellipse cx="30" cy="-9" rx="19" ry="9"/></g>}
                    <path d="M-4-5v-41" stroke="#755a3b" strokeWidth="5"/><path d="M-22-46h42v25h-42Z" fill="#f1ddaa" stroke="#927548" strokeWidth="2"/><path d="M-7-34h14m-7-7v14" stroke="#52734d" strokeWidth="3" />
                  </g>}
                </g>;
              })}
            </GreenwoodLandscape>
            {kingdom.buildings.map(b => {
              const site = GREENWOOD_SITES[b.id], state = plotState(built,b.id), owned = state === PLOT.BUILT;
              const cost = state === PLOT.WILD ? b.clearCost : b.cost;
              return <button key={b.id} type="button" className={`gw-lot${owned ? " is-built" : gold >= cost ? " is-ready" : " is-locked"}${selectedId === b.id ? " is-selected" : ""}`} style={{left:`${site.x/1280*100}%`,top:`${(site.y+25)/780*100}%`}} onClick={() => select(b,true)} aria-pressed={selectedId===b.id} aria-label={`${b.name}. ${owned ? "Built" : `${state === PLOT.WILD ? "Clear plot" : "Build"} for ${cost} gold${gold < cost ? `; earn ${cost-gold} more gold` : "; affordable"}`}`}>
                <span aria-hidden="true">{owned ? "✓" : state === PLOT.CLEARED ? "◇" : "+"}</span><span>{b.name}</span>
              </button>;
            })}
          </div>
        </div>
        <div className="gw-map-tools" aria-label="Map controls">
          <span>Explore your clearing</span>
          <div><button type="button" onClick={() => pan(-180,0)} aria-label="Pan left">←</button><button type="button" onClick={() => pan(180,0)} aria-label="Pan right">→</button><button type="button" onClick={() => setZoom(z => Math.max(1,z-.25))} disabled={zoom===1} aria-label="Zoom out">−</button><output aria-label="Map zoom">{Math.round(zoom*100)}%</output><button type="button" onClick={() => setZoom(z => Math.min(1.75,z+.25))} disabled={zoom===1.75} aria-label="Zoom in">+</button><button type="button" onClick={() => {setZoom(1);viewport.current?.scrollTo({left:0,top:0});}} aria-label="Reset map view">↺</button></div>
        </div>
      </div>

      <aside className="gw-detail" ref={detail} tabIndex={-1} aria-label="Selected plot details">
        {selected ? <>
          <span className="gw-eyebrow">{selectedState === PLOT.BUILT ? "A PART OF YOUR STORY" : selectedState === PLOT.CLEARED ? "READY FOR ITS NEXT CHAPTER" : "A PLACE TO BEGIN"}</span>
          <div className="gw-preview" aria-hidden="true"><svg viewBox="-150 -255 300 290"><GreenwoodBuilding id={selected.id}/></svg><span>{selectedState === PLOT.BUILT ? "Restored" : "Your future building"}</span></div>
          <h3>{selected.name}</h3><p>{GREENWOOD_DESCRIPTIONS[selected.id]}</p>
          <dl><div><dt>Plot</dt><dd>{selectedState === PLOT.BUILT ? "Built & saved" : selectedState === PLOT.CLEARED ? "Cleared" : "Wild land"}</dd></div><div><dt>Prosperity when built</dt><dd>+{selected.prosperity}</dd></div>{selectedState !== PLOT.BUILT && <><div><dt>Clear land</dt><dd>{selected.clearCost} gold{selectedState === PLOT.CLEARED ? " · paid" : ""}</dd></div><div><dt>Build afterward</dt><dd>{selected.cost} gold</dd></div></>}</dl>
          {selectedState === PLOT.BUILT ? <p className="gw-saved">✓ You brought this place to life.</p> : <>
            <p className="gw-requirement">{selectedState === PLOT.WILD ? "First, clear this plot. Then build when you have enough gold." : "The land is ready. Confirm below to build your new landmark."}</p>
            <button type="button" className="gw-primary" disabled={busy || gold < price} onClick={() => selectedState === PLOT.WILD ? onClear(selected) : onBuild(selected)}>{busy ? "Saving…" : `${selectedState === PLOT.WILD ? "Clear plot" : "Build"} · ${price} gold`}</button>
            {gold < price && <p className="gw-shortfall" role="status">Earn {price-gold} more gold through practice.</p>}
          </>}
          <button type="button" className="gw-practice" onClick={onPractice}>Practice & earn gold <span aria-hidden="true">→</span></button>
        </> : <>
          <span className="gw-eyebrow">YOUR NEXT LITTLE ADVENTURE</span><div className="gw-book" aria-hidden="true">✧</div><h3>{count === 0 ? "Welcome to your clearing" : remaining ? "One word. One new beginning." : "Look how far you’ve come."}</h3><p>{count === 0 ? "An old woodland shelter, a winding path, and room for something wonderful. The rest of this village is yours to restore." : remaining ? "Choose a village plot to see what you can restore next. Every place here grows from your spelling practice." : "Every Greenwood plot is restored. Keep practicing and explore your next territory below."}</p>
          <ol className="gw-steps"><li><span>1</span> Choose your spelling list</li><li><span>2</span> Practice and earn gold</li><li><span>3</span> Clear a plot, then build</li></ol>
          <button type="button" className="gw-primary" onClick={onPractice}>Start spelling practice <span aria-hidden="true">→</span></button>
          {remaining && <button type="button" className="gw-practice" onClick={() => select(remaining)}>Explore {remaining.name} →</button>}
        </>}
      </aside>
    </div>

    <div className="gw-journal"><div><span className="gw-eyebrow">THE VILLAGE JOURNAL</span><p>Select a place on the map or below. Gold comes from practice; clearing earns no prosperity.</p></div><span className="gw-purse">{gold.toLocaleString()} <span>gold available</span></span></div>
    <div className="gw-sites" aria-label="Village places">
      {kingdom.buildings.map(b => {
        const state = plotState(built,b.id), owned = state===PLOT.BUILT, price = state===PLOT.WILD ? b.clearCost : b.cost;
        return <button key={b.id} type="button" className={`gw-site${selectedId===b.id ? " is-selected" : ""}`} aria-pressed={selectedId===b.id} onClick={() => select(b)}><span className={`gw-site-marker${owned ? " is-built" : ""}`} aria-hidden="true">{owned ? "✓" : state===PLOT.CLEARED ? "◇" : "+"}</span><span><strong>{b.name}</strong><small>{owned ? "Restored" : `${state===PLOT.WILD ? "Clear" : "Build"} · ${price} gold`}</small></span></button>;
      })}
    </div>
  </section>;
}
