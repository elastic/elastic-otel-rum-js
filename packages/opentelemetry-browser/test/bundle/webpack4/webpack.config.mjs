import {fileURLToPath} from 'url';
import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Subpaths of `@opentelemetry/browser-instrumentation/experimental/*`
const INSTRUMENTATIONS = [
    'errors',
    'fetch',
    'navigation',
    'navigation-timing',
    'resource-timing',
    'user-action',
    'web-vitals',
    'xhr',
];

/** @type {import('./node_modules/@types/webpack').Configuration} */
export default {
    mode: 'development',
    entry: './src/index.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'build'),
    },
    resolve: {
        alias: {
            // Webpack 4 doesn't support package.json exports field, so we need to manually map subpaths
            '@opentelemetry/otlp-exporter-base/browser-http':
                '@opentelemetry/otlp-exporter-base/build/esm/index-browser-http.js',
            '@opentelemetry/browser-sdk/logs':
                '@opentelemetry/browser-sdk/dist/logs/index.js',
            '@opentelemetry/browser-sdk/traces':
                '@opentelemetry/browser-sdk/dist/traces/index.js',
            ...Object.fromEntries(
                INSTRUMENTATIONS.map((name) => [
                    `@opentelemetry/browser-instrumentation/experimental/${name}`,
                    `@opentelemetry/browser-instrumentation/dist/${name}/index.js`,
                ])
            ),
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
