const config = {
    development: {
        API_URL: 'http://localhost:8000'
    },
    production: {
        API_URL: 'https://gold-v00p.onrender.com'
    }
};

const environment = process.env.NODE_ENV || 'development';
console.log('Current environment:', environment);

const API_URL = config[environment].API_URL;
console.log('API URL:', API_URL);

export const buildApiUrl = (path) => {
    const baseUrl = config[environment].API_URL;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`.replace(/([^:]\/)\/+/g, '$1');
};

export default config[environment];
