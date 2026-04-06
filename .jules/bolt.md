## 2024-05-15 - [Batch Calendar Fetch]
**Learning:** Google Apps Script calendar operations (like `getEvents`) are notoriously slow. In loops, they easily become bottlenecks.
**Action:** Always batch fetch calendar events upfront using `getEvents(startDate, endDate)` when iterating over multiple entries, and use a hashmap (like a `Set`) locally in V8 for fast O(1) existence checks.
