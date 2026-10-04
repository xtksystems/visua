import { useLayoutEffect, useRef, type RefObject } from "react";

interface ModalEntry {
  element: HTMLElement;
  lastFocused: HTMLElement | null;
}

const modals: ModalEntry[] = [];
const tabbableSelector = "a[href], area[href], button, input:not([type='hidden']), select, textarea, iframe, summary, [tabindex], [contenteditable='true']";

function tabbable(element: HTMLElement): HTMLElement[] {
  return Array.from(element.querySelectorAll<HTMLElement>(tabbableSelector)).filter((candidate) =>
    candidate.tabIndex >= 0 && !candidate.matches(":disabled") && !candidate.closest("[hidden], [inert]") &&
    candidate.getClientRects().length > 0 && getComputedStyle(candidate).visibility !== "hidden",
  );
}

function focusInside(entry: ModalEntry, preferred?: HTMLElement | null) {
  const target = preferred?.isConnected && entry.element.contains(preferred) && !preferred.matches(":disabled") && preferred.getClientRects().length > 0
    ? preferred : tabbable(entry.element)[0] ?? entry.element;
  target.focus({ preventScroll: true });
}

/** Share one modal stack so a dialog and the command palette cannot handle the same Escape. */
export function useModalFocus(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  options: { open?: boolean; initialFocusRef?: RefObject<HTMLElement | null> } = {},
): void {
  const latest = useRef({ onClose, initialFocusRef: options.initialFocusRef });
  const restoreTarget = useRef<HTMLElement | null>(null);
  const lifetime = useRef(0);
  latest.current = { onClose, initialFocusRef: options.initialFocusRef };
  const open = options.open ?? true;

  useLayoutEffect(() => {
    const element = ref.current;
    if (!open || !element) return;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const trigger = active && element.contains(active) ? restoreTarget.current : active;
    restoreTarget.current = trigger;
    const session = ++lifetime.current;
    const entry: ModalEntry = { element, lastFocused: null };
    // Child layout effects run first: keep a simultaneously mounted nested modal on top.
    const childIndex = modals.findIndex((modal) => element.contains(modal.element));
    modals.splice(childIndex < 0 ? modals.length : childIndex, 0, entry);
    const isTop = () => modals.at(-1) === entry;
    if (isTop()) focusInside(entry, latest.current.initialFocusRef?.current);

    const onKey = (event: KeyboardEvent) => {
      if (!isTop()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        latest.current.onClose();
      } else if (event.key === "Tab") {
        const candidates = tabbable(element);
        const active = document.activeElement;
        const first = candidates[0];
        const last = candidates.at(-1);
        if (!first || !last) {
          event.preventDefault();
          element.focus({ preventScroll: true });
        } else if (!element.contains(active) || active === element || (event.shiftKey ? active === first : active === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus({ preventScroll: true });
        }
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (!isTop()) return;
      if (event.target instanceof HTMLElement && element.contains(event.target)) entry.lastFocused = event.target;
      else focusInside(entry, entry.lastFocused);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("focusin", onFocus, true);

    return () => {
      const wasTop = isTop();
      const index = modals.indexOf(entry);
      if (index >= 0) modals.splice(index, 1);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("focusin", onFocus, true);
      if (!wasTop) return;
      // React may remove the trigger in this same navigation commit. Check after it finishes.
      queueMicrotask(() => {
        if (lifetime.current !== session) return;
        const top = modals.at(-1);
        if (trigger?.isConnected && (!top || top.element.contains(trigger))) trigger.focus({ preventScroll: true });
        else if (top && (!document.activeElement?.isConnected || element.contains(document.activeElement))) focusInside(top, top.lastFocused);
        restoreTarget.current = null;
      });
    };
  }, [ref, open]);
}
