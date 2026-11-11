import { photos } from './photos.js';

// 座標為 taiwan-ecological-map.png 完整圖片範圍內的百分比（非視窗百分比）。
// 依插畫中的山林／溪流區域配置，僅作棲地示意，並非經緯度或真實目擊點。
// 動物插畫由 assets/animals 提供；研究文案仍為示範，正式使用前需校核。
// iconWidth / iconHeight 為 100% 地圖座標尺寸；200% 時寬度為此值的兩倍。
export const animals = [
 {id:'bear',name:'臺灣黑熊',scientific:'Ursus thibetanus formosanus',category:'哺乳類',habitat:'山地森林',habit:'以植物性食物為主，亦會取食昆蟲等食物。',illustration:'assets/animals/black-bear.png',iconWidth:16,iconHeight:15.446,mapRegion:'中部山區森林（示意）',distributionSource:'https://www.taiwan.nps.gov.tw/home/zh-tw/eco-gallery/21318.html',x:56,y:52},
 {id:'cat',name:'石虎',scientific:'Prionailurus bengalensis',category:'哺乳類',habitat:'低海拔森林與農林交錯環境',habit:'多於夜間活動，主要捕食小型動物。',illustration:'assets/animals/leopard-cat.png',iconWidth:14,iconHeight:10.726,mapRegion:'中北部西側淺山，代表苗栗／臺中一帶（示意）',distributionSource:'https://www.forest.gov.tw/0008043',x:39,y:36},
 {id:'monkey',name:'臺灣獼猴',scientific:'Macaca cyclopis',category:'哺乳類',habitat:'森林及林緣環境',habit:'群居活動，取食果實、嫩葉等食物。',illustration:'assets/animals/macaque.png',iconWidth:13.5,iconHeight:15.115,mapRegion:'南部山林的代表點，非僅分布於此（示意）',distributionSource:'https://web.wra.gov.tw/swreeis/News_Content.aspx?n=8145&s=43408',x:36,y:72},
 {id:'salmon',name:'櫻花鉤吻鮭',scientific:'Oncorhynchus masou formosanus',category:'魚類',habitat:'高山冷水溪流',habit:'適應低水溫、清澈且含氧充足的溪流。',illustration:'assets/animals/salmon.png',iconWidth:14.5,iconHeight:6.029,mapRegion:'中北部山區溪流，代表七家灣溪流域（示意）',distributionSource:'https://www.forest.gov.tw/0007996',x:65,y:28},
 {id:'magpie',name:'臺灣藍鵲',scientific:'Urocissa caerulea',category:'鳥類',habitat:'低至中海拔闊葉林與林緣',habit:'常以小群活動，食物種類多樣。',illustration:'assets/animals/blue-magpie.png',iconWidth:16,iconHeight:10.642,mapRegion:'北部中低海拔林地的代表點（示意）',distributionSource:'https://www.taiwan.nps.gov.tw/home/zh-tw/eco-gallery/21330.html',x:70,y:16}
].map((animal, index) => ({
  ...animal,
  number: String(index + 1).padStart(3, '0'),
  photo: photos[animal.id],
  // Missing research fields are explicit; never infer facts from the illustration.
  diet: null,
  introduction: null,
  trivia: null,
  conservation: '保育等級與法規資料待查證，本階段不提供正式分級。',
  research: '此為互動雛形的示範研究摘要。棲地描述僅供介面展示；地圖位置不代表實際分布、目擊紀錄或可前往的觀察地點。'
}));
export const getAnimal = id => animals.find(animal=>animal.id===id);
