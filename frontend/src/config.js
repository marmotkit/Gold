const API_URL = process.env.REACT_APP_API_URL || 'https://gold-v00p.onrender.com';

// 確保 URL 結尾沒有斜線
export const getApiUrl = () => {
    return API_URL.replace(/\/+$/, '');
};

export default {
    API_URL: getApiUrl()
};
