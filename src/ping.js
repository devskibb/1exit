const axios = require('axios');

const RENDER_URL = 'https://1exit.onrender.com/health';

// Ping every 14 minutes
setInterval(async () => {
    try {
        await axios.get(RENDER_URL);
        console.log('Ping successful');
    } catch (error) {
        console.error('Ping failed:', error.message);
    }
}, 14 * 60 * 1000); 