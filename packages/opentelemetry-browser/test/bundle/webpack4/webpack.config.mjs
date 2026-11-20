import {fileURLToPath} from 'url';
import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INSTR_IMPORT = '@opentelemetry/browser-instrumentation/experimental/XXX';
const instrNames = [
    'document-load',
    'errors',
    'fetch',
    'long-animation-frame',
    'navigation',
    'navigation-timing',
    'resource-timing',
    'user-action',
    'xhr',
    'web-vitals',
];
const instrAlias = instrNames.reduce((alias, name) => {
    const key = INSTR_IMPORT.replace('XXX', name);
    const val = INSTR_IMPORT.replace(
        'experimental/XXX',
        `dist/${name}/index.js`
    );
    // @ts-ignore
    alias[key] = val;
    return alias;
}, {});

/**
 * Webpack 4 cannot resolve package.json `imports` (OpenTelemetry 3.x uses `#platform`).
 * Map each package's internal import to its browser platform build.
 * @param {string | {require?: string; default?: string}} entry
 * @param {boolean} preferRequire
 */
function pickBrowserPlatformTarget(entry, preferRequire) {
    if (typeof entry === 'string') {
        return entry;
    }
    if (preferRequire && typeof entry.require === 'string') {
        return entry.require;
    }
    if (!preferRequire && typeof entry.default === 'string') {
        return entry.default;
    }
    if (typeof entry.require === 'string') {
        return entry.require;
    }
    if (typeof entry.default === 'string') {
        return entry.default;
    }
    return null;
}

function packageImportsResolvePlugin() {
    return {
        apply(resolver) {
            const target = resolver.ensureHook('resolve');
            resolver
                .getHook('described-resolve')
                .tapAsync(
                    'OtelPackageImportsPlugin',
                    (request, resolveContext, callback) => {
                        const innerRequest = request.request;
                        if (!innerRequest || !innerRequest.startsWith('#')) {
                            return callback();
                        }
                        const {descriptionFileData, descriptionFileRoot} =
                            request;
                        if (!descriptionFileData?.imports?.[innerRequest]) {
                            return callback();
                        }
                        // Always use the `require` branch (browser .cjs). Webpack 4 cannot mix
                        // the OpenTelemetry .mjs graph with CJS entrypoints without parse errors.
                        const mapped = pickBrowserPlatformTarget(
                            descriptionFileData.imports[innerRequest],
                            true
                        );
                        if (!mapped) {
                            return callback();
                        }
                        const obj = Object.assign({}, request, {
                            path: descriptionFileRoot,
                            request: mapped,
                            relativePath: descriptionFileRoot,
                        });
                        resolver.doResolve(
                            target,
                            obj,
                            `package imports: ${innerRequest} -> ${mapped}`,
                            resolveContext,
                            (err, result) => {
                                if (err) return callback(err);
                                if (result === undefined)
                                    return callback(null, null);
                                callback(null, result);
                            }
                        );
                    }
                );
        },
    };
}

/** @type {import('./node_modules/@types/webpack').Configuration} */
export default {
    mode: 'development',
    entry: './src/index.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'build'),
    },
    resolve: {
        plugins: [packageImportsResolvePlugin()],
        alias: {
            // Webpack 4 doesn't support package.json exports field, so we need to manually map the browser-http subpath
            '@opentelemetry/otlp-exporter-base/browser-http':
                '@opentelemetry/otlp-exporter-base/dist/platform/browser/index.cjs',
            // Also from upstream Browser SDK
            '@opentelemetry/browser-api':
                '@opentelemetry/browser-api/dist/index.js',
            '@opentelemetry/browser-sdk/logs':
                '@opentelemetry/browser-sdk/dist/logs/index.js',
            '@opentelemetry/browser-sdk/traces':
                '@opentelemetry/browser-sdk/dist/traces/index.js',
            // And Browser Instrumentations
            ...instrAlias,
        },
    },
    module: {
        rules: [
            {
                test: /\.(?:js|mjs|cjs)$/,
                // Include OpenTelemetry ES2022 packages and web-vitals for transpilation
                exclude: /node_modules\/(?!(@opentelemetry|web-vitals))/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [['@babel/preset-env']],
                    },
                },
            },
        ],
    },
    devServer: {
        static: {
            directory: path.resolve(__dirname, 'build/'),
        },
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: 'Development',
            template: 'index.html',
        }),
    ],
};
