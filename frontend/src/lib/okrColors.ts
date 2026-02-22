/**
 * OKR-based color palette for initiative bars.
 * Each OKR gets a deterministic color based on its index in the sorted list of all OKR IDs.
 * Initiatives inherit the color of their primary (first) OKR.
 */

export interface OkrColorEntry {
  /** Tailwind bg class for the initiative bar, e.g. 'bg-blue-500' */
  bg: string;
  /** Tailwind hover bg class, e.g. 'hover:bg-blue-600' */
  hover: string;
  /** Tailwind light badge classes, e.g. 'bg-blue-100 text-blue-700' */
  light: string;
}

const OKR_COLORS: OkrColorEntry[] = [
  { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', light: 'bg-blue-100 text-blue-700' },
  { bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600', light: 'bg-emerald-100 text-emerald-700' },
  { bg: 'bg-violet-500', hover: 'hover:bg-violet-600', light: 'bg-violet-100 text-violet-700' },
  { bg: 'bg-amber-500', hover: 'hover:bg-amber-600', light: 'bg-amber-100 text-amber-700' },
  { bg: 'bg-rose-500', hover: 'hover:bg-rose-600', light: 'bg-rose-100 text-rose-700' },
  { bg: 'bg-cyan-500', hover: 'hover:bg-cyan-600', light: 'bg-cyan-100 text-cyan-700' },
  { bg: 'bg-pink-500', hover: 'hover:bg-pink-600', light: 'bg-pink-100 text-pink-700' },
  { bg: 'bg-teal-500', hover: 'hover:bg-teal-600', light: 'bg-teal-100 text-teal-700' },
  { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', light: 'bg-orange-100 text-orange-700' },
  { bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600', light: 'bg-indigo-100 text-indigo-700' },
  { bg: 'bg-lime-500', hover: 'hover:bg-lime-600', light: 'bg-lime-100 text-lime-700' },
  { bg: 'bg-fuchsia-500', hover: 'hover:bg-fuchsia-600', light: 'bg-fuchsia-100 text-fuchsia-700' },
];

/** Default color for initiatives with no linked OKR */
export const NO_OKR_COLOR: OkrColorEntry = {
  bg: 'bg-gray-400',
  hover: 'hover:bg-gray-500',
  light: 'bg-gray-100 text-gray-600',
};

/**
 * Get the color entry for a given OKR ID.
 * @param okrId The OKR's UUID
 * @param allOkrIds Sorted list of all OKR IDs (used for deterministic index assignment)
 */
export function getOkrColor(okrId: string, allOkrIds: string[]): OkrColorEntry {
  const index = allOkrIds.indexOf(okrId);
  if (index === -1) return NO_OKR_COLOR;
  return OKR_COLORS[index % OKR_COLORS.length];
}

/**
 * Get the color for an initiative bar based on its primary (first) OKR.
 * @param okrIds The initiative's OKR IDs (ordered by priority)
 * @param allOkrIds Sorted list of all OKR IDs
 */
export function getInitiativeBarColor(okrIds: string[], allOkrIds: string[]): OkrColorEntry {
  if (okrIds.length === 0) return NO_OKR_COLOR;
  return getOkrColor(okrIds[0], allOkrIds);
}
