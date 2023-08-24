/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable import/no-extraneous-dependencies */

import 'colors';

import fs from 'fs';
import webpack from 'webpack';
import WebpackAssetsManifest from 'webpack-assets-manifest';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import { EsbuildPlugin } from 'esbuild-loader';
import WebpackBar from 'webpackbar';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import lightningcss from 'lightningcss';
import browserslist from 'browserslist';
import { appPaths } from '../../utils/paths';
import { overrideWebpackRules } from '../../utils/override-webpack-rules';
import common, {
  getIsProduction,
  isAnalyze,
  getStyleLoadersConfig,
  disabledProgress,
  getMainEsbuildLoaders,
  ESBUILD_JS_VERSION,
} from './common.config';
import { makeChunkManifest } from './utils/make-chunk-manifest';

const isProduction = getIsProduction();

export const browserslistConfig =
  // eslint-disable-next-line global-require, security/detect-non-literal-require, import/no-dynamic-require
  require(appPaths.packageJson).browserslist || 'last 3 versions';

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
    fallback: {
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
    },
  },

  module: {
    ...common.module,
    rules: [
      ...getMainEsbuildLoaders(),
      ...getStyleLoadersConfig(false),
      ...overrideWebpackRules(common.module.rules, rule => rule),
    ],
  },

  plugins: [
    ...common.plugins,

    new webpack.DefinePlugin({
      'process.env.BROWSER': true,
      __SERVER__: false,
      __CLIENT__: true,
      'process.env': JSON.stringify(process.env),
    }),

    // Создание файла манифеста с ассетами (chunk-manifest.json)
    // https://github.com/webdeveric/webpack-assets-manifest#options
    new WebpackAssetsManifest({
      output: `${appPaths.build}/asset-manifest.json`,
      publicPath: true,
      writeToDisk: true,
      done: (manifest, stats) => {
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
      new EsbuildPlugin({
        target: ESBUILD_JS_VERSION,
      }),
      // lightningcss fast and effective minifier
      new CssMinimizerPlugin({
        minify: CssMinimizerPlugin.lightningCssMinify,
        minimizerOptions: {
          targets: lightningcss.browserslistToTargets(
            browserslist(browserslistConfig),
          ),
        },
      }),
    ],
    runtimeChunk: {
      name: entrypoint => `runtime-${entrypoint.name}`,
    },
    // Создание общих чанков с переиспользуемым функционалом
    splitChunks: {
      // It's recommended to use either the defaults or optimization.splitChunks: { chunks: 'all' }.
      // https://webpack.js.org/migrate/5/
      chunks: 'all',
    },
  },
};
