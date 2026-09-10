# Pulse UI

UI-only extraction of the current Pulse interface.

## Purpose

This folder isolates presentation-layer structure from Pulse's product/backend implementation so the interface can be redesigned without coupling the visual system to Supabase, RPCs, authentication, or domain logic.

## Current source screens

- `screens/Home.jsx` — current discovery/home composition
- `screens/Layout.jsx` — global shell and navigation

## Current visual system

- `styles/design-system.css` — current Liquid Glass design tokens/base system
- `styles/home-neo.css` — current Home-specific visual layer

## Boundary

Included: JSX structure, visual classes, typography, spacing, surfaces, navigation composition, animation-related presentation classes.

Excluded: database access, Supabase queries, authentication, RPCs, domain mutations, server-side logic.

## Note

This is an extraction snapshot, not a second production app. The original application remains the source of truth for behavior until the UI is intentionally migrated.
