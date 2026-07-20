# Add Ballpark Weather Proposal

## Why

目前使用者查看賽程時，無法直接判斷比賽時段的球場天氣與降雨風險。
CWA API Key 已取得，可由 GitHub Actions 定期同步未來七天有賽事球場的
預報至 Firebase，讓前端安全地讀取天氣而不接觸金鑰。

## What Changes

- 建立賽程場地與 CWA 縣市、行政區及 F-D0047 三日／一週資料集的靜態對照。
- 新增 GitHub Actions 定時與手動天氣同步流程，只查詢未來七個臺北日曆日內有賽事的不重複球場。
- 將 CWA F-D0047 回應正規化並整批驗證，再原子更新 Firebase
  `/weather` 與 `/lastSync/weather`。
- 相同 `sourceIssuedAt` 不重寫完整快照；同步或驗證失敗時保留上一版有效資料。
- 新增公開唯讀的 Firebase `/weather` 規則與前端讀取函式。
- 在賽程卡片與賽事詳情顯示比賽時段天氣、最大降雨機率、發布／同步時間及過期狀態；天氣不可用時不影響賽程。

## Capabilities

### New Capabilities

- `ballpark-weather`: 定義 F-D0047 預報同步、Firebase 快照發布、過期判斷與賽事天氣顯示行為。

### Modified Capabilities

無。

## Impact

- 新增球場與資料集對照、天氣同步腳本、最小可執行檢查及 GitHub Actions workflow。
- 新增 `firebase-admin` 作為同步腳本的伺服器端依賴；前端仍使用現有 Firebase Web SDK。
- 擴充 `src/firebase.js`、`src/composables/useSchedules.js`、
  `src/App.vue`、`Calendar.vue`、`GameCard.vue` 與 `GameModal.vue` 的既有資料流。
- 更新 `database.rules.json`，新增公開讀取、前端禁止寫入的 `/weather` 節點。
- GitHub repository 需設定已取得的 `CWA_API_KEY`，並沿用
  `FIREBASE_SERVICE_ACCOUNT_ENJOY_CPBL`。
