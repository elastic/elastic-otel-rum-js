/** Last known outcome of injecting EDOT on a matching tab. */
export type InjectionStatus = 'unknown' | 'active' | 'failed';

/**
 * A website entry stored by the extension for EDOT injection.
 */
export type MonitoredWebsite = {
  /** Stable id for updates and deletes. */
  id: string;
  /** Host part of the URL used to match tabs (e.g. `example.com`). */
  host: string;
  /** npm version of `@elastic/opentelemetry-browser` without the package name. */
  version: string;
  /** OTLP export URL passed to EDOT `exportConfig.url`. */
  endpoint: string;
  /** API key sent as `Authorization: ApiKey …` on export requests. */
  api_key: string;
  /** Service name in Kibana (`service.name`). */
  service_name: string;
  /** Service version in Kibana (`service.version`). */
  service_version: string;
  /** Whether the last injection attempt on a matching tab succeeded. */
  injection_status?: InjectionStatus;
  /** Human-readable detail when `injection_status` is `failed`, or success note. */
  injection_message?: string;
  /** ISO timestamp of the last injection status update. */
  injection_checked_at?: string;
};

export type WebsitesStorage = {
  websites: MonitoredWebsite[];
};

/** Serializable config passed into the page for injection. */
export type EdotInjectConfig = Pick<
  MonitoredWebsite,
  | 'host'
  | 'version'
  | 'endpoint'
  | 'api_key'
  | 'service_name'
  | 'service_version'
> & {
  websiteId: string;
};
