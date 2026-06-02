---
name: frontend-design
description: >
  Create distinctive, production-grade frontend interfaces with high design quality.
  Use this skill when the user asks to build Angular components, pages, modules, or
  full views for the Sistema de Activos Fijos. Generates creative, polished Angular code
  that avoids generic AI aesthetics. Use when: building UI components, designing pages,
  creating Angular templates, styling with SCSS, implementing animations.
---

# Frontend Design — Angular

This skill guides creation of distinctive, production-grade Angular interfaces
that avoid generic "AI slop" aesthetics. Implement real working Angular code with
exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: an Angular component, page, module, or
interface to build. They may include context about the purpose, audience, or
technical constraints.

## Design Thinking

Before coding, understand the context and commit to a **BOLD** aesthetic direction:

- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic,
  organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw,
  art deco/geometric, soft/pastel, industrial/utilitarian, etc. Use these for inspiration
  but design one that is true to the aesthetic direction.
- **Constraints**: Angular framework, SCSS, performance, accessibility, and the
  existing Angular project structure.
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold
maximalism and refined minimalism both work — the key is intentionality, not intensity.

Then implement working Angular code that is:

- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Angular-Specific Guidelines

- Use **standalone components** (Angular 17+) unless the project uses NgModules.
- Apply **SCSS** for all styles; use CSS custom properties (`--var`) for theming.
- Leverage Angular's **`@for`, `@if`, `@switch`** template syntax (Angular 17+).
- Use **Angular Animations** (`@angular/animations`) for transitions and micro-interactions.
- Apply **`OnPush` change detection** for performance-critical components.
- Use **Angular Material** or **custom SCSS** — never mix both inconsistently.
- Keep templates clean: move complex logic to the component class or pipes.

## Frontend Aesthetics Guidelines

Focus on:

- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic
  fonts like Arial and Inter; opt instead for distinctive choices that elevate the
  aesthetics. Pair a distinctive display font with a refined body font. Load via Google
  Fonts or embed in the Angular project's `styles.scss`.

- **Color & Theme**: Commit to a cohesive aesthetic. Define a theme in `styles.scss` using
  CSS custom properties. Dominant colors with sharp accents outperform timid palettes.
  Support dark/light mode via `prefers-color-scheme` or a theme class on `<body>`.

- **Motion**: Use Angular Animations for route transitions, list renders, and state changes.
  Prioritize CSS animations for simple effects. Focus on high-impact moments: staggered
  list entry animations, route fade/slide transitions, hover states that surprise.

- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow.
  Grid-breaking elements. Generous negative space OR controlled density.

- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to
  solid colors. Add contextual effects and textures that match the overall aesthetic.
  Apply gradient meshes, noise textures, geometric patterns, layered transparencies,
  dramatic shadows, decorative borders, and grain overlays via SCSS.

**NEVER** use generic AI-generated aesthetics like overused font families (Inter, Roboto,
Arial, system fonts), clichéd color schemes (particularly purple gradients on white
backgrounds), predictable layouts, and cookie-cutter components that lack context-specific
character.

Interpret creatively and make unexpected choices that feel genuinely designed for the
context. No design should be the same. Vary between light and dark themes, different
fonts, different aesthetics. NEVER converge on common choices across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs
need elaborate SCSS with extensive animations. Minimalist designs need restraint, precision,
and careful attention to spacing, typography, and subtle details. Elegance comes from
executing the vision well.

## Output Format

For each component or page, deliver:

1. **`component.ts`** — Angular component class (standalone, with imports, animations).
2. **`component.html`** — Template with Angular directives and bindings.
3. **`component.scss`** — Complete SCSS with variables, mixins, and responsive styles.
4. If needed: **`component.spec.ts`** — Basic unit test scaffold.

Remember: extraordinary creative work is possible. Don't hold back — show what can truly
be created when thinking outside the box and committing fully to a distinctive vision.
