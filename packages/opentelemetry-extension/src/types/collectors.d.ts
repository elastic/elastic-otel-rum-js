/**
 * OTLP collector configuration shared by monitored websites.
 */
export type Collector = {
  /** Stable id for updates and deletes. */
  id: string;
  /** Display label in the UI and website picker. */
  name: string;
  /** Base OTLP export URL (`exportConfig.url`). Optional when both signal URLs are set. */
  url: string;
  /** Full logs export URL (`exportConfig.logsUrl`). */
  logs_url: string;
  /** Full traces export URL (`exportConfig.tracesUrl`). */
  traces_url: string;
  /** API key sent as `Authorization: ApiKey …` on export requests. */
  api_key: string;
};

export type CollectorsStorage = {
  collectors: Collector[];
};
