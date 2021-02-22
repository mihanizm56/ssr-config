/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable import/no-extraneous-dependencies */

import 'colors';
import fs from 'fs';
import webpack from 'webpack';
import WebpackBar from 'webpackbar';
import WebpackAssetsManifest from 'webpack-assets-manifest';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import TerserPlugin from 'terser-webpack-plugin';
import OptimizeCSSAssetsPlugin from 'optimize-css-assets-webpack-plugin';
import { appPaths } from '../../utils/paths';
import { overrideWebpackRules } from '../../utils/override-webpack-rules';
import common, {
  getIsProduction,
  isAnalyze,
  reScripts,
  getBabelLoaderConfig,
  getStyleLoadersConfig,
  disabledProgress,
} from './common.config';
import { makeChunkManifest } from './utils/make-chunk-manifest';
import { getCacheAndThreadLoaderConfig } from './utils/get-thread-and-cache-loader';

const isProduction = getIsProduction();

export default {
  ...common,
  name: 'client',
  target: 'web',
  entry: {
    client: './src/client/index.tsx',
  },
  output: {
    ...common.output,
    path: `${appPaths.root}/build/static/assets`,
    filename: isProduction ? '[name].[chunkhash:16].js' : '[name].js',
    chunkFilename: isProduction
      ? '[name].[chunkhash:16].chunk.js'
      : '[name].chunk.js',
  },
  // Webpack мутирует resolve объект, клонируем чтобы избежать этого
  // https://github.com/webpack/webpack/issues/4817
  resolve: {
    ...common.resolve,
  },

  module: {
    ...common.module,
    rules: [
      {
        test: reScripts,
        exclude: /node_modules/,
        use: [
          ...getCacheAndThreadLoaderConfig(isProduction),
          getBabelLoaderConfig(false),
        ],
      },
      ...getStyleLoadersConfig(false),

      ...overrideWebpackRules(common.module.rules, (rule) => rule),
    ],
  },

  plugins: [
    ...common.plugins,

    new webpack.DefinePlugin({
      'process.env.BROWSER': true,
      __SERVER__: false,
      __CLIENT__: true,
    }),

    // Создание файла манифеста с ассетами
    // https://github.com/webdeveric/webpack-assets-manifest#options
    new WebpackAssetsManifest({
      output: `${appPaths.build}/asset-manifest.json`,
      publicPath: true,
      writeToDisk: true,
      done: (manifest, stats) => {
        // Write chunk-manifest.json.json
        const chunkFileName = `${appPaths.build}/chunk-manifest.json`;

        try {
          const chunkFiles = makeChunkManifest({
            chunkGroups: stats.compilation.chunkGroups,
            manifest,
          });

          fs.writeFileSync(chunkFileName, JSON.stringify(chunkFiles, null, 2));
        } catch (err) {
          console.error(`ERROR: Cannot write ${chunkFileName}: `, err);
          if (isProduction) process.exit(1);
        }
      },
    }),

    new MiniCssExtractPlugin({
      ignoreOrder: true,
      filename: isProduction ? '[name].[contenthash:8].css' : '[name].css',
      chunkFilename: isProduction
        ? '[name].[contenthash:16].chunk.css'
        : '[name].chunk.css',
    }),

    !disabledProgress &&
      new WebpackBar({
        name: 'client',
        color: 'green',
      }),

    // Webpack Bundle Analyzer
    // https://github.com/th0r/webpack-bundle-analyzer
    isProduction && isAnalyze && new BundleAnalyzerPlugin(),
  ].filter(Boolean),

  optimization: {
    minimize: isProduction,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          parse: {
            // We want terser to parse ecma 8 code. However, we don't want it
            // to apply any minification steps that turns valid ecma 5 code
            // into invalid ecma 5 code. This is why the 'compress' and 'output'
            // sections only apply transformations that are ecma 5 safe
            // https://github.com/facebook/create-react-app/pull/4234
            ecma: 8,
          },
          compress: {
            ecma: 5,
            warnings: false,
            // Disabled because of an issue with Uglify breaking seemingly valid code:
            // https://github.com/facebook/create-react-app/issues/2376
            // Pending further investigation:
            // https://github.com/mishoo/UglifyJS2/issues/2011
            comparisons: false,
            // Disabled because of an issue with Terser breaking valid code:
            // https://github.com/facebook/create-react-app/issues/5250
            // Pending further investigation:
            // https://github.com/terser-js/terser/issues/120
            inline: 2,
          },
          mangle: {
            safari10: true,
          },
          output: {
            ecma: 5,
            comments: false,
            // Turned on because emoji and regex is not minified properly using default
            // https://github.com/facebook/create-react-app/issues/2488
            ascii_only: true,
          },
        },
        sourceMap: true,
      }),
      new OptimizeCSSAssetsPlugin({
        cssProcessorPluginOptions: {
          preset: [
            'default',
            {
              minifyFontValues: { removeQuotes: false },
              discardComments: {
                removeAll: true,
              },
            },
          ],
        },
      }),
    ],

    runtimeChunk: {
      name: (entrypoint) => `runtime-${entrypoint.name}`,
    },
    // Создание общих чанков с переиспользуемым функционалом
    splitChunks: {
      cacheGroups: {
        commons: {
          chunks: 'initial',
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
        },
      },
    },
  },

  // Некоторые библиотеки импортируют Node модули но не используют их в браузере
  // Подготавливаем для моки webpack
  // https://webpack.js.org/configuration/node/
  // https://github.com/webpack/node-libs-browser/tree/master/mock
  node: {
    fs: 'empty',
    net: 'empty',
    tls: 'empty',
  },
};
