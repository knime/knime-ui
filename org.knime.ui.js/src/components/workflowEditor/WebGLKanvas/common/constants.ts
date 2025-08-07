export const FLOATING_HTML_FADE_DELAY_MS = 100;

// The ActionBar component's icons use specific position attribute values (x,y)
// that work for the SVG canvas but don't work too well when used on a different context
// like it's the case for the FloatingHTML (and the respective use cases of node label and name editors).
// This viewbox is required in order to center the icons correctly in a small SVG to be used in normal HTML components
export const FLOATING_HTML_ACTIONBAR_VIEWBOX = "-24.5 -12 49 24";
