const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse request headers
app.use((req, res, next) => {
    const host = req.headers.host;
    req.subdomain = host.split('.')[0];
    next();
});

// Main handler for all routes
app.get('*', async (req, res) => {
    try {
        // Extract subdomain and reconstruct the original URL
        const subdomain = req.subdomain;
        const path = req.url;
        const originalUrl = `https://www.${subdomain}.com${path}`;

        console.log('Attempting to fetch:', originalUrl);
        console.log('Headers:', req.headers);

        // Fetch content with spoofed headers
        const response = await axios.get(originalUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 10000
        });

        console.log('Response status:', response.status);

        // Parse HTML with Cheerio
        const $ = cheerio.load(response.data);

        // Remove common paywall elements (customize based on target sites)
        $('.paywall, .subscription-required, .modal, .fade').remove();
        $('[class*="paywall"], [class*="subscribe"], [id*="paywall"]').remove();

        // Send modified content
        res.setHeader('Content-Type', 'text/html');
        res.send($.html());

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send(`
            <html>
                <body>
                    <h1>Error</h1>
                    <p>Unable to fetch the requested page. Error: ${error.message}</p>
                </body>
            </html>
        `);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 