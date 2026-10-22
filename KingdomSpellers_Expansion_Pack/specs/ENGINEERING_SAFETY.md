# Engineering and child safety

- Do not assume existing persistence is Appwrite, Supabase or any specific product until auditing the repo. Keep the current authentication, data ownership rules and migrations intact.
- A child-facing app needs parent-managed profiles and appropriate privacy controls. Never expose full child name, location or uploaded spelling photos publicly. Keep social interaction off until designed with age-appropriate safeguards.
- OCR photo uploads may include personally identifying material. Verify minimum storage duration, clear deletion path and no public readable storage bucket.
- Define server-trusted rewards and balances. Confirm every purchase belongs to the authenticated profile and that costs cannot be bypassed by changing browser state.
- Assets: test transparent alpha, file sizes, scaling, source ownership, and formats. Art references alone cannot make a full dynamic kingdom. For missing production sprites, place stylized construction sites until new art exists; do not use a collage crop with baked-in labels.
- Deployment: inspect package, build script, Vite base, SPA fallback, GitHub Pages workflow, CNAME and domain. Verify deployed paths on https://www.kingdomspellers.com, not just localhost.
- Maintain a content version ID, accessible no-audio mode, accessibility labels, mobile screens and graceful slow-network behavior.
