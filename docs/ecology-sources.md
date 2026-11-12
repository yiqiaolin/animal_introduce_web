# 物種圖鑑與研究面板生態資料來源

首次查核：2026-11-11；圖鑑九項欄位複核：2026-11-12。適用範圍：臺灣野生族群的介紹及臺灣法定保育分類，非 IUCN 全球受脅等級。資料本體集中在 `scripts/data/animals.js`；本文件僅記錄來源與編輯決策。

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

## 2026-11-12 圖鑑欄位校正

原先 `diet` 在 `.map()` 中被固定設為 null，`habit` 部分混入食性或棲地描述；圖鑑模板另有固定開發標籤、示範後綴與缺值文案。此次在同一份動物資料補齊 `diet`、校正 `habit`，移除覆寫與模板開發文案，沒有以 CSS 隱藏資料。名稱、學名、粗分類、保育類別、介紹與小知識均複核後保留；獼猴棲地改為環境名詞，避免與行為欄重複。

| ID | 食性查核 | 活動習性查核 |
| --- | --- | --- |
| bear | [玉山國家公園：臺灣黑熊科普](https://www.ysnp.gov.tw/StaticPage/Science)「食性」：雜食、以植物為主，亦取食昆蟲與動物。 | 同頁「生殖育幼／活動習性」：獨居、沒有固定巢穴，母獸帶領幼獸活動。未將單一時間段或冬眠說法概括套用所有熊類。 |
| cat | [國家公園石虎頁](https://www.taiwan.nps.gov.tw/home/zh-tw/eco-gallery/21366.html)「生物習性」：肉食，鼠、鳥、蛙等。 | 同頁：夜間活動，白天在樹洞岩穴休憩，善爬樹。該頁保育現況段落有舊的「珍貴稀有」敘述，法定類別仍依現行名錄第一級。 |
| monkey | [臺北市立動物園獼猴頁](https://www.zoo.gov.taipei/News_Content.aspx?n=CC7DF0D6519201FD&s=AA31A15454A25AB5&sms=D5A439C2736D52BF)「食性」：果實、嫩芽為主，亦吃昆蟲等動物性食物。 | 同頁「習性」：日行、群居，樹棲活動也到地面覓食；「棲息地」獨立記為闊葉林及岩地、水源環境。 |
| magpie | [國家公園藍鵲頁](https://www.taiwan.nps.gov.tw/home/zh-tw/eco-gallery/21330.html)「生物習性」：雜食，果實、昆蟲及鳥、鼠等小型脊椎動物。 | 同頁：小群活動，樹枝與草葉築巢於高樹；合作育幼仍放在小知識欄。法定類別不用此頁舊保育欄。 |
| salmon | [國家公園鮭魚頁](https://www.taiwan.nps.gov.tw/home/zh-tw/eco-gallery/21383.html)「生物習性」：水生昆蟲與陸生昆蟲等。 | 同頁：繁殖時游入淺水處，在碎石與卵石河床產卵。刪除原行為欄的水溫、水質條件，這些保留於棲息環境的冷水清澈溪流敘述。 |

程式中的 `ecologySource` 記錄原生態資料來源；`dietSource`、`habitSource` 記錄本次食性與行為的直接來源。`ecologyReviewedOn` 更新為 2026-11-12，指專案查核日，不冒充原文發表日期。

### 分類與遊戲地區核對

| 名稱 | 沿用學名 | 介面粗分類 | 遊戲內研究區域 |
| --- | --- | --- | --- |
| 臺灣黑熊 | Ursus thibetanus formosanus | 哺乳類 | 山地森林研究區 |
| 臺灣獼猴 | Macaca cyclopis | 哺乳類 | 山地森林研究區 |
| 石虎 | Prionailurus bengalensis | 哺乳類 | 低海拔森林研究區 |
| 臺灣藍鵲 | Urocissa caerulea | 鳥類 | 低海拔森林研究區 |
| 櫻花鉤吻鮭 | Oncorhynchus masou formosanus | 魚類 | 高山溪流研究區 |

粗分類維持既有層級，不把食肉目誤當作食性。熊科、貓科、獼猴科、鴉科、鮭科與現有學名相符；熊科分類亦參考[臺北市立動物園黑熊頁](https://www.zoo.gov.taipei/News_Content.aspx?n=CC7DF0D6519201FD&s=EE1CEBDFBE97A545&sms=D5A439C2736D52BF)。

遊戲地區來自 `scripts/data/regions.js` 的物種配置。圖鑑使用已儲存的發現地區，舊資料沒有地區時沿用既有的遊戲配置回退規則；不是推測真實目擊位置。溪邊、岩石、田邊、樹枝、溪裡是提示系統的插畫位置，不寫進生態棲地欄。

### 保留的限制與編輯決策

- 2026-11-12 複核[農業部現行名錄](https://law.moa.gov.tw/LawContent.aspx?id=GL000556)仍列 2025-02-07 為最新修正；以[玉山分類名錄](https://www.ysnp.gov.tw/StaticPage/Directory)核對黑熊、石虎、鮭魚為 I，藍鵲為 III；獼猴依前述 2019 年公告為一般類。
- 鮭魚分類學文獻有不同處理，保留上述官方生態來源的臺灣亞種名稱，不宣稱這是所有分類系統唯一接受的名稱；法規名錄則用 `Oncorhynchus masou` 列名。此差異不影響本專案所指的臺灣族群及法定第一級。
- 不引用舊頁面的族群數量、唯一分布地或精確季節數字，也不擅自推定個別遊戲動物的年齡、性別、目擊地與野外活動時間。
- 未新增 IUCN 欄位；動物園的 LC／VU 是國際評估，不能替代臺灣法定分類。
- 照片作者／授權仍由使用者提供。照片載入失敗採一般影像不可用提示，不使用開發階段的「待提供」文案。
