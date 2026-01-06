# 🗺️ Map Setup Instructions

## Step 1: Database Migration

Before using the coordinates form, you need to add latitude and longitude columns to your database:

1. Go to your **Supabase dashboard** → **SQL Editor**
2. Run the SQL from `docs/migration-add-coordinates.sql`
3. This will add `latitude` and `longitude` columns to the `pubs` table

## Step 2: Get Pub Coordinates

1. Go to `/admin` in your app
2. Click the **"🗺️ Map Setup"** tab
3. You'll see a form with all your pubs listed

### For each pub, get coordinates from Google Maps:

1. **Open Google Maps** in another tab
2. **Search** for the pub: `"[Pub Name] Fremantle"`
3. **Right-click** on the red pin/marker for the pub
4. **Select** "What's here?" from the dropdown menu
5. **Copy** the coordinates that appear at the bottom (format: `-31.9554, 115.7499`)
6. **Paste** the first number (latitude) and second number (longitude) into the form

### Example:
- Search: "Little Creatures Fremantle"
- Right-click the red pin → "What's here?"
- Copy: `-31.9489, 115.7523`
- Enter: 
  - Latitude: `-31.9489`
  - Longitude: `115.7523`

## Step 3: Save & Export

- The form validates coordinates automatically (red border = invalid)
- Click **"Save Coordinates"** to store them in the database
- Click **"Export JSON"** to download a backup file

## Step 4: Build the Map

Once you have coordinates for most/all pubs, we can build the territorial map view that will replace the current pubs list!

## Tips:

- ✅ You don't need to do all 18 pubs at once - save as you go
- ✅ The form shows how many pubs have valid coordinates  
- ✅ Invalid coordinates are highlighted in red
- ✅ You can export a JSON backup of all coordinates