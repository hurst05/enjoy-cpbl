# 球場天氣方案一：Firebase Hosting 與 Cloudflare Worker

## 目標

使用者開啟網頁並載入賽程後，才透過 Cloudflare Worker 查詢今天起七個
日曆日內實際有賽事球場的天氣。CWA API 授權碼只存在 Worker Secret，
不進入前端建置檔案，也不將天氣寫入 Firebase Realtime Database。

## 共通產品規則

- 查詢範圍為臺北時間今天 `00:00` 起，到第七天 `00:00` 前。
- 同一球場有多場比賽時，只查詢一次球場天氣。
- 開賽前三天使用逐三小時預報。
- 每場比賽分析窗為開賽前四小時至開賽後三小時。
- 第四至第七天只顯示逐十二小時天氣趨勢。
- 開賽時間缺失或為 `TBD` 時，不推測預設時間。
- 顯示氣象資料發布時間、取得時間及資料是否過期。
- 大巨蛋標示為室內賽事，天氣資訊定位為交通與進場參考。

## 架構

```text
Firebase Hosting
      │
      │ 1. 讀取 Firebase 賽程
      ▼
Vue 前端
      │
      │ 2. 篩選今天起七天賽事
      │ 3. 去除重複球場
      ▼
Cloudflare Worker
      │
      ├─ 驗證球場代碼
      ├─ 檢查 Cache
      │    ├─ 命中：直接回傳
      │    └─ 未命中：查詢 CWA
      ▼
CWA F-D0047 REST API
```

## 前端請求流程

前端應在既有 `initSchedules()` 完成後執行以下步驟：

1. 從 `scheduleData` 篩選今天起七個日曆日內的賽事。
2. 排除沒有球場或不支援的場地。
3. 使用 `Set` 取得不重複球場代碼。
4. 對球場代碼排序，產生穩定的 GET 請求。
5. 呼叫 Worker 並取得正規化後的球場預報。
6. 依每場比賽的日期與時間計算七小時天氣窗。

請求範例：

```text
/api/weather?venues=大巨蛋,天母,新莊
```

請求只包含球場代碼，不傳入隊伍、場次或 `gameId`，避免相同天氣產生
大量不同快取鍵。

## Worker 職責

- 驗證 `venues` 僅包含預先定義的 CPBL 球場代碼。
- 限制單次球場數量，例如最多十五個。
- 以 `doc/location.md` 的 `LocationsName` 與 `LocationName` 對照球場。
- 依縣市分組，分別查詢 F-D0047 三日與一週 REST 資料集。
- 同一縣市有多個球場時，以多個 `LocationName` 合併查詢。
- 將 CWA 原始格式轉成前端需要的固定 JSON 格式。
- 設定 CWA 請求逾時與錯誤處理。
- 快取成功回應，不快取驗證錯誤或 CWA 失敗回應。
- 不接受使用者指定 URL、縣市、行政區或資料集編號。

## F-D0047 資料集對照

球場與行政區以 [location.md](location.md) 為準。依該文件目前涵蓋的縣市，
REST 資料集如下：

| 縣市 | 三日逐三小時 | 一週逐十二小時 |
| --- | --- | --- |
| 嘉義市 | `F-D0047-057` | `F-D0047-059` |
| 新北市 | `F-D0047-069` | `F-D0047-071` |
| 高雄市 | `F-D0047-065` | `F-D0047-067` |
| 臺北市 | `F-D0047-061` | `F-D0047-063` |
| 花蓮縣 | `F-D0047-041` | `F-D0047-043` |
| 雲林縣 | `F-D0047-025` | `F-D0047-027` |
| 臺東縣 | `F-D0047-037` | `F-D0047-039` |
| 臺中市 | `F-D0047-073` | `F-D0047-075` |
| 桃園市 | `F-D0047-005` | `F-D0047-007` |
| 臺南市 | `F-D0047-077` | `F-D0047-079` |

例如洲際球場只需查詢臺中市資料集，並以 `LocationName=北屯區` 篩選：

```text
GET /api/v1/rest/datastore/F-D0047-073
    ?LocationName=北屯區
    &ElementName=3小時降雨機率,天氣現象,天氣預報綜合描述
```

CWA 授權碼應放在 HTTP `Authorization` Header，不放在 URL query string。

## 快取策略

建議使用以下快取期限：

- 瀏覽器快取十五分鐘。
- Cloudflare 共用快取一小時。
- CWA 暫時失敗時，允許使用最多六小時的舊資料。

概念設定：

```text
Cache-Control: public, max-age=900, s-maxage=3600,
stale-while-revalidate=21600
```

CWA 預報約每六小時更新，一小時共用快取可避免每位訪客都消耗一次
CWA API 額度，同時保留合理的新鮮度。

快取鍵必須以排序後的球場代碼組成，確保所有使用者對相同賽程共用
同一份快取。

## Worker Secret 與存取控制

Cloudflare Worker 需要以下 Secret：

```text
CWA_API_KEY
```

安全要求：

- 授權碼不得出現在 repository、前端環境變數或回應內容。
- CWA 錯誤訊息不得原樣回傳，以免洩漏請求資訊。
- CORS 僅允許正式 Firebase 網域、自訂網域及本機開發網域。
- 未知球場、空球場清單及超過數量上限的請求應回傳 `400`。
- Worker 不得成為可代理任意外部網址的通用 proxy。

## 回傳資料

建議以球場為索引：

```json
{
  "fetchedAt": "2026-07-20T12:10:00+08:00",
  "sourceIssuedAt": "2026-07-20T11:30:00+08:00",
  "stale": false,
  "venues": {
    "洲際": {
      "locationName": "北屯區",
      "shortTerm": [],
      "weekly": []
    }
  }
}
```

`shortTerm` 保存逐三小時降雨機率；`weekly` 保存逐十二小時天氣現象。
比賽窗最大降雨機率由前端依賽事時間計算，避免把每場比賽加入 Worker
快取鍵。

## 前端整合

沿用既有資料流，不新增 Pinia 或其他全域狀態套件：

```text
useSchedules
   ├─ scheduleData
   └─ weatherData
          │
          ▼
       Calendar
          │
          ├─ GameCard：天氣圖示與比賽窗最大降雨機率
          └─ GameModal：完整時段預報
```

## 失敗處理

- Worker 失敗時，賽程仍須正常顯示。
- 有可用舊快取時，回傳舊資料並設定 `stale: true`。
- 完全沒有天氣資料時，卡片不顯示天氣，詳情顯示暫時無法取得。
- 單一球場失敗不應阻止其他球場回傳。
- 前端不得因預報資料格式錯誤而中斷整個月曆渲染。

## 預計異動範圍

- 建立一份供程式使用的球場對照資料，內容以 `doc/location.md` 為準。
- 建立縣市與 F-D0047 三日、一週資料集的對照。
- 新增 Cloudflare Worker 專案與部署設定。
- 擴充 `useSchedules` 載入天氣資料。
- 將天氣資料傳入 `Calendar`、`GameCard` 與 `GameModal`。
- 新增一個最小可執行檢查，驗證時間窗重疊與最大降雨機率計算。

## 成本與限制

Cloudflare Workers Free 目前提供每日 100,000 次請求。超過免費上限時
停止提供 Worker 服務，不會自動產生超額帳單。

參考：[Cloudflare Workers 定價](https://developers.cloudflare.com/workers/platform/pricing/)

主要限制：

- 多一個 Cloudflare 專案需要維護。
- 第一位訪客遇到快取未命中時，需要等待 CWA 回應。
- 不同 Cloudflare 節點可能各自產生一次快取未命中。
- 網站沒有訪客時，不會預先取得天氣。

## 驗收條件

- 前端建置檔案不存在 CWA API 授權碼。
- 只查詢今天起七天內實際有賽事的不重複球場。
- 相同球場集合在一小時內不會再次呼叫 CWA。
- Worker 故障不影響賽程顯示。
- 未知球場不能被用來查詢任意行政區、資料集或外部網址。
- 天氣資料顯示發布時間、取得時間及過期狀態。

## 參考資料

- [CWA API 使用說明](https://opendata.cwa.gov.tw/devManual/insrtuction)
- [CWA 鄉鎮預報產品說明](https://opendata.cwa.gov.tw/opendatadoc/Forecast/F-D0047-001_093.pdf)
- [Cloudflare Workers 限制](https://developers.cloudflare.com/workers/platform/limits/)
