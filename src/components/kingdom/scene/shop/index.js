// The building showroom.
//
// This is a throwaway page: a workbench for judging the building art in
// isolation, before any of it is wired into the kingdom. It exists because the
// art brief is about ARCHITECTURE, and you cannot judge architecture by
// squinting at it in a 15-wide landscape render with a river across the front
// of it. Five buildings, side by side, big, with the things the brief lists
// counted underneath so the judgement is not purely a feeling.

import { Cottage, Blacksmith, Inn, Manor, FarmBuilding } from "./buildings.jsx";
import { Castle } from "./castle.jsx";

export const SHOWROOM = [
  {
    id: "cottage",
    name: "Cottage",
    spec: [
      "irregular footprint (main block + cross-wing)",
      "stone footing",
      "timber-framed plaster walls",
      "steep pitched tile roof",
      "dormer",
      "chimney",
      "shuttered windows, three different states",
      "porch with scalloped valance",
      "thatched lower wing",
      "flower patch, woodpile, crate, barrel",
    ],
    Draw: Cottage,
  },
  {
    id: "blacksmith",
    name: "Blacksmith",
    spec: [
      "stone shop, timber upper",
      "open forge bay with a dark interior",
      "lean-to awning on posts",
      "hearth with fire, lit coals and flames",
      "anvil with horn",
      "chimney + iron cowl with smoke",
      "hanging hammer sign",
      "two woodpile stacks",
      "barrels, crates, quench tub",
    ],
    Draw: Blacksmith,
  },
  {
    id: "inn",
    name: "Inn",
    spec: [
      "two storeys",
      "jettied upper floor with visible beam ends",
      "multiple roof sections (main + cross-gable)",
      "two chimneys",
      "hanging cup sign",
      "porch and steps",
      "balcony with turned balusters",
      "ground and upper window sets",
      "barrels, crates, bench, flowers",
    ],
    Draw: Inn,
  },
  {
    id: "manor",
    name: "Manor",
    spec: [
      "stone ground floor",
      "jettied timber first floor",
      "corner tower with conical tiled roof and finial",
      "two roof heights plus a cross-gable",
      "three chimneys",
      "banner on a pole",
      "mullioned narrow windows",
      "arched door with portcullis and steps",
      "walled courtyard with gate piers",
      "balcony",
    ],
    Draw: Manor,
  },
  {
    id: "farm",
    name: "Farm",
    spec: [
      "long barn",
      "attached lean-to",
      "thatched roof with bundled courses",
      "stepped roofline (main + cross-gable)",
      "big cart door and a second door",
      "louvred gable vent",
      "two haystacks",
      "spoked cart",
      "post-and-rail fence",
      "scarecrow, barrel, crate, signboard",
    ],
    Draw: FarmBuilding,
  },
  {
    id: "castle",
    name: "Castle",
    spec: [
      "battered stone plinth around the whole curtain",
      "crenellated curtain wall, four faces",
      "projecting gatehouse with arched gate",
      "portcullis, raised",
      "machicolations over the gate",
      "great tower with conical roof",
      "corner turrets at unequal heights",
      "arrow loops",
      "hall range with steep roof, dormers and two chimneys",
      "drawbridge on chains",
      "moat",
      "pennant",
      "cobbled yard with a well",
      "ivy climbing the curtain walls",
      "braziers lit on the wall walk",
      "banners either side of the gate",
      "yard stores: woodpiles, barrels, crates",
      "supply cart and trestle stall in the yard",
      "rubble and scrub where the masonry meets the ground",
      "notice board on the gatehouse",
      "painted strictly back to front, so the tower rises from behind the hall",
    ],
    Draw: Castle,
  },
];

export { Cottage, Blacksmith, Inn, Manor, FarmBuilding, Castle };
