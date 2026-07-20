# Add Ballpark Weather Design

## Context

賽程由 `scripts/sync-schedules.js` 寫入 Firebase `/schedules`，前端再由
`useSchedules` 載入，經 `App` 傳給 `Calendar`、`GameCard` 與
`GameModal`。目前沒有天氣節點、伺服器端 Firebase SDK 或天氣同步
workflow。

`doc/location.md` 已列出 11 個賽程場地的 canonical `location` 與 CWA
縣市／行政區。CWA API Key 已取得；既有 Firebase Hosting workflow 已使用
`FIREBASE_SERVICE_ACCOUNT_ENJOY_CPBL`，可供新的同步 workflow 沿用。

## Goals / Non-Goals

**Goals:**

- 只查詢未來七個臺北日曆日內實際有賽事的不重複球場。
- 按縣市合併 F-D0047 查詢，避免逐球場重複請求。
- 讓 API Key 與 Service Account 只存在 GitHub Actions secrets。
- 完整驗證新快照後才原子發布；失敗時保留舊資料。
- 沿用現有 composable 與 props 資料流，讓天氣故障不阻斷賽程。

**Non-Goals:**

- 不保存歷史天氣、即時觀測、雷達圖或推播警報。
- 不在前端直接呼叫 CWA，也不提供天氣 proxy 或管理後台。
- 不替 `TBD` 比賽猜測開賽時間。
- 不新增 Pinia、排程服務、快取服務或 HTTP client 套件。

## Decisions

### 1. 使用單一靜態球場與資料集對照

新增 `src/data/ballparks.js`，以賽程 `location` 為 key，保存 CWA 縣市與
行政區；同一檔案保存各縣市 F-D0047 三日與一週資料集編號。同步腳本
直接 import，內容以 `doc/location.md` 與方案中的資料集表為準。

未知場地必須中止同步並列出名稱，不猜測行政區。相較把 11 筆低頻異動
資料放入 Firebase，此方式不需要第二組存取規則、管理 UI 或額外讀取。

### 2. 使用 GitHub Actions 執行單一 Node 同步腳本

新增 `scripts/sync-weather.js` 與 `sync-weather` npm script。workflow 在
`00:10`、`06:10`、`09:10`、`12:10`、`15:10`、`18:10`、`21:10`
執行並保留 `workflow_dispatch`，設定最小的 `contents: read` 權限。

腳本使用 Node 22 內建 `fetch` 與逾時訊號，不新增 Axios。只有
`firebase-admin` 作為新依賴，用既有 Service Account 與
`firebase-applet-config.json` 的 `databaseURL` 讀寫 Realtime Database；
自行實作 Service Account OAuth 簽章會增加無必要的安全程式碼。

替代的 Cloudflare Worker 需要另一個部署面與快取策略，且會在訪客請求時
才取得資料；本方案選擇預先同步至既有 Firebase。

### 3. 依縣市合併 F-D0047 查詢

腳本以 `Asia/Taipei` 的今天 `00:00` 為起點，篩選第七天 `00:00` 前的
賽程並依 `location` 去重，再按縣市分組。每個必要縣市各呼叫一次三日與
一次一週資料集，同縣市的行政區以單一 `LocationName` 參數合併。

按縣市合併可將最壞情況固定為每個有賽事縣市兩次請求。CWA Key 只放在
`Authorization` header；錯誤只記錄狀態碼與清理後摘要。

### 4. 在記憶體中建立固定快照

同步腳本直接包含 F-D0047 parser 與驗證，不為單一資料來源建立 adapter
或 class。正規化結構如下：

```text
weather
├─ fetchedAt: epoch milliseconds
├─ sourceIssuedAt: ISO 8601 string
├─ status: "ok"
└─ venues
   └─ <schedule location>
      ├─ locationName
      ├─ shortTerm[]
      └─ weekly[]
```

每個時段包含 `startAt`、`endAt`、`weather`，以及數值或 `null` 的
`rainProbability`；有可靠資料時可包含溫度範圍。時間一律正規化為含時區
的 ISO 8601 字串。

所有必要球場、行政區、時段與降雨機率都通過驗證，且資料集可歸屬同一
`sourceIssuedAt` 後，才允許發布。七日內無有效球場視為驗證失敗，不呼叫
CWA，也不以空快照覆蓋舊資料。

### 5. 使用 Firebase root multi-location update 原子發布

新 `sourceIssuedAt` 以一次 root `update` 同時取代 `/weather` 並更新
`/lastSync/weather`。任何查詢或驗證錯誤都發生在正式寫入前，因此不會
留下部分球場或混合新舊資料。

若 `sourceIssuedAt` 與現有快照相同，只用同一個 root `update` 更新
`/weather/fetchedAt` 與 `/lastSync/weather`；`venues` 保持不動。Firebase
快照本身就是前端讀取快取，不另建快取層或歷史節點。

### 6. 前端沿用既有載入與 props 流程

`src/firebase.js` 新增唯讀 `getWeather()`；`useSchedules` 新增獨立的
`weatherData` 與錯誤隔離載入。`App` 將資料傳給 `Calendar` 與
`GameModal`，`Calendar` 再傳給 `GameCard`，不新增全域狀態。

新增 `src/utils/weather.js` 純函式，依 `game.location` 與比賽時間建立顯示
模型：未來 72 小時內選取和開賽前四小時至後三小時重疊的 `shortTerm`
區段；較遠的七日內賽事選取該日 `weekly` 趨勢；`TBD` 不建立虛構時間窗。
同一純函式負責 6／12 小時 freshness 判斷，避免卡片與 Modal 重複邏輯。

### 7. 只增加一個可執行自我檢查

`scripts/sync-weather.js --self-test` 使用 Node 內建 `assert` 與固定 fixture，
覆蓋七日篩選、縣市合併、時間窗重疊、降雨機率驗證及相同發布時間分支。
不引入測試框架或多份 fixture。

### 8. Firebase Rules 只開放讀取

`database.rules.json` 新增 `weather` 的 `.read: true` 與 `.write: false`。
Admin SDK 使用 Service Account，可繞過 client rules；前端不新增任何天氣
寫入函式。

## Risks / Trade-offs

- [CPBL 新增或改名場地會使同步失敗] → log 明列未知 `location`，補入
  單一對照表後手動重跑。
- [CWA 回應欄位或資料集編號改變] → 嚴格驗證並保留上一版快照，修正
  parser 或對照後重跑。
- [各資料集短暫出現不同發布時間] → 不發布混合快照，等待下一次排程或手動重跑。
- [GitHub 排程延遲或暫停] → 避開整點、顯示 freshness，並保留手動執行。
- [公開唯讀天氣增加 Firebase 下載量] → 只保存一份精簡快照，不保存原始 CWA 回應或歷史資料。

## Migration Plan

1. 新增依賴、對照資料、同步腳本、自我檢查與 workflow，先執行離線檢查及 build。
2. 將已取得的 `CWA_API_KEY` 設為 GitHub Actions secret，確認既有
   Firebase Service Account secret 可用。
3. 部署 Database Rules，再以 `workflow_dispatch` 首次產生 `/weather`。
4. 驗證快照後部署前端，確認天氣失敗不影響賽程，再保留排程執行。
5. 若需回滾，停用 weather workflow 並回退前端天氣 props；既有賽程資料與流程不受影響。

## Open Questions

無。
