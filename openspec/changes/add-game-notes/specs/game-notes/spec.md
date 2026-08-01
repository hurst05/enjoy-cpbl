# Game Notes Spec

## ADDED Requirements

### Requirement: 登入者維護個人賽事備註

系統 MUST 允許已登入使用者在 GameModal 為每場賽事維護一則自己的純文字備註。

#### Scenario: 新增或修改備註

- **WHEN** 已登入使用者輸入非空白內容並執行儲存
- **THEN** 系統將去除首尾空白後的內容儲存在該使用者與該場賽事之下
- **AND** 畫面在儲存成功後顯示最新內容

#### Scenario: 清空既有備註

- **WHEN** 已登入使用者清空輸入內容並執行儲存
- **THEN** 系統移除該使用者在該場賽事的備註
- **AND** 其他賽事標記欄位維持不變

#### Scenario: 未登入使用者開啟賽事

- **WHEN** 未登入使用者開啟 GameModal
- **THEN** 系統不顯示可編輯或儲存備註的控制項

#### Scenario: 儲存失敗

- **WHEN** 備註寫入失敗
- **THEN** 系統保留使用者尚未儲存的輸入內容
- **AND** 系統顯示可理解的失敗訊息並允許再次儲存

### Requirement: 安全呈現備註網址

系統 MUST 將備註中的 HTTP 與 HTTPS 網址呈現為可點擊的新分頁連結，並將其他內容
以純文字呈現。

#### Scenario: 備註包含網址與一般文字

- **WHEN** 備註同時包含一般文字與 `https://` 或 `http://` 網址
- **THEN** 系統保留一般文字並將網址分別呈現為可點擊連結
- **AND** 連結使用 `noopener noreferrer` 防止新頁面控制原頁面

#### Scenario: 備註包含非網頁協定

- **WHEN** 備註包含 `javascript:` 或其他非 HTTP/HTTPS 協定內容
- **THEN** 系統將該內容呈現為純文字而非可點擊連結

### Requirement: 備註顯示區塊與賽事卡片提示

系統 MUST 將已儲存備註與群友備註的顯示區塊放在啦啦隊應援名單之後，並在賽事卡片的啦啦隊圖示上提示
目前賽事是否有任何登入使用者的備註（包含自己的備註與群友備註）。

#### Scenario: GameModal 備註顯示順序

- **WHEN** 使用者開啟 GameModal
- **THEN** 啦啦隊應援名單區塊緊接在已儲存備註與群友備註的顯示區塊之前
- **AND** 賽事備註的輸入區保留在我的標記與日曆區塊之後

#### Scenario: 卡片有任何賽事備註

- **WHEN** 自己或同群組成員對目前賽事留下非空白備註
- **THEN** GameCard 的啦啦隊圖示本身顯示與篩選命中一致的彩色流動提示，而不增加外框或高亮整張卡片

#### Scenario: 卡片沒有任何賽事備註

- **WHEN** 目前賽事沒有任何登入使用者的備註
- **THEN** GameCard 的啦啦隊圖示維持原本外觀，不顯示備註提示

#### Scenario: 使用者偏好減少動態效果

- **WHEN** 使用者啟用 `prefers-reduced-motion: reduce`
- **THEN** 備註提示不播放脈衝動畫
