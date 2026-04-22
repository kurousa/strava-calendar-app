
import { test, vi } from 'vitest';
import * as SheetsModule from '../sheets.ts';

// Mock Config if it doesn't exist
global.Config = {
    PROP_SPREADSHEET_ID: 'PROP_SPREADSHEET_ID',
    BACKUP_SHEET_NAME: 'Activities'
};

const mockActivities = [];
for (let i = 0; i < 50; i++) {
    mockActivities.push({
        id: i,
        name: `Activity ${i}`,
        type: 'Run',
        start_date: '2023-01-01T10:00:00Z',
        start_date_local: '2023-01-01T10:00:00Z',
        start_latlng: [35.0, 139.0],
        distance: 5000,
        moving_time: 1800,
        total_elevation_gain: 50
    });
}

test('Benchmark backupToSpreadsheet', async () => {
    // Setup mocks
    vi.stubGlobal('Logger', { log: vi.fn() });
    vi.stubGlobal('PropertiesService', {
        getScriptProperties: () => ({
            getProperty: () => 'fake_spreadsheet_id'
        })
    });

    const mockRange = {
        setFontWeight: vi.fn().mockReturnThis(),
        getValues: vi.fn().mockReturnValue([]),
        setValues: vi.fn(),
        flat: vi.fn().mockReturnValue([]),
    };

    const mockSheet = {
        insertSheet: vi.fn().mockReturnThis(),
        appendRow: vi.fn(),
        setFrozenRows: vi.fn(),
        getRange: vi.fn().mockReturnValue(mockRange),
        getLastRow: vi.fn().mockReturnValue(0),
    };

    global.SpreadsheetApp = {
        openById: vi.fn().mockReturnValue({
            getSheetByName: vi.fn().mockReturnValue(null),
            insertSheet: vi.fn().mockReturnValue(mockSheet)
        })
    };

    // Use simulated delay for fetchWeatherData
    vi.stubGlobal('fetchWeatherDataBatch', vi.fn((activities) => {
        const start = Date.now();
        while(Date.now() - start < 10) {} // Simulate 10ms latency for the batch request
        activities.forEach(a => a.weatherText = 'Sunny');
    }));

    global.generateAiComment = vi.fn(() => 'Nice!');

    const { backupToSpreadsheet } = await import('../sheets.ts');

    // warm up
    backupToSpreadsheet(mockActivities.slice(0, 1));

    const startTime = Date.now();
    backupToSpreadsheet(mockActivities);
    const endTime = Date.now();

    console.log(`\n\n=== BENCHMARK RESULT ===\nExecution time for 50 activities: ${endTime - startTime}ms\n========================\n\n`);
});
