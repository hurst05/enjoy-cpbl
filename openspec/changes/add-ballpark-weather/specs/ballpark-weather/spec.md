# Ballpark Weather Specification

## ADDED Requirements

### Requirement: 球場與 F-D0047 資料集對照

系統必須 (MUST) 以賽程的 `location` 為 canonical key，維護球場的 CWA
縣市、行政區，以及該縣市 F-D0047 三日逐三小時與一週逐十二小時資料集
編號。對照內容必須涵蓋 `doc/location.md` 所列場地。

#### Scenario: 已知球場

- **WHEN** 未來七日賽程包含 `location` 為「洲際」
- **THEN** 系統使用臺中市三日與一週資料集查詢 `LocationName=北屯區`

#### Scenario: 未知球場

- **WHEN** 未來七日賽程包含對照表不存在的 `location`
- **THEN** 同步程序必須失敗並指出未知場地
- **AND** 系統不得覆蓋既有天氣快照

### Requirement: 天氣同步排程與賽程範圍

系統必須 (SHALL) 透過 GitHub Actions 依 `Asia/Taipei` 時區每日在
`00:10`、`06:10`、`09:10`、`12:10`、`15:10`、`18:10`、`21:10`
執行，並支援手動執行。每次同步只處理臺北時間今天 `00:00` 起至第七天
`00:00` 前有賽事的不重複球場。

#### Scenario: 同一球場有多場賽事

- **WHEN** 七日範圍內同一球場有多場賽事
- **THEN** 該次同步只處理一次該球場天氣

#### Scenario: 七日內沒有賽事

- **WHEN** 七日範圍內沒有任何有效球場賽事
- **THEN** 同步程序不得呼叫 CWA 或覆蓋 `/weather`
- **AND** workflow 必須以失敗狀態指出沒有可同步球場

### Requirement: F-D0047 查詢合併與最小化

系統必須 (SHALL) 依縣市分組球場，每個必要縣市各查詢一次三日資料集與
一次一週資料集；同縣市多個球場必須合併其 `LocationName`，不得查詢
七日內沒有賽事的縣市。

#### Scenario: 同縣市有多個球場

- **WHEN** 七日範圍內同時有天母與大巨蛋賽事
- **THEN** 系統分別對臺北市三日與一週資料集各發出一個合併行政區查詢

#### Scenario: 只有單一縣市有賽事

- **WHEN** 七日範圍內只有洲際球場有賽事
- **THEN** 系統只查詢臺中市的三日與一週資料集

### Requirement: 同步憑證安全

同步程序必須 (MUST) 只從 `CWA_API_KEY` 與
`FIREBASE_SERVICE_ACCOUNT_ENJOY_CPBL` GitHub Actions secrets 取得憑證。
CWA 授權碼必須放在 HTTP `Authorization` header，且不得寫入 repository、
前端 bundle、請求 URL 或 workflow log。

#### Scenario: CWA 請求失敗

- **WHEN** CWA 請求回傳錯誤
- **THEN** workflow log 可以顯示狀態碼與不含憑證的錯誤摘要
- **AND** log 不得顯示 CWA 授權碼或完整授權 header

### Requirement: 預報正規化與完整驗證

系統必須 (MUST) 將 F-D0047 回應轉成以球場為索引的固定
`shortTerm` 與 `weekly` 時段資料，並在發布前驗證回應成功、所有必要球場、
行政區、發布時間、時段時間及降雨機率。降雨機率只允許 `0` 至 `100` 的
數值或明確的 `null`。

#### Scenario: 所有必要資料有效

- **WHEN** 每個必要球場均有可解析且通過驗證的三日與一週預報
- **THEN** 系統建立包含 `fetchedAt`、`sourceIssuedAt`、`status` 與
  `venues` 的完整快照

#### Scenario: 個別球場資料缺失

- **WHEN** 任一必要球場缺少必要資料、時間無法解析或降雨機率超出範圍
- **THEN** 整次同步必須失敗
- **AND** 系統不得發布部分球場資料

#### Scenario: 資料集發布時間不一致

- **WHEN** 同一次同步取得的必要資料集無法歸屬同一 `sourceIssuedAt`
- **THEN** 整次同步必須失敗並保留上一版快照

### Requirement: 原子發布與相同預報處理

系統必須 (MUST) 在所有查詢與驗證完成後，才以單次原子操作發布
`/weather` 與 `/lastSync/weather`。同步失敗時必須保留上一版資料；若
`sourceIssuedAt` 未改變，只能更新成功查詢時間，不得重寫球場預報內容。

#### Scenario: 發布新預報

- **WHEN** 新快照通過驗證且 `sourceIssuedAt` 與現有資料不同
- **THEN** 系統原子更新 `/weather` 與 `/lastSync/weather`

#### Scenario: 預報發布時間相同

- **WHEN** 新資料的 `sourceIssuedAt` 與現有資料相同
- **THEN** 系統只更新 `/weather/fetchedAt` 與 `/lastSync/weather`
- **AND** 系統不得重寫 `/weather/venues`

#### Scenario: 維護者強制發布相同報次

- **WHEN** 維護者使用 `--force` 且新快照已通過完整驗證
- **THEN** 即使 `sourceIssuedAt` 相同，系統仍必須原子更新完整 `/weather`
  與 `/lastSync/weather`
- **AND** 未帶 `--force` 的排程與手動執行仍必須維持 metadata-only 行為

#### Scenario: 正式發布前失敗

- **WHEN** CWA、驗證或 Firebase 讀取在正式發布前發生錯誤
- **THEN** 既有 `/weather` 快照必須保持不變

### Requirement: Firebase 天氣存取控制

系統必須 (MUST) 允許未登入前端讀取 `/weather`，拒絕所有瀏覽器端天氣
寫入，並只由 Service Account 的 Admin SDK 發布資料。

#### Scenario: 未登入使用者讀取天氣

- **WHEN** 未登入使用者開啟賽程頁面
- **THEN** Firebase Rules 必須允許讀取 `/weather`

#### Scenario: 前端嘗試寫入天氣

- **WHEN** Firebase Web SDK client 嘗試寫入 `/weather`
- **THEN** Firebase Rules 必須拒絕該寫入

### Requirement: 天氣載入不得阻斷賽程

前端必須 (SHALL) 透過既有賽程初始化流程獨立載入 `/weather`，並將天氣
讀取錯誤與賽程資料錯誤隔離。

#### Scenario: 天氣讀取成功

- **WHEN** `/weather` 可正常讀取
- **THEN** 系統將天氣資料傳給 `Calendar`、`GameCard` 與 `GameModal`

#### Scenario: 天氣讀取失敗

- **WHEN** `/weather` 不存在、格式錯誤或 Firebase 讀取失敗
- **THEN** 賽程仍必須正常顯示
- **AND** 天氣區塊必須保持隱藏或顯示無資料狀態

### Requirement: 賽事天氣選取與顯示

系統必須 (SHALL) 依球場、比賽日期及開賽時間選取預報。未來 72 小時內
且時間已知的比賽使用與開賽前四小時至開賽後三小時重疊的逐三小時
資料；超過 72 小時但仍在第七日 `00:00` 前的比賽使用逐十二小時趨勢。

#### Scenario: 72 小時內且開賽時間已知

- **WHEN** 比賽在未來 72 小時內且開賽時間有效
- **THEN** `GameCard` 選取包含開賽時間的逐三小時預報時段
- **AND** 卡片顯示該時段的 CWA 夜間天氣圖示
- **AND** `GameModal` 顯示比賽窗內的預報時段趨勢

#### Scenario: 超過 72 小時的七日內比賽

- **WHEN** 比賽距現在超過 72 小時但位於第七日 `00:00` 前
- **THEN** `GameCard` 選取包含開賽時間的逐十二小時預報時段並顯示其
  CWA 夜間天氣圖示
- **AND** `GameModal` 顯示該比賽日的逐十二小時天氣趨勢

#### Scenario: 開賽時間未定

- **WHEN** 比賽時間為空或 `TBD`
- **THEN** 系統不得套用預設開賽時間
- **AND** 系統顯示該日趨勢或「開賽時間未定」

### Requirement: 卡片天氣圖示與摘要

`GameCard` 必須 (MUST) 只顯示一個最接近開賽時間的 CWA 夜間天氣圖示，
不得在卡片本體列出多個預報時段或完整天氣文字。天氣代碼必須優先使用
CWA 回應的 `WeatherCode`。

#### Scenario: 預報時段包含開賽時間

- **WHEN** 一個預報時段的開始時間小於等於開賽時間且結束時間大於開賽時間
- **THEN** 卡片必須使用該預報時段

#### Scenario: 預報時段未完整覆蓋開賽時間

- **WHEN** 可用預報沒有任何時段包含開賽時間
- **THEN** 卡片必須使用起始時間距開賽時間最近的預報時段

#### Scenario: Desktop 游標移入圖示

- **WHEN** desktop 使用者將游標移入天氣圖示
- **THEN** tooltip 必須顯示該時段天氣簡述、降雨機率與氣溫

#### Scenario: Mobile 顯示天氣

- **WHEN** 卡片顯示於 mobile 版面
- **THEN** 卡片只顯示天氣圖示，不增加常駐天氣摘要

### Requirement: 逐三小時氣溫範圍

同步流程必須 (MUST) 將 CWA 三日逐三小時資料的 `T` 溫度點正規化成每個
預報時段的最低與最高氣溫，並保留逐十二小時資料的 `MinT`／`MaxT`。

#### Scenario: 三小時時段有溫度邊界值

- **WHEN** 一個逐三小時預報時段有開始與結束邊界的溫度點
- **THEN** 系統必須保存該時段的 `minTemperature` 與 `maxTemperature`
- **AND** 卡片 tooltip 與 `GameModal` 必須能顯示該氣溫範圍

### Requirement: 天氣資料時間與過期狀態

系統必須 (SHALL) 顯示氣象資料發布時間與最後成功同步時間，並依
`fetchedAt` 計算 freshness。超過六小時必須標示資料可能已過期，超過
十二小時必須顯示無法更新提示。

#### Scenario: 資料超過六小時

- **WHEN** `fetchedAt` 距現在超過六小時但未超過十二小時
- **THEN** 前端必須標示天氣資料可能已過期

#### Scenario: 資料超過十二小時

- **WHEN** `fetchedAt` 距現在超過十二小時
- **THEN** 前端必須顯示天氣無法更新提示
- **AND** 賽程內容仍必須正常顯示
