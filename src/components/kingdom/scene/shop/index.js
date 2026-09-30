// The building showroom.
//
// This is a throwaway page: a workbench for judging the building art in
// isolation, before any of it is wired into the kingdom. It exists because the
// art brief is about ARCHITECTURE, and you cannot judge architecture by
// squinting at it in a 15-wide landscape render with a river across the front
// of it. Five buildings, side by side, big, with the things the brief lists
// counted underneath so the judgement is not purely a feeling.

import { Cottage, Blacksmith, Inn, Manor, FarmBuilding } from "./buildings.jsx";

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
];

export { Cottage, Blacksmith, Inn, Manor, FarmBuilding };
