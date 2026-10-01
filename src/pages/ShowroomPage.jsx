// Building showroom — a workbench, not a game screen.
//
//   /#/showroom
//
// Test buildings at large scale, side by side, so the architecture can be judged
// on its own. Nothing here is wired to save data or progression. It exists to
// answer one question: does this building art match the target style?
//
// Each card auto-fits its viewBox to the building's measured bounding box, so
// every building is shown at the largest size that fills its frame and detail is
// never cut off by hand-tuned numbers that drift when the art changes. The seed
// slider then re-measures, which is the real test: a building that still reads
// as a building after its plaster, tile and layout all change is robust.

import { useLayoutEffect, useRef, useState } from "react";
import { iso, Z_HEIGHT } from "../components/kingdom/iso";
import { SHOWROOM } from "../components/kingdom/scene/shop";
import { MAT } from "../components/kingdom/scene/shop/materials";
import "./Showroom.css";

// The iso projection already emits screen pixels at TILE_W = 64, so a building
// drawn in grid units comes out ~160 units across. Zoom so a typical building
// fills its card, then correct the offset against the measured bbox.
const ZOOM = 3.4;
const PAD = 26;
const LOOK = iso(1.05, 0.82, 0.5, Z_HEIGHT);

/** A turf diamond with an optional 1-unit grid, in svg space. */
function Ground({ showGrid, shift }) {
  const tiles = [];
  if (showGrid) {
    for (let i = -9; i < 9; i += 1) {
      for (let j = -9; j < 9; j += 1) {
        tiles.push(
          <polygon
            key={`${i}-${j}`}
            points={[
              iso(i, j, 0, 1), iso(i + 1, j, 0, 1), iso(i + 1, j + 1, 0, 1), iso(i, j + 1, 0, 1),
            ].map((p) => `${r2(p.x)},${r2(p.y)}`).join(" ")}
            fill={(i + j) % 2 === 0 ? "#e4dcc6" : "#f3eee0"}
          />,
        );
      }
    }
  }
  const big = 26;
  return (
    <g data-role="ground">
      <polygon
        points={[
          iso(-big, -big, 0, 1), iso(big, -big, 0, 1), iso(big, big, 0, 1), iso(-big, big, 0, 1),
        ].map((p) => `${r2(p.x)},${r2(p.y)}`).join(" ")}
        fill={showGrid ? "#f7f3e9" : MAT.turf}
      />
      <g transform={`translate(${shift}) scale(${ZOOM})`}>{tiles}</g>
    </g>
  );
}

/** One building, framed to fit, with its feature list underneath. */
function Card({ item, seed, showGrid }) {
  const Draw = item.Draw;
  const svgRef = useRef(null);
  const bodyRef = useRef(null);
  const [frame, setFrame] = useState(null);

  // Measure the building, then derive a viewBox that frames it exactly.
  useLayoutEffect(() => {
    const svg = svgRef.current;
    const body = bodyRef.current;
    if (!svg || !body) return;
    let b;
    try {
      b = body.getBBox();
    } catch {
      return;
    }
    if (!b || !b.width || !b.height) return;
    const w = b.width * ZOOM;
    const h = b.height * ZOOM;
    // Centre on the building, then shift so LOOK sits a little below centre:
    // the extra headroom above is for chimneys and the manor's tower.
    const cx = b.x * ZOOM + w / 2;
    const cy = b.y * ZOOM + h / 2;
    const tx = -cx - LOOK.x * ZOOM;
    const ty = -cy - LOOK.y * ZOOM + h * 0.06;
    setFrame({
      vb: `${r2(-w / 2 - PAD)} ${r2(-h / 2 - PAD)} ${r2(w + PAD * 2)} ${r2(h + PAD * 2)}`,
      shift: `${r2(tx)},${r2(ty)}`,
    });
  }, [seed, item.id]);

  // Before measuring, fall back to a sane frame so the first paint is not empty.
  const vb = frame ? frame.vb : "-340 -430 680 640";
  const shift = frame
    ? frame.shift
    : `${r2(-LOOK.x * ZOOM)},${r2(-LOOK.y * ZOOM)}`;

  return (
    <figure className="shop-card">
      <svg
        ref={svgRef}
        className="shop-svg"
        viewBox={vb}
        role="img"
        aria-label={`${item.name} building test`}
      >
        <Ground showGrid={showGrid} shift={shift} />
        <g transform={`translate(${shift}) scale(${ZOOM})`}>
          <g ref={bodyRef}>
            <Draw seed={seed} lit />
          </g>
        </g>
      </svg>
      <figcaption>
        <h3>{item.name}</h3>
        <ul>
          {item.spec.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

export default function ShowroomPage() {
  // The seed can come from the URL (?seed=11 or #/showroom?seed=11) so the
  // screenshot script can capture specific variants without driving the UI.
  const urlSeed = Number(
    new URLSearchParams(window.location.search).get("seed")
      ?? new URLSearchParams(window.location.hash.split("?")[1] || "").get("seed"),
  );
  // `only` is URL-driven for the same reason: judging one building's silhouette
  // needs the whole window, not a card in a six-up grid. Without this the
  // screenshot script can only ever capture the full sheet, and fine detail
  // (masonry courses, merlons, tile seams) is too small to judge.
  const qs = () => new URLSearchParams(
    window.location.search || window.location.hash.split("?")[1] || "",
  );
  const [seed, setSeed] = useState(Number.isFinite(urlSeed) && urlSeed > 0 ? urlSeed : 3);
  const [showGrid, setShowGrid] = useState(false);
  const [only, setOnly] = useState(qs().get("only") || "all");

  const list = only === "all" ? SHOWROOM : SHOWROOM.filter((s) => s.id === only);

  return (
    <main className={`shop-page${only === "all" ? "" : " shop-solo"}`}>
      <header className="shop-head">
        <div>
          <p className="shop-kicker">Art test · not part of the game</p>
          <h1>Building showroom</h1>
          <p className="shop-sub">
            {SHOWROOM.length} buildings at full size. Judge the architecture on its
            own before any of it goes near the kingdom map.
          </p>
        </div>
        <div className="shop-controls">
          <label>
            Seed
            <input
              type="range"
              min="0"
              max="20"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
            />
            <output>{seed}</output>
          </label>
          <label className="shop-check">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />
            Show 1-unit grid
          </label>
          <label>
            Show
            <select value={only} onChange={(e) => setOnly(e.target.value)}>
              <option value="all">All</option>
              {SHOWROOM.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="shop-grid">
        {list.map((item) => (
          <Card key={item.id} item={item} seed={seed} showGrid={showGrid} />
        ))}
      </div>

      <section className="shop-check">
        <h2>Acceptance questions</h2>
        <ol>
          <li>Do they look like detailed medieval buildings?</li>
          <li>Do roofs have multiple sections?</li>
          <li>Is timber framing visible?</li>
          <li>Are silhouettes varied?</li>
          <li>Do buildings have attached details and props?</li>
          <li>Do they look illustrated rather than generated from rectangles?</li>
          <li>Would these buildings visually belong in the target village image?</li>
        </ol>
      </section>
    </main>
  );
}

function r2(n) {
  return Math.round(n * 100) / 100;
}