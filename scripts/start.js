/* eslint-disable import/no-extraneous-dependencies */

import 'colors';

import express from 'express';
import webpack from 'webpack';
import browserSync from 'browser-sync';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import webpackConfig from '../configs/webpack';
import { appPaths } from '../utils/paths';
import { copyDir } from '../utils/fs';
import run from './run';
import clean from './clean';
import { getInjectedConfig } from './get-injected-config';
import { createCompilation } from './utils/create-compilation';
import { enrichClientConfig } from './utils/enrich-client-config';
import { enrichServerConfig } from './utils/enrich-server-config';
import { showStatsErrors } from './utils/show-stats-errors';

const openBrowser = process.env.BROWSER !== 'none';
const PORT = process.env.PORT || 3000;

const start = async () => {
  const server = express();

  const webpackResultConfig = await getInjectedConfig(webpackConfig);

  // clean build dir
  await run(clean);
  // copy static invscode-file://vscode-app/usr/share/code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.htmlto build dir
  await copyDir(appPaths.public, `${appPaths.root}/build/static`);

  // Configure client-side hot module replacement
  const clientConfig = webpackResultConfig.find(
    config => config.name === 'client',
  );
  const serverConfig = webpackResultConfig.find(
    config => config.name === 'server',
  );

  enrichClientConfig(clientConfig);
  enrichServerConfig(serverConfig);

  const webpackResultCompiler = webpack([clientConfig, serverConfig]);

  const clientCompiler = webpackResultCompiler.compilers.find(
    compiler => compiler.name === 'client',
  );
  const serverCompiler = webpackResultCompiler.compilers.find(
    compiler => compiler.name === 'server',
  );

  const clientCompilation = createCompilation('client', clientCompiler);
  const serverCompilation = createCompilation('server', serverCompiler);

  server.use(
    webpackDevMiddleware(clientCompiler, {
      publicPath: clientConfig.output.publicPath,
      stats: 'errors-only',
    }),
  );

  server.use(webpackHotMiddleware(clientCompiler, { log: false }));

  let appPromise;
  let appPromiseResolve;
  let app;
  let appPromiseIsResolved = true;

  serverCompiler.hooks.compile.tap('server', () => {
    if (!appPromiseIsResolved) {
      return;
    }

    appPromiseIsResolved = false;
    // eslint-disable-next-line no-return-assign
    appPromise = new Promise(resolve => {
      appPromiseResolve = resolve;
    });
  });

  function checkForUpdate(fromUpdate) {
    // Очищаем консоль перед перезапуском
    console.clear();
    const hmrPrefix = '[\x1b[35mHMR\x1b[0m]';

    if (!app.hot) {
      console.log(`${hmrPrefix} ${'Hot Module Replacement is disabled'.red}`);

      return;
    }

    if (app.hot.status() !== 'idle') {
      return Promise.resolve();
    }

    return app.hot
      .check(true)
      .then(updatedModules => {
        if (!updatedModules) {
          if (fromUpdate) {
            console.log(`${hmrPrefix} ${'Update applied'.green}`);
          }

          return;
        }
        if (updatedModules.length === 0) {
          console.log(`${hmrPrefix} ${'Nothing hot updated'.yellow}`);

          return;
        }

        console.log(`${hmrPrefix} ${'Updated modules:'.green}`);
        updatedModules.forEach(moduleId => {
          console.log(`${hmrPrefix} - ${`${moduleId}`.green}`);
        });

        checkForUpdate(true);
      })
      .catch(async error => {
        if (['abort', 'fail'].includes(app.hot.status())) {
          console.log(`${hmrPrefix} ${'Cannot apply update'.yellow.underline}`);
          console.log(`reason: ${app.hot.status()}`.red);

          // Удаление server.js из require.cache
          delete require.cache[require.resolve(`${appPaths.build}/server`)];

          // Удаление чанков из require.cache
          Object.keys(require.cache).forEach(filename => {
            if (
              /.*\/build\/chunks\/[^/]+/.test(filename) ||
              /.*\\build\\chunks\\[^\\]+/.test(filename)
            ) {
              delete require.cache[filename];
            }
          });

          // переустанавливаем сервер нашего приложения в переменную
          // eslint-disable-next-line global-require, import/no-unresolved, import/no-dynamic-require, security/detect-non-literal-require
          app = (await require(`${appPaths.build}/server`)).default;
          console.log(`${hmrPrefix} ${'App has been reloaded'.green}`);
        } else {
          console.log(`${hmrPrefix} ${'Update failed'.red}`);
          console.log(`${error.stack || error.message}`.red);
        }
      });
  }

  // https://webpack.js.org/configuration/watch/#watchoptions
  // подписываемся на обновление файлов вебпака
  serverCompiler.watch(
    {
      aggregateTimeout: 1000,
    },
    async (error, stats) => {
      const isError = !app || error || stats.hasErrors();

      // начальный старт еще не имеет собранного сервера app
      if (!app) {
        return;
      }

      // вывод ошибок
      if (isError) {
        if (error) {
          console.log(`${error}`.red);
        } else {
          showStatsErrors(stats);
        }

        return;
      }

      // вызываем функцию обновления hmr
      await checkForUpdate();

      // завершаем сборку
      appPromiseIsResolved = true;
      appPromiseResolve();
    },
  );

  // Ждем пока оба промиса сборки зарезолвятся
  await clientCompilation;
  await serverCompilation;

  // записываем серверную часть в переменную app
  // eslint-disable-next-line global-require, import/no-unresolved, import/no-dynamic-require, security/detect-non-literal-require
  const appServer = await require(`${appPaths.build}/server`);

  const setupProxy = appServer.setupProxy;

  // запуск сервера статики public папки
  server.use('/static', express.static(appPaths.publicInBuild));

  // запуск setupProxy перед основным сервером
  if (setupProxy) {
    setupProxy(server);
  }

  // передаём траффик с девсервера вебпака на наш
  server.use(async (req, res) => {
    try {
      await appPromise;

      app(req, res, server);
    } catch (error) {
      console.log(`${error}`.red);
    }
  });

  app = appServer.default;

  // завершаем сборку
  appPromiseIsResolved = true;
  appPromiseResolve();

  // Запуск dev сервера с browsersync и HMR
  browserSync.create().init(
    {
      // https://www.browsersync.io/docs/options
      server: true,
      middleware: [server],
      open: openBrowser,
      notify: false,
      ui: false,
      port: PORT,
    },
    error => {
      if (error) {
        throw new Error('Browsersync error', error);
      }
    },
  );
};

export default start;
