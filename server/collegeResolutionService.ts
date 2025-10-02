// Server-side college resolution service
// Centralizes all college matching logic with IPEDS data

import { promises as fs } from 'fs';
import path from 'path';

interface College {
  unitid: number;
  name: string;
  alias?: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
}

interface CollegeResolution {
  originalName: string;
  standardName: string | null;
  latitude: number | null;
  longitude: number | null;
  confidence: number; // 0-1 scale
  source: 'ipeds' | 'existing' | 'unmatched';
}

interface CanonicalCollege {
  baseName: string;
  campusDescriptor: string;
  college: College;
  score: number;
}

class CollegeResolutionService {
  private nameIndex: Map<string, College> = new Map();
  private searchTerms: string[] = [];
  private canonicalIndex: Map<string, CanonicalCollege[]> = new Map(); // baseName -> ranked colleges
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🏫 Loading IPEDS college data...');
      
      // Load college data from JSON file
      const filePath = path.join(process.cwd(), 'ipeds-institutions.json');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const colleges = JSON.parse(fileContent) as College[];
      
      if (!Array.isArray(colleges) || colleges.length === 0) {
        throw new Error('College data is empty or invalid');
      }

      // Add custom entries for military/non-traditional institutions
      const customEntries: College[] = [
        {
          unitid: 999998,
          name: "Army National Guard",
          state: "XX",
          city: "",
          alias: ""
        },
        {
          unitid: 999999,
          name: "Marine Corps",
          state: "XX",
          city: "",
          alias: "Marines | US Marine Corps | USMC"
        }
      ];
      
      const allColleges = [...colleges, ...customEntries];

      // Build indexes for fast lookups
      allColleges.forEach(college => {
        // Use the full name as the key (normalized)
        const normalizedName = college.name.toLowerCase().trim();
        this.nameIndex.set(normalizedName, college);
        this.searchTerms.push(college.name);

        // Also index with more aggressive normalization for better matching
        const aggressiveNormalized = normalizedName
          .replace(/\./g, '') // Remove periods
          .replace(/\b(in|at|of the)\b/g, '') // Remove common prepositions
          .replace(/@/g, ' at ') // Convert @ to at
          .replace(/\s*\([^)]*\)/g, '') // Remove parenthetical suffixes like (Online)
          .replace(/\bCO\b/g, 'Community College') // Expand CO abbreviation
          .replace(/\b and \b/g, ' ') // Handle "and" equivalencies (e.g. "Hobart and William Smith" → "Hobart William Smith")
          .replace(/\s+/g, ' ') // Normalize spaces
          .trim();
        
        if (aggressiveNormalized !== normalizedName) {
          this.nameIndex.set(aggressiveNormalized, college);
        }

        // Also index by alias if it exists
        if (college.alias && college.alias.trim() && college.alias.trim() !== ' ') {
          const aliasNames = college.alias.split(/[,;|]/).map(a => a.trim());
          aliasNames.forEach(alias => {
            if (alias && alias !== ' ') {
              this.nameIndex.set(alias.toLowerCase().trim(), college);
              
              // Also add aggressive normalized versions of aliases
              const aggressiveAlias = alias.toLowerCase()
                .replace(/\./g, '')
                .replace(/\b(in|at|of the)\b/g, '')
                .replace(/\b and \b/g, ' ') // Handle "and" equivalencies in aliases too
                .replace(/\s+/g, ' ')
                .trim();
              if (aggressiveAlias !== alias.toLowerCase().trim()) {
                this.nameIndex.set(aggressiveAlias, college);
              }
            }
          });
        }
      });

      // Build canonical index for deduplication
      this.buildCanonicalIndex(allColleges);

      this.initialized = true;
      console.log(`✅ Loaded ${allColleges.length} colleges with ${this.nameIndex.size} indexed entries`);
      console.log(`📚 Built ${this.canonicalIndex.size} canonical college groups`);
      
    } catch (error) {
      console.error('❌ Failed to load college data:', error);
      throw new Error(`College data loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async resolveColleges(collegeNames: string[]): Promise<CollegeResolution[]> {
    await this.initialize();

    const results: CollegeResolution[] = [];
    
    // Special mappings only for custom entries not in IPEDS
    const specialMappings: Record<string, string> = {
      "Army National Guard": "Army National Guard", // Custom entry
      "Marine Corps": "Marine Corps", // Custom entry
    };

    for (const collegeName of collegeNames) {
      if (!collegeName || collegeName.trim() === '') {
        results.push({
          originalName: collegeName,
          standardName: null,
          latitude: null,
          longitude: null,
          confidence: 0,
          source: 'unmatched'
        });
        continue;
      }

      const trimmed = collegeName.trim();
      
      // Check special mappings first
      if (specialMappings[trimmed]) {
        const specialName = specialMappings[trimmed];
        const matchedCollege = this.nameIndex.get(specialName.toLowerCase());
        results.push({
          originalName: collegeName,
          standardName: specialName,
          latitude: matchedCollege?.latitude || null,
          longitude: matchedCollege?.longitude || null,
          confidence: 1.0,
          source: 'ipeds'
        });
        continue;
      }
      
      // Try exact match (case insensitive)
      const exactMatch = this.nameIndex.get(trimmed.toLowerCase());
      if (exactMatch) {
        results.push({
          originalName: collegeName,
          standardName: exactMatch.name,
          latitude: exactMatch.latitude || null,
          longitude: exactMatch.longitude || null,
          confidence: 1.0,
          source: 'ipeds'
        });
        continue;
      }
      
      // Try aggressive normalized match
      const normalizedInput = trimmed.toLowerCase()
        .replace(/\./g, '')
        .replace(/\b(in|at|of the)\b/g, '')
        .replace(/@/g, ' at ')
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/\bCO\b/g, 'Community College')
        .replace(/\b and \b/g, ' ') // Handle "and" equivalencies (e.g. "Hobart and William Smith" → "Hobart William Smith")
        .replace(/\s+/g, ' ')
        .trim();
      
      const normalizedMatch = this.nameIndex.get(normalizedInput);
      if (normalizedMatch) {
        console.log(`✅ NORMALIZED MATCH: "${trimmed}" → "${normalizedMatch.name}"`);
        results.push({
          originalName: collegeName,
          standardName: normalizedMatch.name,
          latitude: normalizedMatch.latitude || null,
          longitude: normalizedMatch.longitude || null,
          confidence: 0.9,
          source: 'ipeds'
        });
        continue;
      }
      
      
      // Try substring matching for cases like "SUNY MARITIME" → "SUNY Maritime College"
      let substringMatch = null;
      for (const [indexedName, college] of Array.from(this.nameIndex.entries())) {
        if (indexedName.includes(normalizedInput) || normalizedInput.includes(indexedName)) {
          // Prefer matches where input is subset of college name (more specific)
          if (indexedName.includes(normalizedInput)) {
            substringMatch = college;
            console.log(`✅ SUBSTRING MATCH: "${trimmed}" → "${college.name}"`);
            break;
          }
        }
      }
      
      if (substringMatch) {
        results.push({
          originalName: collegeName,
          standardName: substringMatch.name,
          latitude: substringMatch.latitude || null,
          longitude: substringMatch.longitude || null,
          confidence: 0.8,
          source: 'ipeds'
        });
        continue;
      } else {
        console.log(`❌ NO MATCH FOUND FOR: "${trimmed}"`);
      }
      
      // Try prefix matching with scoring
      const prefixMatch = this.findBestPrefixMatch(trimmed);
      if (prefixMatch) {
        const matchedCollege = this.nameIndex.get(prefixMatch.toLowerCase());
        results.push({
          originalName: collegeName,
          standardName: prefixMatch,
          latitude: matchedCollege?.latitude || null,
          longitude: matchedCollege?.longitude || null,
          confidence: 0.9, // High confidence for prefix matches
          source: 'ipeds'
        });
        continue;
      }
      
      // No match found
      results.push({
        originalName: collegeName,
        standardName: null,
        latitude: null,
        longitude: null,
        confidence: 0,
        source: 'unmatched'
      });
    }

    return results;
  }

  /**
   * Canonicalize college name by extracting base name and campus descriptor
   */
  private canonicalizeName(name: string): { baseName: string; campusDescriptor: string } {
    let cleanName = name.trim();
    
    // Extract campus/program qualifiers in parentheses
    const parentheticalMatch = cleanName.match(/^(.+?)\s*\((.+?)\)$/);
    let campusDescriptor = '';
    
    if (parentheticalMatch) {
      cleanName = parentheticalMatch[1].trim();
      campusDescriptor = parentheticalMatch[2].trim();
    }
    
    // Remove administrative suffixes and campus indicators
    const baseName = cleanName
      .replace(/\s+(Main\s+Campus|Campus|System\s+Office|Online|Extension|Center)$/i, '')
      .replace(/\s+Graduate\s+School$/i, '')
      .replace(/\s+Medical\s+Center$/i, '')
      .replace(/\s+Hospital$/i, '')
      .trim();
    
    return { baseName, campusDescriptor };
  }

  /**
   * Score a college entry for ranking (higher = better)
   */
  private scoreCollege(college: College, baseName: string, campusDescriptor: string): number {
    let score = 0;
    const name = college.name.toLowerCase();
    const baseNameLower = baseName.toLowerCase();
    
    // Base score for exact base name match
    if (name === baseNameLower) {
      score += 50;
    }
    
    // Prefer main campus indicators
    if (name.includes('main campus') || name === baseName) {
      score += 15;
    }
    
    // Penalize system offices, online programs, and administrative variants
    const disqualifyingTerms = [
      'system office', 'online', 'extension', 'center', 'hospital', 
      'medical center', 'graduate school only', 'administrative'
    ];
    
    for (const term of disqualifyingTerms) {
      if (name.includes(term) || campusDescriptor.toLowerCase().includes(term)) {
        score -= 40;
      }
    }
    
    // Prefer shorter, cleaner names (less likely to be variants)
    if (college.name.length < baseName.length + 20) {
      score += 10;
    }
    
    return score;
  }

  /**
   * Build canonical index grouping colleges by base name
   */
  private buildCanonicalIndex(colleges: College[]): void {
    for (const college of colleges) {
      const { baseName, campusDescriptor } = this.canonicalizeName(college.name);
      const score = this.scoreCollege(college, baseName, campusDescriptor);
      
      const canonical: CanonicalCollege = {
        baseName,
        campusDescriptor,
        college,
        score
      };
      
      const baseNameKey = baseName.toLowerCase();
      if (!this.canonicalIndex.has(baseNameKey)) {
        this.canonicalIndex.set(baseNameKey, []);
      }
      
      this.canonicalIndex.get(baseNameKey)!.push(canonical);
    }
    
    // Sort each group by score (best first)
    for (const group of Array.from(this.canonicalIndex.values())) {
      group.sort((a: CanonicalCollege, b: CanonicalCollege) => b.score - a.score);
    }
  }

  /**
   * Get distinct institutions from a group, keeping the best scoring variant per unitid
   */
  private getDistinctInstitutions(group: CanonicalCollege[]): CanonicalCollege[] {
    const bestPerUnit = new Map<number, CanonicalCollege>();
    for (const c of group) {
      const existing = bestPerUnit.get(c.college.unitid);
      if (!existing || c.score > existing.score) {
        bestPerUnit.set(c.college.unitid, c);
      }
    }
    return Array.from(bestPerUnit.values());
  }

  async searchColleges(query: string, limit: number = 50): Promise<string[]> {
    await this.initialize();

    if (!query || query.trim().length < 1) {
      return [];
    }

    const q = query.toLowerCase().trim();
    const matched: CanonicalCollege[] = [];
    const seenUnitIds = new Set<number>();

    // Search through canonical groups for matches
    for (const [baseName, group] of Array.from(this.canonicalIndex.entries())) {
      const base = baseName.toLowerCase();
      const baseMatches = base.includes(q) || base.split(' ').some(w => w.startsWith(q));

      let groupMatches = baseMatches;
      if (!groupMatches) {
        for (const c of group) {
          const n = c.college.name.toLowerCase();
          if (n.includes(q) || n.split(' ').some(w => w.startsWith(q))) {
            groupMatches = true;
            break;
          }
        }
      }
      if (!groupMatches) continue;

      // Get all distinct institutions from this group and add them
      for (const c of this.getDistinctInstitutions(group)) {
        if (!seenUnitIds.has(c.college.unitid)) {
          seenUnitIds.add(c.college.unitid);
          matched.push(c);
        }
      }
    }

    // Sort results by relevance
    const sorted = matched.sort((a, b) => {
      const aBase = a.baseName.toLowerCase();
      const bBase = b.baseName.toLowerCase();
      const aName = a.college.name.toLowerCase();
      const bName = b.college.name.toLowerCase();

      // Prefix matches get highest priority
      const aStarts = aBase.startsWith(q) || aName.startsWith(q);
      const bStarts = bBase.startsWith(q) || bName.startsWith(q);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;

      // Contains matches next
      const aContains = aBase.includes(q) || aName.includes(q);
      const bContains = bBase.includes(q) || bName.includes(q);
      if (aContains !== bContains) return aContains ? -1 : 1;

      // Then by score
      if (a.score !== b.score) return b.score - a.score;
      
      // Then alphabetically by base name
      if (a.baseName !== b.baseName) return a.baseName.localeCompare(b.baseName);
      
      // Finally by location for deterministic ordering
      const aLoc = `${a.college.state}|${a.college.city}`;
      const bLoc = `${b.college.state}|${b.college.city}`;
      return aLoc.localeCompare(bLoc);
    });

    const top = sorted.slice(0, limit);

    // Generate labels with collision handling
    const baseLabel = (c: CanonicalCollege) => {
      const { city, state } = c.college;
      return city && state && state !== 'XX' ? `${c.baseName} — ${city}, ${state}` : c.baseName;
    };

    const labels = top.map(baseLabel);
    const counts = new Map<string, number>();
    labels.forEach(l => counts.set(l, (counts.get(l) || 0) + 1));

    return top.map((c, i) => {
      const l = labels[i];
      if ((counts.get(l) || 0) <= 1) return l;
      
      // Handle collision: upgrade to full college name
      const { city, state, unitid } = c.college;
      const upgraded = city && state && state !== 'XX'
        ? `${c.college.name} — ${city}, ${state}`
        : c.college.name;
      
      // Ultimate fallback: append unitid if still colliding
      if (top.filter((_, j) => j !== i && 
          (city && state && state !== 'XX' 
            ? `${top[j].college.name} — ${city}, ${state}` 
            : top[j].college.name) === upgraded).length > 0) {
        return `${upgraded} — ${unitid}`;
      }
      
      return upgraded;
    });
  }

  private findBestPrefixMatch(input: string): string | null {
    const normalizedInput = input.toLowerCase().trim();
    
    // Minimum 3 characters to avoid false positives
    if (normalizedInput.length < 3) {
      return null;
    }
    
    // Find all colleges that start with the input
    const prefixMatches: string[] = [];
    
    // Search through all searchable terms (includes both names and aliases)
    this.searchTerms.forEach(collegeName => {
      const normalizedName = collegeName.toLowerCase();
      if (normalizedName.startsWith(normalizedInput)) {
        prefixMatches.push(collegeName);
      }
    });
    
    if (prefixMatches.length === 0) {
      return null;
    }
    
    if (prefixMatches.length === 1) {
      return prefixMatches[0];
    }
    
    // Multiple matches - apply intelligent ranking
    return this.rankPrefixMatches(normalizedInput, prefixMatches);
  }

  private rankPrefixMatches(input: string, matches: string[]): string {
    // Sort matches by relevance score (higher score = better match)
    const scoredMatches = matches.map(match => ({
      name: match,
      score: this.calculateMatchScore(input, match)
    }));
    
    scoredMatches.sort((a, b) => b.score - a.score);
    
    return scoredMatches[0].name;
  }

  private calculateMatchScore(input: string, match: string): number {
    const inputLower = input.toLowerCase();
    const matchLower = match.toLowerCase();
    
    let score = 0;
    
    // Exact prefix match gets highest score
    if (matchLower.startsWith(inputLower)) {
      score += 10;
    }
    
    // Shorter matches are generally better (more specific)
    score += Math.max(0, 5 - (matchLower.length - inputLower.length) / 10);
    
    // Prefer matches that don't have lots of extra words
    const inputWords = inputLower.split(' ').length;
    const matchWords = matchLower.split(' ').length;
    score += Math.max(0, 3 - Math.abs(matchWords - inputWords));
    
    // Boost score for exact word boundary matches
    const words = matchLower.split(' ');
    if (words.some(word => word === inputLower)) {
      score += 5;
    }
    
    return score;
  }
}

// Create singleton instance
const collegeResolutionService = new CollegeResolutionService();

export { collegeResolutionService, type CollegeResolution };