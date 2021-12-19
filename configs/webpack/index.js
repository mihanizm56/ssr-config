import clientConfig from './client.config';
import serverConfig from './server.config';

export default [clientConfig, serverConfig];

export {
  getCacheAndThreadLoaderConfig,
} from './utils/get-thread-and-cache-loader';
