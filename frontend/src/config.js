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

export const API_URL = config[environment].API_URL;
console.log('API URL:', API_URL);

export const getApiUrl = () => {
    return API_URL.replace(/\/+$/, '');
};

export const buildApiUrl = (path) => {
    const baseUrl = getApiUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
};

export default {
    API_URL: getApiUrl(),
    buildApiUrl
};
