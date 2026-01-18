/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Array of brand name and version separated by a space
 *
 * @example [" Not A;Brand 99", "Chromium 99", "Chrome 99"]
 *
 * @note This value is intended to be taken from the [UA client hints API](https://wicg.github.io/ua-client-hints/#interface) (`navigator.userAgentData.brands`).
 *
 * @experimental This attribute is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
export const ATTR_BROWSER_BRANDS = 'browser.brands';

/**
 * Preferred language of the user using the browser
 *
 * @example en
 * @example en-US
 * @example fr
 * @example fr-FR
 *
 * @note This value is intended to be taken from the Navigator API `navigator.language`.
 *
 * @experimental This attribute is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
export const ATTR_BROWSER_LANGUAGE = 'browser.language';


/**
 * A boolean that is true if the browser is running on a mobile device
 *
 * @note This value is intended to be taken from the [UA client hints API](https://wicg.github.io/ua-client-hints/#interface) (`navigator.userAgentData.mobile`). If unavailable, this attribute **SHOULD** be left unset.
 *
 * @experimental This attribute is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
export const ATTR_BROWSER_MOBILE = 'browser.mobile';

/**
 * The platform on which the browser is running
 *
 * @example Windows
 * @example macOS
 * @example Android
 *
 * @note This value is intended to be taken from the [UA client hints API](https://wicg.github.io/ua-client-hints/#interface) (`navigator.userAgentData.platform`). If unavailable, the legacy `navigator.platform` API **SHOULD NOT** be used instead and this attribute **SHOULD** be left unset in order for the values to be consistent.
 * The list of possible values is defined in the [W3C User-Agent Client Hints specification](https://wicg.github.io/ua-client-hints/#sec-ch-ua-platform). Note that some (but not all) of these values can overlap with values in the [`os.type` and `os.name` attributes](./os.md). However, for consistency, the values in the `browser.platform` attribute should capture the exact value that the user agent provides.
 *
 * @experimental This attribute is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
export const ATTR_BROWSER_PLATFORM = 'browser.platform';

/**
 * This event describes the website performance metrics introduced by Google, See [web vitals](https://web.dev/vitals).
 *
 * @experimental This event is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
export const EVENT_BROWSER_WEB_VITAL = 'browser.web_vital';

/**
 * Value of the [HTTP User-Agent](https://www.rfc-editor.org/rfc/rfc9110.html#field.user-agent) header sent by the client.
 *
 * @example CERN-LineMode/2.15 libwww/2.17b3
 * @example Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1
 * @example YourApp/1.0.0 grpc-java-okhttp/1.27.2
 */
export const ATTR_USER_AGENT_ORIGINAL = 'user_agent.original';
