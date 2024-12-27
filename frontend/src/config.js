const config = {
  API_BASE_URL: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5000'
    : 'https://gold-l1xp.onrender.com'
};

export default config;
