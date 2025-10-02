import fs from 'fs';
import pkg from 'pg';
const { Pool } = pkg;

// Load IPEDS data
const ipedsData = JSON.parse(fs.readFileSync('ipeds-institutions.json', 'utf8'));

// Create connection to database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Create a mapping from college names to coordinates
const collegeCoordinateMap = new Map();

// Add exact matches and variations
ipedsData.forEach(institution => {
  const name = institution.name;
  const lat = institution.latitude;
  const lng = institution.longitude;
  
  if (lat && lng) {
    // Add exact name
    collegeCoordinateMap.set(name.toLowerCase(), { lat, lng });
    
    // Add alias if exists
    if (institution.alias && institution.alias.trim() !== ' ') {
      institution.alias.split('|').forEach(alias => {
        collegeCoordinateMap.set(alias.trim().toLowerCase(), { lat, lng });
      });
    }
    
    // Add common variations
    const variations = [
      name.replace(/^CUNY /, ''), // Remove CUNY prefix
      name.replace(/ College$/, ''), // Remove College suffix
      name.replace(/ University$/, ''), // Remove University suffix
    ];
    
    variations.forEach(variation => {
      if (variation !== name) {
        collegeCoordinateMap.set(variation.toLowerCase(), { lat, lng });
      }
    });
  }
});

console.log(`Loaded ${collegeCoordinateMap.size} college coordinate mappings from IPEDS data`);

async function fixCollegeCoordinates() {
  try {
    // Get all colleges with generic NYC coordinates
    const problematicColleges = await pool.query(`
      SELECT DISTINCT standard_name, latitude, longitude 
      FROM college_locations 
      WHERE latitude = '40.7128' AND longitude = '-74.0060'
      ORDER BY standard_name
    `);
    
    console.log(`Found ${problematicColleges.rows.length} colleges with generic NYC coordinates`);
    
    let updatedCount = 0;
    let notFoundCount = 0;
    
    for (const college of problematicColleges.rows) {
      const collegeName = college.standard_name.toLowerCase();
      
      // Try to find coordinates for this college
      let coordinates = null;
      
      // Try exact match first
      coordinates = collegeCoordinateMap.get(collegeName);
      
      // Try without common prefixes/suffixes
      if (!coordinates) {
        const searchVariations = [
          collegeName.replace(/^cuny /, ''),
          collegeName.replace(/^suny /, ''),
          collegeName.replace(/ college$/, ''),
          collegeName.replace(/ university$/, ''),
          collegeName.replace(/ community college$/, ''),
          collegeName.replace(/^university of /, ''),
        ];
        
        for (const variation of searchVariations) {
          coordinates = collegeCoordinateMap.get(variation);
          if (coordinates) break;
        }
      }
      
      // Try partial matches for complex names
      if (!coordinates) {
        for (const [mapKey, coords] of collegeCoordinateMap.entries()) {
          if (mapKey.includes(collegeName.split(' ')[0]) || 
              collegeName.includes(mapKey.split(' ')[0])) {
            coordinates = coords;
            break;
          }
        }
      }
      
      if (coordinates) {
        // Update the coordinates
        await pool.query(`
          UPDATE college_locations 
          SET latitude = $1, longitude = $2 
          WHERE standard_name = $3
        `, [coordinates.lat.toString(), coordinates.lng.toString(), college.standard_name]);
        
        console.log(`✓ Updated ${college.standard_name}: ${coordinates.lat}, ${coordinates.lng}`);
        updatedCount++;
      } else {
        console.log(`✗ No coordinates found for: ${college.standard_name}`);
        notFoundCount++;
      }
    }
    
    console.log(`\nSummary:`);
    console.log(`- Updated: ${updatedCount} colleges`);
    console.log(`- Not found: ${notFoundCount} colleges`);
    
    // Verify the fix
    const remainingGeneric = await pool.query(`
      SELECT COUNT(*) 
      FROM college_locations 
      WHERE latitude = '40.7128' AND longitude = '-74.0060'
    `);
    
    console.log(`- Remaining generic coordinates: ${remainingGeneric.rows[0].count}`);
    
  } catch (error) {
    console.error('Error fixing college coordinates:', error);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixCollegeCoordinates();