<<<<<<< HEAD
const API_URL = process.env.REACT_APP_API_URL || 'https://gold-v00p.onrender.com';

export const getApiUrl = () => {
    return API_URL.replace(/\/+$/, '');
=======
const config = {
    API_URL: process.env.REACT_APP_API_URL || 
        (process.env.NODE_ENV === 'production' 
            ? 'https://gold-1.onrender.com'
            : 'http://localhost:8000')
>>>>>>> temp-deploy
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
