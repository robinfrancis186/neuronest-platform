# NeuroNest design refresh

Implemented: shared readable typography and quiet card surfaces; shorter parent dashboard copy and truthful status fallbacks; clearer care cards; report chart labels and an accessible data view; new sign-in illustration.

The screenshot fixtures are synthetic layout data, not authenticated production records. New captures are under `output/playwright/design-refresh/`; `node scripts/capture-design.mjs` from `apps/web` reproduces them and checks destination paths.

## Artwork

Mode: built-in imagegen. Its interface does not expose a ChatGPT Images 2.5 model selector.

Saved asset: `apps/web/public/brand/family-reading-v2.png`.

Final prompt: Use case: illustration-story. Asset type: NeuroNest family developmental care app sign-in illustration. Create a refined editorial paper-cut illustration of a South Indian parent and young child sitting comfortably together on a rug, sharing a picture book, relaxed natural interaction. Warm off-white background, restrained forest green, muted sage, terracotta and small ochre accents matching an understated healthcare application. Wide balanced composition, generous negative space, beautiful simple tactile shapes, sophisticated magazine illustration rather than glossy 3D or cartoon mascot. No text, no letters, no logo, no medical equipment, no puzzle symbols. Entire figures within frame. This will appear as a welcoming rectangular artwork in a web sign-in panel.
