// Palettes for the kingdom scene.
//
// One palette per territory theme, plus the material colours shared by every
// building. Kept in one place so a region reads as a single illustrated world
// rather than a pile of unrelated objects.
//
// Lighting convention, applied everywhere: the sun is upper-left, so
//   * top faces are the lightest
//   * the +x face (down-right) is mid
//   * the +y face (down-left, toward the viewer) is darkest
// See boxTones()/shade() in ../iso.

import { shade } from "../iso";

export const GROUND = {
  forest: {
    key: "forest",
    grass: "#7fc178",
    grassLight: "#95d18b",
    grassDark: "#63a95f",
    coast: "#d8c9a0",
    soil: "#8a6a4a",
    soilDark: "#6d5238",
    rock: "#9c8f7a",
    rockDark: "#7b7060",
    oak: "#4e9159",
    oakLight: "#6bb268",
    pine: "#2f6b45",
    pineLight: "#417f56",
    birch: "#7fbf5e",
    water: "#7cc3e8",
    waterDeep: "#4f9ccc",
    waterLight: "#a8dcf2",
    road: "#d8c096",
    roadEdge: "#a8814f",
    field: "#c9b45c",
  },
  river: {
    key: "river",
    grass: "#8ecb87",
    grassLight: "#a4d99b",
    grassDark: "#6fb26d",
    coast: "#ded0a8",
    soil: "#8d6f4a",
    soilDark: "#6f5539",
    rock: "#a49a86",
    rockDark: "#837a69",
    oak: "#579d5f",
    oakLight: "#74b46b",
    pine: "#35724b",
    pineLight: "#47855a",
    birch: "#8acb66",
    water: "#84c9ec",
    waterDeep: "#4a95c8",
    waterLight: "#b0e2f5",
    road: "#dcc59b",
    roadEdge: "#ab8753",
    field: "#c8b862",
  },
  highland: {
    key: "highland",
    grass: "#9db96d",
    grassLight: "#b0c983",
    grassDark: "#7d9a52",
    coast: "#c2b48c",
    soil: "#7d6a52",
    soilDark: "#5f5040",
    rock: "#9a9384",
    rockDark: "#78725f",
    oak: "#5b8a4c",
    oakLight: "#78a55e",
    pine: "#2f6141",
    pineLight: "#417a52",
    birch: "#8bbd5f",
    water: "#7ab6d8",
    waterDeep: "#4b86ab",
    waterLight: "#a3d4ea",
    road: "#cbbb98",
    roadEdge: "#9a8663",
    field: "#b7ac54",
  },
  cavern: {
    key: "cavern",
    grass: "#9c93cf",
    grassLight: "#b1a8dd",
    grassDark: "#7e74b4",
    coast: "#b7aed0",
    soil: "#6f6486",
    soilDark: "#544a68",
    rock: "#8a80a8",
    rockDark: "#6a6182",
    oak: "#6a5fa0",
    oakLight: "#8579bd",
    pine: "#4c427e",
    pineLight: "#5f5396",
    birch: "#8f83cc",
    water: "#9fb4ea",
    waterDeep: "#6c83c4",
    waterLight: "#c2d0f5",
    road: "#c3bcd6",
    roadEdge: "#948cb0",
    field: "#a79ac0",
  },
  peak: {
    key: "peak",
    grass: "#c9a077",
    grassLight: "#dcb48c",
    grassDark: "#a9845f",
    coast: "#d9bda0",
    soil: "#7a4a3a",
    soilDark: "#5c3529",
    rock: "#8f7365",
    rockDark: "#6d564b",
    oak: "#8a5644",
    oakLight: "#a87059",
    pine: "#6b4436",
    pineLight: "#825646",
    birch: "#b07a5c",
    water: "#8fb8d8",
    waterDeep: "#5f8bab",
    waterLight: "#b3d2e8",
    road: "#d6b795",
    roadEdge: "#a98a6a",
    field: "#c2a052",
  },
};

/** Materials shared by every building, so a village looks built from one quarry
 *  and one set of carpentry rather than assorted coloured boxes. */
export const MAT = {
  plaster: ["#f2e6ca", "#ead9b8", "#e6dcc4", "#f4ead4", "#dfd2b6"],
  timber: "#6b4a2c",
  timberDark: "#4a2d19",
  beam: "#5a3f28",
  stone: "#b8b0a2",
  stoneDark: "#8f8879",
  stoneLight: "#cec7b8",
  thatch: "#c9a86a",
  slate: "#6a6f7a",
  tile: ["#c1503f", "#4a6fa5", "#d98a3c", "#8a5a34", "#3f7f8a", "#a8503f", "#c98f3a", "#7a5a8c"],
  glass: "#ffd98a",
  glassDark: "#5a4a2c",
  door: "#6b4326",
  doorDark: "#4a2d19",
  cloth: ["#c1503f", "#4a6fa5", "#d98a3c", "#7a5a8c", "#3f7f8a"],
};

/** A warm light wash used over the whole scene at higher development stages, so
 *  a flourishing kingdom literally looks brighter. */
export const STAGE_GLOW = [0, 0, 0.05, 0.09, 0.13];

export function stageTint(theme, stage) {
  const g = GROUND[theme] || GROUND.forest;
  return shade(g.grassLight, STAGE_GLOW[Math.max(0, Math.min(STAGE_GLOW.length - 1, stage))]);
}
