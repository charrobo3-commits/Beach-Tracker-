require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL in environment. Set it in .env or your shell.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter?data=[out:json];node["natural"="beach"](36.8,-9.6,42.2,-6.2);out;';

async function fetchBeaches() {
  const response = await axios.get(OVERPASS_URL, { responseType: 'json' });
  return response.data.elements || [];
}

async function seed() {
  const data = await fetchBeaches();

  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE TABLE IF NOT EXISTS beaches (
      id SERIAL PRIMARY KEY,
      osm_id BIGINT UNIQUE,
      name TEXT,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      location GEOGRAPHY(Point, 4326),
      ipma_id TEXT,
      ih_station TEXT,
      water_quality TEXT,
      water_quality_updated DATE
    );
  `);

  for (const node of data) {
    if (!node.tags?.name) continue;

    await pool.query(`
      INSERT INTO beaches (osm_id, name, lat, lng, location)
      VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($4, $3), 4326))
      ON CONFLICT (osm_id) DO NOTHING;
    `, [node.id, node.tags.name, node.lat, node.lon]);
  }

  console.log('Beaches seeded.');
  await pool.end();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
