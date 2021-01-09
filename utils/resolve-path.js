import path from 'path';
import { appPaths } from './paths';

export const resolvePath = (...args) => path.resolve(appPaths.root, ...args);
