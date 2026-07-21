# 替群組成員標記已購票實作清單

## 1. 資料模型與授權

- [x] 1.1 擴充 `getGroupMarks`，替每位去重後的成員累積共同 `groupIds`
- [x] 1.2 在 Firebase 資料層新增寫入與刪除
  `ticketPurchasedBy/{buyerUid}` 的函式
- [x] 1.3 更新 `database.rules.json`，只允許同群組購票者寫自己的子節點，
  並保留購票者刪除自己紀錄及資料擁有者管理自身資料的權限
- [ ] 1.4 驗證同群組新增、非同群組拒絕、修改他人紀錄拒絕，
  以及離開群組後刪除自己紀錄的規則案例

## 2. 共用已購票狀態

- [x] 2.1 擴充 `src/utils/groupMarks.js`，集中判斷既有本人標記與代購紀錄
- [x] 2.2 更新 `useMarks` 的代購操作與本地 `groupMarks`，讓單筆寫入成功後
  立即反映且失敗不影響其他成員
- [x] 2.3 讓 GameCard、GameModal、`useFilters` 與 MyMarksModal 共用有效
  已購票判斷，並排除好友清單中的登入者本人

## 3. GameModal 操作介面

- [x] 3.1 保留既有本人已購票按鈕，僅在有其他群友時顯示「替群友標記」
- [x] 3.2 建立依 UID 去重且排除本人的可複選清單，使用成員 `groupIds`
  寫入代購紀錄
- [x] 3.3 為單一成員加入寫入中停用、失敗還原與錯誤提示，
  並維持桌面及行動裝置可操作性

## 4. 驗證

- [x] 4.1 擴充 `_test-scripts-to-delete/gameCardFriendsBought.test.js`，涵蓋舊布林值、
  單筆與多筆代購、移除部分來源、UID 去重及排除本人
- [x] 4.2 執行標記共用函式測試腳本並確認通過
- [x] 4.3 執行 `npm run build`，確認 Vue、SCSS 與生產建置成功
