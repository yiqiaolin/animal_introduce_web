// 所有座標、研究文案及素材皆為雛形示範；正式上線前需逐項校核。
export const animals = [
 {id:'bear',name:'臺灣黑熊',scientific:'Ursus thibetanus formosanus',category:'哺乳類',habitat:'山地森林',habit:'以植物性食物為主，亦會取食昆蟲等食物。',symbol:'🐻',x:52,y:48},
 {id:'cat',name:'石虎',scientific:'Prionailurus bengalensis',category:'哺乳類',habitat:'低海拔森林與農林交錯環境',habit:'多於夜間活動，主要捕食小型動物。',symbol:'🐈',x:39,y:41},
 {id:'monkey',name:'臺灣獼猴',scientific:'Macaca cyclopis',category:'哺乳類',habitat:'森林及林緣環境',habit:'群居活動，取食果實、嫩葉等食物。',symbol:'🐒',x:40,y:68},
 {id:'salmon',name:'櫻花鉤吻鮭',scientific:'Oncorhynchus masou formosanus',category:'魚類',habitat:'高山冷水溪流',habit:'適應低水溫、清澈且含氧充足的溪流。',symbol:'🐟',x:58,y:32},
 {id:'magpie',name:'臺灣藍鵲',scientific:'Urocissa caerulea',category:'鳥類',habitat:'低至中海拔闊葉林與林緣',habit:'常以小群活動，食物種類多樣。',symbol:'🐦',x:61,y:22}
].map((animal,index)=>({...animal,number:String(index+1).padStart(3,'0'),photo:null,conservation:'保育等級與法規資料待查證，本階段不提供正式分級。',research:'此為互動雛形的示範研究摘要。棲地描述僅供介面展示；地圖位置不代表實際分布、目擊紀錄或可前往的觀察地點。'}));
export const getAnimal = id => animals.find(animal=>animal.id===id);
