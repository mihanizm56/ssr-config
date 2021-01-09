/* eslint-disable import/no-extraneous-dependencies */

import path from 'path';
import webpack from 'webpack';
import ActionsLoaderConfig from '@mihanizm56/webpack-magic-redux-modules/lib/loader-config';
import { appPaths } from '../../utils/paths';

export const resolvePath = (...args) => path.resolve(appPaths.root, ...args);

const STATIC_PATH = '/static/assets/';

export const isProduction = !process.argv.includes('--develop');
export const isVerbose = process.argv.includes('--verbose');
export const isAnalyze = process.argv.includes('--analyse');

export const reJavaScript = /\.(js)$/;
export const reTypeScript = /\.(ts|tsx)$/;
export const reStyle = /(\.module)?\.(css|scss|sass)$/;
export const reImage = /\.(gif|jpg|jpeg|png|svg)$/;
const staticAssetName = '[name].[hash:8].[ext]';

// export const commonStylesLoaders = [
//   {
//     loader: 'postcss-loader',
//     options: {
//       sourceMap: true,
//       config: {
//         path: `${packagePaths.configs}/postcss.config.js`,
//       },
//     },
//   },
//   {
//     loader: 'sass-loader',
//     options: { sourceMap: true },
//   },
// ];

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
            issuer: reStyle,
            oneOf: [
              // Инлайним маловесные SVGs как UTF-8 закодированные строки
              {
                test: /\.svg$/,
                loader: 'svg-url-loader',
                options: {
                  name: staticAssetName,
                  limit: 4096, // 4kb
                },
              },

              // Инлайним маловесные изображения как Base64 закодированные строки
              {
                loader: 'url-loader',
                options: {
                  name: staticAssetName,
                  limit: 4096, // 4kb
                },
              },
            ],
          },

          // Или возвращем URL на ресурс
          {
            loader: 'file-loader',
            options: {
              name: staticAssetName,
            },
          },
        ],
      },

      // Конвертирование TXT в модуль
      {
        test: /\.txt$/,
        loader: 'raw-loader',
      },

      // Для всего основного возвращаем URL
      // НЕ ЗАБЫТЬ обновить `exclude` при добавлении нового модуля
      {
        exclude: [
          reJavaScript,
          reTypeScript,
          reStyle,
          reImage,
          /\.json$/,
          /\.txt$/,
          /\.md$/,
          /\.ejs$/,
          /\.woff2/,
          /\.woff/,
        ],
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

      ActionsLoaderConfig(),
    ].filter(Boolean),
  },

  bail: isProduction,

  cache: !isProduction,

  stats: {
    cached: isVerbose,
    cachedAssets: isVerbose,
    chunks: isVerbose,
    chunkModules: isVerbose,
    colors: true,
    hash: isVerbose,
    modules: isVerbose,
    reasons: !isProduction,
    timings: true,
    version: isVerbose,
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
