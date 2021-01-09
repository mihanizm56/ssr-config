/* eslint-disable import/no-extraneous-dependencies */

import path from 'path';
import os from 'os';
import webpack from 'webpack';
import { appPaths } from '../../utils/paths';
import { resolvePath } from '../../utils/resolve-path';

export const getIsProduction = () => process.env.NODE_ENV === 'production';
const isProduction = getIsProduction();
export const isAnalyze = process.env.ANALYZE === 'true';

export const reJavaScript = /\.(js(x)?)$/;
export const reTypeScript = /\.(ts(x)?)$/;
export const reImage = /\.(gif|jpg|jpeg|png|svg)$/;

// style files regexes
export const reCssRegex = /\.css$/;
export const reCssModuleRegex = /\.module\.css$/;
export const reSassRegex = /\.(scss|sass)$/;
export const reSassModuleRegex = /\.module\.(scss|sass)$/;
export const reAllStyles = /(\.module)?\.(css|scss|sass)$/;

const staticAssetName = '[name].[hash:8].[ext]';
const STATIC_PATH = '/static/assets/';

export const getCacheAndThreadLoaderConfig = () =>
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
  context: appPaths.root,

  mode: isProduction ? 'production' : 'development',

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
        test: reTypeScript,
        include: [appPaths.src],
        loader: 'awesome-typescript-loader',
        options: {
          reportFiles: [`${appPaths.src}/**/*.{ts,tsx}`],
          useCache: true,
          useBabel: true,
          babelOptions: {
            // https://babeljs.io/docs/usage/options/
            babelrc: false,
            configFile: false,

            plugins: [
              '@babel/plugin-proposal-class-properties',
              '@babel/plugin-syntax-dynamic-import',
              '@babel/plugin-transform-exponentiation-operator',
              // https://github.com/babel/babel/tree/master/packages/babel-plugin-transform-react-constant-elements
              isProduction && '@babel/plugin-transform-react-constant-elements',
              isProduction && '@babel/plugin-transform-react-inline-elements',
            ].filter(Boolean),
          },
          babelCore: '@babel/core',
        },
      },
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
                  getCacheAndThreadLoaderConfig(),
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
                  getCacheAndThreadLoaderConfig(),
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
              getCacheAndThreadLoaderConfig(),
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
        use: [getCacheAndThreadLoaderConfig(), { loader: 'raw-loader' }],
      },

      // Для всего основного возвращаем URL
      // НЕ ЗАБЫТЬ обновить `exclude` при добавлении нового модуля
      {
        exclude: [/\.json$/, /\.md$/, /\.ejs$/, /\.woff2/, /\.woff/],
        loader: 'file-loader',
        options: {
          name: staticAssetName,
        },
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
          getCacheAndThreadLoaderConfig(),
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
  ],
};
