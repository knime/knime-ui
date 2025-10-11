/**
 * Selection has 2 modes:
 * - committed: means selection state is stable and settled. This is relevant
 *              for features that rely on a selection context but that might be
 *              too heavy to react to fast changes on a selection
 * - preview:   means selection state is being updated for a preview. This is mainly
 *              relevant for canvas features which require quicker repaints to visually
 *              update the selection w/o actually committing to it
 */
export type SelectionMode = "committed" | "preview";
