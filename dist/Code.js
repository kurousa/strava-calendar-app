var global = this;

"use strict";
(() => {
  // src/auth.ts
  function getOAuthService() {
    const scriptProps = PropertiesService.getScriptProperties();
    const CLIENT_ID = scriptProps.getProperty("STRAVA_CLIENT_ID");
    const CLIENT_SECRET = scriptProps.getProperty("STRAVA_CLIENT_SECRET");
    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error("STRAVA_CLIENT_ID \u307E\u305F\u306F STRAVA_CLIENT_SECRET \u304C\u30B9\u30AF\u30EA\u30D7\u30C8\u30D7\u30ED\u30D1\u30C6\u30A3\u306B\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002");
    }
    return OAuth2.createService("Strava").setAuthorizationBaseUrl("https://www.strava.com/oauth/authorize").setTokenUrl("https://www.strava.com/oauth/token").setClientId(CLIENT_ID).setClientSecret(CLIENT_SECRET).setCallbackFunction("authCallback").setPropertyStore(PropertiesService.getUserProperties()).setScope("activity:read_all");
  }
  function authCallback(request) {
    const service = getOAuthService();
    const authorized = service.handleCallback(request);
    if (authorized) {
      return HtmlService.createHtmlOutput("\u8A8D\u8A3C\u304C\u6210\u529F\u3057\u307E\u3057\u305F\u3002\u3053\u306E\u30BF\u30D6\u306F\u9589\u3058\u3066\u3001GAS\u306E\u753B\u9762\u306B\u623B\u3063\u3066\u304F\u3060\u3055\u3044\u3002");
    } else {
      return HtmlService.createHtmlOutput("\u8A8D\u8A3C\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002");
    }
  }
  function startAuth() {
    const service = getOAuthService();
    if (service.hasAccess()) {
      Logger.log("\u3059\u3067\u306BStrava\u3068\u306E\u9023\u643A\u306F\u5B8C\u4E86\u3057\u3066\u3044\u307E\u3059");
    } else {
      const authorizationUrl = service.getAuthorizationUrl();
      Logger.log("\u4EE5\u4E0B\u306EURL\u3092\u30B3\u30D4\u30FC\u3057\u3066\u3001\u30D6\u30E9\u30A6\u30B6\u306E\u65B0\u3057\u3044\u30BF\u30D6\u3067\u958B\u3044\u3066\u304F\u3060\u3055\u3044:");
      Logger.log(authorizationUrl);
    }
  }
  function resetAuth() {
    getOAuthService().reset();
    Logger.log("\u9023\u643A\u3092\u89E3\u9664\u3057\u307E\u3057\u305F\u3002");
  }

  // src/api.ts
  var API_BASE = "https://www.strava.com/api/v3";
  var STRAVA_API_DELAY_MS = 200;
  function getStravaActivities(afterDate, beforeDate, perPage = 200) {
    const service = getOAuthService();
    if (!service.hasAccess()) {
      const errorMsg = "Strava\u3068\u9023\u643A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002startAuth\u3092\u5B9F\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
      Logger.log("\u30A8\u30E9\u30FC: " + errorMsg);
      sendErrorEmail(errorMsg);
      return [];
    }
    let allActivities = [];
    let page = 1;
    const baseParams = getSearchParam(afterDate, beforeDate, perPage);
    while (true) {
      const currentParams = { ...baseParams, page };
      const queryString = Object.keys(currentParams).map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(currentParams[key])).join("&");
      const url = `${API_BASE}/athlete/activities?${queryString}`;
      console.log(`[API Request] URL: ${url}`);
      try {
        const response = UrlFetchApp.fetch(url, {
          headers: {
            Authorization: "Bearer " + service.getAccessToken()
          },
          muteHttpExceptions: true
        });
        if (response.getResponseCode() !== 200) {
          Logger.log(`[API Error] ${response.getContentText()}`);
          break;
        }
        const activities = JSON.parse(response.getContentText());
        if (activities.length === 0) {
          break;
        }
        allActivities = allActivities.concat(activities);
        Logger.log(`\u30DA\u30FC\u30B8 ${page} \u304B\u3089 ${activities.length} \u4EF6\u53D6\u5F97\u3057\u307E\u3057\u305F...`);
        if (activities.length < perPage) {
          break;
        }
        page++;
        Utilities.sleep(STRAVA_API_DELAY_MS);
      } catch (e) {
        const errorMsg = "Strava API\u306E\u547C\u3073\u51FA\u3057\u306B\u5931\u6557\u3057\u307E\u3057\u305F: " + e.toString();
        Logger.log("\u30A8\u30E9\u30FC: " + errorMsg);
        sendErrorEmail(errorMsg);
        break;
      }
    }
    Logger.log(`\u5408\u8A08 ${allActivities.length}\u4EF6\u306E\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u304C\u898B\u3064\u304B\u308A\u307E\u3057\u305F\u3002`);
    return allActivities;
  }
  function getSearchParam(afterDate, beforeDate, perPage) {
    const params = {};
    if (perPage) {
      params.per_page = perPage;
    }
    if (afterDate) {
      params.after = convertToTime(afterDate);
    } else {
      const yesterday = /* @__PURE__ */ new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      params.after = convertToTime(yesterday);
    }
    if (beforeDate) {
      params.before = convertToTime(beforeDate);
    } else {
      const today = /* @__PURE__ */ new Date();
      params.before = convertToTime(today);
    }
    return params;
  }
  function convertToTime(date) {
    return Math.floor(date.getTime() / 1e3);
  }

  // src/formatters/RideFormatter.ts
  function makeRideDescription(activity) {
    const { distanceKm, timeMin, elevation, hr } = getCommonMetrics(activity);
    const speedKmh = activity.average_speed ? (activity.average_speed * 3.6).toFixed(1) : 0;
    const wattsText = activity.average_watts ? `\u5E73\u5747\u30D1\u30EF\u30FC: ${activity.average_watts} W
` : "";
    const cadenceText = activity.average_cadence ? `\u5E73\u5747\u30B1\u30A4\u30C7\u30F3\u30B9: ${activity.average_cadence} rpm
` : "";
    return `
\u8DDD\u96E2: ${distanceKm} km
\u6642\u9593: ${timeMin} \u5206
\u5E73\u5747\u901F\u5EA6: ${speedKmh} km/h
\u7372\u5F97\u6A19\u9AD8: ${elevation} m
\u5E73\u5747\u5FC3\u62CD\u6570: ${hr}
${wattsText}${cadenceText}\u8A73\u7D30: https://www.strava.com/activities/${activity.id}
  `.trim();
  }

  // src/formatters/RunFormatter.ts
  function makeRunDescription(activity) {
    const { distanceKm, timeMin, elevation, hr } = getCommonMetrics(activity);
    let paceText = "\u6E2C\u5B9A\u306A\u3057";
    if (activity.average_speed > 0) {
      const secondsPerKm = 1e3 / activity.average_speed;
      const paceMin = Math.floor(secondsPerKm / 60);
      const paceSec = Math.floor(secondsPerKm % 60).toString().padStart(2, "0");
      paceText = `${paceMin}'${paceSec}" /km`;
    }
    return `
\u8DDD\u96E2: ${distanceKm} km
\u6642\u9593: ${timeMin} \u5206
\u30DA\u30FC\u30B9: ${paceText}
\u7372\u5F97\u6A19\u9AD8: ${elevation} m
\u5E73\u5747\u5FC3\u62CD\u6570: ${hr}

\u8A73\u7D30: https://www.strava.com/activities/${activity.id}
  `.trim();
  }

  // src/formatters/DefaultFormatter.ts
  function getCommonMetrics(activity) {
    return {
      distanceKm: ((activity.distance || 0) / 1e3).toFixed(1),
      timeMin: Math.floor((activity.moving_time || 0) / 60),
      elevation: activity.total_elevation_gain || 0,
      hr: activity.has_heartrate ? activity.average_heartrate + " bpm" : "\u6E2C\u5B9A\u306A\u3057"
    };
  }
  function makeDefaultDescription(activity) {
    let descriptionLines = [];
    if (activity.distance && activity.distance > 0) {
      const distanceKm = (activity.distance / 1e3).toFixed(1);
      descriptionLines.push(`\u8DDD\u96E2: ${distanceKm} km`);
    }
    if (activity.moving_time && activity.moving_time > 0) {
      const timeMin = Math.floor(activity.moving_time / 60);
      descriptionLines.push(`\u6642\u9593: ${timeMin} \u5206`);
    }
    if (activity.total_elevation_gain && activity.total_elevation_gain > 0) {
      descriptionLines.push(`\u7372\u5F97\u6A19\u9AD8: ${activity.total_elevation_gain} m`);
    }
    if (activity.has_heartrate && activity.average_heartrate) {
      descriptionLines.push(`\u5E73\u5747\u5FC3\u62CD\u6570: ${activity.average_heartrate} bpm`);
    }
    descriptionLines.push("");
    descriptionLines.push(`\u8A73\u7D30: https://www.strava.com/activities/${activity.id}`);
    return descriptionLines.join("\n").trim();
  }
  function deepFreeze(object) {
    const propNames = Object.getOwnPropertyNames(object);
    for (const name of propNames) {
      const value = object[name];
      if (value && typeof value === "object") {
        deepFreeze(value);
      }
    }
    return Object.freeze(object);
  }
  var ACTIVITY_STYLES_CACHE = null;
  var DEFAULT_ACTIVITY_STYLE_CACHE = null;
  function initStyles() {
    ACTIVITY_STYLES_CACHE = deepFreeze({
      "Walk": { emoji: "\u{1F6B6}", color: CalendarApp.EventColor.GREEN },
      "Run": { emoji: "\u{1F3C3}", color: CalendarApp.EventColor.BLUE },
      "VirtualRun": { emoji: "\u{1F3C3}", color: CalendarApp.EventColor.BLUE },
      "Ride": { emoji: "\u{1F6B4}", color: CalendarApp.EventColor.RED },
      "VirtualRide": { emoji: "\u{1F6B4}", color: CalendarApp.EventColor.RED },
      "Swim": { emoji: "\u{1F3CA}", color: CalendarApp.EventColor.CYAN },
      "Hike": { emoji: "\u{1F97E}", color: CalendarApp.EventColor.PALE_GREEN },
      "Workout": { emoji: "\u{1F3CB}\uFE0F", color: CalendarApp.EventColor.ORANGE },
      "WeightTraining": { emoji: "\u{1F3CB}\uFE0F", color: CalendarApp.EventColor.ORANGE }
    });
    DEFAULT_ACTIVITY_STYLE_CACHE = Object.freeze({ emoji: "\u{1F3C5}", color: CalendarApp.EventColor.GRAY });
  }
  function getActivityStyle(type) {
    if (!ACTIVITY_STYLES_CACHE) {
      initStyles();
    }
    return ACTIVITY_STYLES_CACHE[type] || DEFAULT_ACTIVITY_STYLE_CACHE;
  }
  function makeDescription(activity) {
    console.log(`[DEBUG] activity type: ${activity.type}`);
    if (activity.type === "Ride" || activity.type === "VirtualRide") {
      return makeRideDescription(activity);
    } else if (activity.type === "Run" || activity.type === "Walk") {
      return makeRunDescription(activity);
    } else {
      return makeDefaultDescription(activity);
    }
  }

  // src/main.ts
  var CALENDAR_API_DELAY_MS = 200;
  var DISTANCE_ACTIVITIES = /* @__PURE__ */ new Set([
    "Run",
    "Ride",
    "Walk",
    "Hike",
    "Swim",
    "AlpineSki",
    "BackcountrySki",
    "NordicSki",
    "RollerSki",
    "Canoeing",
    "Kayaking",
    "Rowing",
    "StandUpPaddling",
    "Surfing",
    "Sail",
    "Windsurf",
    "IceSkate",
    "InlineSkate",
    "Skateboard",
    "Snowshoe",
    "Kitesurf",
    "VirtualRide",
    "VirtualRun",
    "GravelRide",
    "MountainBikeRide",
    "EMountainBikeRide",
    "Velomobile",
    "Handcycle",
    "Wheelchair"
  ]);
  function main() {
    const yesterday = /* @__PURE__ */ new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const activities = getStravaActivities(yesterday, /* @__PURE__ */ new Date());
    if (activities.length === 0) {
      Logger.log("\u767B\u9332\u3059\u308B\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u304C\u3042\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002");
      return;
    }
    Logger.log("[DEBUG]\u53D6\u5F97\u3067\u304D\u305F\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u306E\u6570: " + activities.length + ", \u6700\u521D\u306E\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3ID: " + activities[0].id);
    const calendar = getTargetCalendar();
    if (!calendar) {
      Logger.log("\u30AB\u30EC\u30F3\u30C0\u30FC\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002");
      return;
    }
    Logger.log(`[DEBUG]\u767B\u9332\u5148calendar: ${calendar.getName()}`);
    activities.forEach((activity) => {
      processActivityToCalendar(activity, calendar);
    });
  }
  function sendErrorEmail(message) {
    const email = Session.getEffectiveUser().getEmail();
    if (!email) {
      Logger.log("\u901A\u77E5\u5148\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u3092\u53D6\u5F97\u3067\u304D\u306A\u304B\u3063\u305F\u305F\u3081\u3001\u30E1\u30FC\u30EB\u9001\u4FE1\u3092\u30B9\u30AD\u30C3\u30D7\u3057\u307E\u3057\u305F\u3002");
      return;
    }
    const props = PropertiesService.getUserProperties();
    const lastNotified = props.getProperty("LAST_ERROR_NOTIFIED_AT");
    const now = (/* @__PURE__ */ new Date()).getTime();
    if (lastNotified && now - parseInt(lastNotified) < 24 * 60 * 60 * 1e3) {
      return;
    }
    const subject = "\u3010Strava\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u9023\u643A\u3011Strava\u3068\u306E\u9023\u643A\u3067\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002";
    const body = "Strava\u3068\u306E\u9023\u643A\u3067\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002\n\n\u30A8\u30E9\u30FC\u5185\u5BB9:\n" + message;
    MailApp.sendEmail(email, subject, body);
    props.setProperty("LAST_ERROR_NOTIFIED_AT", now.toString());
    Logger.log("\u30A8\u30E9\u30FC\u30E1\u30FC\u30EB\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F: " + email);
  }
  function processActivityToCalendar(activity, calendar, distanceActivities = DISTANCE_ACTIVITIES, skipDuplicateCheck = false) {
    const startTime = new Date(activity.start_date);
    const endTime = new Date(startTime.getTime() + activity.elapsed_time * 1e3);
    if (!skipDuplicateCheck) {
      const existingEvents = calendar.getEvents(startTime, endTime);
      const isDuplicate = existingEvents.some((event2) => {
        const desc = event2.getDescription();
        return desc && desc.includes(`strava.com/activities/${activity.id}`);
      });
      if (isDuplicate) {
        Logger.log(`\u30B9\u30AD\u30C3\u30D7: \u65E2\u306B\u767B\u9332\u6E08\u307F\u306E\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u3067\u3059: ${activity.id}`);
        return "skipped";
      }
    }
    const type = activity.type;
    const style = getActivityStyle(type);
    const distanceKm = (activity.distance / 1e3).toFixed(1);
    const hasDistance = distanceActivities.has(type) && activity.distance > 0;
    const title = hasDistance ? `[${type}] ${activity.name} - ${distanceKm}km` : `[${type}] ${activity.name}`;
    const description = makeDescription(activity);
    Logger.log("[DEBUG]\u4EE5\u4E0B\u306E\u60C5\u5831\u304C\u30AB\u30EC\u30F3\u30C0\u30FC\u306B\u767B\u9332\u3055\u308C\u307E\u3059");
    Logger.log("[DEBUG]startTime -> " + startTime);
    Logger.log("[DEBUG]endTime -> " + endTime);
    const event = calendar.createEvent(title, startTime, endTime, {
      description
    });
    if (style.color) {
      event.setColor(style.color);
    }
    Utilities.sleep(CALENDAR_API_DELAY_MS);
    Logger.log(`\u30AB\u30EC\u30F3\u30C0\u30FC\u306B\u767B\u9332\u3057\u307E\u3057\u305F: ID ${activity.id}`);
    return "success";
  }
  function getTargetCalendar() {
    const CALENDAR_ID = PropertiesService.getScriptProperties().getProperty("CALENDAR_ID");
    if (CALENDAR_ID) {
      const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
      if (!calendar) {
        Logger.log("\u30A8\u30E9\u30FC: \u6307\u5B9A\u3055\u308C\u305F\u30AB\u30EC\u30F3\u30C0\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002");
      }
      return calendar;
    }
    return CalendarApp.getDefaultCalendar();
  }
  function doGet() {
    return HtmlService.createHtmlOutputFromFile("index").setTitle("Strava \u30AB\u30EC\u30F3\u30C0\u30FC\u30A4\u30F3\u30DD\u30FC\u30C8");
  }

  // src/manual_import.ts
  function importPastActivitiesFromWeb(startStr, endStr) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!startStr || !endStr || !dateRegex.test(startStr) || !dateRegex.test(endStr)) {
      const msg = "\u30A8\u30E9\u30FC: \u65E5\u4ED8\u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093 (YYYY-MM-DD)\u3002";
      Logger.log(msg);
      return msg;
    }
    const startDate = /* @__PURE__ */ new Date(`${startStr}T00:00:00`);
    const endDate = /* @__PURE__ */ new Date(`${endStr}T23:59:59`);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      const msg = "\u30A8\u30E9\u30FC: \u7121\u52B9\u306A\u65E5\u4ED8\u304C\u6307\u5B9A\u3055\u308C\u307E\u3057\u305F\u3002";
      Logger.log(msg);
      return msg;
    }
    if (startDate > endDate) {
      const msg = "\u30A8\u30E9\u30FC: \u958B\u59CB\u65E5\u306F\u7D42\u4E86\u65E5\u3088\u308A\u524D\u306E\u65E5\u4ED8\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
      Logger.log(msg);
      return msg;
    }
    return importPastActivities(startDate, endDate);
  }
  function importPastActivities(startDate, endDate, perPage = 200) {
    if (!startDate || !endDate) {
      startDate = /* @__PURE__ */ new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      endDate = /* @__PURE__ */ new Date();
      Logger.log("\u203B\u5F15\u6570\u304C\u6307\u5B9A\u3055\u308C\u3066\u3044\u306A\u3044\u305F\u3081\u3001\u76F4\u8FD11\u30F6\u6708\u306E\u671F\u9593\u3067\u5B9F\u884C\u3057\u307E\u3059\u3002");
    }
    Logger.log(`[Import] ${startDate.toLocaleDateString()} \u304B\u3089 ${endDate.toLocaleDateString()} \u306E\u30C7\u30FC\u30BF\u3092\u53D6\u308A\u8FBC\u307F\u307E\u3059...`);
    const activities = getStravaActivities(startDate, endDate, perPage);
    if (activities.length === 0) {
      const msg = "\u8A72\u5F53\u3059\u308B\u671F\u9593\u306E\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u306F\u3042\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002";
      return msg;
    }
    const calendar = getTargetCalendar();
    if (!calendar) return "\u30AB\u30EC\u30F3\u30C0\u30FC\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002";
    let successCount = 0;
    let skipCount = 0;
    const existingEvents = calendar.getEvents(startDate, endDate);
    const existingActivityIds = /* @__PURE__ */ new Set();
    existingEvents.forEach((event) => {
      const desc = event.getDescription();
      if (desc) {
        const match = desc.match(/strava\.com\/activities\/(\d+)/);
        if (match && match[1]) {
          existingActivityIds.add(match[1]);
        }
      }
    });
    Logger.log(`[Import] \u65E2\u306B\u30AB\u30EC\u30F3\u30C0\u30FC\u306B\u3042\u308B\u30A4\u30D9\u30F3\u30C8\u3092 ${existingActivityIds.size} \u4EF6\u691C\u51FA\u3057\u307E\u3057\u305F\u3002`);
    activities.forEach((activity) => {
      const activityIdStr = String(activity.id);
      if (existingActivityIds.has(activityIdStr)) {
        Logger.log(`\u30B9\u30AD\u30C3\u30D7: \u65E2\u306B\u767B\u9332\u6E08\u307F\u306E\u30A2\u30AF\u30C6\u30A3\u30D3\u30C6\u30A3\u3067\u3059: ${activity.id}`);
        skipCount++;
        return;
      }
      const result = processActivityToCalendar(activity, calendar, void 0, true);
      if (result === "skipped") skipCount++;
      if (result === "success") successCount++;
    });
    const resultMsg = `\u2705 \u5B8C\u4E86! \u65B0\u898F\u767B\u9332: ${successCount}\u4EF6 / \u30B9\u30AD\u30C3\u30D7: ${skipCount}\u4EF6`;
    Logger.log(resultMsg);
    return resultMsg;
  }
})();
