const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Extract the zip file using Python
console.log('Extracting IPEDS data...');
execSync('python3 -m zipfile -e ipeds-hd2023.zip .');

// Read the CSV file
console.log('Reading HD2023.csv...');
const csvContent = fs.readFileSync('HD2023.csv', 'utf8');

// Parse CSV headers
const lines = csvContent.split('\n');
const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

console.log(`Found ${lines.length - 1} institutions in IPEDS data`);
console.log('Headers:', headers.slice(0, 10).join(', '), '...');

// Find the index of important columns
const UNITID_INDEX = headers.indexOf('UNITID');
const INSTNM_INDEX = headers.indexOf('INSTNM');
const IALIAS_INDEX = headers.indexOf('IALIAS');
const CITY_INDEX = headers.indexOf('CITY');
const STABBR_INDEX = headers.indexOf('STABBR');
const ZIP_INDEX = headers.indexOf('ZIP');
const SECTOR_INDEX = headers.indexOf('SECTOR');
const LATITUDE_INDEX = headers.indexOf('LATITUDE');
const LONGITUD_INDEX = headers.indexOf('LONGITUD');
const WEBADDR_INDEX = headers.indexOf('WEBADDR');
const OPEID_INDEX = headers.indexOf('OPEID');

console.log('Column indexes:', {
  UNITID: UNITID_INDEX,
  INSTNM: INSTNM_INDEX,
  IALIAS: IALIAS_INDEX,
  CITY: CITY_INDEX,
  STABBR: STABBR_INDEX
});

// Parse CSV data
const colleges = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  // Simple CSV parsing (handles basic quoted fields)
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"' && (j === 0 || line[j-1] === ',')) {
      inQuotes = true;
    } else if (char === '"' && inQuotes && (j === line.length - 1 || line[j+1] === ',')) {
      inQuotes = false;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  
  // Extract college data
  const unitid = fields[UNITID_INDEX];
  const name = fields[INSTNM_INDEX]?.replace(/"/g, '');
  const alias = fields[IALIAS_INDEX]?.replace(/"/g, '');
  const city = fields[CITY_INDEX]?.replace(/"/g, '');
  const state = fields[STABBR_INDEX]?.replace(/"/g, '');
  const zip = fields[ZIP_INDEX]?.replace(/"/g, '');
  const sector = fields[SECTOR_INDEX];
  const latitude = parseFloat(fields[LATITUDE_INDEX]) || null;
  const longitude = parseFloat(fields[LONGITUD_INDEX]) || null;
  const website = fields[WEBADDR_INDEX]?.replace(/"/g, '');
  const opeid = fields[OPEID_INDEX]?.replace(/"/g, '');
  
  if (name) {
    colleges.push({
      unitid: parseInt(unitid),
      opeid: opeid || null,
      name: name,
      alias: alias || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      sector: parseInt(sector) || null,
      latitude: latitude,
      longitude: longitude,
      website: website || null,
      domains: website ? [website.replace(/^https?:\/\//, '').replace(/\/$/, '')] : []
    });
  }
}

console.log(`Processed ${colleges.length} colleges from IPEDS data`);

// Save to JSON file
const outputPath = 'ipeds-institutions.json';
fs.writeFileSync(outputPath, JSON.stringify(colleges, null, 2));
console.log(`Saved IPEDS data to ${outputPath}`);

// Show some examples
console.log('\nSample colleges:');
colleges.slice(0, 5).forEach(college => {
  console.log(`- ${college.name} (${college.city}, ${college.state}) - UNITID: ${college.unitid}`);
});

// Check for Monroe University
const monroeColleges = colleges.filter(c => 
  c.name.toLowerCase().includes('monroe') || 
  (c.alias && c.alias.toLowerCase().includes('monroe'))
);
console.log('\nMonroe-related institutions:');
monroeColleges.forEach(college => {
  console.log(`- ${college.name}${college.alias ? ` (alias: ${college.alias})` : ''} - ${college.city}, ${college.state}`);
});