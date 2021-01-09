/* eslint-disable import/no-extraneous-dependencies */

import fs from 'fs';
import os from 'os';
import webpack from 'webpack';
import WebpackAssetsManifest from 'webpack-assets-manifest';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import CompressionPlugin from 'compression-webpack-plugin';
import { appPaths, packagePaths } from '../../utils/paths';
import { overrideWebpackRules } from '../../utils/override-webpack-rules';
import { resolvePath } from '../../utils/resolve-path';
import common, { getIsProduction, isAnalyze, reStyle } from './common.config';

// eslint-disable-next-line import/no-dynamic-require, @typescript-eslint/no-var-requires, security/detect-non-literal-require
const pkg = require(appPaths.packageJson);
const isProduction = getIsProduction();

const brotliEnabled = process.env.BROTLI_ASSETS !== 'false';
const gzipEnabled = process.env.GZIP_ASSETS !== 'false';

const getCacheAndThreadLoaderConfig = () =>
  !isProduction
    ? ({ loader: 'cache-loader' },
      {
        loader: 'thread-loader',
        options: {
          workers: os.cpus().length - 1,
          poolRespawn: false,
          workerParallelJobs: 50,
          poolParallelJobs: 200,
        },
      })
    : {
        loader: 'thread-loader',
        options: {
          workers: os.cpus().length - 1,
          poolRespawn: false,
          workerParallelJobs: 50,
          poolParallelJobs: 200,
        },
      };

export default {
  ...common,
  name: 'client',
  target: 'web',
  entry: {
    client: './src/client/index.tsx',
  },
  output: {
    ...common.output,
    path: `${appPaths.root}/build/public/assets`,
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
      ...overrideWebpackRules(common.module.rules, (rule) => {
        // Переопределение babel-preset-env конфигурации
        if (rule.loader === 'awesome-typescript-loader') {
          return {
            ...rule,
            options: {
              ...rule.options,
              babelOptions: {
                ...rule.options.babelOptions,
                presets: [
                  [
                    '@babel/preset-env',
                    {
                      modules: false,
                      corejs: 3,
                      targets: {
                        browsers: pkg.browserslist,
                      },
                      forceAllTransforms: isProduction,
                      useBuiltIns: 'entry',
                    },
                  ],
                  ...(rule.options.babelOptions.presets
                    ? rule.options.babelOptions.presets
                    : []),
                ],
              },
            },
          };
        }

        return rule;
      }),
      {
        test: reStyle,
        rules: [
          // ...(isProduction
          //   ? []
          //   : [
          //       {
          //         loader: 'css-hot-loader',
          //         options: { cssModule: true, reloadAll: true },
          //       },
          //     ]),
          !isProduction && { loader: 'cache-loader' },
          { use: MiniCssExtractPlugin.loader },
          {
            exclude: resolvePath('node_modules'),
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[local]-[hash:base64:10]',
              },
              importLoaders: 2,
              sourceMap: !isProduction,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: !isProduction,
              config: {
                path: `${packagePaths.configs}/postcss.config.js`,
              },
            },
          },
          {
            loader: 'sass-loader',
            options: { sourceMap: true },
          },
        ].filter(Boolean),
      },
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
      customize: (entry) => {
        // You can prevent adding items to the manifest by returning false.
        if (entry.key.toLowerCase().endsWith('.map')) return false;
        return { key: entry.key, value: entry.value };
      },
      done: (manifest, stats) => {
        // Write chunk-manifest.json.json
        const chunkFileName = `${appPaths.build}/chunk-manifest.json`;
        try {
          const fileFilter = (file) => !file.endsWith('.map');
          const addPath = (file) => manifest.getPublicPath(file);
          const chunkFiles = stats.compilation.chunkGroups.reduce((acc, c) => {
            acc[c.name] = [
              ...(acc[c.name] || []),
              ...c.chunks.reduce(
                (files, cc) => [
                  ...files,
                  ...cc.files.filter(fileFilter).map(addPath),
                ],
                [],
              ),
            ];
            return acc;
          }, Object.create(null));
          fs.writeFileSync(chunkFileName, JSON.stringify(chunkFiles, null, 2));
        } catch (err) {
          console.error(`ERROR: Cannot write ${chunkFileName}: `, err);
          if (isProduction) process.exit(1);
        }
      },
    }),

    new MiniCssExtractPlugin({
      filename: isProduction ? '[name].[contenthash:8].css' : '[name].css',
      chunkFilename: isProduction
        ? '[name].[contenthash:16].chunk.css'
        : '[name].chunk.css',
    }),

    // Webpack Bundle Analyzer
    // https://github.com/th0r/webpack-bundle-analyzer
    isProduction && isAnalyze && new BundleAnalyzerPlugin(),
    isProduction &&
      brotliEnabled &&
      new CompressionPlugin({
        filename: '[path].br[query]',
        algorithm: 'brotliCompress',
        test: /\.js$|\.css$|\.json$|\.html$|\.ico$/,
        compressionOptions: {
          level: 11,
        },
      }),
    isProduction &&
      gzipEnabled &&
      new CompressionPlugin({
        filename: '[path].gz[query]',
        algorithm: 'gzip',
        test: /\.js$|\.css$|\.json$|\.html$|\.ico$/,
      }),
  ].filter(Boolean),

  optimization: {
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
