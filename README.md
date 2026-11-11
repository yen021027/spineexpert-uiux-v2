# 脊椎知識室 · UI UX Pro Max 第二版

這是完全獨立的第二版設計 Demo，保留原來的 `spineexpert-demo` 專案與已發布網址。沒有套用第一版附件的視覺規則，也不替換第一版。

第二版：https://yen021027.github.io/spineexpert-uiux-v2/

使用獨立的 `spineexpert-uiux-v2` 儲存庫與 GitHub Pages。推送 main 後，GitHub Actions 先執行完整瀏覽器測試，通過後才部署 public 目錄。

## 設計與功能

- 深墨綠、薄荷綠、留白與編輯式版面，以「找資訊、讀文章」為主。
- 首頁搜尋、五個原站分類、原文節錄、醫師介紹及看診資訊。
- 115 篇文章的全文搜尋、分類／年份／標籤篩選、發布日期排序與分頁。
- 可分享的 hash 網址、瀏覽器上一頁／下一頁、保留分類的返回連結。
- 閱讀進度、文章字級放大、原始來源與相關主題。
- 手機選單、鍵盤操作、可見焦點、減少動態與響應式版面。
- 移除箭頭裝飾；使用一致的非箭頭 SVG 圖示。未加入會收集病情的表單。

## 本機啟動

```sh
npm ci
npm run serve
```

在執行開發伺服器的電腦開啟 http://127.0.0.1:4174/ 。開發伺服器只綁定本機，與 GitHub Pages 公開版本分開。若 npm 快取權限異常，可用 `npm ci --cache .npm-cache`。

修改 CSS／JS 後執行 `npm run version-assets`。這是純靜態網站，部署目錄為 `public`。示範網站公開不代表門診資訊已完成確認或正式醫療服務上線。

## 驗證

```sh
npm test
```

測試使用 Playwright Chromium 與 axe-core。若缺少瀏覽器，執行 `npx playwright install chromium`。驗證報告與桌面／手機截圖位於 `test-results`。

涵蓋十種寬度、首頁／文章列表／醫師／看診／文章／錯誤頁、搜尋與篩選、鍵盤、選單中斷、歷史導覽、字級、減少動態、橫向螢幕、200% 縮放、載入失敗復原、12 組 axe 掃描，以及全部 115 篇文章在三種寬度的原文一致性和無溢位檢查。以固定 SHA-256 驗證來源資料。開發電腦另有本機基準時，也驗證第一版檔案沒有被修改。

自動檢查不能取代人工無障礙稽核或醫師審閱。沒有使用真實使用者 Core Web Vitals 資料，不聲稱正式醫療上線資格。

## 內容依據與限制

資料與照片直接複製自現有 Demo，文章資料檔保持位元組一致。原文來源、日期、分類及標籤都保留。文章頁不包含原文醫療影像，提供原文連結。未生成新的醫療摘要、診斷、療效保證或門診時間。醫師經歷依原站收錄內容呈現，未另行查證現職異動。

- 原始部落格：http://spineexpert.blogspot.com/?m=1
- 原始文章 feed：http://spineexpert.blogspot.com/feeds/posts/default?alt=json&max-results=150
- 醫師簡介：https://www.blogger.com/profile/00538994561338350909
- 第一版：https://yen021027.github.io/spineexpert-demo/

UI UX Pro Max 研究與設計筆記僅留在開發電腦，不隨公開儲存庫上傳。所有頁面使用 noindex, nofollow。內容為衛教分享，無法取代實際診察。原文章與照片的權利屬各自權利人。
