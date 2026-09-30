// Materials for the illustrated building set.
//
// The old village palette treated a wall as one flat colour and a roof as one
// flat triangle. The target style is a warm, hand-painted medieval
// illustration, which depends on three things this file provides:
//
//   1. Several related tones per material, not one. Plaster is a family of warm
//      off-whites; clay tile is a family of reds; shingle a family of browns.
//      Picking per building stops a row of houses reading as a colour swatch.
//   2. A consistent light. The sun is high and to the upper LEFT, so:
//        * horizontal surfaces (roofs' top faces, window sills, ledges) lightest
//        * the +y wall (which faces down-LEFT on screen)  mid-light, and it is
//          the face the viewer reads, so it carries doors, windows and detail
//        * the +x wall (which faces down-RIGHT on screen)  clearly the darkest
//   3. Warm neutrals. Nothing is grey; stone is warm grey, shadows are brown.

import { shade } from "../../iso";

export const MAT = {
  // --- walls ---------------------------------------------------------------
  // Lime plaster, weathered a little differently on each house.
  plaster: [
    "#f0e4c9", "#e9dcbc", "#f4ead4", "#e4d2ae",
    "#eee0c1", "#e7d6b3", "#f1e7cd", "#e2cda6",
  ],
  // Timber frame, three values so beams have depth.
  beam: "#6d4c31",
  beamLight: "#8d6742",
  beamDark: "#4b3322",
  beamWarm: "#7a5535",

  // --- masonry -------------------------------------------------------------
  stone: "#bcb09b",
  stoneLight: "#d2c7b3",
  stoneDark: "#948a7a",
  stoneCool: "#a9a396",
  mortar: "#cdc3b1",

  // --- roofs ----------------------------------------------------------------
  // Hand-split clay tile.
  tile: ["#b05740", "#9d5b47", "#ab6a4c", "#8f4e3d", "#bb7a52", "#96543f", "#a4604a"],
  // Thatch, for the cottage's lower outbuilding.
  thatch: "#c8a463",
  thatchDark: "#a8863f",
  // Weathered shingle, for barns and outbuildings.
  shingle: ["#8c6c4c", "#7d6047", "#957a58", "#6f573f"],
  slate: ["#5f6a71", "#69747b", "#556067"],
  ridge: "#c6ae83",
  ridgeDark: "#9d8a66",

  // --- joinery and metal ----------------------------------------------------
  glass: "#7ea3b2",
  glassLit: "#ffd489",
  glassDeep: "#4e6f80",
  shutter: "#4f6d5a",
  shutterAlt: "#8a4436",
  door: "#7d5433",
  doorDark: "#5d3c24",
  iron: "#41464b",
  ironLight: "#5d646b",
  brass: "#c39a3c",
  cloth: "#b8503f",
  clothAlt: "#3f6b74",

  // --- ground and planting --------------------------------------------------
  turf: "#7ba24e",
  turfLight: "#93b862",
  dirt: "#8b6f4d",
  dirtLight: "#a58763",
  thatchStraw: "#d8bd7c",
  hay: "#d3b268",
  hayDark: "#ab8b4a",
  flower: ["#d9697f", "#e8b04b", "#c2d06a", "#b487d0", "#ef8a5c"],
};

/**
 * Tones for a wall or block face, given the light convention above.
 * `front` is the +y face, `right` the +x face.
 */
export function tones(base) {
  return {
    top: shade(base, 0.2),
    front: base,
    right: shade(base, -0.22),
    line: shade(base, -0.44),
  };
}

/** Deterministic pick from a tone family, so a building never changes. */
export function pick(list, seed) {
  return list[Math.abs(Math.round(seed * 997)) % list.length];
}
