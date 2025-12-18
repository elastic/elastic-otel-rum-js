/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// NOTE: we get the @types/node here because of transitive deps
// @opentelemetry/exporter-*-otlp-http
//  -> @opentelemetry/otlp-transformer
//      -> protobufjs
//          -> @types/node
// it's okay for now but wee need to explicitly install once this
// transitive deps are 

import { createReadStream, existsSync, lstatSync, readFileSync } from 'fs';
import { createServer } from 'http';

const server = createServer((req, res) => {
    // sanitize the path
    const url = new URL(`http://localhost${req.url}`);
    const config = url.searchParams.get('config') || 'null';

    // this is for the ping that playwright does before testing
    if (url.pathname === '/') {
        res.writeHead(200, 'OK');
        res.end('Hello World!!!');
        return;
    }

    const fileUrl = new URL(`.${url.pathname}`, import.meta.url)
    const lstat = lstatSync(fileUrl, {throwIfNoEntry: false});

    if (lstat && lstat.isFile()) {
        console.log('file found')
        // Assets are meant to be only HTML pages but we could allow others
        if (fileUrl.pathname.endsWith('.html')) {
            const origHtml = readFileSync(fileUrl, { encoding: 'utf-8' });

            // TODO: inject the EDOT with config
            res.end(origHtml.replace(
                'globalThis.edotConfig = null;',
                `globalThis.edotConfig = JSON.parse(decodeURIComponent('${config}'))`,
            ));
            return;
        }

        // For the rest just pipe
        const fileStream = createReadStream(fileUrl);
        fileStream.pipe(res);
    } else {
        res.writeHead(404, 'Not Found');
        res.end();
    }
});

server.listen(3000);
console.log(`server listening to http://localhost:${server.address().port}`)
