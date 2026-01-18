const template = `
    <h2 class="content-subhead">Home Component</h2>
    <p>
        This is the Home component. It just loads some static assets that should appear in the trace
        as child spans of the "document-load" span. Also the static assets lie the main CSS files and
        the JS ones should be present as well.
    </p>

    <div class="pure-g">
        <div class="pure-u-1-4">
            <img class="pure-img-responsive" src="http://farm3.staticflickr.com/2875/9069037713_1752f5daeb.jpg" alt="Peyto Lake">
        </div>
        <div class="pure-u-1-4">
            <img class="pure-img-responsive" src="http://farm3.staticflickr.com/2813/9069585985_80da8db54f.jpg" alt="Train">
        </div>
        <div class="pure-u-1-4">
            <img class="pure-img-responsive" src="http://farm6.staticflickr.com/5456/9121446012_c1640e42d0.jpg" alt="T-Shirt Store">
        </div>
        <div class="pure-u-1-4">
            <img class="pure-img-responsive" src="http://farm8.staticflickr.com/7357/9086701425_fda3024927.jpg" alt="Mountain">
        </div>
    </div>
`;

/**
 * @param {HTMLElement} target
 */
export function Component(target) {
    target.innerHTML = template;
}
