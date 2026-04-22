const fs = require('fs');

let code = fs.readFileSync('weather.ts', 'utf8');

// Wait! In the github action, the error was:
// weather.ts(83,34): error TS2353: Object literal may only specify known properties, and 'dateObj' does not exist in type '{ activity: StravaActivity; hourIndex: number; }'.

code = code.replace(
    /const mapping: \{ activity: StravaActivity, dateObj: Date, hourIndex: number \}\[\] = \[\];/g,
    `const mapping: { activity: StravaActivity, hourIndex: number }[] = [];`
);

code = code.replace(
    /mapping\.push\(\{ activity, dateObj, hourIndex \}\);/g,
    `mapping.push({ activity, hourIndex });`
);

fs.writeFileSync('weather.ts', code);
