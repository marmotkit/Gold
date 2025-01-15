const config = {
    API_URL: (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/$/, '')
};

console.log('API URL:', config.API_URL);
export default config;
