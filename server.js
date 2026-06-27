require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL in environment. Set it in .env or your environment.');
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 3000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(express.json());

app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '../index.html');
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Failed to load app');
    const token = process.env.MAPBOX_ACCESS_TOKEN || 'YOUR_MAPBOX_ACCESS_TOKEN';
    return res.send(data.replace(/YOUR_MAPBOX_ACCESS_TOKEN/g, token));
  });
});

app.use(express.static(path.join(__dirname, '../')));

app.get('/api/beaches', async (req, res, next) => {
  try {
    const { lat, lng, radius = 50000 } = req.query;
    const query = lat && lng
      ? {
          text: `SELECT id, name, lat, lng,
                 ST_Distance(location, ST_MakePoint($2,$1)::geography) AS distance_m
               FROM beaches
               WHERE ST_DWithin(location, ST_MakePoint($2,$1)::geography, $3)
               ORDER BY distance_m ASC`,
          values: [parseFloat(lat), parseFloat(lng), parseInt(radius, 10)]
        }
      : { text: `SELECT id, name, lat, lng FROM beaches ORDER BY name ASC`, values: [] };

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
