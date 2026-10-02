# AI Harness Switcher

Source: [Stitch project](https://stitch.google.com/projects/10886453997180725911)

The implementation follows the exported screen HTML and screenshots. The project-level theme describes an emerald palette; the actual screens use cyan, which takes precedence here.

## Screens

- Dashboard & Targets: `8ee95667440448bba12b316bb887fc8c`
- Skills & Capabilities: `b3ddf84cbf5c4d02936c759d5c0eae75`
- Hooks & Triggers: `bd0a2294e3344ef58bb789da945308d3`
- Profiles & Matrix: `359f810c7d3e40b399bb0430fcbd0555`
- Component references: Core Primitives, Inode & Rule Inspector, Data Grid & Rows, Components Library.

## Visual system

- Canvas `#0f131c`, window chrome and panels `#080c14`, inset surfaces `#111622`.
- Borders `#222838`, primary text `#e2e8f0`, secondary text `#94a3b8`.
- Cyan `#00e5f5` for linked state and primary actions; blue `#38bdf8` for profiles; amber `#f59e0b` for unresolved definitions.
- Local Geist Variable font for UI; system monospace for paths, code, and status metadata.
- Fixed title bar, 228px navigation sidebar, fluid content, fixed bottom status rail.
- Compact 4px corners, fine outlines, dense tables, and restrained shadows.
- Narrow windows collapse navigation into a drawer and stack panels; tables scroll horizontally.

## Components and behavior

Use the existing shadcn/ui Base UI registry style (`base-nova`) for buttons, badges, inputs, tables, tabs, dialogs, switches, selects, checkboxes, and separators.

This is a frontend preview. Versioned local storage retains configuration. Profile selection updates available skill links according to the matrix. Broken and conflicting definitions remain unresolved. Runtime actions show a simulation or export JSON; no filesystem operation runs until a backend is connected.
