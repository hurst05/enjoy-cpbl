# 替群組成員標記已購票設計

## Context

目前個人標記儲存在 Firebase Realtime Database 的
`users/{uid}/marks/{gameId}`。`ticketPurchased` 是由資料擁有者維護的布林值，
而 `groupMarks` 只讀取群組成員的標記供畫面彙整。資料庫規則只允許使用者寫入
自己的 `users/{uid}`，因此不能直接讓購票者改寫群友的既有布林值。

賽事詳情、賽事卡片、篩選器與「我的標記」目前都直接判斷
`ticketPurchased`。新資料必須保持舊欄位可用，並讓所有讀取點採用同一套判斷。

## Goals / Non-Goals

**Goals:**

- 讓使用者能替一位或多位同群組成員標記已購票。
- 保留代購者身分，使不同購票者的紀錄不會互相覆蓋。
- 確保本人標記與代購標記在所有既有畫面得到一致結果。
- 只擴充必要的 Realtime Database 路徑與安全規則。
- 保持既有 `ticketPurchased` 資料向後相容。

**Non-Goals:**

- 不擴充「想看」標記為可代替群友操作。
- 不記錄票價、座位、張數、付款或轉讓流程。
- 不加入即時同步監聽；其他瀏覽器仍依既有重新載入機制取得更新。
- 不建立新的後端服務、Cloud Function 或前端套件。

## Decisions

### 使用被標記者底下的獨立代購紀錄

每筆代購紀錄儲存在下列路徑：

```text
users/{targetUid}/marks/{gameId}/ticketPurchasedBy/{buyerUid} = groupId
```

值使用共同群組 ID，供安全規則驗證新增紀錄時雙方確實是該群組成員。
每位購票者只有自己的子節點，因此新增或刪除不會覆寫其他人的紀錄。
被標記者仍可依既有父層規則管理自己的完整標記資料。

不直接改寫目標成員的 `ticketPurchased`，因為該做法無法保留操作者、
會產生最後寫入者覆蓋問題，也必須過度放寬其他使用者資料的寫入權限。

### 以共用函式計算有效已購票狀態

有效狀態定義如下：

```text
ticketPurchased === true OR ticketPurchasedBy 至少有一筆紀錄
```

擴充既有 `src/utils/groupMarks.js`，集中提供單筆標記狀態判斷與群友持票名單。
GameModal、GameCard、`useFilters` 與 MyMarksModal 必須重用此判斷，避免各自實作。

### 沿用 groupMarks 並附帶共同群組 ID

`getGroupMarks` 已依目前使用者的群組逐一載入成員，並以 UID 去重。
載入時在每位成員資料中累積 `groupIds`，GameModal 寫入代購紀錄時取其中一個
共同群組 ID。這不增加資料庫查詢，也不需要新增全域狀態。

GameModal 的群友選擇清單必須排除登入者 UID。若兩人在多個群組相遇，
清單仍只顯示一次；共同群組 ID 僅用於授權，不需要使用者選擇。

### 保留本人按鈕並新增群友選擇區

既有「標記已購票」按鈕繼續只切換本人的 `ticketPurchased`。
當存在其他群組成員時，額外顯示「替群友標記」，展開可複選的成員清單。

勾選狀態代表目前登入者是否已建立該成員的代購紀錄。每次切換立即寫入，
寫入期間只停用該成員控制項；失敗時還原狀態並顯示錯誤。其他來源已使成員
具有有效已購票狀態時，畫面可以提示「已有票」，但不阻止購票者記錄自己的
獨立代購事實。

### 只為代購子節點增加細粒度寫入權限

`database.rules.json` 在
`users/$targetUid/marks/$gameId/ticketPurchasedBy/$buyerUid` 增加規則。
非資料擁有者新增或更新時必須同時符合：

- `auth.uid` 等於 `$buyerUid`。
- 值是有效的群組 ID 字串。
- 該群組同時包含登入者與 `$targetUid`。

購票者可刪除自己的子節點，即使之後已離開群組；第三位群組成員不能修改。
目標使用者與管理員仍沿用既有父層權限。規則不放寬其他 marks 或 profile 欄位。

## Risks / Trade-offs

- [舊版前端忽略代購紀錄] → 保留 `ticketPurchased`，並同步部署規則與新版前端。
- [群組關係解除後紀錄仍存在] → 將紀錄視為購票事實；購票者或被標記者可刪除。
- [跨瀏覽器不會立即更新] → 沿用現有載入行為，本次不引入即時監聽。
- [多位購票者為同一人標記] → 各自保存子節點，移除其中一筆不影響有效狀態。

## Migration Plan

1. 先部署支援 `ticketPurchasedBy` 的資料庫規則。
2. 部署可讀寫新紀錄並使用共用有效狀態判斷的前端。
3. 不搬移既有資料；舊的 `ticketPurchased` 繼續有效。
4. 若需回滾，先回滾前端，再移除新增規則；保留的代購節點不影響舊版前端。

## Open Questions

無。
