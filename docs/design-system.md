# Genesis Design System

The Genesis design system is the shared visual language for the Organization OS
for AI Work. It deliberately favors calm hierarchy, generous space, semantic
tokens, and restrained motion over decorative effects.

## Foundation

- **Tokens:** `frontend/app/globals.css` owns semantic colors, typography,
  spacing, radii, containers, shadows, and timing values. Dark is the default;
  light resolves through the same semantic names.
- **Tailwind:** `frontend/tailwind.config.ts` exposes those tokens as stable
  utilities. Components never need hard-coded color values.
- **Components:** `frontend/components/design-system/` contains visual
  primitives only. Product features compose them later.
- **Themes:** `frontend/components/theme/` provides dark, light, and system
  preference support without adding another dependency.
- **Motion:** `frontend/lib/motion.ts` centralizes Framer Motion variants;
  CSS handles small ambient loading states. Reduced motion is respected globally.

## Development reference

The Style Guide is available at `/style-guide` as a development reference. It
is not part of the product journey and must remain separate from product routes.

## Iconography

Use intent names from `frontend/lib/icons.ts`. Add a semantic name to that
registry before using a new Lucide icon in a shared component. This keeps icon
choice consistent across the product.
