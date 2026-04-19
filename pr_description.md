🧪 Improve testing in sheets.ts by preventing unnecessary GAS calls and covering edge cases

🎯 **What:** The testing gap addressed
The `backupToSpreadsheet` function in `sheets.ts` previously checked `activities.length === 0` *after* fetching the `spreadsheetId` using `PropertiesService.getScriptProperties().getProperty()`. This caused unnecessary Google Apps Script (GAS) API calls when the function was called with an empty array.

Additionally, the test suite did not cover the edge case where `activities.map(...).filter(...)` results in an empty array `rows.length === 0` (which happens if all provided activities are duplicates).

📊 **Coverage:** What scenarios are now tested
1. **Empty array optimization:** The `activities.length === 0` check is now the first line of the function, ensuring no property reads are performed. We updated the existing test `should skip backup if no activities are provided` to explicitly assert that `global.PropertiesService.getScriptProperties` is *not* called.
2. **Duplicate filtering edge case:** Added a new test `should skip appending rows if rows.length === 0 after filtering` that verifies `sheet.getRange(...).setValues(...)` is skipped when all activities provided are duplicates that get filtered out.

✨ **Result:** The improvement in test coverage
- Reduced unnecessary GAS quota usage and improved performance for empty sync operations.
- Increased branch coverage in `sheets.ts` by exercising the empty `rows` array scenario.
- Test assertions now strictly verify that specific GAS services are completely bypassed when they aren't needed.
