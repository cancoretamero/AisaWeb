# Theme Style Guide (Light + Dark)

## Palette

### Light
- **Background**: `#FAFAFA`
- **Surface**: `#FFFFFF`
- **Panel**: `#F3F4F6`
- **Text**: `#1F2937`
- **Muted text**: `#6B7280`
- **Border**: `rgba(0, 0, 0, 0.05)`
- **Shadow**: `0 8px 32px 0 rgba(0, 0, 0, 0.05)`

### Dark
- **Background**: `#050505` (varies by page; baseline for root dark)
- **Surface**: `#0F0F0F`
- **Panel/Card**: `#121212`
- **Text**: `#E5E7EB`
- **Muted text**: `#9CA3AF`
- **Border**: `rgba(255, 255, 255, 0.08)`
- **Shadow**: `0 8px 32px 0 rgba(0, 0, 0, 0.4)`

## Glassmorphism

- **Light**: `background: rgba(255, 255, 255, 0.75)` + `backdrop-filter: blur(20px) saturate(180%)`
- **Dark**: `.dark .glass-apple { background: rgba(20, 20, 20, 0.65); border: 1px solid rgba(255, 255, 255, 0.12); }`

## Gradients & Overlays

- **Hero overlay (dark)**: `bg-gradient-to-b from-dark-bg/40 via-transparent to-dark-bg`
- **Hero overlay (light)**: keep the same structure, swap to `from-white/60 ... to-white` variants as needed per page.
- **Frost gradients**: `linear-gradient(135deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.1))` for light, and `rgba(255, 255, 255, 0.1)` for dark.

## Patterns

- **Grid Pattern Light**: low-opacity black grid data URI (`fill-opacity="0.03"`).
- **Grid Pattern Dark**: low-opacity white grid data URI (`fill-opacity="0.04"`).

