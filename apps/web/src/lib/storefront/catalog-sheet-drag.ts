/** Pure helpers for mobile filter sheet drag-to-dismiss (Pointer Events). */

export const SHEET_DRAG_CLOSE_DISTANCE_PX = 96;
export const SHEET_DRAG_CLOSE_VELOCITY_PX_MS = 0.55;
export const SHEET_DRAG_MIN_DISTANCE_FOR_VELOCITY_PX = 40;

export type SheetDragCloseInput = {
  /** Positive = dragged downward. */
  deltaY: number;
  /** px/ms downward velocity at release; 0 if unknown. */
  velocityY: number;
};

/**
 * Whether a downward drag should close the sheet.
 * Distance ≥ 96px OR (distance ≥ 40px and velocity ≥ 0.55 px/ms).
 */
export function shouldCloseSheetFromDrag(input: SheetDragCloseInput): boolean {
  const dy = Math.max(0, input.deltaY);
  if (dy >= SHEET_DRAG_CLOSE_DISTANCE_PX) return true;
  if (
    dy >= SHEET_DRAG_MIN_DISTANCE_FOR_VELOCITY_PX &&
    input.velocityY >= SHEET_DRAG_CLOSE_VELOCITY_PX_MS
  ) {
    return true;
  }
  return false;
}

/** Clamp visual drag offset (only allow downward pull). */
export function clampSheetDragOffset(deltaY: number): number {
  if (!Number.isFinite(deltaY) || deltaY <= 0) return 0;
  return deltaY;
}

export function sheetDragVelocityPxPerMs(
  deltaY: number,
  elapsedMs: number,
): number {
  // Ignore sub-frame releases (synthetic or tap jitter) so velocity dismiss
  // only applies to real downward flicks.
  if (elapsedMs < 16) return 0;
  return Math.max(0, deltaY) / elapsedMs;
}
