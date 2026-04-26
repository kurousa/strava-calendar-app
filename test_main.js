import { readFileSync } from 'fs';
const file = readFileSync('main.ts', 'utf-8');
console.log(file.includes('function attachMapToCalendarEvent'));
