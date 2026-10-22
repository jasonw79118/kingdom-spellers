# Artwork provenance and generation prompts

The supplied pack is the approved art direction. Original PNGs in its
`assets/reference` and `assets/usable-buildings` folders are untouched.
Production copies are under `public/assets/kingdom/greenwood/` at the repository
root. The supplied alpha bounds were inspected; production sprite copies are
cropped to visible alpha bounds, resized to at most 640px, and saved as WebP
with PNG fallbacks and 160px thumbnails. This is asset normalization, not a
change to the original designs. Browser fallback and missing-asset checks pass.

| Production asset | Source / role |
| --- | --- |
| `starter_cottage` | Supplied `06_starter_cottage.png`; canonical `cottage` |
| `schoolhouse_spelling_academy` | Supplied `03_schoolhouse_spelling_academy.png`; canonical `schoolhouse` |
| `town_hall_guild_hall` | Supplied `02_town_hall_guild_hall.png`; canonical `townhall` |
| `marketplace_cluster` | Supplied `05_marketplace_cluster.png`; canonical `market` |
| `library_word_hall`, `spell_tower` | Supplied art prepared for future content, not new owned/purchasable IDs |
| `greenwood-terrain-v2` | Generated empty terrain; selected open-meadow revision |
| `well`, `castle`, `bakery` | Generated missing canonical building sprites |
| `cottage-grand` | Generated structural cottage upgrade |
| `garden`, `camp` | Generated separate decoration and humble starter sprites |

Generated artwork used the **built-in image generation tool**, not an API/CLI
fallback. No API key was required or embedded. Final selected assets are copied
into the project; the app never depends on the generator's default save folder.
Blue/gold banners and lanterns are small original code-native SVG details,
separate from the painted environment. The earlier terrain version remains an
unused draft; no purchased structures are baked into either terrain image.

The prompt strings/templates below record the actual requested inputs.

## Initial empty-terrain prompt

```text
Create a production video game terrain/background asset, landscape 1536x1024 composition. Premium lush hand-painted storybook medieval fantasy game art, soft atmospheric depth and painterly textured materials, warm sunlight from upper left, emerald forest, meadow, alpine distant mountains with pale blue sky top 18 percent, flowers, mossy stones and lush multi-layer mature tree canopies framing edges. Three-quarter elevated camera looking across an open grassy valley, consistent with cozy intricately painted timber-and-stone village sprites. IMPORTANT: the village has not been built. NO buildings whatsoever, NO cottages, NO castles even in background, NO towers, NO ruins, NO people, NO text, NO UI, NO labels, NO watermark. The central 75 percent of image must be genuinely spacious unbuilt sunlit meadow with several open grassy building pockets, smoothly rolling, not a tile grid. A modest winding sandy woodland trail enters bottom center and curves gently toward upper center with small branches to pockets; a narrow sparkling turquoise river hugs the far right edge with naturally mossy rocky banks and a little waterfall far right background. Sparse wildflowers, small bushes and layered forest perimeter. Keep the central buildable meadow relatively quiet so independent interactive game building sprites can be placed on it later. Not a finished village, not concept sheet or mockup. Match a high quality children's storybook kingdom adventure, beautifully detailed but readable and warmly inviting.
```

## Selected terrain revision

The initial terrain was the edit target. Opaque landscape output:

```text
Edit this game terrain asset. Preserve its beautiful painted style, alpine horizon and sky, sunlight, turquoise river along the right edge, waterfall, and winding central path. Make the central playable meadow much more open so independent building sprites can stand on actual grass: remove ALL trees, large boulders, shrubs and foreground foliage from the area between 12% and 88% of image width and 30% and 95% of image height, replacing those central obstructions with softly textured sunlit meadow grass and a few tiny low wildflowers. In particular clear the lower-left and lower-middle foreground pockets; no rocks or tall plants in those building pockets. Keep lush tree canopies and rocks only along the extreme left/right frame and far background, so this still feels like a rich forest world. Do not add any buildings, ruins, towers, castles, signs, construction sites, people, text, labels or UI. This remains a genuinely empty unbuilt terrain layer with space for seven separately placed game structures. Same camera, palette and warm painterly finish; no flat vector style.
```

## Well, castle, cottage upgrade

Each was a separate transparent-background tool call. Exact template:

```text
Production isolated game building sprite. {SUBJECT} Beautifully detailed hand-painted storybook fantasy, softly dimensional painted materials, rich carved oak timber and stone, no flat outlines, cozy polished kingdom-building educational adventure. Camera three-quarter elevated front view, see front and right side slightly, sunlight from upper left, full object visible within image with 6 percent margin. The building's bottom ground contact centered at bottom. Authentic alpha TRANSPARENT BACKGROUND, no scenery behind, no opaque ground island, no sky, no text, no watermark, no UI. Match illustrated cozy medieval architecture with warm yellow windows, botanical accents and tactile richly painted roof shingles. Use transparent background.
```

`SUBJECT` values:

- Well: `A small medieval village water well, creamy irregular masonry ring with dark visible water, two sturdy oak posts, little red terracotta shingle canopy, tiny bucket and a small ring of wildflowers. Modest, not a grand monument.`
- Castle: `A storybook woodland keep, three compact creamy limestone towers with cobalt blue shingle roofs, blue-and-gold banners, warm timber gatehouse, arched oak gate, a few small flowering vines at foundation. Whole compact castle as one coherent building, no surrounding village.`
- Cottage upgrade: `An upgraded cottage for a storybook medieval village: a cozy cream-stone and timber house, terracotta red tiled steep roof, a modest added side wing with blue slate roof, chimney, oak arched door with iron handle, emerald shutters, warm glowing diamond-paned windows, flowerboxes and a tiny garden at foundation. Clearly one expanded home, not a palace.`

## Garden and camp

Each was a separate transparent-background call. Exact template:

```text
An isolated production game sprite. {SUBJECT} Richly painted high quality storybook fantasy game style, tactile natural materials and soft sunlight upper left, warm peaceful woodland medieval adventure. Three-quarter elevated front camera. Entire object visible with small margin and ground contact at bottom center. Real alpha transparent background, no sky or scenery, no text, no UI, no watermark. Detailed painterly organic texture, not flat vector or 3D plastic.
```

- Garden: `A tiny cottage flower garden bed, oval patch of mossy earth, layered sunflowers, pink hollyhocks, cream daisies, small blue flowers, one rustic wooden edging. This is a ground decoration viewed slightly from above, not a whole landscape.`
- Camp: `A humble tiny woodland starter camp: one modest worn canvas lean-to stretched between rough oak poles, rolled blanket, a wooden crate, a small unlit campfire ring and a little log. Cozy and welcoming but genuinely poor and unbuilt, no house or permanent building.`

## Bakery

Separate transparent-background call:

```text
Production isolated building sprite for cozy storybook medieval kingdom game. A small welcoming village bakery, cream limestone and carved oak timber walls, terracotta tiled steep roof and chimney, arched door, warm diamond-paned windows with green shutters, a cheerful cream-and-red striped awning over bread display counter with baskets of baguettes and round loaves, a small hanging carved wooden bread-shaped sign with NO TEXT, vines and flowerboxes at foundation. Rich hand-painted storybook materials, soft dimensional light from upper left, lush botanical accents, three-quarter elevated front camera, entire building visible 6 percent margins. Similar charming detailed painterly craft to a polished children's kingdom adventure. Real alpha transparent background, no scenery, no ground island, no UI, no text, no watermark. One building, modest size, not a palace.
```
