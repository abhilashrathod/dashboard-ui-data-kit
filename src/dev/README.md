# dev

Developer-only tools and stories (Storybook's "Dev/" section). Not part of the kit, and never imported by the app.

- `MockApiExplorer`: calls the mock API by hand and shows status, timing, request id and the response. Combine it with the Network toolbar to see every failure mode.
- `LookAndFeel.stories.tsx`: Foundations/Look & Feel, a static mock of the visual language used as a reference for later stages. Not kit code.
- `StoryMatrix`: a story wrapper that renders its children in light/dark × comfortable/compact, so each "All variants" story is axe-checked in all four.
- `a11y.ts`: `openOverlayA11y`, story parameters for overlays rendered open. They exclude only the page Radix hid behind a modal (see the comment there for why).
- `data-state-demo/`: small widgets with real queries against the mock API (Data/States in practice). They're the usage examples for `toDataState` + `DataBoundary`; see docs/data-states.md.
