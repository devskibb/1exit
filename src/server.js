const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware to parse request headers
app.use((req, res, next) => {
    const host = req.headers.host || '';
    console.log('Incoming host:', host); // Debug log

    // Extract subdomain more reliably
    let subdomain;
    if (host.includes('onrender.com')) {
        subdomain = host.split('.onrender.com')[0].split('-')[0];
    } else if (host.includes('1exit.xyz')) {
        subdomain = host.split('.1exit.xyz')[0];
    } else if (host.includes('localhost')) {
        subdomain = host.split('.localhost')[0];
    }

    console.log('Extracted subdomain:', subdomain); // Debug log
    req.subdomain = subdomain;
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.send('OK');
});

// Main handler for all routes
app.get('*', async (req, res) => {
    try {
        const pathParts = req.path.split('/').filter(part => part);
        if (pathParts.length < 1) {
            return res.status(400).send('Invalid URL format');
        }

        const siteName = pathParts[0];
        const remainingPath = '/' + pathParts.slice(1).join('/');
        const originalUrl = `https://www.${siteName}.com${remainingPath}`;

        console.log('Attempting to fetch:', originalUrl);

        // Customize headers based on the site
        let headers = {
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };

        // Add specific headers for WSJ
        if (siteName === 'wsj') {
            headers = {
                ...headers,
                'Referer': 'https://www.google.com/',
                'From': 'googlebot(at)googlebot.com',
                'Host': 'www.wsj.com',
                'Cache-Control': 'no-cache',
                'X-Forwarded-For': '66.249.66.1'  // Googlebot IP
            };
        }

        const response = await axios.get(originalUrl, {
            headers,
            timeout: 10000
        });

        console.log('Response status:', response.status);

        // Parse HTML with Cheerio
        const $ = cheerio.load(response.data);

        // Remove common paywall elements
        $('.paywall, .subscription-required, .modal, .fade').remove();
        $('[class*="paywall"], [class*="subscribe"], [id*="paywall"]').remove();

        // WSJ specific removals
        if (siteName === 'wsj') {
            $('.wsj-snippet-login').remove();
            $('.snippet-promotion').remove();
            $('.article-access-level-label').remove();
            $('[data-module-id="3"]').remove();
        }

        // Send modified content
        res.setHeader('Content-Type', 'text/html');
        res.send($.html());

    } catch (error) {
        console.error('Error details:', error.response?.status, error.response?.statusText);
        res.status(500).send(`
            <html>
                <body>
                    <h1>Error</h1>
                    <p>Unable to fetch the requested page. Error: ${error.message}</p>
                    <p>Status: ${error.response?.status}</p>
                    <p>Attempted URL: ${req.headers.host}${req.url}</p>
                </body>
            </html>
        `);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 