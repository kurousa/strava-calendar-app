// Minimal benchmark to see the impact of getEvents in loop vs not
const { performance } = require('perf_hooks');

const ITERATIONS = 1000;

function runBench() {
    let getEventsCalls = 0;
    const calendar = {
        getEvents: () => {
            getEventsCalls++;
            // Simulate a slow API call natively
            let sum = 0;
            for(let i=0; i<10000; i++) sum += i;
            return [];
        },
        createEvent: () => {
            return { setColor: () => {} };
        }
    };

    // A mock version of what we have in main.js
    function processActivityToCalendar(activity, calendar, skipDuplicateCheck) {
        if (!skipDuplicateCheck) {
            const existingEvents = calendar.getEvents(new Date(), new Date());
            const isDuplicate = existingEvents.some(e => e.getDescription() && e.getDescription().includes(activity.id));
            if (isDuplicate) return 'skipped';
        }
        // simulate standard logic
        return 'success';
    }

    const startWithoutSkip = performance.now();
    for(let i=0; i<ITERATIONS; i++) {
        processActivityToCalendar({id: i, start_date: '2023-01-01', elapsed_time: 3600, type: 'Run'}, calendar, false);
    }
    const endWithoutSkip = performance.now();

    const startWithSkip = performance.now();
    for(let i=0; i<ITERATIONS; i++) {
        processActivityToCalendar({id: i, start_date: '2023-01-01', elapsed_time: 3600, type: 'Run'}, calendar, true);
    }
    const endWithSkip = performance.now();

    console.log(`With N+1 queries (skipDuplicateCheck=false): ${(endWithoutSkip - startWithoutSkip).toFixed(2)} ms (${getEventsCalls} API calls)`);
    console.log(`Without N+1 queries (skipDuplicateCheck=true): ${(endWithSkip - startWithSkip).toFixed(2)} ms (0 API calls)`);
}

runBench();
