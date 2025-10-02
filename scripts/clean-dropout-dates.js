import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Refined dropout date logic - only assign dates for EXPLICIT evidence of departure
const dropoutRules = [
  // 2024 Cohort - Clear departure evidence
  {
    name: "Giulio Beharovic",
    year: 2024,
    dropoutDate: "2024-12-15",
    keywords: ["doesn't go to LaGuardia anymore", "money was tight"],
    reasoning: "Explicit statement of no longer attending due to financial issues"
  },
  {
    name: "Jamil Compaore", 
    year: 2024,
    dropoutDate: "2024-12-20",
    keywords: ["Stopped out of Old Westbury", "decided not to go back"],
    reasoning: "Explicit departure statement - stopped out and decided not to return"
  },
  {
    name: "Izaih Dunbar",
    year: 2024, 
    dropoutDate: "2025-03-01",
    keywords: ["not going to classes", "getting kicked out"],
    reasoning: "Parent confirmed not attending classes, likely academic dismissal"
  }
];

// Students to EXCLUDE from dropout dates (still enrolled or never enrolled)
const excludeFromDropout = [
  // Never enrolled
  "Dzidefo Akatsa", // "never responded"
  "Pablo Colon", // "didn't make cutoff" 
  "Michael Dodson Jr.", // "working at AMC"
  "Gregory Clarke", // "no response"
  
  // Unresponsive but still enrolled (college + no explicit departure)
  "Risat Ahmed", // "Hostos" + "stopped responding" = still enrolled
  "Jeniffer Cruz Dabrowska", // "City" + "no response" = still enrolled
  "Jamar Brown", // "Guttman" + "stopped responding" = still enrolled
  "Tyler Dabideen", // "Lehman" + unresponsive = still enrolled
  "Emilie Davis", // "John Jay" + "no response" = still enrolled
  
  // Off-track but still enrolled
  "Sir William Cyril" // "Mercy College" + "will need support" = still enrolled
];

function cleanCSVData(inputFile, outputFile) {
  console.log(`\n🧹 Cleaning CSV data: ${inputFile}`);
  
  const csvContent = fs.readFileSync(inputFile, 'utf8');
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  
  // Find relevant column indices
  const firstNameIndex = headers.findIndex(h => h.includes('First Name'));
  const lastNameIndex = headers.findIndex(h => h.includes('Last Name'));
  const cohortYearIndex = headers.findIndex(h => h.includes('Cohort Year'));
  const collegeIndex = headers.findIndex(h => h.includes('College or Workforce'));
  const trackIndex = headers.findIndex(h => h.includes('Track'));
  const notesIndex = headers.findIndex(h => h.includes('Notes'));
  
  // Add dropout date column if it doesn't exist
  let dropoutDateIndex = headers.findIndex(h => h.includes('Dropout Date'));
  if (dropoutDateIndex === -1) {
    headers.push('Dropout Date');
    dropoutDateIndex = headers.length - 1;
  }
  
  const cleanedLines = [headers.join(',')];
  let changesCount = 0;
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const fields = lines[i].split(',');
    const firstName = fields[firstNameIndex]?.trim();
    const lastName = fields[lastNameIndex]?.trim();
    const fullName = `${firstName} ${lastName}`;
    const year = parseInt(fields[cohortYearIndex]);
    const college = fields[collegeIndex]?.trim();
    const track = fields[trackIndex]?.trim();
    const notes = fields[notesIndex]?.trim() || '';
    
    // Clear any existing dropout date
    if (fields[dropoutDateIndex]) {
      fields[dropoutDateIndex] = '';
    }
    
    // Apply dropout date rules
    const rule = dropoutRules.find(r => 
      r.name === fullName && r.year === year
    );
    
    if (rule && !excludeFromDropout.includes(fullName)) {
      // Verify keywords match the notes
      const hasKeywords = rule.keywords.some(keyword => 
        notes.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (hasKeywords) {
        fields[dropoutDateIndex] = rule.dropoutDate;
        console.log(`✅ SET DROPOUT DATE: ${fullName} → ${rule.dropoutDate}`);
        console.log(`   Reasoning: ${rule.reasoning}`);
        changesCount++;
      } else {
        console.log(`⚠️  SKIPPED: ${fullName} - keywords not found in notes`);
      }
    } else if (excludeFromDropout.includes(fullName)) {
      console.log(`🔒 EXCLUDED: ${fullName} - still enrolled or never enrolled`);
    }
    
    cleanedLines.push(fields.join(','));
  }
  
  // Write cleaned file
  fs.writeFileSync(outputFile, cleanedLines.join('\n'));
  console.log(`\n📊 SUMMARY: ${changesCount} dropout dates assigned`);
  console.log(`💾 Cleaned data saved to: ${outputFile}`);
}

// Clean all CSV files
const csvFiles = [
  'Copy of Alumni Success Master Tracker - 2024_1753196965443.csv',
  'Copy of Alumni Success Master Tracker - 2023_1753196965447.csv', 
  'Copy of Alumni Success Master Tracker - 2022_1753196965447.csv'
];

csvFiles.forEach(file => {
  const inputPath = path.join(__dirname, '..', 'attached_assets', file);
  const outputPath = path.join(__dirname, '..', 'attached_assets', `CLEANED_${file}`);
  
  if (fs.existsSync(inputPath)) {
    cleanCSVData(inputPath, outputPath);
  } else {
    console.log(`❌ File not found: ${inputPath}`);
  }
});

console.log('\n🎯 DATA CLEANING COMPLETE');
console.log('Next steps:');
console.log('1. Review cleaned CSV files (CLEANED_*.csv)');
console.log('2. Delete current database data');
console.log('3. Re-import using cleaned CSV files');
console.log('4. Verify funnel calculations with accurate dropout dates');