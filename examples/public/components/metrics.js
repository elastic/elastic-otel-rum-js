const template = `
    <h2 class="content-subhead">metrics Component</h2>
    <p>
        This is the metrics component. It contains some elements where you can interact to
        send metrics to the OTLP endpoint
    </p>

    <h3 class="content-subhead">(TODO) UpdownCounter Metric</h3>
    <p>
        <div id="updown-results"></div>
        <button class="pure-button" id="button-add">Add</button>
        <button class="pure-button" id="button-sub">Sub</button>
    </p>
`;

/**
 * @param {HTMLElement} target 
 */
export function Component(target) {
    // TODO: create the metrics here using the API
    // Render
    target.innerHTML = template;

    // Bind listeners
    target.querySelector('#button-add').addEventListener('click', () => {
        // TODO: add one to the counter
    });

    target.querySelector('#button-sub').addEventListener('click', () => {
        // TODO: sub one to the counter
    });
}