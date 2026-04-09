# Performance Optimization Track (Utopia Fitness App)

## Current Status
- **Phase:** Step 2 (Diet System 4.0 Implementation)
- **Goal:** Fix Diet Template Import & Suggestion Shelf UI.
- **Strategy:** Advanced parsing, data isolation, manual trigger only.

## Log
- **2026-04-07:** 
  - Implemented `dietTemplates` in `AppData` and `AppContext`.
  - Added `Suggestion Shelf` and `Merge` logic in `Nutrition.tsx`.
  - **Identified Issue:** Import parser is too strict (requires `-` prefix).
  - **Identified Issue:** Phase switching doesn't always refresh the shelf correctly if the phase index is out of bounds of imported data.
  - **User Requirement:** Add "One-click Mirror Day" button to fill today's meals from suggestions.
  - **User Requirement:** Support decimal parsing for macros (e.g., 47.75g).

## Diet System 4.0 Rules (Strict)
1. Templates must be independent of `NutritionSettings`.
2. Suggestions are a "view layer" only; no auto-writing to today's log.
3. Merging only affects selected meals, not original templates.
4. Use stable text structure for import (no complex JSON).
5. One-click mirror must be manually triggered.
6. All suggested meals must be fully editable once added to today's log.

## Next Steps for New AI
1. Fix `handleImportPlan` regex in `Nutrition.tsx` to be more robust (optional `-`, support decimals).
2. Add `applyAllSuggestedMeals` function and a "Mirror All" button in the Suggestion Shelf.
3. Ensure `resolvedNutritionToday` and Phase selector are perfectly synced.
