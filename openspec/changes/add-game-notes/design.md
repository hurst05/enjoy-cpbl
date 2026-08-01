# Design: Add Game Notes

## Context

賽事詳情目前已取得登入者的 `userMarks` 與同群組成員的 `groupMarks`。兩者都以
`users/{uid}/marks/{gameId}` 為單場資料來源，因此備註可沿用既有資料流，不需新增
Firebase 集合或額外查詢。

## Goals / Non-Goals

**Goals:**

- 每位登入者可維護每場一則純文字備註。
- `GameModal` 顯示同群組成員的非空白備註與姓名。
- HTTP/HTTPS 網址安全地轉為可點擊連結，同時保留一般文字。
- 儲存成功後立即更新目前畫面，不需關閉再開啟視窗。

**Non-Goals:**

- 不提供多人共同編輯同一則備註。
- 不提供富文字、圖片上傳、連結預覽或版本紀錄。
- 不改造既有群組與使用者資料的讀取權限模型。
- 不在「我的標記」清單或賽事卡片顯示備註。

## Decisions

1. 備註儲存在 `users/{uid}/marks/{gameId}/note`。這可直接被 `getUserMarks` 與
   `getGroupMarks` 載入，並自然形成每人每場一則資料。另建共享集合會需要處理群組
   選擇與跨群組同步，與已確認的個人備註模型不符。
2. 新增 `setUserGameNote(uid, gameId, note)` 封裝 Firebase 寫入。非空白內容儲存
   trim 後的字串；清空時移除 `note` 節點，避免留下無意義空字串。
3. 儲存由 `GameModal` 發出事件交給既有 `useMarks` 資料流處理，使 Firebase 邊界與
   畫面元件分離，成功後同步更新 `userMarks` 的本地狀態。
4. 網址切分放在純函式工具中，以文字片段陣列渲染，不使用 `v-html`。只有
   `http://` 與 `https://` 是連結，並加上 `target="_blank"` 與
   `rel="noopener noreferrer"`。
5. 群友備註沿用 `groupMarks` 已依共同群組整理且以 UID 去重的資料；畫面排除登入者
   本人與空白備註。

## Risks / Trade-offs

- 既有 Firebase 規則允許所有已登入者讀取使用者節點，群組可見範圍目前由應用程式
  的 `getGroupMarks` 控制，而非資料庫讀取規則強制。→ 本次維持現行模型，不額外擴大
  讀取；若未來需要強制資料隔離，應另案調整資料模型與規則。
- 同一使用者同時在兩個頁籤編輯時採最後寫入者為準。→ 介面顯示儲存中狀態並在成功
  後更新本地值，本次不引入衝突合併。
- 很長的網址可能影響窄螢幕排版。→ 連結樣式允許斷行，輸入框設定合理長度上限。

## Migration Plan

既有標記不含 `note` 時視為沒有備註，不需資料遷移。部署可直接搭配目前的 Firebase
規則；回滾前端後，已寫入的 `note` 欄位會保留但不影響既有標記判斷。

## Open Questions

無。
