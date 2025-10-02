const StreamZip = require('node-stream-zip');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

async function extractAndProcessIPEDS() {
  console.log('Extracting IPEDS HD2023 data...');
  
  // Extract the zip file
  const zip = new StreamZip.async({ file: path.join(__dirname, '..', 'ipeds-hd2023.zip') });
  
  try {
    // Extract all files
    await zip.extract(null, '.');
    console.log('Extraction complete');
    
    // Close the zip
    await zip.close();
    
    // Find the HD2023.csv file
    const csvFile = 'HD2023.csv';
    if (!fs.existsSync(csvFile)) {
      // Try different case variations
      const files = fs.readdirSync('.');
      const hdFile = files.find(f => f.toLowerCase().includes('hd2023') && f.endsWith('.csv'));
      if (hdFile) {
        console.log(`Found CSV file: ${hdFile}`);
        processCSV(hdFile);
      } else {
        console.error('Could not find HD2023.csv file');
      }
    } else {
      processCSV(csvFile);
    }
  } catch (err) {
    console.error('Error extracting:', err);
  }
}

function processCSV(csvFile) {
  console.log(`Processing ${csvFile}...`);
  
  const colleges = [];
  let count = 0;
  
  fs.createReadStream(csvFile)
    .pipe(csv())
    .on('data', (row) => {
      count++;
      
      // Extract relevant fields
      const college = {
        unitid: parseInt(row.UNITID) || null,
        opeid: row.OPEID || null,
        name: row.INSTNM || '',
        alias: row.IALIAS || null,
        city: row.CITY || null,
        state: row.STABBR || null,
        zip: row.ZIP || null,
        sector: parseInt(row.SECTOR) || null,
        latitude: parseFloat(row.LATITUDE) || null,
        longitude: parseFloat(row.LONGITUD) || null,
        website: row.WEBADDR || null,
        domains: row.WEBADDR ? [row.WEBADDR.replace(/^https?:\/\//, '').replace(/\/$/, '')] : []
      };
      
      if (college.name) {
        colleges.push(college);
      }
    })
    .on('end', () => {
      console.log(`Processed ${count} rows, found ${colleges.length} valid colleges`);
      
      // Save to JSON
      const outputPath = 'ipeds-institutions.json';
      fs.writeFileSync(outputPath, JSON.stringify(colleges, null, 2));
      console.log(`Saved IPEDS data to ${outputPath}`);
      
      // Show statistics
      console.log('\nStatistics:');
      console.log(`Total institutions: ${colleges.length}`);
      
      // Check for Monroe
      const monroeColleges = colleges.filter(c => 
        c.name.toLowerCase().includes('monroe') || 
        (c.alias && c.alias.toLowerCase().includes('monroe'))
      );
      
      console.log(`\nMonroe-related institutions (${monroeColleges.length}):`);
      monroeColleges.forEach(college => {
        console.log(`- ${college.name}${college.alias ? ` (alias: ${college.alias})` : ''} - ${college.city}, ${college.state}`);
        if (college.website) {
          console.log(`  Website: ${college.website}`);
        }
      });
      
      // Show some examples
      console.log('\nSample colleges:');
      colleges.slice(0, 5).forEach(college => {
        console.log(`- ${college.name} (${college.city}, ${college.state}) - UNITID: ${college.unitid}`);
      });
    })
    .on('error', (err) => {
      console.error('Error reading CSV:', err);
    });
}

// Run the extraction
extractAndProcessIPEDS();