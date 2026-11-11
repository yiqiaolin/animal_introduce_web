# 研究面板生態資料來源

查核日期：2026-11-11。適用範圍：臺灣野生族群的介紹及臺灣法定保育分類，非 IUCN 全球受脅等級。資料本體集中在 `scripts/data/animals.js`；本文件僅記錄來源與編輯決策。

## 法定分類

- 農業部主管法規系統：[陸域保育類野生動物名錄](https://law.moa.gov.tw/LawContent.aspx?id=GL000556)，查核時所列最新修正為 2025-02-07（農林業字第1132401967號，即日生效）。此次修正第五點魚類，不代表所有物種均於當日重新評估。
- 玉山國家公園管理處：[保育類野生動物名錄](https://www.ysnp.gov.tw/StaticPage/Directory)。第一級哺乳類列有臺灣黑熊、石虎；第一級魚類列有櫻花鉤吻鮭；第三級鳥類列有臺灣藍鵲。
- [農業部第五點修正附件](https://www.moa.gov.tw/redirect_files.php?id=50644)，第 2 頁列 `Oncorhynchus masou`／櫻花鉤吻鮭／I。法規名錄的列名範圍與面板採用的臺灣亞種學名不同，不以此直接更改分類學名稱。
- 林業保育署前身林務局：[2019-01-09 名錄修正說明](https://www.forest.gov.tw/faqs/news/0063328)：臺灣獼猴自該日起改列一般類。[農業部 2022 年公告說明](https://www.moa.gov.tw/theme_data.php?id=8826&sub_theme=agri&theme=news)亦確認此分類。一般類不等於可任意捕捉、飼養。
- [陽明山國家公園臺灣藍鵲頁](https://www.ymsnp.gov.tw/ch/florafauna/birds/352)列 III 其他應予保育。國家公園主題網藍鵲生態頁仍寫「珍貴稀有」，故本專案只引用其生態介紹，不採該頁保育欄，以現行名錄為準。

## 生態欄位對應

以下均為自行精簡改寫，不使用網頁中較舊的族群數量、唯一分布地、繁殖期等時效性敘述。部分頁面未標示原文更新日期；以下日期是本次查核日期，並非研究發表日。

| ID | 名稱、學名、棲地、小知識與簡介的主要來源 | 使用範圍 |
| --- | --- | --- |
| bear | [國家公園主題網：臺灣黑熊](https://www.taiwan.nps.gov.tw/home/zh-tw/eco-gallery/21318.html) | 學名、山區低干擾環境、V／新月形胸斑及原生熊類介紹；亞種用法亦見[林業保育署保育行動計畫](https://www.forest.gov.tw/file/203155)。不將棲地限於某固定海拔。 |
| cat | [國家公園主題網：石虎](https://www.taiwan.nps.gov.tw/home/zh-tw/eco-gallery/21366.html) | 學名、低海拔森林／農墾交錯環境、耳背白斑與夜行性。不採其舊分布名單。 |
| monkey | [臺北市立動物園：臺灣獼猴](https://www.zoo.gov.taipei/News_Content.aspx?n=CC7DF0D6519201FD&s=AA31A15454A25AB5&sms=D5A439C2736D52BF) | 學名、闊葉林／岩地／水源、頰囊／臀部肉墊、樹棲與地面覓食。頁面更新 2026-10-05；其 LC 欄為全球受脅評估，不用於臺灣法定等級。 |
| salmon | [國家公園主題網：櫻花鉤吻鮭](https://www.taiwan.nps.gov.tw/home/zh-tw/eco-gallery/21383.html)、[林業保育署：臺灣櫻花鉤吻鮭野生動物保護區](https://www.forest.gov.tw/0007996) | 冷水清澈溪流、大甲溪上游、陸封型與臺灣特有亞種；保留既有 `Oncorhynchus masou formosanus` 用法。[水產試驗所](https://www.tfrin.gov.tw/theme_data.php?id=2802&sub_theme=tide&theme=book_data)亦採此學名。分類文獻存在不同處理，本次不宣稱已統一所有分類系統。 |
| magpie | [國家公園主題網：臺灣藍鵲](https://www.taiwan.nps.gov.tw/home/zh-tw/eco-gallery/21330.html) | 學名、中低海拔森林／果園／開墾地、合作照顧後代、臺灣特有鴉科與長尾。保育分類改依上述現行名錄。 |

## 尚未正式化的範圍

`diet` 仍為 null，`habit` 保留舊示範內容及圖鑑的待校核標示，未擴大本階段查核範圍。地圖百分比座標、發現地區均為互動示意，不是現實目擊紀錄。照片作者／授權仍由使用者提供，未因生態資料查核而視為完成。
