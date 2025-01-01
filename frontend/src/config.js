const config = {
    development: {
        apiUrl: 'http://localhost:8000/api/v1'
    },
    production: {
        apiUrl: process.env.REACT_APP_API_URL || 'https://your-production-api-url/api/v1'
    }
};

const env = process.env.NODE_ENV || 'development';
export const apiConfig = config[env];
