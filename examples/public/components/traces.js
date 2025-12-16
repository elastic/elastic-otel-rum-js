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

    <h3 class="content-subhead">(TODO) Log Tasks</h3>
    <p>
        <div id="tasks-results"></div>
        <button class="pure-button" id="button-task">Do Logs Task</button>
    </p>
`;

/**
 * @param {HTMLElement} target 
 */
export function Component(target) {
    // Render
    target.innerHTML = template;

    // Refs
    /** @type {HTMLDivElement} */
    const fetchResultsElem = target.querySelector('#fetch-results');
    // Bind listeners
    target.querySelector('#button-fetch').addEventListener('click', () => {
        const options = {
            method: 'POST',
            body: JSON.stringify({message: 'request made by fetch API'}),
        }
        fetch('/api/echo', options)
            .then(r => r.json())
            .then(json => {
                fetchResultsElem.innerText = json.result;
            });
    });
    target.querySelector('#button-xhr').addEventListener('click', () => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/echo', true);
        xhr.setRequestHeader('Content-Type', 'application/json');

        xhr.onreadystatechange = function() {
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                const json = JSON.parse(xhr.responseText);
                fetchResultsElem.innerText = json.result;
            }
        };

        const data = JSON.stringify({message: 'request made by XMLHttpRequest API'});
        xhr.send(data);
    });
}