# Proposal: Add Game Notes

## Why

登入使用者目前只能標記想看與已購票，無法在單場賽事留下網址或補充資訊供群友參考。新增每人每場一則備註，可讓群組成員在既有賽事詳情中共享相簿、集合資訊或其他連結。

## What Changes

- 登入使用者可在賽事詳情新增、修改或清空自己的單場備註。
- 備註隨使用者的既有賽事標記儲存，每位使用者每場最多一則。
- 同群組成員可在賽事詳情查看彼此的非空白備註與顯示名稱。
- 備註中的 HTTP/HTTPS 網址會以安全、可點擊的新分頁連結呈現，其餘文字維持純文字顯示。
- 未登入使用者不能輸入或儲存備註，也不會看到群友備註。

## Capabilities

### New Capabilities

- `game-notes`: 定義每人每場備註的編輯、儲存、群友可見性與網址呈現行為。

### Modified Capabilities

- `group-tags`: 群組標記資料新增備註欄位，並在單場賽事詳情呈現群友備註。

## Impact

- `src/components/GameModal.vue`：新增備註編輯器、儲存狀態及群友備註清單。
- `src/firebase.js`：沿用 `users/{uid}/marks/{gameId}` 路徑新增備註讀寫函式，不新增依賴或資料集合。
- `src/composables/useMarks.js` 與 `src/App.vue`：視需要串接儲存後的本地資料更新。
- 測試腳本依專案規範放在 `_test-scripts-to-delete/`。
