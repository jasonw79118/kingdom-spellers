// The building library.
//
// Two things matter here.
//
// SCALE — the previous pass drew every structure at roughly the same footprint,
// so a cottage, a blacksmith and a castle tower all read as equally important.
// `SCALE` is an explicit hierarchy: a keep is many times the size of a shed, and
// the scene is composed around that.
//
// VARIETY — a village where every house is the same shape, recoloured, reads as
// one object stamped thirty times. `House` takes a `variant`, and each variant
// changes the roof form, the number of storeys, the chimney, the timber pattern,
// the orientation and whether there's a lean-to or a dormer. Recolouring is the
// last thing it does, not the only thing.

import { shade, boxTones } from "../iso";
import { P, L, at, px } from "./geometry";
import { MAT } from "./palette";

/**
 * Visual hierarchy, in grid units. The brief's ratio, roughly:
 *
 *   castle / keep   #############      3.4 x 2.8
 *   town hall       #########            2.4 x 1.9
 *   inn / smithy    #######               1.9 x 1.6
 *   house           #####                 1.6 x 1.4
 *   cottage         ####                  1.3 x 1.2
 *   shed            ##                    0.8 x 0.7
 */
export const SCALE = {
  keep: { w: 3.4, d: 2.8, h: 2.4 },
  hall: { w: 2.4, d: 1.9, h: 1.7 },
  manor: { w: 2.0, d: 1.6, h: 1.4 },
  workshop: { w: 1.9, d: 1.6, h: 1.3 },
  house: { w: 1.6, d: 1.4, h: 1.0 },
  cottage: { w: 1.3, d: 1.2, h: 0.8 },
  shed: { w: 0.8, d: 0.7, h: 0.5 },
};

/** Roof forms. Each is a genuinely different silhouette, not a recolour. */
const ROOFS = ["gableX", "gableY", "hip", "gambrel"];
export const ROOF_KINDS = ROOFS;

/**
 * Roof geometry for a footprint.
 *
 * Returns `{ faces, ridge, gable }` where each face is
 * `[[gx, gy, gz], …, fill]` — the point list wrapped in an array, with the
 * fill alongside. A `null` fill means "use the wall colour", which is what
 * gable ends get: painting them in roof colour is what makes a house look like
 * a wedge instead of a building.
 *
 * Kept separate from the house body so a building can mix forms — a gambrel
 * barn with a lean-to shed bolted to the side.
 */
function roofFaces(kind, rx, ry, rw, rd, z, rise, tone) {
  /** @type {Array<[Array<Array<number>>, string|null]>} */
  const faces = [];
  const add = (list, fill) => faces.push([list, fill]);
  const x2 = rx + rw;
  const y2 = ry + rd;
  const xm = rx + rw / 2;
  const ym = ry + rd / 2;
  const zr = z + rise;

  if (kind === "gableY") {
    // Ridge runs north–south. The two slopes face ±x, and the gable triangle
    // faces the camera on the +y end.
    add([[rx, ry, z], [xm, ry, zr], [xm, y2, zr], [rx, y2, z]], shade(tone, -0.34));
    add([[xm, ry, zr], [x2, ry, z], [x2, y2, z], [xm, y2, zr]], tone);
    add([[rx, y2, z], [x2, y2, z], [xm, y2, zr]], null);
    return { faces, ridge: [[xm, ry, zr], [xm, y2, zr]], gable: "y" };
  }

  if (kind === "hip") {
    // Ridge along x, shortened at BOTH ends so all four sides slope — the
    // silhouette that separates a hip from a plain gable at a glance.
    const inset = Math.min(rw, rd) * 0.32;
    const a0 = rx + inset;
    const a1 = x2 - inset;
    add([[a0, ry, z], [a1, ry, z], [a1, ym, zr], [a0, ym, zr]], shade(tone, -0.34));
    add([[a0, ym, zr], [a1, ym, zr], [a1, y2, z], [a0, y2, z]], tone);
    add([[rx, ry, z], [a0, ry, z], [a0, ym, zr], [rx, ym, zr]], shade(tone, -0.16));
    add([[a1, ym, zr], [x2, ym, zr], [x2, y2, z], [a1, y2, z]], shade(tone, -0.26));
    return { faces, ridge: [[a0, ym, zr], [a1, ym, zr]], gable: "hip" };
  }

  if (kind === "gambrel") {
    // Barn form: shallow lower slope, steep upper slope. Reads as storage.
    const bz = z + rise * 0.5;
    const bm = ry + rd * 0.22;
    const bt = ry + rd * 0.78;
    add([[rx, ry, z], [x2, ry, z], [x2, bm, bz], [rx, bm, bz]], shade(tone, -0.34));
    add([[rx, bm, bz], [x2, bm, bz], [x2, ym, zr], [rx, ym, zr]], shade(tone, -0.24));
    add([[rx, ym, zr], [x2, ym, zr], [x2, bt, bz], [rx, bt, bz]], tone);
    add([[rx, bt, bz], [x2, bt, bz], [x2, y2, z], [rx, y2, z]], shade(tone, -0.12));
    // The tall +x gable, stepped to follow the break in the roof line.
    add([[x2, ry, z], [x2, y2, z], [x2, bt, bz], [x2, ym, zr], [x2, bm, bz]], null);
    return { faces, ridge: [[rx, ym, zr], [x2, ym, zr]], gable: "barn" };
  }

  // gableX (the default): ridge east–west, slopes facing north and south.
  add([[rx, ry, z], [x2, ry, z], [x2, ym, zr], [rx, ym, zr]], shade(tone, -0.34));
  add([[rx, ym, zr], [x2, ym, zr], [x2, y2, z], [rx, y2, z]], tone);
  add([[x2, ry, z], [x2, y2, z], [x2, ym, zr]], null); // gable end, wall colour
  return { faces, ridge: [[rx, ym, zr], [x2, ym, zr]], gable: "x" };
}

/** A small mono-pitch roof over a lean-to or an open shelter. */
function leanRoof(x, y, w, d, z, rise, tone) {
  return [
    { points: [[x, y, z + rise], [x + w, y, z + rise], [x + w, y + d, z], [x, y + d, z]], fill: shade(tone, -0.16) },
    { points: [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z - 0.07], [x, y + d, z - 0.07]], fill: shade(tone, -0.46) },
  ];
}

/** A dormer poking out of a roof slope. */
function Dormer({ x, y, w, d, h, tone, along = "x" }) {
  const wt = MAT.glass;
  if (along === "x") {
    return (
      <g>
        <polygon points={P([[x, y, h], [x + w, y, h], [x + w * 0.8, y + d, h + 0.24], [x + w * 0.2, y + d, h + 0.24]])} fill={shade(tone, -0.3)} />
        <polygon points={P([[x + w * 0.2, y + d, h + 0.24], [x + w * 0.8, y + d, h + 0.24], [x + w * 0.7, y + d * 0.5, h + 0.44], [x + w * 0.3, y + d * 0.5, h + 0.44]])} fill={tone} />
        <polygon points={P([[x + w * 0.32, y + d * 0.52, h + 0.2], [x + w * 0.68, y + d * 0.52, h + 0.2], [x + w * 0.68, y + d * 0.52, h + 0.4], [x + w * 0.32, y + d * 0.52, h + 0.4]])} fill={wt} stroke={MAT.glassDark} strokeWidth={0.5} />
      </g>
    );
  }
  return (
    <g>
      <polygon points={P([[x, y, h], [x, y + d, h], [x + w, y + d * 0.8, h + 0.24], [x + w, y + d * 0.2, h + 0.24]])} fill={shade(tone, -0.3)} />
      <polygon points={P([[x, y + d * 0.2, h + 0.24], [x, y + d * 0.8, h + 0.24], [x + w * 0.5, y + d * 0.7, h + 0.44], [x + w * 0.5, y + d * 0.3, h + 0.44]])} fill={tone} />
      <polygon points={P([[x + w * 0.5, y + d * 0.3, h + 0.2], [x + w * 0.5, y + d * 0.7, h + 0.2], [x + w * 0.5, y + d * 0.7, h + 0.4], [x + w * 0.5, y + d * 0.3, h + 0.4]])} fill={wt} stroke={MAT.glassDark} strokeWidth={0.5} />
    </g>
  );
}

/** A shuttered, lit window. */
function Window({ gx, gy, gz, w, h, lit, shutters }) {
  return (
    <g>
      <polygon points={P([[gx, gy, gz], [gx + w, gy, gz], [gx + w, gy, gz + h], [gx, gy, gz + h]])} fill={lit ? MAT.glass : "#3d4a55"} stroke={MAT.glassDark} strokeWidth={0.6} />
      {lit && <polygon points={P([[gx + w * 0.1, gy, gz + h * 0.12], [gx + w * 0.5, gy, gz + h * 0.12], [gx + w * 0.5, gy, gz + h * 0.55], [gx + w * 0.1, gy, gz + h * 0.55]])} fill={shade(MAT.glass, 0.3)} />}
      {shutters && (
        <g fill="#4a6fa5">
          <polygon points={P([[gx - w * 0.34, gy, gz], [gx - w * 0.04, gy, gz], [gx - w * 0.04, gy, gz + h], [gx - w * 0.34, gy, gz + h]])} />
          <polygon points={P([[gx + w * 1.04, gy, gz], [gx + w * 1.34, gy, gz], [gx + w * 1.34, gy, gz + h], [gx + w * 1.04, gy, gz + h]])} />
        </g>
      )}
    </g>
  );
}

/** Plank door with a lintel. */
function Door({ gx, gy, gz, w, h }) {
  const knob = at(gx + w * 0.8, gy, px(gz + h * 0.5));
  return (
    <g>
      <polygon points={P([[gx, gy, gz], [gx + w, gy, gz], [gx + w, gy, gz + h], [gx, gy, gz + h]])} fill={MAT.door} stroke={MAT.doorDark} strokeWidth={0.7} />
      <path d={L([[gx + w * 0.5, gy, gz + 0.04], [gx + w * 0.5, gy, gz + h - 0.04]], false)} stroke={MAT.doorDark} strokeWidth={0.8} opacity={0.7} />
      <circle cx={knob.x} cy={knob.y} r={1.4} fill="#d8c096" />
    </g>
  );
}

/**
 * A house or cottage. `variant` selects the form; pass a stable integer so a
 * given house always looks the same from visit to visit.
 */
export function House({
  x, y, z = 0, w = 1.6, d = 1.4, h = 1.0, variant = 0, lit = true, sign = null,
}) {
  const v = ((variant % 8) + 8) % 8;
  const wall = MAT.plaster[v % MAT.plaster.length];
  const roofTone = MAT.tile[(v * 3 + 1) % MAT.tile.length];
  const wt = boxTones(wall);
  const storeys = v === 3 || v === 6 ? 0.5 : 0;
  const wh = h + storeys;
  const over = 0.13;
  const rx = x - over;
  const ry = y - over;
  const rw = w + over * 2;
  const rd = d + over * 2;
  const roofKind = ROOFS[v % 4];
  const rise = (roofKind === "hip" ? 0.5 : roofKind === "gambrel" ? 0.6 : 0.44) + (v % 3) * 0.07;
  const { faces, ridge, gable } = roofFaces(roofKind, rx, ry, rw, rd, wh, rise, roofTone);
  const chimX = roofKind === "gableY" ? rx + rw * 0.3 : rx + rw * (0.14 + (v % 3) * 0.28);
  const chimY = roofKind === "gableY" ? ry + rd * (0.5 + (v % 3) * 0.14) : ry + rd * 0.28;
  const lean = v === 2 || v === 5;
  const dormer = v === 4 || v === 7;

  return (
    <g data-role="building" data-subrole="house" data-variant={v} data-w={w.toFixed(2)} data-d={d.toFixed(2)} data-h={wh.toFixed(2)}>
      {/* footing */}
      <polygon points={P([[x - 0.09, y - 0.09, z], [x + w + 0.09, y - 0.09, z], [x + w + 0.09, y + d + 0.09, z], [x - 0.09, y + d + 0.09, z]])} fill={shade(wall, -0.22)} />

      {/* walls */}
      <polygon points={P([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + wh], [x + w, y, z + wh]])} fill={wt.right} stroke={wt.line} strokeWidth={0.7} />
      <polygon points={P([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + wh], [x, y + d, z + wh]])} fill={wt.front} stroke={wt.line} strokeWidth={0.7} />

      {/* timber framing — the pattern varies with the variant */}
      <g stroke={MAT.beam} strokeWidth={1.4} opacity={0.7} fill="none">
        <path d={L([[x + 0.02, y + d, z + 0.05], [x + 0.02, y + d, z + wh - 0.05]], false)} />
        <path d={L([[x + w - 0.02, y + d, z + 0.05], [x + w - 0.02, y + d, z + wh - 0.05]], false)} />
        <path d={L([[x + 0.02, y + d, z + 0.05], [x + w - 0.02, y + d, z + 0.05]], false)} />
        <path d={L([[x + 0.02, y + d, z + wh - 0.05], [x + w - 0.02, y + d, z + wh - 0.05]], false)} />
        {v % 2 === 0 ? (
          <>
            <path d={L([[x + w * 0.5, y + d, z + 0.05], [x + w * 0.5, y + d, z + wh - 0.05]], false)} />
            <path d={L([[x + 0.02, y + d, z + wh * 0.5], [x + w * 0.5, y + d, z + wh * 0.16]], false)} />
            <path d={L([[x + w - 0.02, y + d, z + wh * 0.5], [x + w * 0.5, y + d, z + wh * 0.16]], false)} />
          </>
        ) : (
          <>
            {[0.34, 0.68].map((t, i) => (
              <path key={i} d={L([[x + 0.02, y + d, z + wh * t], [x + w - 0.02, y + d, z + wh * t]], false)} />
            ))}
            <path d={L([[x + w * 0.3, y + d, z + 0.05], [x + w * 0.7, y + d, z + wh * 0.34]], false)} />
          </>
        )}
        {storeys > 0 && <path d={L([[x + 0.02, y + d, z + wh * 0.52], [x + w - 0.02, y + d, z + wh * 0.52]], false)} />}
      </g>

      {/* openings */}
      <Door gx={x + w * 0.4} gy={y + d} gz={z + 0.03} w={w * 0.2} h={0.44} />
      <Window gx={x + 0.1} gy={y + d} gz={z + 0.2} w={0.22} h={0.24} lit={lit} shutters={v % 2 === 1} />
      <Window gx={x + w - 0.32} gy={y + d} gz={z + 0.2} w={0.22} h={0.24} lit={lit} />
      {storeys > 0 && (
        <>
          <Window gx={x + 0.18} gy={y + d} gz={z + wh * 0.6} w={0.2} h={0.22} lit={lit} />
          <Window gx={x + w - 0.38} gy={y + d} gz={z + wh * 0.6} w={0.2} h={0.22} lit={lit} />
        </>
      )}

      {/* roof */}
      {faces.map(([list, fill], i) => (
        <polygon key={i} points={P(list)} fill={fill === null ? wt.front : fill} stroke={shade(roofTone, -0.45)} strokeWidth={0.7} />
      ))}
      {ridge[0][0] !== ridge[1][0] || ridge[0][1] !== ridge[1][1] ? (
        <path d={L(ridge, false)} stroke={shade(roofTone, 0.26)} strokeWidth={2.2} strokeLinecap="round" />
      ) : null}
      {/* eaves shadow under the overhang */}
      <polygon points={P([[rx, ry + rd, wh], [rx + rw, ry + rd, wh], [rx + rw, ry + rd, wh - 0.07], [rx, ry + rd, wh - 0.07]])} fill={shade(roofTone, -0.46)} />
      {gable === "x" && (
        <g stroke={roofTone} strokeWidth={2.6} fill="none" strokeLinecap="round">
          <path d={L([[rx + rw, ry, wh], [rx + rw, ry + rd / 2, wh + rise]], false)} />
          <path d={L([[rx + rw, ry + rd, wh], [rx + rw, ry + rd / 2, wh + rise]], false)} />
        </g>
      )}

      {dormer && roofKind === "gableX" && (
        <Dormer x={x + w * 0.22} y={ry + rd * 0.62} w={w * 0.42} d={rd * 0.3} h={wh} tone={roofTone} along="x" />
      )}

      {/* chimney */}
      <polygon points={P([[chimX, chimY, wh], [chimX + 0.2, chimY, wh], [chimX + 0.2, chimY, wh + 0.5], [chimX, chimY, wh + 0.5]])} fill={MAT.stoneDark} />
      <polygon points={P([[chimX, chimY, wh + 0.5], [chimX + 0.2, chimY, wh + 0.5], [chimX + 0.2, chimY, wh + 0.56], [chimX, chimY, wh + 0.56]])} fill={MAT.stone} />

      {lean && (
        <g>
          {leanRoof(x - 0.02, y + d, 0.55, 0.5, 0.02, 0.34, roofTone).map((f, i) => (
            <polygon key={i} points={P(f.points)} fill={f.fill} />
          ))}
          <polygon points={P([[x - 0.02, y + d, 0.36], [x + 0.53, y + d, 0.36], [x + 0.53, y + d, 0.02], [x - 0.02, y + d, 0.02]])} fill={shade(wall, -0.1)} />
        </g>
      )}

      {sign && (
        <g>
          <path d={L([[x + w * 0.78, y + d, 0.5], [x + w * 0.78, y + d, 0.78]], false)} stroke={MAT.beam} strokeWidth={2} />
          <polygon points={P([[x + w * 0.78, y + d, 0.78], [x + w * 0.78 + 0.34, y + d, 0.78], [x + w * 0.78 + 0.34, y + d, 0.98], [x + w * 0.78, y + d, 0.98]])} fill="#8a5a34" stroke="#5a3f28" strokeWidth={0.8} />
        </g>
      )}

      {/* a wood pile against the wall, so buildings have a base detail */}
      {v % 3 === 0 && (
        <g stroke="#7a5636" strokeWidth={2.2} strokeLinecap="round">
          {[0, 1, 2].map((i) => (
            <path key={i} d={L([[x + w - 0.16, y + d - 0.02, 0.04 + i * 0.05], [x + w + 0.14, y + d - 0.02, 0.04 + i * 0.05]], false)} />
          ))}
        </g>
      )}
    </g>
  );
}

/** A low open-sided shed: the smallest thing in the hierarchy. */
export function Shed({ x, y, z = 0, variant = 0, tone }) {
  const w = SCALE.shed.w;
  const d = SCALE.shed.d;
  const h = SCALE.shed.h;
  const t = tone || MAT.tile[(variant + 2) % MAT.tile.length];
  return (
    <g data-role="building" data-subrole="shed" data-variant={variant} data-w={w.toFixed(2)} data-d={d.toFixed(2)} data-h={h.toFixed(2)}>
      <polygon points={P([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])} fill={shade(MAT.timber, -0.1)} />
      <polygon points={P([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={MAT.timber} />
      {leanRoof(x - 0.1, y - 0.1, w + 0.2, d + 0.2, z + h, 0.26, t).map((f, i) => (
        <polygon key={i} points={P(f.points)} fill={f.fill} />
      ))}
    </g>
  );
}

export { Window, Door, leanRoof };
