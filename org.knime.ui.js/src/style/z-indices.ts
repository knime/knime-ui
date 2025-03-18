/**
 * Top most layer, to render an invisible overlay that blocks user interactions
 */
export const layerBlockingOverlay = 100;

/**
 * Layer for the global loader (displayed when saving before closing app)
 */
export const layerGlobalLoadingOverlay = 99;

/**
 * Layer for the error overlay that could be shown during app init
 */
export const layerGlobalErrorOverlay = 90;

/**
 * Layer for items that require some prioritization while still staying
 * below critical layers that should not be superseded
 */
export const layerPriorityElevation = 85;

/**
 * Layer for the app skeleton loader
 */
export const layerAppSkeletonLoader = 80;

/**
 * Layer for modals, confirmation dialogs, etc
 */
export const layerModals = 70;

/**
 * Layer for toasts
 */
export const layerToasts = 60;

/**
 * Layer for floating windows that can be freely dragged
 */
export const layerFloatingWindows = 50;

/**
 * Layer for expanded menus and dropdowns
 */
export const layerExpandedMenus = 40;

/* --------------------------**** PANELS ****-------------------------------------- *
 * Definitions:
 *
 * Static panel: Is a container or section of the interface that holds content or controls
 * related to the main application context. It’s typically a part of the core layout,
 * often can be collapsed/expanded and stays visible or accessible on the screen
 * as the users interact with the app.
 *
 * Drawer panel: Temporary container that slides in from the edge of the screen.
 * It can display over other content (including other static panels) and can be dismissed.
 */

/**
 * Layer for decorations inside drawer panels
 */
export const layerDrawerPanelDecorations = 30;

/**
 * Layer for drawer panels
 */
export const layerDrawerPanel = 25;

/**
 * Layer for decorations inside static panels
 */
export const layerStaticPanelDecorations = 20;

/**
 * Layer for static panels
 */
export const layerStaticPanels = 15;

/* --------------------------**** PANELS ****-------------------------------------- */

/* --------------------------**** CANVAS ****-------------------------------------- *
 * This layer ordering **only** applies to HTML elements __inside__ the canvas. Because
 * the z-index cannot be applied to elements in the SVG namespace and instead their
 * layering is applied based on order of definition, which is why we use Portals via Vue Teleport
 */

/**
 * Layer for basic floating elements that provide information. e.g info bar
 */
export const layerCanvasInfo = 10;

/**
 * Layer for tooltips inside the canvas. e.g for node errors
 */
export const layerCanvasTooltips = 5;

/* --------------------------**** CANVAS ****-------------------------------------- */

/**
 * Layer for minimally elevated items
 */
export const layerMinorElevation = 2;

/* --------------------------**** WEBGL CANVAS ****-------------------------------------- */

export const webGlCanvasNodeSelectionPlane = 10;

export const webGlCanvasSelectedNode = 20;

export const webGlCanvasConnections = 30;

export const webGlCanvasFloatingMenus = layerExpandedMenus;
