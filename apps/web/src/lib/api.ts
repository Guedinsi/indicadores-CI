export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
).replace(/\/$/, "");

export type Axis = {
  id: number;
  slug: string;
  name: string;
  abbreviation: string | null;
  description: string | null;
  indicatorCount: number;
};

export type IndicatorKind = "TOTAL" | "RATE" | null;
export type IndicatorPolarity = "HIGHER_BETTER" | "LOWER_BETTER" | null;

export type IndicatorSummary = {
  code: string;
  name: string;
  unit: string | null;
  kind: IndicatorKind;
  polarity: IndicatorPolarity;
};

export type IndicatorCard = {
  code: string;
  name: string;
  description: string | null;
  unit: string | null;
  kind: IndicatorKind;
  polarity: IndicatorPolarity;
  axisSlug: string;
  axisAbbreviation: string | null;
  /** Período do valor mostrado; null quando não há dado. */
  period: string | null;
  /** null = sem dado. */
  value: number | null;
};

export type SeriesPoint = { period: string; value: number | null };

export type SeriesResponse = {
  indicator: IndicatorSummary;
  territory: { code: string; name: string; type: string };
  points: SeriesPoint[];
};

export type ComparisonItem = {
  territory: string;
  type: string;
  value: number | null;
};

export type ComparisonResponse = {
  indicator: IndicatorSummary;
  period: string | null;
  values: ComparisonItem[];
};

async function get<T>(
  path: string,
  params: Record<string, string | undefined> = {},
): Promise<T> {
  const url = new URL(`${API_URL}/api${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`A API respondeu com status ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  axes: () => get<Axis[]>("/axes"),
  periods: () => get<string[]>("/periods"),
  indicators: (axis?: string, period?: string) =>
    get<IndicatorCard[]>("/indicators/latest", { axis, period }),
  /** Série de um território; sem `territory`, a do município. */
  series: (code: string, territory?: string) =>
    get<SeriesResponse>(`/indicators/${encodeURIComponent(code)}/values`, {
      territory,
    }),
  comparison: (code: string, period?: string) =>
    get<ComparisonResponse>(
      `/indicators/${encodeURIComponent(code)}/comparison`,
      { period },
    ),
};
