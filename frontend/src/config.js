const config = {
    API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000'
};

// 確保 API_URL 以斜線結尾
if (config.API_URL) {
    config.API_URL = config.API_URL.replace(/\/+$/, '') + '/';
}

console.log('API URL:', config.API_URL);
export default config;
