const API_URL = process.env.REACT_APP_API_URL || 'https://gold-v00p.onrender.com';

// 確保 URL 格式正確
export const getApiUrl = () => {
    const url = API_URL.replace(/\/+$/, ''); // 移除結尾的斜線
    return url;
};

// 構建完整的 API 路徑
export const buildApiUrl = (path) => {
    const baseUrl = getApiUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
};

export default {
    API_URL: getApiUrl(),
    buildApiUrl
};
