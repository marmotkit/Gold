const config = {
    API_URL: (process.env.REACT_APP_API_URL || 
        (process.env.NODE_ENV === 'production' 
            ? 'https://gold-1.onrender.com'
            : 'http://localhost:8000')) + '/'
};

console.log('Current environment:', process.env.NODE_ENV);
console.log('API URL:', config.API_URL);

export default config;
