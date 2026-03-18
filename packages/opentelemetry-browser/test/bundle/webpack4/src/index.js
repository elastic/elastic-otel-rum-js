/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {startBrowserSdk} from '@elastic/opentelemetry-browser';
// import { logs } from '@opentelemetry/api-logs';

// Setup SDK and register with API, then obtain logger from API.
startBrowserSdk();
// const logger = logs.getLogger('bundle-test-webpack');

// window.addEventListener('load', () => {
//   console.log('loaded');
//   const emitEventButton = document.getElementById('emit-event-button');
//   emitEventButton.addEventListener('click', () => {
//     console.log('clicked');
//     logger.emit({
//       body: 'test-event-body',
//       eventName: 'custom.event',
//     });
//   });
// });
