/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Test only IIFE build of the replay entry point until its CDN build lands (#154)
import {startBrowserSdk} from '../../lib/replay/index.js';

globalThis['startBrowserSdk'] = startBrowserSdk;
