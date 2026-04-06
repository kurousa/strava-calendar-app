// Mock Google Apps Script global CalendarApp
global.CalendarApp = {
    EventColor: {
        BLUE: 'BLUE',
        RED: 'RED',
        GREEN: 'GREEN',
        CYAN: 'CYAN',
        PALE_GREEN: 'PALE_GREEN',
        ORANGE: 'ORANGE',
        GRAY: 'GRAY'
    },
};

const { getActivityStyle } = require('./formatters/DefaultFormatter.js');

const ITERATIONS = 1_000_000;
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  getActivityStyle('Run');
  getActivityStyle('Ride');
  getActivityStyle('Unknown');
}
const end = performance.now();

console.log(`Execution time for ${ITERATIONS} iterations: ${(end - start).toFixed(2)} ms`);
