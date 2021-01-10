/* eslint-disable import/no-extraneous-dependencies */

import path from 'path';
import os from 'os';
import webpack from 'webpack';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import { appPaths } from '../../utils/paths';
import { resolvePath } from '../../utils/resolve-path';

export const getIsProduction = () => process.env.NODE_ENV === 'production';
const isProduction = getIsProduction();
export const isAnalyze = process.env.ANALYZE === 'true';
// eslint-disable-next-line import/no-dynamic-require, @typescript-eslint/no-var-requires, security/detect-non-literal-require
const pkg = require(appPaths.packageJson);

export const reScripts = /\.(js|jsx|ts|tsx)$/;
export const reImage = /\.(gif|jpg|jpeg|png|svg)$/;

// style files regexes
export const reCssRegex = /\.css$/;
export const reCssModuleRegex = /\.module\.css$/;
export const reSassAllRegex = /(\.module)?\.(scss|sass)$/;
export const reAllStyles = /(\.module)?\.(css|scss|sass)$/;

const staticAssetName = '[name].[hash:8].[ext]';
const STATIC_PATH = '/static/assets/';

export const getCacheAndThreadLoaderConfig = () => [
  { loader: 'cache-loader' },
  {
    loader: 'thread-loader',
    options: {
      workers: os.cpus().length - 1,
      poolRespawn: false,
      workerParallelJobs: 50,
      poolParallelJobs: 200,
    },
  },
];

export const getBabelLoaderConfig = (isNode) => ({
  loader: 'babel-loader',
  options: {
    cacheDirectory: true,
    cacheCompression: false,
    compact: isProduction,
    plugins: [
      '@babel/plugin-proposal-class-properties',
      '@babel/plugin-syntax-dynamic-import',
      '@babel/plugin-transform-exponentiation-operator',
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-proposal-nullish-coalescing-operator',
      // https://github.com/babel/babel/tree/master/packages/babel-plugin-transform-react-constant-elements
      isProduction && '@babel/plugin-transform-react-inline-elements',
      isNode &&
        isProduction &&
        '@babel/plugin-transform-react-constant-elements',
    ].filter(Boolean),
    presets: [
      isNode
        ? '@babel/preset-env'
        : [
            '@babel/preset-env',
            {
              modules: false,
              corejs: 3,
              targets: {
                browsers: pkg.browserslist,
              },
              forceAllTransforms: isProduction,
              useBuiltIns: 'entry',
              // Exclude transforms that make all code slower
              exclude: ['transform-typeof-symbol'],
            },
          ],
      '@babel/preset-react',
      '@babel/preset-typescript',
    ],
  },
});

export default {
  context: appPaths.root,

  mode: isProduction ? 'production' : 'development',
  // mode: 'development',

  devtool: isProduction ? false : 'inline-cheap-module-source-map',

  output: {
    publicPath: STATIC_PATH,
    devtoolModuleFilenameTemplate: (info) =>
      path.resolve(info.absoluteResourcePath).replace(/\\/g, '/'),
  },

  resolve: {
    // Нужно синхронизировать с .eslintrc
    alias: {
      '@': appPaths.src,
    },
    modules: ['node_modules'],
    extensions: ['.ts', '.tsx', '.js', '.json'],
  },

  module: {
    // Делаем несуществующие импорты ошибками а не ворнингами
    strictExportPresence: true,

    rules: [
      {
        test: reImage,
        oneOf: [
          // Инлайним маловесные изображения в CSS
          {
            issuer: reAllStyles,
            oneOf: [
              // Инлайним маловесные SVGs как UTF-8 закодированные строки
              {
                test: /\.svg$/,

                use: [
                  { loader: 'cache-loader' },
                  {
                    loader: 'svg-url-loader',
                    options: {
                      name: staticAssetName,
                      limit: 4096, // 4kb
                    },
                  },
                ],
              },

              // Инлайним маловесные изображения как Base64 закодированные строки
              {
                use: [
                  { loader: 'cache-loader' },
                  {
                    loader: 'url-loader',
                    options: {
                      name: staticAssetName,
                      limit: 4096, // 4kb
                    },
                  },
                ],
              },
            ],
          },

          // Или возвращем URL на ресурс
          {
            use: [
              ...getCacheAndThreadLoaderConfig(),
              {
                loader: 'file-loader',
                options: {
                  name: staticAssetName,
                },
              },
            ],
          },
        ],
      },

      // Конвертирование TXT в модуль
      {
        test: /\.txt$/,
        use: [{ loader: 'cache-loader' }, { loader: 'raw-loader' }],
      },

      // Для всего основного возвращаем URL
      // НЕ ЗАБЫТЬ обновить `exclude` при добавлении нового модуля
      {
        exclude: [
          reScripts,
          reAllStyles,
          reImage,
          /\.json$/,
          /\.txt$/,
          /\.md$/,
          /\.ejs$/,
          /\.woff2/,
          /\.woff/,
        ],
        use: [
          ...getCacheAndThreadLoaderConfig(),
          {
            loader: 'file-loader',
            options: {
              name: staticAssetName,
            },
          },
        ],
      },

      // Исключение dev модулей при production сборке
      isProduction && {
        test: resolvePath('node_modules/react-deep-force-update/lib/index.js'),
        loader: 'null-loader',
      },

      {
        test: /\.[jt]s$/,
        exclude: /node_modules/,
        use: [
          ...getCacheAndThreadLoaderConfig(),
          {
            loader: '@mihanizm56/webpack-magic-redux-modules',
          },
        ],
      },
    ].filter(Boolean),
  },

  bail: isProduction,

  cache: !isProduction,

  stats: {
    cached: false,
    cachedAssets: false,
    chunks: false,
    chunkModules: false,
    colors: true,
    hash: false,
    modules: false,
    reasons: !isProduction,
    timings: true,
    version: false,
    // Скрываем ворнинги для mini-css-extract-plugin warnings о конфликтах в порядке стилей
    warningsFilter: (warning) =>
      /Conflicting order. Following module has been added/gm.test(warning),
    // Скрываем логи дочерних плагинов
    children: false,
  },

  plugins: [
    new webpack.DefinePlugin({
      __DEV__: !isProduction,
      __TEST__: false,
    }),

    !isProduction &&
      new ForkTsCheckerWebpackPlugin({
        async: false,
      }),
  ],
};
