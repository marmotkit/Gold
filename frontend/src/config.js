const config = {
    API_URL: process.env.NODE_ENV === 'production'
        ? 'https://gold-v00p.onrender.com'
        : 'http://localhost:8000'
};

console.log('Current environment:', process.env.NODE_ENV);
console.log('API URL:', config.API_URL);

export default config;
