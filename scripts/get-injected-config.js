/* eslint-disable import/no-dynamic-require */
/* eslint-disable security/detect-non-literal-require */
/* eslint-disable global-require */
import { appPaths, resolveApp } from '../utils/paths';

export const getInjectedConfig = async () => {
  const pkg = require(appPaths.packageJson);
  const extraPathForAdditionalConfig =
    pkg['config-overrides-path'] || './config-overrides.js';

  try {
    const overridesConfig = require(resolveApp(extraPathForAdditionalConfig));

    const client = overridesConfig.find((config) => config.name === 'client');
    const server = overridesConfig.find((config) => config.name === 'server');

    return {
      client,
      server,
    };
  } catch {
    return {
      client: {},
      server: {},
    };
  }
};
