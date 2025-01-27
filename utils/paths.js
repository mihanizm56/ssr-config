/* eslint-disable import/no-extraneous-dependencies */
import fs from 'fs';
import path from 'path';

const DEFAULT_APP_CWD = path.join(process.cwd(), '../', '../', '../');

const appCwd = process.env.APP_CWD || DEFAULT_APP_CWD;

// Пути в приложении
const appDirectory = fs.realpathSync(appCwd);
export const resolveApp = relativePath =>
  path.resolve(appDirectory, relativePath);

export const appPaths = {
  root: resolveApp('.'),
  src: resolveApp('src'),
  build: resolveApp('build'),
  public: resolveApp('public'),
  publicInBuild: path.join(resolveApp('build'), 'static'),
  nodeModules: resolveApp('node_modules'),
  packageJson: resolveApp('package.json'),
  packageLockJson: resolveApp('package-lock.json'),
  tsConfig: resolveApp('tsconfig.json'),
  configOverrides: resolveApp('config-overrides.js'),
};

// Путь в пакете сборки
const packageDirectory = fs.realpathSync(process.cwd());
const resolvePackage = relativePath =>
  path.resolve(packageDirectory, relativePath);

export const packagePaths = {
  root: resolvePackage('.'),
  scripts: resolvePackage('scripts'),
  configs: resolvePackage('configs'),
  utils: resolvePackage('utils'),
  nodeModules: resolvePackage('node_modules'),
  packageJson: resolvePackage('package.json'),
};
