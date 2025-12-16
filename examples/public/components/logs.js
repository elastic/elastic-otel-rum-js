const template = `
    <h2 class="content-subhead">Logs Component</h2>
    <p>
        This is the Logs component. It contains some elements where you can interact to
        send logs to the OTLP endpoint
    </p>

    <h3 class="content-subhead">Send logs</h3>
    <form class="pure-form">
        <fieldset>
            <input name="message" type="text" placeholder="Log message" />
            <button type="submit" class="pure-button pure-button-primary">Send Log</button>
        </fieldset>
    </form>
`;

/**
 * @param {HTMLElement} target 
 */
export function Component(target) {
    // TODO: create a logger here using the API

    // Render
    target.innerHTML = template;

    // Bind listeners
    target.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        /** @type {HTMLFormElement} */
        // @ts-ignore
        const form = e.target;
        const data = new FormData(form);
        const message = data.get('message').toString().trim();

        if (message) {
            // TODO: send the log
        }
    });
}