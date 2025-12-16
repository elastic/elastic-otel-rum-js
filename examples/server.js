import { createReadStream, existsSync } from 'fs';
import { createServer } from 'http';

import mime from 'mime';

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
        // console.log(`Data in ${signal} => ${pretty}`)
      } catch (error) {
        console.log(`Error in ${signal} => ${error}`)
      }
    });
    res.writeHead(200, 'OK', { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: 1 }));
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
        
        res.writeHead(200, 'OK', { 'content-type': 'application/json' });
        res.end(JSON.stringify(result ? result : { ok: 1 }));
      } catch (error) {
        console.log(`Error in API => ${error}`)
        res.writeHead(400, 'Bad Request', { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: 0, error: error.message }));
      }
    });
    return;
  }

  // then check for static resource
  const filePath = 'public/' + (url.pathname.slice(1) || 'index.html');
  if (existsSync(filePath)) {
    const fileStream = createReadStream(filePath);
    res.setHeader('content-type', mime.getType(filePath));
    fileStream.pipe(res);
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
    return { ok: 1, result: `(ECHO) ${json.message}`};
  }
}

server.listen(3000);
console.log(`server listening to http://localhost:${server.address().port}`)
