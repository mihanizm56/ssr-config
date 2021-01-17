/* eslint-disable import/no-dynamic-require */
/* eslint-disable security/detect-non-literal-require */
/* eslint-disable global-require */
import { appPaths, resolveApp } from '../utils/paths';

export const getInjectedConfig = async (config) => {
  const pkg = require(appPaths.packageJson);
  const extraPathForAdditionalConfig =
    pkg['config-overrides-path'] || './config-overrides.js';

  try {
    const overridesConfigFunction = require(resolveApp(
      extraPathForAdditionalConfig,
    ));

    if (
      !overridesConfigFunction &&
      typeof overridesConfigFunction === 'function'
    ) {
      return config;
    }

    return overridesConfigFunction(config);
  } catch {
    return config;
  }
};
