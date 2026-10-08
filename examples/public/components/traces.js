/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

const template = `
    <h2 class="content-subhead">Traces Component</h2>
    <p>
        This is the Traces component. It contains some elemes where you can interact to create traces like
        fetch and XMLHttpRequest calls, user interactions and long tasks.
    </p>

    <h3 class="content-subhead">Fetch and XMLHttpRequest</h3>
    <p>
        <div id="fetch-results"></div>
        <button class="pure-button" id="button-fetch">Do Fetch</button>
        <button class="pure-button" id="button-xhr">Do XHR</button>
    </p>
    <p>
        <div id="fetch-results-fail"></div>
        <button class="pure-button" id="button-fetch-fail">Do Failed Fetch</button>
        <button class="pure-button" id="button-xhr-fail">Do Failed XHR</button>
    </p>

    <h3 class="content-subhead">(TODO) Long Tasks</h3>
    <p>
        <div id="tasks-results"></div>
        <button class="pure-button" id="button-task">Do Long Task</button>
    </p>
`;

/**
 * @param {HTMLElement} target
 */
export function Component(target) {
    function getTracer(name) {
        const API_MAJOR = 1; // TODO: check when update the major version
        const otelApiSymbol = Symbol.for(`opentelemetry.js.api.${API_MAJOR}`);
        // It's odd that the `trace` API is actually the tracer provider
        const tracerProvider = globalThis[otelApiSymbol].trace;
        return tracerProvider.getTracer(name);
    }

    // Render
    target.innerHTML = template;

    // Refs
    /** @type {HTMLDivElement} */
    const fetchResultsElem = target.querySelector('#fetch-results');
    // Bind listeners
    target.querySelector('#button-fetch')?.addEventListener('click', () => {
        const options = {
            method: 'POST',
            body: JSON.stringify({message: 'request made by fetch API'}),
        };
        fetch('/api/echo', options)
            .then((r) => r.json())
            .then((json) => {
                fetchResultsElem.innerText = json.result;
            });
    });
    target.querySelector('#button-xhr')?.addEventListener('click', () => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/echo', true);
        xhr.setRequestHeader('Content-Type', 'application/json');

        xhr.onreadystatechange = function () {
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                const json = JSON.parse(xhr.responseText);
                fetchResultsElem.innerText = json.result;
            }
        };

        const data = JSON.stringify({
            message: 'request made by XMLHttpRequest API',
        });
        xhr.send(data);
    });

    /** @type {HTMLDivElement} */
    const fetchFailResultsElem = target.querySelector('#fetch-results-fail');
    target
        .querySelector('#button-fetch-fail')
        ?.addEventListener('click', () => {
            const options = {
                method: 'POST',
                body: JSON.stringify({message: 'request made by fetch API'}),
            };
            getTracer('custom-tracer').startActiveSpan(
                'manual Span',
                (span) => {
                    console.log('active span', span);
                    fetch('/api/fail', options)
                        .then((r) => r.json())
                        .then((json) => {
                            fetchFailResultsElem.innerText = json.error;
                            throw new Error(json.error);
                        })
                        .then(
                            () => null,
                            (e) => span.recordException(e)
                        )
                        .finally(() => {
                            span.end();
                        });
                }
            );
        });
    target.querySelector('#button-xhr-fail')?.addEventListener('click', () => {
        getTracer('app-tracer').startActiveSpan('Click Span', (span) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/fail', true);
            xhr.setRequestHeader('Content-Type', 'application/json');

            xhr.onreadystatechange = function () {
                try {
                    if (xhr.readyState === XMLHttpRequest.DONE) {
                        const json = JSON.parse(xhr.responseText);
                        fetchFailResultsElem.innerText = json.error;
                        throw new Error(json.error);
                    }
                } catch (e) {
                    span.recordException(e);
                }
            };
            xhr.onloadend = () => span.end();

            const data = JSON.stringify({
                message: 'request made by XMLHttpRequest API',
            });
            xhr.send(data);
        });
    });
}
