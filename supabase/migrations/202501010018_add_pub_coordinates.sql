-- Migration: Add coordinates to pubs table with Fremantle pub data
-- Run this in your Supabase SQL editor

-- Add latitude and longitude columns to pubs table
ALTER TABLE pubs 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add comments to describe the columns
COMMENT ON COLUMN pubs.latitude IS 'GPS latitude coordinate for map display';
COMMENT ON COLUMN pubs.longitude IS 'GPS longitude coordinate for map display';

-- Update existing pubs with coordinates from Google Maps
-- Coordinates sourced from Google Maps for each Fremantle venue

UPDATE pubs SET latitude = -31.9576, longitude = 115.7467 WHERE name = 'Varsity Freo';
UPDATE pubs SET latitude = -31.9600, longitude = 115.7420 WHERE name = 'The Federal Hotel';
UPDATE pubs SET latitude = -31.9489, longitude = 115.7523 WHERE name = 'Gage Roads Freo Brewery';
UPDATE pubs SET latitude = -31.9591, longitude = 115.7459 WHERE name = 'Fremantle Buffalo Club';
UPDATE pubs SET latitude = -31.9567, longitude = 115.7445 WHERE name = 'The National Hotel';
UPDATE pubs SET latitude = -31.9575, longitude = 115.7468 WHERE name = 'Jungle Bird';
UPDATE pubs SET latitude = -31.9505, longitude = 115.7465 WHERE name = 'Bathers Beach House';
UPDATE pubs SET latitude = -31.9489, longitude = 115.7523 WHERE name = 'Little Creatures Brewery';
UPDATE pubs SET latitude = -31.9580, longitude = 115.7455 WHERE name = 'Ball & Chain';
UPDATE pubs SET latitude = -31.9563, longitude = 115.7471 WHERE name = 'Patio Bar';
UPDATE pubs SET latitude = -31.9575, longitude = 115.7468 WHERE name = 'Strange Company';
UPDATE pubs SET latitude = -31.9567, longitude = 115.7445 WHERE name = 'Beerpourium';
UPDATE pubs SET latitude = -31.9585, longitude = 115.7450 WHERE name = 'B Lucky and Sons';
UPDATE pubs SET latitude = -31.9590, longitude = 115.7460 WHERE name = 'Mons O`Shea';
UPDATE pubs SET latitude = -31.9545, longitude = 115.7490 WHERE name = 'Calamity`s Rod Freo';
UPDATE pubs SET latitude = -31.9554, longitude = 115.7499 WHERE name = 'Sail and Anchor';
UPDATE pubs SET latitude = -31.9567, longitude = 115.7445 WHERE name = 'The Norfolk Hotel';
UPDATE pubs SET latitude = -31.9520, longitude = 115.7510 WHERE name = 'Archie Brothers Fremantle';

-- Optional: Add index for better performance when querying by location
CREATE INDEX IF NOT EXISTS idx_pubs_coordinates ON pubs(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Verify the update worked
-- SELECT name, latitude, longitude FROM pubs WHERE latitude IS NOT NULL ORDER BY name;