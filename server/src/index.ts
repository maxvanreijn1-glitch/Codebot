import express from 'express';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, '../../client/dist');

// Serve static files from the client build
app.use(express.static(DIST_DIR));

// Handle API routes (if any)
app.get('/api/some-endpoint', (req, res) => {
    // API logic here
});

// SPA fallback route for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));  // serves index.html for all other routes
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});