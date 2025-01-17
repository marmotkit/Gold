export const API_URL = 'https://gold-v00p.onrender.com';

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
