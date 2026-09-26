/** Client UI state: selection, lens, view mode, panels. */
import { create } from "zustand";
import type { MinStatus } from "../lib/types.ts";

export type Lens = "status" | "gap" | "evidence" | "priority" | "crosswalk" | "overlay";
export type ViewMode = "constellation" | "terrain";

interface UiState {
  selectedId: string | null;
  hoveredId: string | null;
  /** Node ids an agent or search asked the camera to frame. */
  focusIds: string[];
  focusSeq: number;
  lens: Lens;
  view: ViewMode;
  outlineOpen: boolean;
  inspectorOpen: boolean;
  paletteOpen: boolean;
  paletteQuery: string;
  /** Weakest link status counted in threat views (Threats page, threat Observatory, Nexus ring). */
  threatMin: MinStatus;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  focus: (ids: string[], lens?: Lens) => void;
  setLens: (lens: Lens) => void;
  cycleLens: () => void;
  setView: (view: ViewMode) => void;
  toggleOutline: () => void;
  setInspector: (open: boolean) => void;
  openPalette: (query?: string) => void;
  closePalette: () => void;
  setThreatMin: (min: MinStatus) => void;
}

export const LENSES: Lens[] = ["status", "gap", "evidence", "priority", "crosswalk", "overlay"];

export const useUi = create<UiState>((set, get) => ({
  selectedId: null,
  hoveredId: null,
  focusIds: [],
  focusSeq: 0,
  lens: "status",
  view: "constellation",
  outlineOpen: true,
  inspectorOpen: true,
  paletteOpen: false,
  paletteQuery: "",
  threatMin: "unreviewed",
  select: (id) => set({ selectedId: id, inspectorOpen: id ? true : get().inspectorOpen }),
  hover: (id) => set({ hoveredId: id }),
  focus: (ids, lens) => set((s) => ({ focusIds: ids, focusSeq: s.focusSeq + 1, lens: lens ?? s.lens, selectedId: ids.length === 1 ? ids[0]! : s.selectedId })),
  setLens: (lens) => set({ lens }),
  cycleLens: () => set((s) => ({ lens: LENSES[(LENSES.indexOf(s.lens) + 1) % LENSES.length]! })),
  setView: (view) => set({ view }),
  toggleOutline: () => set((s) => ({ outlineOpen: !s.outlineOpen })),
  setInspector: (open) => set({ inspectorOpen: open }),
  openPalette: (query = "") => set({ paletteOpen: true, paletteQuery: query }),
  closePalette: () => set({ paletteOpen: false }),
  setThreatMin: (threatMin) => set({ threatMin }),
}));
