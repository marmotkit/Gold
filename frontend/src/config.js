const config = {
    development: {
        API_URL: 'http://localhost:8000'
    },
    production: {
        API_URL: 'https://gold-1-ccpj.onrender.com'
    }
};

const environment = process.env.NODE_ENV || 'development';
console.log('Current environment:', environment);

const API_URL = config[environment].API_URL;
console.log('API URL:', API_URL);

export const buildApiUrl = (path) => `${API_URL}${path}`;
export default config[environment];
