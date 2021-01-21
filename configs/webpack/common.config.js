/* eslint-disable import/no-extraneous-dependencies */

import path from 'path';
import webpack from 'webpack';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { appPaths, packagePaths } from '../../utils/paths';
import { resolvePath } from '../../utils/resolve-path';
import { getCacheAndThreadLoaderConfig } from './utils/get-thread-and-cache-loader';

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
      !isNode &&
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

export const getStyleLoadersConfig = (isNode) => [
  {
    test: reCssRegex,
    exclude: reCssModuleRegex,
    rules: [
      !isNode &&
        !isProduction && {
          loader: 'css-hot-loader',
          options: { cssModule: true, reloadAll: true },
        },
      !isNode && { use: MiniCssExtractPlugin.loader },
      !isProduction && { loader: 'cache-loader' },
      {
        loader: 'css-loader',
        options: {
          importLoaders: 1,
          sourceMap: !isProduction,
          onlyLocals: isNode,
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
    ].filter(Boolean),
  },
  {
    test: reCssModuleRegex,
    rules: [
      !isNode &&
        !isProduction && {
          loader: 'css-hot-loader',
          options: { cssModule: true, reloadAll: true },
        },
      !isNode && { use: MiniCssExtractPlugin.loader },
      !isProduction && { loader: 'cache-loader' },
      {
        loader: 'css-loader',
        options: {
          modules: {
            localIdentName: '[local]-[hash:base64:10]',
          },
          importLoaders: 1,
          sourceMap: !isProduction,
          onlyLocals: isNode,
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
    ].filter(Boolean),
  },
  {
    test: reSassAllRegex,
    rules: [
      !isNode &&
        !isProduction && {
          loader: 'css-hot-loader',
          options: { cssModule: true, reloadAll: true },
        },
      !isNode && { use: MiniCssExtractPlugin.loader },
      !isProduction && { loader: 'cache-loader' },
      {
        loader: 'css-loader',
        options: {
          modules: {
            localIdentName: '[local]-[hash:base64:10]',
          },
          importLoaders: 2,
          sourceMap: !isProduction,
          onlyLocals: isNode,
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
];

export default {
  context: appPaths.root,

  mode: isProduction ? 'production' : 'development',

  output: {
    publicPath: STATIC_PATH,
    devtoolModuleFilenameTemplate: (info) =>
      path.resolve(info.absoluteResourcePath).replace(/\\/g, '/'),
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
                  !isProduction && { loader: 'cache-loader' },
                  {
                    loader: 'svg-url-loader',
                    options: {
                      name: staticAssetName,
                      limit: 4096, // 4kb
                    },
                  },
                ].filter(Boolean),
              },

              // Инлайним маловесные изображения как Base64 закодированные строки
              {
                use: [
                  !isProduction && { loader: 'cache-loader' },
                  {
                    loader: 'url-loader',
                    options: {
                      name: staticAssetName,
                      limit: 4096, // 4kb
                    },
                  },
                ].filter(Boolean),
              },
            ],
          },

          // Или возвращем URL на ресурс
          {
            use: [
              !isProduction && { loader: 'cache-loader' },
              {
                loader: 'file-loader',
                options: {
                  name: staticAssetName,
                },
              },
            ].filter(Boolean),
          },
        ],
      },

      // Конвертирование TXT в модуль
      {
        test: /\.txt$/,
        use: [
          !isProduction && { loader: 'cache-loader' },
          { loader: 'raw-loader' },
        ].filter(Boolean),
      },

      {
        test: /\.(ttf|woff2|woff)/,
        use: [
          !isProduction && { loader: 'cache-loader' },
          { loader: 'file-loader' },
        ].filter(Boolean),
      },

      // Для всего остального возвращаем URL
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
          ...getCacheAndThreadLoaderConfig(isProduction),
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

    new ForkTsCheckerWebpackPlugin({
      async: true,
    }),
  ],
};
