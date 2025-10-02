# 🎯 Production Code Review – Contract & Behavior Analysis

## Goal
Identify critical contract risks and behavior preservation requirements before any refactoring. Focus on data integrity, cache consistency, and zero-regression changes.

## Risk Assessment: MEDIUM
**Maintainability**: Needs refactor  
**Data Integrity**: Requires validation  
**Cache Consistency**: Needs audit

---

## 🚨 Critical Contract Risks (Address First)

### 1. Type Coercion Gaps in Alumni Updates
**File**: `shared/schema.ts` lines 120-122, 150  
**Risk**: Numeric fields stored as text may not validate properly from form inputs

**Confirmed Issues**:
```typescript
// Current schema (lines 120-122, 150)
highSchoolGpa: text("high_school_gpa"),        // Should validate numeric input
householdIncome: text("household_income"),     // Should validate numeric input  
collegeGpa: text("college_gpa"),               // Should validate numeric input
dateOfBirth: date("date_of_birth"),            // Date type but may receive strings
```

**Impact**: Form inputs of "3.5" or "50000" may fail validation or save incorrectly

**Required Zod Insert Schema Fix**:
```typescript
// In drizzle-zod insert schema
highSchoolGpa: z.string().regex(/^\d*\.?\d*$/, "Must be a valid GPA").optional(),
householdIncome: z.string().regex(/^\d+$/, "Must be a valid income").optional(),
collegeGpa: z.string().regex(/^\d*\.?\d*$/, "Must be a valid GPA").optional(),
dateOfBirth: z.coerce.date().transform(d => d.toISOString().split('T')[0]).optional(),
```

### 2. Cache Invalidation Inconsistency  
**File**: `client/src/components/ExcelLikeDataTable.tsx` lines 364  
**Risk**: Inline edits don't invalidate all necessary cache keys

**Current Issue**:
```typescript
// Line 364: Only invalidates paginated query
queryClient.invalidateQueries({ queryKey: ['alumni', 'paginated', page, searchTerm, filterState] });
// Missing: Detail view + analytics invalidation
```

**Comparison with Working Pattern** (GeneralNoteModal.tsx lines 77-78):
```typescript
// Good pattern - invalidates both detail and interactions
queryClient.invalidateQueries({ queryKey: [`/api/alumni/${alumni.id}/interactions`] });
queryClient.invalidateQueries({ queryKey: [`/api/alumni/${alumni.id}`] });
```

**Required Fix**:
```typescript
onSuccess: ({ id }) => {
  queryClient.invalidateQueries({ queryKey: ['alumni', 'paginated', page, searchTerm, filterState] });
  queryClient.invalidateQueries({ queryKey: qk.alumniById(id) });
  queryClient.invalidateQueries({ queryKey: ['analytics'] }); // If data affects charts
}
```

### 3. Export Column Visibility Contract
**File**: `client/src/components/ExcelLikeDataTable.tsx` (requires analysis)  
**Risk**: Export function may not use same column visibility as table display

**Analysis Needed**: 
- Table uses `COLUMN_GROUPS` filtered by group state (lines 40-77)
- Need to verify export function uses same filtered columns
- Potential mismatch between frozen columns and export order

**Investigation Required**: Find export function and verify it uses identical column filtering logic

---

## 🔒 Security & Permission Audit Required

### New/Changed Routes Needing Review:
1. **PATCH `/api/alumni/:id`** - Needs field-level permission validation
2. **POST `/api/alumni/:id/interactions`** - Verify user can access this alumni
3. **GET `/api/alumni/export`** - May expose PII without proper filtering

### Permission Checks Missing:
- Alumni access by support category/role
- Bulk export permissions
- Inline edit authorization per field

---

## 📋 Behavior Preservation Test Plan

### Critical Paths to Lock Before Refactoring:

#### Test 1: Text Field Validation (GPA/Income)
```
1. Edit alumni with householdIncome: "75000" (string input)
2. Edit highSchoolGpa: "3.75" (string input)  
3. Edit collegeGpa: "2.85" (string input)
4. Edit dateOfBirth via date picker (may send Date object)
✅ Verify: All save successfully and display correctly in both list and detail views
❌ Expected Issue: May fail validation or save with wrong format
```

#### Test 2: Cache Consistency
```
1. View alumni list, note supportCategory for ID 1217
2. Open alumni detail, change supportCategory inline
3. Navigate back to list
✅ Verify: List shows updated value immediately
```

#### Test 3: Export Column Parity
```
1. Hide 2-3 columns in table view
2. Reorder remaining columns
3. Export to CSV
✅ Verify: Export has same columns in same order as visible table
```

---

## 📦 Staged Review Packs

### Pack 1: Architecture & Contracts (BLOCKER)
**Files to Review**:
- `shared/schema.ts` - Zod schemas with coercion
- `server/routes.ts` lines 200-400 - Alumni PATCH endpoints
- `client/src/lib/queryClient.ts` - Query invalidation patterns

**Ask from Reviewers**: Validate type coercion + cache invalidation strategy

### Pack 2: Client State Correctness  
**Files to Review**:
- `client/src/pages/AlumniDetail.tsx` - Inline edit mutations
- `client/src/components/ExcelLikeDataTable.tsx` - Export logic
- `client/src/hooks/useInlineEdit.ts` - State management

**Ask from Reviewers**: Test mutation → cache → UI flow

### Pack 3: Security & Permissions
**Files to Review**:
- `server/routes.ts` - New PATCH/POST endpoints
- Permission middleware implementation
- PII filtering in export responses

**Ask from Reviewers**: Manual auth testing + data exposure check

---

## 🚀 Immediate Implementation Plan

### Week 1: Contract Hardening (MUST COMPLETE FIRST)
**Goal**: Fix text field validation and cache invalidation before any refactoring

**Tasks**:
1. Add proper regex validation to GPA/income text fields in insert schemas
2. Fix cache invalidation in ExcelLikeDataTable mutation (line 364)
3. Test inline edit → cache sync → UI update flow
4. Add validation tests for text numeric fields

**DoD**: 
- GPA/income fields validate string inputs properly (regex patterns)
- List/detail/analytics views stay in sync after inline edits
- All text-numeric fields save and display correctly

### Week 2: Split Large Components (After contracts are safe)
**Goal**: Break down oversized files with zero behavior change

**Tasks**:
1. Extract `AlumniFilters` from `Alumni.tsx` (preserve all filter logic)
2. Extract `AnalyticsCharts` from `Analytics.tsx` (preserve chart state)
3. Snapshot test all extracted components

**DoD**:
- No component over 500 lines
- All extracted components have snapshot tests
- Zero user-facing behavior changes

### Week 3: Backend Domain Split
**Goal**: Organize routes by domain without changing endpoints

**Tasks**:
1. Move alumni routes to `server/routes/alumni.ts`
2. Move analytics routes to `server/routes/analytics.ts`
3. Preserve exact same endpoint URLs and responses

**DoD**:
- Same API contract maintained
- All existing API tests pass
- Route organization by domain complete

### Week 4: Performance & Testing
**Goal**: Add comprehensive testing and optimize performance

**Tasks**:
1. Add E2E tests for critical paths (edit → save → sync)
2. Implement virtualization for large tables
3. Add bundle size monitoring

**DoD**:
- Critical user flows have E2E coverage
- Table performance improved for 1000+ rows
- Bundle size measured and optimized

---

## 🧪 Minimal Test Plan (Run Now)

### Before ANY changes:
1. **Numeric Coercion**: Edit GPA as "3.75" → verify saves as number 3.75
2. **Cache Sync**: Edit supportCategory inline → verify list updates immediately  
3. **Export Parity**: Hide columns, export → verify CSV matches visible columns

### After each week:
- Run the same 3 tests to ensure no regression
- All existing functionality works identically

---

## ⚡ Quick Wins (Safe to implement immediately)

1. **Add type coercion to schemas** - Low risk, high impact
2. **Fix cache invalidation** - Prevents data inconsistency bugs  
3. **Add numeric field validation** - Prevents bad data entry

---

## 🎯 Success Metrics

**Week 1**: Type safety score 100%, zero cache sync bugs
**Week 2**: Component complexity reduced 60%, same functionality  
**Week 3**: Route organization complete, same API contract
**Week 4**: Test coverage 80%+ on critical paths, performance improved

**Overall Goal**: Maintainable codebase with zero user-facing changes