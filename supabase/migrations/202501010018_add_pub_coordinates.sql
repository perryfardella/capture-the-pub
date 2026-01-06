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

UPDATE pubs SET latitude = -32.054331475192036, longitude = 115.74879401223146 WHERE name = 'Varsity Freo';
UPDATE pubs SET latitude = -32.05467244587919, longitude = 115.7480515409016 WHERE name = 'The Federal Hotel';
UPDATE pubs SET latitude = -32.054179945536454, longitude = 115.7400712540142 WHERE name = 'Gage Roads Freo Brewery';
UPDATE pubs SET latitude = -32.05497754343671, longitude = 115.74459030564515 WHERE name = 'Fremantle Buffalo Club';
UPDATE pubs SET latitude = -32.05444410712358, longitude = 115.74630124807969 WHERE name = 'The National Hotel';
UPDATE pubs SET latitude = -32.05508406636752, longitude = 115.74490268911764 WHERE name = 'Jungle Bird';
UPDATE pubs SET latitude = -32.05824328015, longitude = 115.74213074028353 WHERE name = 'Bathers Beach House';
UPDATE pubs SET latitude = -32.05915658898284, longitude = 115.74471908940438 WHERE name = 'Little Creatures Brewery';
UPDATE pubs SET latitude = -32.05721955585494, longitude = 115.74575391776673 WHERE name = 'Ball & Chain';
UPDATE pubs SET latitude = -32.05744958106826, longitude = 115.74777270677576 WHERE name = 'Patio Bar';
UPDATE pubs SET latitude = -32.05633136359293, longitude = 115.74601235740339 WHERE name = 'Strange Company';
UPDATE pubs SET latitude = -32.05569122266371, longitude = 115.74731659085269 WHERE name = 'Beerpourium';
UPDATE pubs SET latitude = -32.05533620347604, longitude = 115.74707611459762 WHERE name = 'Mons O`Shea';
UPDATE pubs SET latitude = -32.055436979318415, longitude = 115.74625500276623 WHERE name = 'Calamity`s Rod Freo';
UPDATE pubs SET latitude = -32.056189143120115, longitude = 115.74869065705998 WHERE name = 'Sail and Anchor';
UPDATE pubs SET latitude = -32.057128425736416, longitude = 115.74943898491269 WHERE name = 'The Norfolk Hotel';
UPDATE pubs SET latitude = -32.05382288547113, longitude = 115.74922009715156 WHERE name = 'Archie Brothers Fremantle';

-- Optional: Add index for better performance when querying by location
CREATE INDEX IF NOT EXISTS idx_pubs_coordinates ON pubs(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Verify the update worked
-- SELECT name, latitude, longitude FROM pubs WHERE latitude IS NOT NULL ORDER BY name;