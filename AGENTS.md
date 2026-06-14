# 專案架構與開發指南 (AGENTS.md)

這份文件旨在幫助 AI 代理程式（如 Claude 或其他 LLM）以及開發者快速了解 `enjoy-cpbl` 的專案架構、技術棧、編碼風格以及開發規範。

## 技術棧 (Tech Stack)

- **前端框架**: Vue 3
- **建置工具**: Vite
- **程式語言**: JavaScript (ES6+), 無 TypeScript
- **樣式**: Vanilla CSS (主要集中於 `src/style.css` 及 Vue 單一元件檔內的 `<style>`)，無使用 Tailwind CSS 或預處理器
- **後端/資料庫**: Firebase (版本 12.14.0，包含 Auth, Firestore 等)
- **網路爬蟲**: Puppeteer + jsdom (透過 Vite custom plugin 及前端發起請求進行中職賽程爬取)

## 專案架構 (Project Structure)

```text
enjoy-cpbl/
├── src/
│   ├── components/     # Vue UI 元件 (如: Calendar, GameCard, 各式 Modal 等)
│   ├── utils/          # 共用工具函式 (如: scraper.js 爬蟲邏輯)
│   ├── data/           # 靜態資料或設定 (如: defaultTeams.js)
│   ├── assets/         # 靜態資源 (圖片、圖示等)
│   ├── App.vue         # 應用程式根元件
│   ├── main.js         # Vue 應用程式進入點
│   ├── style.css       # 全域 CSS 樣式
│   └── firebase.js     # Firebase 初始化與設定
├── public/             # 靜態公開檔案
├── vite.config.js      # Vite 設定檔 (內含自訂的 cpbl-scraper plugin)
├── package.json        # 專案套件設定
└── (scripts)           # 根目錄包含多個獨立腳本 (如: populate-admin.js, clear-old-groups.js, test-*.js 等)
```

## 編碼風格 (Coding Conventions)

1. **語言**: 專案使用純 JavaScript，不使用 TypeScript。請確保程式碼相容於現代 ES6+ 標準。
2. **Vue 元件**:
    - 採用 Vue 3 單一元件檔 (`.vue`) 開發。
    - 遵循 Vue 3 Composition API（若專案中混用 Options API，開發新功能時建議以現有元件的風格為主）。
3. **樣式**:
    - 使用純 CSS。全域樣式請寫在 `src/style.css`。
    - 元件特定樣式請寫在對應 `.vue` 檔的 `<style scoped>` 中。
4. **檔案命名**:
    - Vue 元件使用 PascalCase (例如 `GameCard.vue`, `AuthModal.vue`)。
    - 一般 JS 檔案及工具函式使用 camelCase (例如 `scraper.js`, `defaultTeams.js`)。
5. **格式化**: 專案根目錄目前無嚴格的 ESLint 或 Prettier 設定檔，請遵守標準的 JavaScript 縮排與排版習慣（通常為 2 空格縮排），並保持與現有程式碼風格一致。
6. **狀態與資料流**: 無使用 Vuex 或 Pinia，狀態多半在根元件或透過 Props / Events / Provide / Inject 來傳遞，或是直接與 Firebase 互動。

## 測試規範 (Testing Conventions)

1. **無自動化測試框架**: `package.json` 中並無配置 Jest、Vitest 或 Cypress 等標準測試框架。
2. **單一測試腳本**: 專案根目錄下存在許多自訂的測試腳本（如 `test-auth.js`, `test-browser.js`, `test-data.js`），通常是用於本地端驗證特定邏輯或爬蟲功能。
3. **測試方法**: 執行這些腳本時，通常使用 Node.js 直接運行（例：`node test-browser.js`），新增功能時，可建立類似的獨立腳本來驗證資料或 Firebase 連線。

## 開發注意事項 (Development Notes)

1. **爬蟲功能**:
    - 本專案依賴 Puppeteer 來爬取中華職棒 (CPBL) 的賽程資料。
    - 開發環境中，爬蟲邏輯被整合在 `vite.config.js` 的 Vite custom plugin (`cpbl-scraper`) 內。請注意 Puppeteer 的 headless 設定與 Node.js 執行環境。
2. **Firebase 整合**:
    - Firebase 邏輯集中在 `src/firebase.js`。
    - 若要測試或更新資料庫結構，可利用根目錄的 `populate-*.js` 系列腳本。請確保在執行具破壞性的寫入腳本前已經確認過環境。
3. **建置與執行**:
    - 啟動開發伺服器：`npm run dev`
    - 打包發布版本：`npm run build`
    - 預覽發布版本：`npm run preview`
