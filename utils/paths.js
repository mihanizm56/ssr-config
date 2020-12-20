/* eslint-disable import/no-extraneous-dependencies */
const fs = require('fs')
const path = require('path')

// Пути в приложении
const resolveApp = relativePath => path.resolve(process.cwd(), relativePath);

module.exports.appPaths = {
  root: resolveApp('.'),
  src: resolveApp('src'),
  build: resolveApp('build'),
  public: resolveApp('public'),
  nodeModules: resolveApp('node_modules'),
  envDefaults: resolveApp('.env.defaults'),
  packageJson: resolveApp('package.json'),
  packageLockJson: resolveApp('package-lock.json'),
  tsConfig: resolveApp('tsconfig.json'),
};

// Путь в пакете сборки
const PACKAGE_PATH = path.join(process.cwd(), 'node_modules', 'ssr-scripts')
const resolvePackage = relativePath => path.resolve(PACKAGE_PATH, relativePath);

module.exports.packagePaths = {
  root: resolvePackage('.'),
  scripts: resolvePackage('scripts'),
  configs: resolvePackage('configs'),
  utils: resolvePackage('utils'),
  nodeModules: resolvePackage('node_modules'),
  packageJson: resolvePackage('package.json'),
};