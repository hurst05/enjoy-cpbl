# 球場天氣方案二：GitHub Actions 定期同步至 Firebase

## 目標

由 GitHub Actions 定時讀取 Firebase 賽程、查詢今天起七個日曆日內
實際有賽事球場的 CWA 預報，再將精簡結果寫入 Firebase Realtime
Database。前端只讀 Firebase，不直接接觸 CWA API。

## 共通產品規則

- 查詢範圍為臺北時間今天 `00:00` 起，到第七天 `00:00` 前。
- 同一球場有多場比賽時，只查詢一次球場天氣。
- 開賽前三天使用逐三小時預報。
- 每場比賽分析窗為開賽前四小時至開賽後三小時。
- 第四至第七天只顯示逐十二小時天氣趨勢。
- 開賽時間缺失或為 `TBD` 時，不推測預設時間。
- 顯示氣象資料發布時間、同步時間及資料是否過期。
- 不保存歷史天氣，每次只保留最新完整快照。

## 架構

```text
GitHub Actions
      │
      │ 1. 讀取 Firebase schedules
      │ 2. 篩選今天起七天賽事
      │ 3. 去除重複球場
      ▼
CWA F-D0047 REST API
      │
      │ 4. 正規化與驗證
      ▼
Firebase weather
      │
      │ 5. 前端純讀取
      ▼
Vue / GameCard / GameModal
```

## 執行時間

臺北時間每天執行七次：

1. `06:00`
2. `09:00`
3. `12:00`
4. `15:00`
5. `18:00`
6. `21:00`
7. `24:00`，即翌日 `00:00`

GitHub Actions 整點容易受排程尖峰影響，建議實際設定為每個時段的
第十分鐘：

```text
06:10、09:10、12:10、15:10、18:10、21:10、00:10
```

規劃中的 workflow 排程：

```yaml
on:
  schedule:
    - cron: '10 0,6,9,12,15,18,21 * * *'
      timezone: 'Asia/Taipei'
  workflow_dispatch:
```

`workflow_dispatch` 保留手動補跑能力。GitHub 排程可能因平台負載稍微
延遲，不應將它視為精確到分鐘的排程器。

## GitHub Secrets

新增：

```text
CWA_API_KEY
```

Firebase 憑證沿用目前 Hosting workflow 已存在的：

```text
FIREBASE_SERVICE_ACCOUNT_ENJOY_CPBL
```

不另外建立第二份 Firebase Service Account。workflow 不得輸出完整 CWA
請求 URL，避免放在 query parameter 的授權碼出現在 log。

## 同步流程

每次 Action 執行以下步驟：

1. 使用 Firebase Service Account 讀取 `/schedules`。
2. 以 `Asia/Taipei` 日期篩選今天起七天的賽事。
3. 取得不重複球場代碼。
4. 以 `doc/location.md` 對照球場的縣市與行政區。
5. 依縣市分組，分別查詢 F-D0047 三日與一週 REST 資料集。
6. 同一縣市有多個球場時，以多個 `LocationName` 合併查詢。
7. 將 CWA 原始格式轉為固定 JSON 格式。
8. 驗證完整 payload。
9. 所有必要資料均成功後，才一次寫入 Firebase。
10. 更新 `/lastSync/weather`。

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

例如同一輪只有洲際球場有賽事時，只需呼叫臺中市的兩個資料集，並以
`LocationName=北屯區` 篩選。CWA 授權碼應放在 HTTP `Authorization`
Header，不放在 URL query string。

## 寫入前驗證

至少驗證以下內容：

- CWA 回應成功。
- 至少有一個未來七天球場。
- 所有球場均存在於球場對照表。
- 預報時間可以解析。
- 降雨機率是 `0` 至 `100` 的數值或明確缺值。
- payload 包含 `sourceIssuedAt` 與 `fetchedAt`。

任何必要驗證失敗時，不覆蓋 Firebase 既有天氣資料。

## Firebase 資料結構

```text
weather
├─ fetchedAt
├─ sourceIssuedAt
├─ status
└─ venues
   ├─ 洲際
   │  ├─ locationName
   │  ├─ shortTerm
   │  └─ weekly
   ├─ 新莊
   └─ ...
```

不按同步時間建立歷史節點，避免資料持續累積。

## Firebase Database Rules

新增 `/weather` 規則：

- 公開讀取，讓未登入使用者也能顯示天氣。
- 前端使用者一律不能寫入。
- GitHub Action 透過 Admin 身分寫入，不受一般前端規則限制。

概念規則：

```json
{
  "weather": {
    ".read": true,
    ".write": false
  }
}
```

## 相同資料處理

CWA 約每六小時更新，但本方案依需求每三小時查詢一次，因此約有一半
執行可能取得相同 `sourceIssuedAt`。

```text
sourceIssuedAt 沒有變化
        │
        ├─ 不重寫完整 weather
        └─ Action 正常結束
```

這仍符合每三小時查詢一次，同時減少 Firebase 無意義寫入。

## 原子發布策略

同步程式先在記憶體中建立完整的新 payload，完成所有驗證後再一次取代
`/weather`。不得在逐球場查詢過程中逐筆覆蓋正式資料。

如此可避免：

- CWA 查到一半失敗，Firebase 只剩部分球場。
- 新舊 `sourceIssuedAt` 混在同一份資料。
- 同步例外時清空上一版可用預報。

## 前端流程

沿用既有資料載入模式：

```text
initSchedules()
   ├─ getSchedules()
   ├─ getWeather()
   └─ 將兩者交給 Calendar
```

前端負責：

- 讀取 `/weather`。
- 判斷 `fetchedAt` 是否超過合理期限。
- 依比賽時間選取重疊預報區段。
- 顯示比賽窗最大降雨機率與時段趨勢。
- 顯示最後成功同步時間。
- 天氣失敗時仍正常顯示賽程。

## 失敗處理

- CWA 暫時失敗：Action 失敗並保留上一版 Firebase 資料。
- 個別必要球場失敗：不發布不完整的新快照。
- Firebase 寫入失敗：Action 失敗，不影響舊資料。
- 資料超過六小時：前端標示資料可能已過期。
- 資料超過十二小時：顯示無法更新提示，但賽程仍正常。
- GitHub Actions 支援手動重跑失敗的 workflow。

## 用量估算

目前 `location.md` 的十一個球場分布於十個縣市。最壞情況是十個縣市
未來七天都有賽事：

```text
10 個縣市 × 2 個資料集 × 7 次／天 = 140 次 CWA 查詢／天
```

實際只查詢有賽事的縣市，通常會低於 140 次／天，且遠低於一般會員
目前每日 20,000 次 API 限制。

公開 repository 使用標準 GitHub-hosted runner 不收取 Actions 費用；
私有 repository 則使用帳戶方案附帶的 Actions 分鐘。

## 預計異動範圍

- 建立一份供程式使用的球場對照資料，內容以 `doc/location.md` 為準。
- 建立縣市與 F-D0047 三日、一週資料集的對照。
- 新增天氣同步腳本。
- 新增定時與手動執行的 GitHub Actions workflow。
- 擴充 Firebase 存取函式以讀取天氣。
- 更新 Realtime Database Rules，公開 `/weather` 讀取並禁止前端寫入。
- 擴充 `useSchedules` 載入天氣資料。
- 將天氣資料傳入 `Calendar`、`GameCard` 與 `GameModal`。
- 新增一個最小可執行檢查，驗證時間窗與同步資料驗證。

## 驗收條件

- 每日依臺北時間執行七次。
- 支援手動補跑。
- CWA API 授權碼不出現在 repository、前端或 workflow log。
- 同步失敗不會刪除上一版天氣。
- 相同 `sourceIssuedAt` 不重寫完整資料。
- 前端只能讀取 `/weather`，不能寫入。
- 天氣資料顯示發布時間、同步時間及過期狀態。
- 天氣同步故障不影響賽程顯示。

## 參考資料

- [CWA API 使用說明](https://opendata.cwa.gov.tw/devManual/insrtuction)
- [CWA 一般會員額度](https://opendata.cwa.gov.tw/about/application/general)
- [CWA API 存取頻率建議](https://opendata.cwa.gov.tw/faq)
- [GitHub Actions 排程事件](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/concepts/security/secrets)
- [GitHub Actions 計費](https://docs.github.com/en/actions/concepts/billing-and-usage)
