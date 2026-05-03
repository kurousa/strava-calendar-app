// ==========================================
// カレンダー取得ユーティリティ
// ==========================================
function getTargetCalendar(): GoogleAppsScript.Calendar.Calendar | null {
  const calendarId = PropertiesService.getScriptProperties().getProperty(
    Config.PROP_CALENDAR_ID,
  );
  if (calendarId) {
    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      Logger.log("エラー: 指定されたカレンダーが見つかりません。");
    }
    return calendar;
  }
  return CalendarApp.getDefaultCalendar();
}

/**
 * Retrieves a set of Strava activity IDs that are already present in the given calendar
 * within the specified date range.
 */
function getExistingActivityIds(
  calendar: GoogleAppsScript.Calendar.Calendar,
  startDate: Date,
  endDate: Date,
): Set<string> {
  const existingActivityIds = new Set<string>();

  try {
    // Use Advanced Calendar Service if available for much faster bulk reads
    if (
      typeof Calendar !== "undefined" &&
      Calendar.Events &&
      Calendar.Events.list
    ) {
      let pageToken: string | undefined;
      do {
        const response = Calendar.Events.list(calendar.getId(), {
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          q: Config.STRAVA_SEARCH_QUERY, // Search reduces the result set on the server
          maxResults: Config.CALENDAR_PAGE_SIZE,
          singleEvents: true,
          pageToken: pageToken,
          fields: "items(extendedProperties,description),nextPageToken", // Note: Keep in sync with fields used in the loop below
        });

        if (response.items) {
          const items = response.items;
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            // Fast path: use extended properties (avoids parsing)
            if (item.extendedProperties?.private?.[Config.STRAVA_TAG_KEY]) {
              existingActivityIds.add(
                item.extendedProperties.private[Config.STRAVA_TAG_KEY],
              );
            }
            // Fallback for older events: parse description directly from JSON (still much faster than GAS proxies)
            else if (item.description) {
              const desc = item.description;
              const prefix = Config.STRAVA_SEARCH_QUERY+ "/";
              const prefixLen = prefix.length;
              const idx = desc.indexOf(prefix);
              if (idx !== -1) {
                let endIdx = idx + prefixLen;
                const len = desc.length;
                while (endIdx < len) {
                  const charCode = desc.charCodeAt(endIdx);
                  if (charCode < 48 || charCode > 57) break;
                  endIdx++;
                }
                if (endIdx > idx + prefixLen) {
                  existingActivityIds.add(
                    desc.substring(idx + prefixLen, endIdx),
                  );
                }
              }
            }
          }
        }
        pageToken = response.nextPageToken;
      } while (pageToken);
      return existingActivityIds;
    }
  } catch (e) {
    Logger.log(
      `Advanced Calendar service error: ${e}, falling back to CalendarApp`,
    );
  }

  // Fallback if Advanced Service is somehow unavailable
  const existingEvents = calendar.getEvents(startDate, endDate, {
    search: Config.STRAVA_SEARCH_QUERY,
  });
  for (let i = 0; i < existingEvents.length; i++) {
    const event = existingEvents[i];
    const tag = event.getTag(Config.STRAVA_TAG_KEY);
    if (tag) {
      existingActivityIds.add(tag);
    } else {
      const desc = event.getDescription();
      if (desc) {
        const prefix = Config.STRAVA_SEARCH_QUERY + "/";
        const prefixLen = prefix.length;
        const idx = desc.indexOf(prefix);
        if (idx !== -1) {
          let endIdx = idx + prefixLen;
          const len = desc.length;
          while (endIdx < len) {
            const charCode = desc.charCodeAt(endIdx);
            if (charCode < 48 || charCode > 57) break;
            endIdx++;
          }
          if (endIdx > idx + prefixLen) {
            existingActivityIds.add(desc.substring(idx + prefixLen, endIdx));
          }
        }
      }
    }
  }

  return existingActivityIds;
}

/**
 * マップ画像をカレンダーイベントに添付する
 */
function attachMapToCalendarEvent_(
  activity: StravaActivity,
  calendar: GoogleAppsScript.Calendar.Calendar,
  event: GoogleAppsScript.Calendar.CalendarEvent,
): void {
  if (!activity.mapUrl || typeof saveMapToDrive !== "function") {
    return;
  }

  const fileName = `strava_map_${activity.id}.png`;
  const folder = getOrCreateMapFolder();
  const files = folder.getFilesByName(fileName);

  if (!files.hasNext()) {
    return;
  }

  const file = files.next();
  // Google Calendar API (v3) を使って添付ファイルを追加
  // 標準のIDは "event_id@google.com" 形式なので、ID部分のみ抽出
  const eventId = event.getId().split("@")[0];

  try {
    // global の Calendar オブジェクト (Advanced Service) を使用
    if (typeof Calendar === "undefined") {
      return;
    }

    Calendar.Events.patch(
      {
        attachments: [
          {
            fileUrl: file.getUrl(),
            title: file.getName(),
            mimeType: file.getMimeType(),
          },
        ],
      },
      calendar.getId(),
      eventId,
      {
        supportsAttachments: true,
      },
    );
    Logger.log(`添付ファイルを追加しました: ${fileName}`);
  } catch (e) {
    const errStr = (e as Error).toString();
    Logger.log(`添付ファイルの追加に失敗しました: ${errStr}`);
    const errorMsg = `[Calendar Error] 添付ファイルの追加に失敗しました: ${errStr}`;
    if (typeof sendErrorEmail === "function") sendErrorEmail(errorMsg);
  }
}

/**
 * アクティビティに付加情報（天気、AIコメント、ルートマップ）を追加する
 */
function enrichActivityData_(activity: StravaActivity, startTime: Date): void {
  if (activity.start_latlng && activity.start_latlng.length === 2) {
    if (typeof fetchWeatherData === "function") {
      Utilities.sleep(100);
      activity.weatherText = fetchWeatherData(
        activity.start_latlng[0],
        activity.start_latlng[1],
        startTime,
      );
    }
  }

  if (typeof generateAiComment === "function") {
    activity.aiComment = generateAiComment(activity);
  }

  if (activity.map && activity.map.summary_polyline) {
    if (typeof saveMapToDrive === "function") {
      const mapFile = saveMapToDrive(activity);
      if (mapFile) {
        activity.mapUrl = mapFile.getUrl();
      }
    }
  }
}

// ==========================================
// アクティビティをカレンダーに登録する共通処理
// ==========================================
function processActivityToCalendar(
  activity: StravaActivity,
  calendar: GoogleAppsScript.Calendar.Calendar,
  distanceActivitiesArg?: Set<string>,
  skipDuplicateCheck: boolean = false,
): string | undefined {
  const distanceActivities =
    distanceActivitiesArg || new Set(Config.DISTANCE_ACTIVITIES);
  // 時間の計算（Stravaは世界標準時なので、日本時間に合わせる必要があります）
  const startTime = new Date(activity.start_date);
  const endTime = new Date(startTime.getTime() + activity.elapsed_time * 1000);

  // 既に登録済みのアクティビティかどうかを判定する (in-lined)
  // ⚡ Bolt: skipDuplicateCheck フラグで事前チェックをバイパスできるように変更
  if (!skipDuplicateCheck) {
    const existingEvents = calendar.getEvents(startTime, endTime);
    const isDuplicate = existingEvents.some((event) => {
      const desc = event.getDescription();
      return desc && desc.includes(`${Config.STRAVA_SEARCH_QUERY}/${activity.id}`);
    });

    if (isDuplicate) {
      Logger.log(`スキップ: 既に登録済みのアクティビティです: ${activity.id}`);
      return "skipped";
    }
  }

  // ーーー ここから下は「新規」の時しか実行されない ーーー

  enrichActivityData_(activity, startTime);

  const title = generateEventTitle_(activity, distanceActivities);
  const style = getActivityStyle(activity.type);

  // カレンダーに登録する詳細メモ
  const description = makeDescription(activity);

  Logger.log("[DEBUG]以下の情報がカレンダーに登録されます");
  Logger.log("[DEBUG]startTime -> " + startTime);
  Logger.log("[DEBUG]endTime -> " + endTime);
  Logger.log("[DEBUG]title -> " + title);

  // カレンダーに予定として作成
  const event = calendar.createEvent(title, startTime, endTime, {
    description: description,
  });

  // ⚡ Bolt Optimization: Tag the event for lightning-fast lookups in getExistingActivityIds
  try {
    event.setTag(Config.STRAVA_TAG_KEY, String(activity.id));
  } catch (e) {
    Logger.log(`イベントタグの設定に失敗しました: ${e}`);
  }

  // 【追加】マップ画像をカレンダーに添付する
  attachMapToCalendarEvent_(activity, calendar, event);

  // イベントに色を設定する
  if (style.color) {
    event.setColor(style.color);
  }

  // カレンダーAPIの連続作成制限を回避しつつ、GASの実行時間制限(6分)に配慮
  // 重複スキップ時は待機せず、カレンダーへの新規書き込みが行われた直後のみ短時間待機する
  Utilities.sleep(Config.CALENDAR_API_DELAY_MS);

  Logger.log(`カレンダーに登録しました: ID ${activity.id}`);
  return "success";
}

/**
 * カレンダーイベントのタイトルを生成する
 */
function generateEventTitle_(
  activity: StravaActivity,
  distanceActivities: Set<string>,
): string {
  const type = activity.type;
  const style = getActivityStyle(type);
  const distanceKm = (activity.distance / 1000).toFixed(1);
  const emoji = style.emoji;

  const hasDistance = distanceActivities.has(type) && activity.distance > 0;

  return hasDistance
    ? `[${emoji} ${type}] ${activity.name} - ${distanceKm}km`
    : `[${emoji} ${type}] ${activity.name}`;
}


if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getTargetCalendar,
    getExistingActivityIds,
    attachMapToCalendarEvent_,
    processActivityToCalendar,
    generateEventTitle_,
    enrichActivityData_,
  };
}
