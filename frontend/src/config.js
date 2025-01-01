const BACKEND_URL = 'https://gold-1.onrender.com/api/v1';

const config = {
    development: {
        apiUrl: 'http://localhost:8000/api/v1'
    },
    production: {
        apiUrl: BACKEND_URL
    }
};

const env = process.env.NODE_ENV || 'development';
console.log('Current environment:', env);
console.log('API URL:', config[env].apiUrl);

export const apiConfig = config[env];
