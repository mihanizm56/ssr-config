/* eslint-disable import/no-dynamic-require */
/* eslint-disable security/detect-non-literal-require */
/* eslint-disable global-require */
import { appPaths } from '../utils/paths';
import { readFile } from '../utils/fs';

export const getInjectedConfig = async () => {
  const pkg = require(appPaths.packageJson);
  const extraPathForAdditionalConfig = pkg['config-overrides-path'];

  if (extraPathForAdditionalConfig) {
    console.log(
      'detect extraPathForAdditionalConfig',
      extraPathForAdditionalConfig,
    );
    const configFile = require(extraPathForAdditionalConfig);

    return configFile;
  }

  const additionalConfigExists = await readFile(appPaths.configOverrides).catch(
    () => null,
  );

  if (Boolean(additionalConfigExists)) {
    console.log('detect additionalConfigExists', additionalConfigExists);

    const configFile = require(appPaths.configOverrides);

    return configFile;
  }

  return [];
};
