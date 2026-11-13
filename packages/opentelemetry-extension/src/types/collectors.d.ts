/**
 * OTLP collector configuration shared by monitored websites.
 */
export type Collector = {
  /** Stable id for updates and deletes. */
  id: string;
  /** Display label in the UI and website picker. */
  name: string;
  /** Primary OTLP export URL (same role as the former per-website endpoint). */
  url: string;
  /** Logs export URL (reserved for future SDK wiring). */
  logs_url: string;
  /** Traces export URL (reserved for future SDK wiring). */
  traces_url: string;
  /** API key sent as `Authorization: ApiKey …` on export requests. */
  api_key: string;
};

export type CollectorsStorage = {
  collectors: Collector[];
};
