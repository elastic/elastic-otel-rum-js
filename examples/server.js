import {createReadStream, existsSync, readFileSync} from 'fs';
import {createServer} from 'http';
import {createGzip} from 'zlib';

import 'dotenv/config';
import mime from 'mime';

const serverPort = process.env.PORT || 3000;
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const exportHeaders = process.env.OTEL_EXPORTER_OTLP_HEADERS;
const envToInject = {};
let shouldInjectEnv = false;

if (typeof otlpEndpoint === 'string' && otlpEndpoint) {
    shouldInjectEnv = true;
    envToInject.otlpEndpoint = otlpEndpoint;
}
if (typeof exportHeaders === 'string' && exportHeaders) {
    shouldInjectEnv = true;
    envToInject.exportHeaders = exportHeaders
        .split(',')
        .map((h) => h.trim())
        .reduce((bag, h) => {
            const idx = h.indexOf('=');
            const k = h.slice(0, idx);
            const v = h.slice(idx + 1);
            bag[k.trim()] = v.trim();
            return bag;
        }, {});
}

const server = createServer((req, res) => {
    // sanitize the path
    const url = new URL(`http://localhost${req.url}`);
    const [_, firstSegment, secondSegment] = url.pathname.split('/');

    // anythign starting with "/v1/*" will be dumped here
    // to show the traces, metrcs & logs exports
    if (firstSegment === 'v1') {
        const signal = secondSegment;
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
            try {
                const text = Buffer.concat(chunks).toString('utf-8');
                const pretty = JSON.stringify(JSON.parse(text), null, 4);
                // TODO: offer summay option ???
                console.log(`Data in ${signal} => ${pretty}`);
            } catch (error) {
                console.log(`Error in ${signal} => ${error}`);
            }
        });
        res.writeHead(200, 'OK', {'content-type': 'application/json'});
        res.end(JSON.stringify({ok: 1}));
        return;
    }

    // also we will handle "/api" calls for traces and
    // maybe to show tracestate propagation
    if (firstSegment === 'api') {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
            // TODO: some other checks, accept GET requests?
            try {
                const text = Buffer.concat(chunks).toString('utf-8');
                const json = JSON.parse(text);
                const result = handleApiRequest(json, url);

                res.writeHead(200, 'OK', {'content-type': 'application/json'});
                res.end(JSON.stringify(result ? result : {ok: 1}));
            } catch (error) {
                console.log(`Error in API => ${error}`);
                res.writeHead(400, 'Bad Request', {
                    'content-type': 'application/json',
                });
                res.end(JSON.stringify({ok: 0, error: error.message}));
            }
        });
        return;
    }

    // then check for static resource
    const filePath = 'public/' + (url.pathname.slice(1) || 'index.html');
    if (existsSync(filePath)) {
        // inject .env in index.html if available
        if (shouldInjectEnv && filePath.endsWith('public/index.html')) {
            const origHtml = readFileSync(filePath, {encoding: 'utf-8'});
            const serailizedEnv = JSON.stringify(envToInject);

            res.setHeader('content-type', mime.getType(filePath));
            res.end(
                origHtml.replace(
                    'globalThis.otelEnv = {};',
                    `globalThis.otelEnv = ${serailizedEnv};`
                )
            );
            return;
        }

        // For the rest just pipe
        const fileStream = createReadStream(filePath);
        res.setHeader('content-type', mime.getType(filePath));
        // Gzip if possible
        const acceptEncoding = req.headers['accept-encoding'];
        if (acceptEncoding && acceptEncoding.match(/\bgzip\b/)) {
            const gzip = createGzip();
            res.setHeader('content-encoding', 'gzip');
            fileStream.pipe(gzip).pipe(res);
        } else {
            fileStream.pipe(res);
        }
    } else {
        res.writeHead(404, 'Not Found');
        res.end();
    }
});

/**
 *
 * @param {Record<string, any>} json
 * @param {URL} url
 * @returns {Record<string, any> | undefined}
 */
function handleApiRequest(json, url) {
    if (url.pathname === '/api/echo') {
        return {ok: 1, result: `(ECHO) ${json.message}`};
    }
}

server.listen(serverPort);
console.log(`server listening to http://localhost:${server.address().port}`);
