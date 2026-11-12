# 研究系統啟動開場 Phase 1–4

## 初始化順序

1. `state.js` 讀取既有探索及研究員資料，必要時初始化研究員編號與加入日期。
2. `main.js` 初始化地圖、研究面板與圖鑑。
3. `researchStartup.start()` 判斷是否需要開場。首次造訪時顯示全螢幕原生 dialog，依序呈現系統初始化、研究員身分識別、研究任務指派，依序 3000／4000／5000ms，共 12000ms；Phase 2 已加入深綠色正式畫面與 CSS 掃描／轉場，沒有音效。
4. 完成或略過時先關閉開場、清理計時器及事件，再執行一次 `onReady`，呼叫原本的 `initDialogs()`。原本首次邀請依既有 `wildlifeExplorer_introSeen` 規則顯示，並沒有被改寫或提前標記。

已完成開場或既有首次邀請的使用者直接進入第 4 步。開場只讀 `getResearcherProfile()`，沒有第二套研究員資料。

## 保存與重置範圍

新增 key `twe.startup.v1`，值 `1` 表示開場已完成或略過；既有已處理首次邀請的使用者也會補上此旗標，避免更新後重播。若開場中途離站、取消或銷毀控制器，未完成的開場不會被標記。

儲存被禁止時仍可在本次頁面完成流程，但無法保證跨重新整理保存旗標。

Phase 3 維持原本兩種資料清除範圍，`STARTUP_KEY` 不加入 `PROJECT_STORAGE_KEYS`：

- 「重新開始探索」仍只重設 `twe.exploration.v1`：物種、選取動物、圖鑑解鎖、紀錄、區域造訪歸零；保留研究員、首次邀請、開場旗標與目前地圖視角。
- 「重置所有研究資料」只刪除 `twe.researcher.v1`、`twe.exploration.v1`、`wildlifeExplorer_introSeen`。在當頁重新產生並保存初始研究員身分，因此研究員 key 會以新資料重新建立，與原先重新載入後的初始化結果一致；舊名稱、編號、日期及自訂身分欄位不會復活。恢復臺灣總覽 100% 初始視野，並清空地圖編輯器的記憶體暫存。
- 兩者都保留 `twe.startup.v1` 及其他無關儲存資料，使用同一控制器的 `replay()` 忽略已播放旗標。結束或略過時照常標記旗標，一般重新造訪不重播。
- 不使用 reload、replace、assign 或其他整頁導覽；沒有新增計時器或另一套開場控制器。

## 控制 API

`createStartupController()` 在 `scripts/startup-controller.js`，負責狀態、儲存、計時與回呼。`initResearchStartup({ onReady })` 在 `scripts/research-startup.js`，提供正式畫面及既有研究員／首次邀請資料來源。`main.js` 匯出已初始化的 `researchStartup` 由既有重置整合流程使用；重播時不重新執行 `initDialogs()`。

| 方法 | 行為 |
| --- | --- |
| `start()` | 一般首次啟動；已處理時直接銜接，不重播；同一輪重複呼叫不執行。 |
| `complete()` | 正常完成；與略過共用一次性結束流程。 |
| `skip()` | 略過並記錄已處理，正常銜接；按鈕與 Esc 使用此路徑。 |
| `replay({ onFinish } = {})` | 明確忽略已處理旗標，於同頁再播放；正在播放或其他 dialog 開啟時回傳 false，不搶焦點。可提供此次重播結束回呼。 |
| `cancel()` | 關閉及取消本輪計時，不儲存也不呼叫完成回呼；可之後重新 start。供中止／清理使用，不等同略過。 |
| `dispose()` | 清理本輪並永久停用此控制器。 |
| `getStatus()` | 回傳 idle、running、finished 或 disposed。 |

一般完成回呼收到 `{ reason: 'completed' | 'skipped' | 'already-seen', played: boolean }`。`initResearchStartup` 的初始 `onReady` 在整個控制器生命週期僅執行一次，預設重播不會重複綁定工具列事件。若使用自訂 replay 回呼，由呼叫方處理該輪完成後的銜接。

## Phase 2 正式畫面

- 0–3 秒：研究系統圖示、初始化狀態、由 CSS scaleX 推進的細進度條，以及淡入的計畫名稱。進度條是開場視覺，不是假裝量測資源載入百分比。
- 3–7 秒：研究員識別卡淡入，一條低亮度掃描線向下移動約 0.9 秒；邊框柔和亮起，階段開始後約 0.85 秒起淡入驗證結果，1.1 秒時完整顯示，留下約 2.9 秒閱讀時間。名稱只用 `textContent` 呈現，來自控制器呼叫的 `getResearcherProfile()`，空白名稱回退至「未命名研究員」。
- 7–12 秒：任務說明與準備完成提示在階段開始後約 0.8 秒內完整淡入，至淡出前有約 3.92 秒閱讀時間；最後 0.28 秒整體淡出，12 秒時由原控制器關閉並銜接原有引導或地圖。

右上角固定略過按鈕從開始即可操作，Esc 也視為略過。三個面板共用同一 Grid 格位，使階段切換不因內容高度不同而跳動；只有當前面板開放輔助工具存取，其餘皆 `aria-hidden` 且 inert。單一 live status 播報階段，不移動鍵盤焦點。

`prefers-reduced-motion: reduce` 停用進場、掃描、亮起與淡出效果，保持控制器的 12 秒流程，略過依然可用。窄螢幕自適應文字與卡片；高度不足時允許開場內部捲動，略過按鈕固定於可視範圍。

`createStartupView()` 保留 adapter 介面：

- `canOpen()`：確認沒有其他 Modal 開啟。
- `open({ profile, onSkip })`：重設畫面，讀取該輪研究員資料，鎖定背景與聚焦略過。
- `showStage(stage, index)`：依原控制器提供的階段 ID 更新顯示，沒有第二組計時器。
- `close()`：取消所有開場 CSS 動畫、移除監聽器、關閉原生 dialog、重設階段與名稱，恢復焦點及捲動設定。

階段時間集中於 `STARTUP_STAGES[].durationMs`（3000、4000、5000），總長由其加總；淡出集中於 `STARTUP_FADE_OUT_MS`（280）。控制器將該輪的實際階段時長交給 view，view 設定 `--startup-stage-duration` 與 `--startup-fade-duration`，供進度條及最終淡出使用。淡入仍為 0.35 秒、識別掃描仍為 0.9 秒，延長的部分用於完整資訊停留。原 `durationMs` 選項可覆寫總長，三段依 3:4:5 分配，CSS 自動同步。CSS 不負責觸發完成，沒有 animationend 完成回呼或額外計時器。

## Phase 3 同頁重置協調

1. 研究員資料管理確認成功後，執行原本對應的 state API，再關閉確認 dialog，透過 `onReset({kind:'progress'|'all'})` 通知共用彈窗。
2. `dialogs.js` 關閉研究員檔案，沿用原有關閉動畫；動畫期間內容 inert，避免舊名稱表單繼續寫入。收到真正 close 事件後中止該輪 AbortController、移除舊內容及巢狀確認窗，才通知 `main.js`。
3. main 的 `refreshAfterReset()` 重繪研究面板、圖鑑、地圖標記並呼叫同一實例的 `researchStartup.replay()`。既有探索事件讓研究員統計、徽章與稱號同步；通知佇列清空，舊通知不重播。
4. 開場完成／略過後呼叫既有 dialogs 實例的 `showInvitationIfNeeded()`。簡易重置保留已處理旗標，不再次教學；完整重置清除旗標並呼叫 `resetIntroMemory()` 清掉模組快取，因此顯示原有首次邀請。不重複呼叫 `initDialogs()` 或累積工具列事件。

原本完整重置依賴重新載入的部分已改為明確復原：`state.js` 清除舊 profile 載入快照、重建身分，僅在刪除期間暫停寫入，完成後可繼續探索及改名。新的身分若因儲存權限無法保存，仍在記憶體可用，既有研究員檔案會顯示儲存失敗提醒；刪除失敗則保留原記憶體狀態並嘗試回復原儲存，不進入重播。

`map.js` 提供 `cancelPendingSwitch()` 與 `resetView()`，透過載入版本 token 忽略重置前尚未完成的圖片請求。簡易重置只取消舊請求並保留視野；完整重置回到最初的臺灣總覽，不產生假的地區造訪紀錄。重置不會重新綁定地圖監聽器。

自動整合測試 `tests/startup-reset.test.mjs` 使用真實 main.js 模組圖及可控 DOM／計時／圖片載入，驗證關閉順序、連續重置、12 秒／略過、舊請求、範圍、取消與無導覽。測試 fixture 位於 `tests/helpers/research-app-fixture.mjs`；瀏覽器原生視覺及焦點行為仍需人工驗收。

測試：`node --test tests/*.test.mjs`。首次流程可在新的瀏覽器設定檔或無痕視窗驗收，避免刪除既有探索資料。

## Phase 4 最終回歸

檢查沿用 12 秒階段設定、原有兩種清除範圍及正式視覺，未更動執行流程。補測完成／略過後立即重播時的舊計時與完成回呼，以及同一原生 dialog 立即重開時上一輪的延遲 close 事件；同時確認監聽器清理及捲動／焦點還原。

測試仍使用 `node --test tests/*.test.mjs`，另執行既有地圖、開發者模式、座標編輯回歸及語法／格式檢查。自動化結果屬於可控計時與 DOM 替身／CSS 規則驗證，不等同實際瀏覽器動畫與輔助工具驗收。Phase 1–3 的使用者人工驗收結果保留；本次是否具備瀏覽器連線及執行結果另於交付回報中說明。
