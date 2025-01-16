import config from '../config';

export const buildApiUrl = (path) => {
  return `${config.API_URL}${path}`;
}; 