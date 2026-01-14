/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// NOTE: we get the @types/node here because of transitive deps
// @opentelemetry/exporter-*-otlp-http
//  -> @opentelemetry/otlp-transformer
//      -> protobufjs
//          -> @types/node
// it's okay for now but wee need to add a 3-slash reference once this
// transitive deps are resolved

import { createReadStream, lstatSync, readFileSync } from 'fs';
import { createServer } from 'http';

const server = createServer((req, res) => {
    // sanitize the path
    const url = new URL(`http://localhost${req.url}`);

    // this is for the ping that playwright does before testing
    if (url.pathname === '/') {
        res.writeHead(200, 'OK');
        res.end('Hello World!!!');
        return;
    }

    const fileUrl = new URL(`.${url.pathname}`, import.meta.url)
    const lstat = lstatSync(fileUrl, {throwIfNoEntry: false});

    if (lstat && lstat.isFile()) {
        // Assets are meant to be only HTML pages but we could allow others
        if (fileUrl.pathname.endsWith('.html')) {
            const origHtml = readFileSync(fileUrl, { encoding: 'utf-8' });
            const config = url.searchParams.get('config') || '{}';

            // inject the EDOT with config
            res.end(injectSdk(origHtml, JSON.parse(decodeURIComponent(config))));
            return;
        }

        // For the rest just pipe
        const fileStream = createReadStream(fileUrl);
        if (fileUrl.pathname.endsWith('.js')) {
            res.setHeader('content-type', 'application/javascript');
        } else if (fileUrl.pathname.endsWith('.css')) {
            res.setHeader('content-type', 'text/css');
        }
        fileStream.pipe(res);
    } else {
        res.writeHead(404, 'Not Found');
        res.end();
    }
});

server.listen(3000);
console.log(`server listening to http://localhost:${server.address().port}`)

// -- helper functions

function injectSdk(html, config) {
    const placeholder = '<!-- EDOT_PLACEHOLDER (DO NOT REMOVE)-->';
    const code = `
        <script>
        // Same pattern as https://www.elastic.co/docs/reference/apm/agents/rum-js/install-agent#_asynchronous_non_blocking_pattern
        ;(function(d, s, c) {
            var j = d.createElement(s),
                t = d.getElementsByTagName(s)[0];
            j.src = '/assets/elastic-otel-browser.min.js';
            j.onload = function() { startBrowserSdk(c); };
            t.parentNode.insertBefore(j, t);
        })(document, 'script', ${JSON.stringify(config)})
        </script>
    `;

    return html.replace(placeholder, code);
}
