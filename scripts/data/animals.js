import { photos } from './photos.js';

// 座標為 taiwan-ecological-map.png 完整圖片範圍內的百分比（非視窗百分比）。
// 依插畫中的山林／溪流區域配置，僅作棲地示意，並非經緯度或真實目擊點。
// 名稱、學名、分類、棲地、食性、活動習性、保育類別及介紹已核對官方來源。
// 查核範圍與來源差異見 docs/ecology-sources.md；遊戲座標並非真實目擊點。
// iconWidth / iconHeight 為 100% 地圖座標尺寸；200% 時寬度為此值的兩倍。
const legalDirectory = 'https://www.ysnp.gov.tw/StaticPage/Directory';
const legalVersion = 'https://law.moa.gov.tw/LawContent.aspx?id=GL000556';

export const animals = [
 {id:'bear',trivia:'胸前常有黃白色 V 字或新月形斑紋。',introduction:'臺灣原生的熊類，屬亞洲黑熊的臺灣特有亞種。',conservation:'第 I 級｜瀕臨絕種野生動物',ecologySource:'https://www.taiwan.nps.gov.tw/home/zh-tw/eco-gallery/21318.html',name:'臺灣黑熊',scientific:'Ursus thibetanus formosanus',category:'哺乳類',habitat:'人為干擾較少的山區森林',habit:'通常獨居，沒有固定巢穴；母獸會帶領幼獸活動。',diet:'雜食性，以植物為主，也會取食昆蟲等動物性食物。',illustration:'assets/animals/black-bear.png',iconWidth:16,iconHeight:15.446,mapRegion:'中部山區森林（示意）',distributionSource:'https://www.taiwan.nps.gov.tw/home/zh-tw/eco-gallery/21318.html',x:56,y:52},
 {id:'cat',trivia:'耳朵背面的白色圓斑，是辨識石虎的特徵。',introduction:'外形近似家貓的小型貓科動物，主要於夜間活動。',conservation:'第 I 級｜瀕臨絕種野生動物',ecologySource:'https://www.taiwan.nps.gov.tw/home/zh-tw/eco-gallery/21366.html',name:'石虎',scientific:'Prionailurus bengalensis',category:'哺乳類',habitat:'低海拔森林與農林交錯環境',habit:'主要夜間活動，白天在樹洞或岩穴休息，善於攀樹。',diet:'肉食性，捕食鼠類、鳥類、蛙類等小型動物。',illustration:'assets/animals/leopard-cat.png',iconWidth:14,iconHeight:10.726,mapRegion:'中北部西側淺山，代表苗栗／臺中一帶（示意）',distributionSource:'https://www.forest.gov.tw/0008043',x:39,y:36},
 {id:'monkey',trivia:'臉頰具有頰囊，臀部則有紅色肉墊。',introduction:'臺灣特有的靈長類動物，以樹棲活動為主，也會到地面覓食。',conservation:'一般類野生動物（非保育類）',ecologySource:'https://www.zoo.gov.taipei/News_Content.aspx?n=CC7DF0D6519201FD&s=AA31A15454A25AB5&sms=D5A439C2736D52BF',name:'臺灣獼猴',scientific:'Macaca cyclopis',category:'哺乳類',habitat:'闊葉林及鄰近的岩地、水源環境',habit:'日間活動、群居，常在樹上移動，也會到地面覓食。',diet:'以果實、嫩芽為主，也取食昆蟲等動物性食物。',illustration:'assets/animals/macaque.png',iconWidth:13.5,iconHeight:15.115,mapRegion:'南部山林的代表點，非僅分布於此（示意）',distributionSource:'https://web.wra.gov.tw/swreeis/News_Content.aspx?n=8145&s=43408',x:36,y:72},
 {id:'salmon',trivia:'屬陸封型鮭魚，終生在淡水中生活。',introduction:'臺灣特有的鮭魚亞種，適應冷冽清澈的溪流水域。',conservation:'第 I 級｜瀕臨絕種野生動物',ecologySource:'https://www.taiwan.nps.gov.tw/home/zh-tw/eco-gallery/21383.html',name:'櫻花鉤吻鮭',scientific:'Oncorhynchus masou formosanus',category:'魚類',habitat:'大甲溪上游清澈、低溫的高山溪流',habit:'繁殖時會游入淺水區，在碎石與卵石河床產卵。',diet:'肉食性，攝食水生昆蟲、落水的陸生昆蟲等。',illustration:'assets/animals/salmon.png',iconWidth:14.5,iconHeight:6.029,mapRegion:'中北部山區溪流，代表七家灣溪流域（示意）',distributionSource:'https://www.forest.gov.tw/0007996',x:65,y:28},
 {id:'magpie',trivia:'繁殖期會互相協助照顧下一代。',introduction:'臺灣特有的鴉科鳥類，常成小群活動，具有醒目的長尾。',conservation:'第 III 級｜其他應予保育野生動物',ecologySource:'https://www.taiwan.nps.gov.tw/home/zh-tw/eco-gallery/21330.html',name:'臺灣藍鵲',scientific:'Urocissa caerulea',category:'鳥類',habitat:'中低海拔森林及附近果園、開墾地',habit:'常成小群活動，會用樹枝與草葉在高樹上築巢。',diet:'雜食性，取食果實、昆蟲及小型脊椎動物。',illustration:'assets/animals/blue-magpie.png',iconWidth:16,iconHeight:10.642,mapRegion:'北部中低海拔林地的代表點（示意）',distributionSource:'https://www.taiwan.nps.gov.tw/home/zh-tw/eco-gallery/21330.html',x:70,y:16}
].map((animal, index) => ({
  ...animal,
  number: String(index + 1).padStart(3, '0'),
  photo: photos[animal.id],
  ecologyReviewedOn: '2026-11-12',
  conservationSources: animal.id === 'monkey'
    ? [legalVersion, 'https://www.forest.gov.tw/faqs/news/0063328']
    : [legalVersion, legalDirectory],
  dietSource: animal.id === 'bear' ? 'https://www.ysnp.gov.tw/StaticPage/Science' : animal.ecologySource,
  habitSource: animal.id === 'bear' ? 'https://www.ysnp.gov.tw/StaticPage/Science' : animal.ecologySource,
  research: '地圖位置僅供探索示意，不代表實際分布、目擊紀錄或可前往的觀察地點。'
}));
export const getAnimal = id => animals.find(animal=>animal.id===id);
