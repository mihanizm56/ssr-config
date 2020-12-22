/* eslint-disable import/no-extraneous-dependencies */

import webpack from 'webpack';
import nodeExternals from 'webpack-node-externals';
import { appPaths } from '../../utils/paths';
import { overrideWebpackRules } from '../../utils/override-webpack-rules';
import common, {
  isProduction,
  resolvePath,
  reStyle,
  reImage,
  commonStylesLoaders,
} from './common.config';

// eslint-disable-next-line import/no-dynamic-require, @typescript-eslint/no-var-requires, security/detect-non-literal-require
const pkg = require(appPaths.packageJson);

export default {
  ...common,

  name: 'server',
  target: 'node',

  entry: {
    server: './src/server/index.ts',
  },

  output: {
    ...common.output,
    path: appPaths.build,
    filename: '[name].js',
    chunkFilename: 'chunks/[name].js',
    libraryTarget: 'commonjs2',
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
                        // eslint-disable-next-line security/detect-unsafe-regex
                        node: pkg.engines.node.match(/(\d+\.?)+/)[0],
                      },
                      forceAllTransforms: isProduction,
                      useBuiltIns: false,
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

        // Переписываем пути для статических ассетов
        if (
          rule.loader === 'file-loader' ||
          rule.loader === 'url-loader' ||
          rule.loader === 'svg-url-loader'
        ) {
          return {
            ...rule,
            options: {
              ...rule.options,
              emitFile: false,
            },
          };
        }

        return rule;
      }),
      {
        test: reStyle,
        rules: [
          {
            include: appPaths.src,
            exclude: resolvePath('node_modules'),
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: isProduction
                  ? '[hash:base64:5]'
                  : '[path]-[local]-[hash:base64:5]',
              },
              // onlyLocals: true, // TODO FIX
              importLoaders: 2,
            },
          },
          ...commonStylesLoaders,
        ],
      },
    ],
  },

  externals: [
    './chunk-manifest.json',
    './asset-manifest.json',
    nodeExternals({
      whitelist: [reStyle, reImage],
    }),
  ],

  // devtool
  ...(isProduction ? {} : { devtool: 'inline-cheap-module-source-map' }),

  plugins: [
    ...common.plugins,

    new webpack.DefinePlugin({
      'process.env.BROWSER': false,
      __SERVER__: true,
      __CLIENT__: false,
    }),

    // Добавляем "баннер" для каждого собранного чанка
    // https://webpack.js.org/plugins/banner-plugin/
    ...(isProduction
      ? [
          new webpack.BannerPlugin({
            banner: 'require("source-map-support").install();',
            raw: true,
            entryOnly: false,
          }),
        ]
      : []),
  ],

  node: {
    console: false,
    global: false,
    process: false,
    Buffer: false,
    __filename: false,
    __dirname: false,
  },
};
