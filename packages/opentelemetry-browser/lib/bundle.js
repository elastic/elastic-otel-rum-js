/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {inferPageRoute} from './page-route.js';
import {setPageRoute, startBrowserSdk} from './sdk.js';

globalThis['startBrowserSdk'] = startBrowserSdk;
globalThis['setPageRoute'] = setPageRoute;
globalThis['inferPageRoute'] = inferPageRoute;
