### Anchored Components

This folder contains components designed to be anchored at specific positions on top of the canvas.

The anchoring behavior depends on the implementation of each canvas renderer (e.g., SVG or WebGL), as it must account for the layering and coordinate systems specific to the chosen canvas rendering system.

#### Key Notes:

These components make **no** assumptions about their positioning.
Positioning logic is delegated to an implementation of the `FloatingMenu` component, which must be provided by each canvas renderer.
By separating the responsibility of anchoring from the components themselves, this approach ensures flexibility and compatibility across different rendering systems.
