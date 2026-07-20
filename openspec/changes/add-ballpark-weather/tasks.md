# Add Ballpark Weather Tasks

## 1. 對照資料與同步依賴

- [x] 1.1 依 `doc/location.md` 新增 `src/data/ballparks.js`，完整收錄
  11 個 canonical `location` 的 CWA 縣市／行政區，以及 10 個縣市的
  F-D0047 三日與一週資料集編號
- [x] 1.2 在 `package.json` 加入 `firebase-admin` 與 `sync-weather` script，
  確認 Node 22 可從既有 Firebase 設定取得 `databaseURL`

## 2. F-D0047 天氣同步

- [x] 2.1 新增 `scripts/sync-weather.js`，透過 Admin SDK 讀取
  `/schedules`，以 `Asia/Taipei` 篩選七個日曆日、驗證未知球場並依縣市
  合併不重複行政區
- [x] 2.2 使用 Node 原生 `fetch` 實作不洩漏 API Key 的 F-D0047 三日／
  一週查詢，將回應正規化為 `shortTerm`／`weekly`，並驗證球場、時間、
  `sourceIssuedAt` 與降雨機率
- [x] 2.3 實作新發布時間的完整 root multi-location update、相同
  `sourceIssuedAt` 的 metadata-only update，以及所有失敗保留既有
  `/weather` 的行為
- [x] 2.4 加入 `sync-weather -- --self-test`，用 Node `assert` 與固定資料
  覆蓋七日篩選、縣市合併、比賽時間窗、降雨機率驗證及相同發布時間分支

## 3. 自動排程與 Firebase 權限

- [x] 3.1 新增天氣同步 GitHub Actions workflow，設定七個
  `Asia/Taipei` 排程、`workflow_dispatch`、Node 22、`contents: read` 與
  `CWA_API_KEY`、`FIREBASE_SERVICE_ACCOUNT_ENJOY_CPBL` secrets
- [x] 3.2 更新 `database.rules.json`，讓 `/weather` 公開唯讀且拒絕 Web
  SDK 寫入，並確認 Admin SDK 仍能原子發布

## 4. 前端資料與選取邏輯

- [x] 4.1 在 `src/firebase.js` 新增唯讀 `getWeather()`，並讓
  `useSchedules` 獨立載入及回傳 `weatherData`，確保失敗不阻斷賽程
- [x] 4.2 新增 `src/utils/weather.js`，依球場、72 小時界線、比賽前四
  小時至後三小時重疊區段、`TBD` 與 `fetchedAt` 建立顯示模型
- [x] 4.3 由 `App` 將 `weatherData` 傳至 `Calendar`、`GameCard` 與
  `GameModal`，不新增全域狀態管理

## 5. 天氣介面

- [x] 5.1 在 `GameCard` 顯示最大降雨機率、逐十二小時趨勢或過期摘要，
  無資料時維持原卡片正常顯示
- [x] 5.2 在 `GameModal` 顯示預報區段、發布時間、同步時間、六／十二小時
  freshness 狀態及開賽時間未定提示
- [x] 5.3 補齊 desktop 與 mobile scoped SCSS，確認天氣內容不擠壓既有
  隊伍、標記及售票資訊

## 6. 驗證與上線

- [x] 6.1 執行天氣 `--self-test`、`npm run build` 與 Firebase Rules
  emulator 或等價檢查，驗證公開讀取及 Web SDK 寫入拒絕
- [ ] 6.2 將已取得的 `CWA_API_KEY` 設為 GitHub Actions secret，確認既有
  Firebase Service Account secret 可用，再手動執行 workflow 驗證
  `/weather` 與 `/lastSync/weather`
- [ ] 6.3 部署 Database Rules 與前端，驗證 72 小時內、第四至第七日、
  `TBD`、過期及同步失敗保留舊快照情境後保留排程執行

## 7. 卡片天氣圖示調整

- [x] 7.1 先新增失敗測試，覆蓋包含開賽時間的單一時段選取、CWA night
  圖示代碼、逐三小時氣溫範圍與逐十二小時 fallback
- [x] 7.2 擴充天氣同步 parser，保存 `WeatherCode`，並從三日資料的 `T`
  溫度點建立每個逐三小時時段的最低與最高氣溫
- [x] 7.3 調整 `src/utils/weather.js` 與 `GameCard`，只顯示最接近開賽時間的
  CWA 夜間圖示，desktop tooltip 顯示天氣、降雨機率與氣溫
- [x] 7.4 執行 self-test、前端邏輯測試、build 與 desktop/mobile 瀏覽器驗證

## 8. 強制重寫相同報次

- [x] 8.1 先新增失敗測試，確認 `--force` 會完整發布相同
  `sourceIssuedAt`，且預設分支仍只更新 metadata
- [x] 8.2 實作 `npm run sync-weather -- --force` 的 CLI 參數傳遞與完整
  root update，並執行 self-test、build 與 diff 檢查
