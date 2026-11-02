/**
 * Pointer and keyboard maths in a console that may be laid out right to left.
 *
 * Classes mirror on their own - `start-0` is the left edge in English and the
 * right one in Arabic - but a drag computed from `clientX` does not: x grows to
 * the right whichever way the page reads. These answer the few questions such
 * code asks, from the element's own computed direction rather than the locale,
 * so a subtree pinned `dir="ltr"` (the workflow canvas) keeps its own answer.
 */

export function isRtl(element: Element): boolean {
  return getComputedStyle(element).direction === "rtl";
}

/** `1` where x grows toward the inline end, `-1` where it grows toward the start. */
export function inlineSign(element: Element): 1 | -1 {
  return isRtl(element) ? -1 : 1;
}

/** The arrow key that points toward the inline start: `ArrowLeft`, or `ArrowRight` in RTL. */
export function towardStart(element: Element): "ArrowLeft" | "ArrowRight" {
  return isRtl(element) ? "ArrowRight" : "ArrowLeft";
}

/** How far a pointer at `x` is from the inline-end edge of `bounds`. */
export function fromEnd(bounds: DOMRect, x: number, element: Element): number {
  return isRtl(element) ? x - bounds.left : bounds.right - x;
}
