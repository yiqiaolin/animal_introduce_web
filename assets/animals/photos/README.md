# 使用者提供照片

網站不搜尋、下載或產生照片。請自行提供下列檔案，放入本資料夾後重新整理頁面即可顯示。

| 檔名 | 物種 ID | 動物 |
| --- | --- | --- |
| bear.png | bear | 臺灣黑熊 |
| monkey.jpeg | monkey | 臺灣獼猴 |
| cat.jpg | cat | 石虎 |
| magpie.jpg | magpie | 臺灣藍鵲 |
| salmon.jpg | salmon | 櫻花鉤吻鮭 |

缺圖、載入中、檔案損壞時會顯示占位區，成功載入後自動顯示照片。照片以 `object-fit: cover` 適配卡片，原始檔案不修改。若使用其他檔名或副檔名，請更新 `scripts/data/photos.js` 的對應 `src`。

`photos.js` 每筆預留 `description`、`author`、`source`、`license`、`licenseUrl`、`modifications`。請填入自行確認的實際資料，留白欄位不顯示，不會自動推測作者或授權。

`previous-downloads/` 保留先前版本下載的原圖與歷史授權紀錄，不代表目前照片已由使用者提供，網站不引用這些檔案。未刪除既有素材。
