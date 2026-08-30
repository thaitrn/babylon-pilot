# PRD — Linh Quang: Vượt Bão

- Sản phẩm: Babylon Pilot redesign
- Trạng thái: **Ready for MVP implementation**
- Owner: Product / BA / Solution Architecture / UI/UX
- Ngày chốt: 2026-08-30 (GMT+7)
- Canonical URL: https://thaitrn.github.io/babylon-pilot/
- Tài liệu này thay thế định nghĩa gameplay trong `docs/pm-mvp-acceptance.md`.

## 0. Executive decision

Babylon Pilot hiện tại là một tech demo đẹp nhưng chưa phải game: người dùng chạm vào 10 mục tiêu tĩnh, không có avatar/fantasy điều khiển, không có nguy cơ, thất bại, áp lực thời gian, lựa chọn hay lý do chơi lại. Source xác nhận các linh thể chỉ bob tại chỗ, một click đủ gần sẽ thu thập và điểm chỉ tăng (`src/main.ts:127-147`, `src/main.ts:165-214`). Live HTML chỉ trình bày `0/10`, FPS và engine tag; không có start, trạng thái chơi hay kết quả.

**Quyết định MVP:** biến trải nghiệm thành một arcade flight 3 lane, một màn chơi có tác giả, kéo dài 70 giây. Người chơi lái Phi Thuyền Linh Quang qua bão cực quang, thu đủ 12/18 Mảnh Sáng và còn ít nhất 1 Khiên khi tới Cổng Bình Minh.

**Backend:** không cần cho MVP. Toàn bộ run state ở memory; `bestScore` và `soundEnabled` lưu bằng `localStorage`. Không account, leaderboard, cloud save hoặc API. Backend chỉ được xem xét sau khi FUN-GATE đạt và có nhu cầu leaderboard/anti-cheat thật.

## 1. Gate coverage

- **Product gate:** fantasy, audience, objective, session loop, scope, KPI và MoSCoW đã chốt.
- **BA gate:** state machine, game rules, score, failure/win, data state và edge cases đã chốt.
- **Solution Architecture gate:** client-only architecture, module boundaries, contracts/test hooks và performance budget đã chốt.
- **UI/UX gate:** mobile-first wireflow, HUD, controls, visual hierarchy, feedback và accessibility đã chốt.
- **FUN-GATE:** protocol và ngưỡng go/no-go được định nghĩa ở mục 13; chỉ có thể kết luận sau playtest thật.

## 2. Research và evidence baseline

### 2.1 Comparable games

| Game / nguồn | Cơ chế đáng học | Áp dụng cho MVP | Không sao chép |
|---|---|---|---|
| Race The Sun — Steam official | Luật ngắn: không crash, ở trong ánh sáng, không chậm; short session, high score, áp lực thời gian | Auto-forward, hiểm họa đọc nhanh, course ngắn, one-more-run | Endless procedural, upgrade ship, editor, 25 level |
| Tiny Wings — Apple App Store official | Fantasy “muốn bay”, one-tap dễ hiểu, đêm đến là deadline | Một fantasy sentence + một trục điều khiển + countdown rõ | Procedural daily world, unlock/meta modes |
| Sky: Children of the Light — Apple editorial | Bay giữa đảo nổi, thu ánh sáng, soi sáng thế giới | Ngôn ngữ fantasy ấm áp, Mảnh Sáng/Cổng Bình Minh, collect có ý nghĩa | Open world, multiplayer, quests |
| AER: Memories of Old — Steam/Ubisoft official | Bay giữa đảo nổi, art tối giản, fantasy cứu thế giới khỏi bóng tối | Silhouette chim/phi thuyền rõ, floating fragments, world tối giản | Exploration/open world, puzzle, transform |
| Crossy Road / Subway Surfers — nguồn official và mô tả store | Input ít nhưng timing/đọc hazard tạo skill; fail nhanh, replay nhanh; runner dùng lane, collect và obstacle | 3 lane, lane switch tức thời nhưng có easing, đọc trước hazard, retry một tap | Endless economy, ads, character unlock, missions |

### 2.2 Kết luận research

1. Arcade tốt giải thích được bằng một câu và một input; độ sâu đến từ timing/route, không phải nhiều nút.
2. Fantasy phải gắn với rule: ánh sáng là mục tiêu, bóng tối/hazard là rủi ro, cổng cuối là kết quả.
3. Short session cần failure rõ và retry nhanh; chỉ “collect đủ” không tạo căng thẳng.
4. Progression MVP nên nằm trong run (3 wave khó dần) và personal best local; meta economy/backend là feature creep.
5. “Juice” ưu tiên phản hồi hành động thiết yếu: collect, hit, combo, countdown, portal; không dùng particle làm wallpaper vô hạn.

### 2.3 Sources

Truy cập 2026-08-30:

- Race The Sun, Steam: https://store.steampowered.com/app/253030/Race_The_Sun/
- Tiny Wings, Apple App Store: https://apps.apple.com/us/app/tiny-wings/id417817520
- Sky: Children of the Light, Apple editorial: https://apps.apple.com/us/iphone/story/id1467288062
- AER: Memories of Old, Steam: https://store.steampowered.com/app/331870/AER_Memories_of_Old
- AER, Ubisoft: https://www.ubisoft.com/en-us/games/aer-memories-of-old
- Subway Surfers official: https://subwaysurfers.com/
- WebGL best practices, MDN: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- Babylon.js scene optimization: https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene
- Rendering frame budget, web.dev: https://web.dev/articles/rendering-performance

### 2.4 Current product evidence

- Source hiện tại: 10 sphere spawn ngẫu nhiên trên một mặt phẳng và chỉ dao động nhẹ (`src/main.ts:127-147`, `src/main.ts:242-249`).
- Interaction hiện tại: pointer-down được chiếu lên mặt phẳng; hit trong bán kính 0.75 thì collect (`src/main.ts:165-214`). Không có player avatar, movement, collision damage, countdown hoặc end state.
- Live probe ngày 2026-08-30: canonical URL trả HTTPS 200, HTML 2,283 bytes. Live HUD chỉ có `0/10`, FPS và engine tag.
- Bundle baseline hiện tại: JS 5,979,227 bytes raw, 1,301,559 bytes gzip; `dist` khoảng 6,036 KiB và 26 file. Budget MVP ở mục 12 lấy baseline thật này để ngăn regression.

## 3. Product definition

### 3.1 One-line pitch

**Lái Phi Thuyền Linh Quang qua bão cực quang, né Mảnh Vỡ và gom đủ 12 Mảnh Sáng trước khi Cổng Bình Minh khép lại.**

### 3.2 Target users

- Người chơi casual mở link từ mobile hoặc desktop, không muốn cài app hay đăng nhập.
- Có 1–3 phút rảnh; hiểu game trong tối đa 10 giây.
- Không giả định quen Babylon.js hay game 3D.

### 3.3 User value

- Cảm giác lái xuyên không gian 3D đẹp và phản hồi tức thì.
- Một thử thách hoàn chỉnh, công bằng, kết thúc rõ trong khoảng 70–100 giây cả UI.
- Có mastery: đọc lane, đổi lane đúng lúc, giữ combo, cải thiện điểm cá nhân.

### 3.4 Goals

1. 90% người playtest bắt đầu điều khiển đúng mà không cần giải thích miệng.
2. Người chơi luôn biết: đang cần gì, còn bao lâu, còn bao nhiêu lỗi được phép.
3. Một run có win/fail rõ, difficulty tăng nhận thấy được và retry trong <=2 giây.
4. Duy trì tương thích touch/mouse/keyboard và WebGPU/WebGL2 fallback.

### 3.5 Non-goals

Không có account, backend, online leaderboard, multiplayer, shop, currency, cosmetic, ads, procedural endless world, nhiều level, narrative cutscene, quest, inventory, upgrade tree, gamepad, PWA hoặc localization ngoài tiếng Việt trong MVP.

## 4. Core game design

### 4.1 Fantasy và camera

- Player avatar: một phi thuyền/chim ánh sáng có silhouette rõ, đặt ở 20–25% chiều cao tính từ đáy màn hình.
- Camera: third-person chase, auto-forward; người chơi không điều khiển camera.
- World: 3 lane vô hình chạy về Cổng Bình Minh. Mảnh Sáng và Mảnh Vỡ đi từ horizon về player để tạo cảm giác tốc độ.
- Mọi gameplay object phải phân biệt bằng shape lẫn màu: Mảnh Sáng tròn/kim cương vàng; Mảnh Vỡ nhọn tím-đỏ; player trắng-xanh.

### 4.2 Input — một ý niệm duy nhất: chọn lane

**Touch/pointer**

- Chạm vào 1/3 trái, giữa hoặc phải của vùng chơi để chọn lane tương ứng.
- Giữ và kéo ngang: target lane cập nhật theo vị trí ngón tay; không cần swipe threshold.
- Input nhận ở `pointerdown` và `pointermove` khi đang giữ; không chờ `pointerup`.

**Desktop**

- `A`/`ArrowLeft`: sang một lane trái.
- `D`/`ArrowRight`: sang một lane phải.
- Click vào 1/3 màn hình chọn lane trực tiếp.
- `Enter`/`Space`: Start/Retry trên màn hình tương ứng.

**Behavior**

- Lane switch hoàn tất trong 180–240 ms với ease-out; không teleport cứng.
- Input ở mép khi đã lane ngoài không gây trạng thái lỗi.
- HUD/buttons không được truyền pointer xuống gameplay.
- Không có jump, brake, boost hoặc camera gesture trong MVP.

### 4.3 Course và session

Một run chuẩn dài **70 giây gameplay**:

1. **Wave 1 — Học (0–20s):** tốc độ 1.0x; single Mảnh Sáng; hazard đứng riêng; đảm bảo player gặp một collect dễ trong 5 giây đầu.
2. **Wave 2 — Chọn đường (20–45s):** tốc độ 1.15x; cặp shard/hazard tạo lựa chọn lane; bắt đầu combo 3+.
3. **Wave 3 — Áp lực (45–65s):** tốc độ 1.3x; pattern đổi lane 2 bước, khoảng đọc không dưới 900 ms tại target device.
4. **Portal (65–70s):** không spawn hazard mới; Cổng Bình Minh mở nếu đạt 12, chuyển success khi player vào cổng.

Course có **18 Mảnh Sáng** và đủ cơ hội đạt mục tiêu dù bỏ lỡ 6. Pattern authored, deterministic và giống nhau giữa các run để người chơi học bằng kỹ năng. Có thể mirror trái/phải theo `runIndex % 2`; không random thay đổi fairness.

Tổng session dự kiến:

- first visit: 5–10s title/tutorial + 3s countdown + 70s run + 5–15s result = 83–98s;
- replay: 3s countdown + 70s run + result = 75–90s;
- fail do hết Khiên có thể ngắn hơn nhưng không trước 20s trong pattern chuẩn.

### 4.4 Objective, risk và failure

- Objective: thu **ít nhất 12/18 Mảnh Sáng** và còn **>=1 Khiên** khi vào portal.
- Bắt đầu với **3 Khiên**.
- Va Mảnh Vỡ: mất 1 Khiên, mất combo, flash cảnh báo; player invulnerable 1,200 ms để không double-hit.
- Khiên về 0: fail ngay — “Phi thuyền tan vỡ”.
- Tới portal với <12 Mảnh Sáng: fail — “Cổng khép lại — thiếu N Mảnh Sáng”.
- Tab/app hidden: pause simulation và timer; resume bằng overlay “Chạm để tiếp tục”, không để người dùng chết ngoài ý muốn.
- Resize/orientation: giữ state và re-layout; không reset run.

### 4.5 Skill và meaningful choice

- Đọc pattern từ xa và chọn lane an toàn.
- Timing lane switch, đặc biệt ở Wave 3.
- Người mới có thể thắng bằng 12/18; người giỏi giữ chuỗi collect để tăng score.
- Một số Mảnh Sáng nằm cạnh hazard, tạo lựa chọn risk/reward bằng điểm/combo nhưng **không có collectible loại hai**.

### 4.6 Scoring và progression

Score không thay objective:

- +100 mỗi Mảnh Sáng.
- Combo tăng 1 khi collect liên tiếp; miss shard hoặc hit hazard reset về 0.
- Combo bonus mỗi collect: `25 × min(combo - 1, 4)`; tối đa +100/collect.
- Success bonus: `500 + 200 × số Khiên còn lại`.
- Fail không có success bonus.

Result hiển thị score, best local và grade:

- S: success, 18 shard, 3 Khiên.
- A: success, >=15 shard, >=2 Khiên.
- B: mọi success khác.
- C: fail nhưng >=9 shard.
- D: fail còn lại.

Progression MVP:

- Trong run: 3 wave, speed/visual intensity tăng và portal payoff.
- Qua run: personal best score và best grade bằng `localStorage`; không unlock gameplay power.

### 4.7 Feedback / juice

**Collect**

- Shard hút vào player trong 120–180 ms, burst nhỏ có pool, số `+100/+bonus` bay lên <=500 ms.
- Player scale pulse <=8%, emissive pulse và collect sound ngắn.
- Combo >=3 hiển thị `x3`/`x4` cạnh player, không che hazard.

**Hit**

- Camera impulse nhỏ <=120 ms, chromatic/flash đỏ <=150 ms, shield icon vỡ, âm cảnh báo.
- Không screen shake mạnh; tôn trọng reduced motion.

**Wave/portal**

- Toast “BÃO MẠNH HƠN” <=1.2s khi chuyển wave.
- Từ giây 60, portal hiện rõ; nếu thiếu shard, HUD mục tiêu pulse vàng chứ không đỏ giả failure.
- Success: camera ease-in portal, trail kéo dài, burst 0.8–1.2s rồi result.

**Audio**

- Should, không chặn release nếu browser từ chối audio. Unlock sau Start gesture.
- Có mute button; mặc định bật nếu policy cho phép, lưu local. Không autoplay trước gesture.

## 5. State machine và business rules

```text
BOOT
  -> TITLE             engine/scene ready
TITLE
  -> COUNTDOWN         Start gesture
COUNTDOWN (3,2,1)
  -> PLAYING
PLAYING
  -> PAUSED            document hidden / explicit resume needed
PAUSED
  -> PLAYING           user gesture
PLAYING
  -> FAILURE           shields == 0
PLAYING
  -> PORTAL_CHECK      elapsed >= 65s
PORTAL_CHECK
  -> SUCCESS           elapsed >= 70s AND shards >= 12 AND shields > 0
  -> FAILURE           elapsed >= 70s AND shards < 12
SUCCESS | FAILURE
  -> RESULT            payoff animation complete
RESULT
  -> COUNTDOWN         Retry
```

Business rules:

1. Chỉ `PLAYING` cập nhật timer, movement, collision và score.
2. Mỗi entity có `collected/hit` flag; một object chỉ mutate state đúng một lần.
3. Collision dùng gameplay hitbox nhỏ hơn visual khoảng 15% để cảm giác công bằng.
4. Trong invulnerability, hazard có thể đi xuyên player nhưng không trừ Khiên hay lặp feedback.
5. Run outcome immutable sau khi vào SUCCESS/FAILURE.
6. Retry reset toàn bộ run state/entity/timer, nhưng giữ settings và personal best.
7. `bestScore = max(storedBest, finalScore)`; parse lỗi/localStorage unavailable phải fallback in-memory, game vẫn chơi được.
8. Delta time phải clamp để tab resume hoặc frame stall không teleport object/cascade collision.

## 6. User stories và acceptance criteria

### US-01 — Hiểu game và bắt đầu

Là người mới, tôi muốn hiểu fantasy, mục tiêu và điều khiển ngay để bắt đầu mà không cần hướng dẫn ngoài game.

- AC-01.1 Given app ready, then title hiển thị tên game, pitch ngắn, `Thu 12 Mảnh Sáng • Né Mảnh Vỡ • 3 Khiên`, hướng dẫn tương ứng input và CTA `BẮT ĐẦU`.
- AC-01.2 When bấm Start, then countdown 3-2-1 chạy và gameplay nhận input sau `1`; không hazard hit trước khi PLAYING.
- AC-01.3 First Mảnh Sáng có thể collect trong <=5 giây và không bị hazard che.
- AC-01.4 Trong moderated test, >=9/10 người thực hiện đúng ít nhất một lane switch và nói đúng objective trước giây 10 mà không được coach.

### US-02 — Điều khiển công bằng trên mobile/desktop

Là người chơi, tôi muốn phi thuyền phản hồi chính xác để lỗi thuộc về kỹ năng của tôi.

- AC-02.1 Touch/click vào mỗi 1/3 viewport chọn đúng lane; keyboard left/right không vượt biên.
- AC-02.2 Lane switch hoàn tất 180–240 ms; input-to-visible-response <=100 ms ở target device.
- AC-02.3 Pointer ở HUD/result không điều khiển ship.
- AC-02.4 Portrait 390×844 và landscape 844×390 giữ đủ ba lane, player và khoảng nhìn trước; không scroll/zoom/overscroll.
- AC-02.5 Resize/orientation giữa run không reset score, timer, shield hoặc làm sai lane mapping.

### US-03 — Thu thập và giữ combo

- AC-03.1 Mỗi Mảnh Sáng chỉ tăng shards 1 và score theo công thức đúng một lần.
- AC-03.2 Consecutive collect tăng combo; miss hoặc hit reset combo.
- AC-03.3 HUD cập nhật shard/score trong frame kế tiếp; visual feedback bắt đầu <=100 ms.
- AC-03.4 Có đúng 18 shard trong course; 12 là ngưỡng win.

### US-04 — Nhận rủi ro và thất bại

- AC-04.1 Hazard có silhouette/màu khác shard trong cả normal và color-deficiency check.
- AC-04.2 Hit trừ đúng 1 Khiên, reset combo, kích hoạt 1,200 ms invulnerability và feedback hit.
- AC-04.3 Nhiều overlap trong invulnerability không trừ thêm Khiên.
- AC-04.4 Khiên về 0 fail ngay; portal với <12 shard fail với số còn thiếu chính xác.
- AC-04.5 Kết quả không thay đổi sau khi outcome đã set dù collision frame kế tiếp xảy ra.

### US-05 — Hoàn thành và chơi lại

- AC-05.1 Có đủ 12 shard và >=1 Khiên lúc hết course thì success.
- AC-05.2 Result hiển thị outcome, grade, shard `N/18`, score, best và CTA `CHƠI LẠI`.
- AC-05.3 Retry vào countdown trong <=2 giây, không reload page và không còn entity/collision state từ run trước.
- AC-05.4 Best score/grade còn sau reload cùng origin; localStorage lỗi không crash.

### US-06 — Pause/resume hợp lý

- AC-06.1 Khi document hidden, timer và simulation không tiến.
- AC-06.2 Khi quay lại, overlay chặn gameplay cho tới gesture resume.
- AC-06.3 Resume không tạo pointer gameplay cùng gesture và không gây instant collision do delta time lớn.

### US-07 — Khả dụng và accessibility

- AC-07.1 Text thiết yếu đạt contrast >=4.5:1; CTA >=3:1 và có focus state.
- AC-07.2 Touch target button/mute tối thiểu 44×44 CSS px, nằm trong safe area.
- AC-07.3 Không truyền thông tin chỉ bằng màu: shard/hazard khác shape; shield có icon + số khi cần.
- AC-07.4 `prefers-reduced-motion` giảm camera impulse/particle ít nhất 50%, bỏ flash toàn màn hình; gameplay timing không đổi.
- AC-07.5 Sound có mute và game vẫn hoàn chỉnh khi muted/audio unavailable.

### US-08 — Runtime và compatibility

- AC-08.1 WebGPU init lỗi/timeout tự fallback WebGL2; engine ready <=10s cold load trên target network.
- AC-08.2 Không uncaught error, màn hình đen, context-loss crash hoặc failed required asset trong full run + retry.
- AC-08.3 Nếu context lost, hiển thị recoverable message/Reload thay vì canvas đen im lặng.
- AC-08.4 Performance đáp ứng tất cả Must budget ở mục 12 trên reference matrix.

## 7. Wireflow mobile-first

### 7.1 Flow

```text
[Loading: logo + progress]
          |
          v
[Title]
 LINH QUANG: VƯỢT BÃO
 "Thu 12 Mảnh Sáng trước khi cổng khép lại"
 [12 mục tiêu] [3 khiên] [70 giây]
 "Chạm trái / giữa / phải để lái"
 [ BẮT ĐẦU ]       [âm thanh]
          |
          v
[Countdown: 3 • 2 • 1]
          |
          v
[Playing]
 top:       ✦ 05/12       00:42       ◇◇◇
 center:        horizon / portal
                objects approach
 lower:        player craft
 bottom:  vùng chạm ba lane vô hình
          |
    +-----+------+
    |            |
 shields=0   course end
    |            |
    v            v
[Fail payoff] [Win payoff]
    +-----+------+
          v
[Result card]
 THÀNH CÔNG / THẤT BẠI
 Grade A • 15/18 • 2,350
 Kỷ lục: 2,800
 [ CHƠI LẠI ]
 [ VỀ MÀN HÌNH CHÍNH ] (text link, Could)
```

### 7.2 HUD hierarchy

1. Objective `✦ N/12`: trái top, lớn nhất cùng timer.
2. Countdown `MM:SS`: giữa top; chuyển amber ở <=10s.
3. Shield: phải top, ba biểu tượng; icon mất bằng animation ngắn.
4. Score nhỏ hơn ở dưới objective hoặc góc trái; không cạnh tranh với survival info.
5. Combo gần player nhưng lệch 48px để không che hitbox.
6. FPS/engine tag không hiển thị cho player production; chỉ debug flag/test hook.

### 7.3 Responsive rules

- Safe-area padding: `max(12px, env(safe-area-inset-*)))`.
- HUD content max-width 720px, vẫn phân bố ba cột trong portrait.
- Landscape thấp: giảm title/HUD vertical spacing, không giảm touch target.
- Player và lane tính theo render viewport sau hardware scaling, không theo canvas backing pixel trực tiếp.
- Result dùng overlay DOM một layer; width `min(88vw, 420px)`; không cần scroll ở 390×844.

## 8. Visual / motion / audio spec

### 8.1 Palette

```css
--bg-deep: #05081A;
--bg-aurora: #11265B;
--player: #EAFBFF;
--player-glow: #66E3FF;
--shard: #FFD76A;
--shard-hot: #FFF3B0;
--hazard: #A63DFF;
--danger: #FF4D6D;
--success: #66F2A3;
--text: #F4F8FF;
--text-muted: #A9B8D8;
--panel: rgba(5, 8, 26, .82);
```

Hazard phải có core đỏ/nhọn; không chỉ đổi vàng sang tím. Background giảm saturation/brightness sau vật thể gameplay để giữ readability.

### 8.2 Typography

- System stack: `ui-rounded, system-ui, -apple-system, "Segoe UI", sans-serif`.
- Title 32–44px / 700; HUD primary 20–24px / 700; body 16–18px; debug không xuất hiện production.
- Numerals dùng `font-variant-numeric: tabular-nums` để timer không nhảy layout.

### 8.3 Motion

- UI ease: `cubic-bezier(.2,.8,.2,1)`.
- CTA 160ms; result enter 240ms; lane switch 180–240ms.
- Không animation trang trí vô hạn trên DOM. Aurora ở scene có quality tiers.
- Reduced motion: no full-screen flash, camera impulse <=2px equivalent, particle emit giảm >=50%.

## 9. MoSCoW

### Must

- One-line fantasy, Title/Start, 3-second countdown.
- Auto-forward 3-lane control cho touch/click/keyboard.
- Authored 70s course, 18 shard, target 12, 3 wave khó dần.
- 3 Khiên, hazard collision, invulnerability, hai failure condition.
- Score/combo theo contract, success/fail/result/retry.
- HUD objective/timer/shield; collect/hit/portal visual feedback.
- Pause khi hidden; resize/orientation giữ state.
- Local personal best fallback-safe.
- Reduced-motion behavior cho camera/flash/particle; gameplay timing không đổi.
- WebGPU/WebGL2 fallback, mobile/desktop acceptance, performance budget.
- Test hook đủ để QA xác minh state transition/rules mà không dựa vào pixel click ngẫu nhiên.

### Should

- Procedural WebAudio cues + mute.
- Mirrored course mỗi run để replay có biến thể nhưng giữ fairness.
- Context loss recover UI.

### Could — chỉ sau FUN-GATE

- Haptic trên browser hỗ trợ.
- Share score bằng Web Share API.
- Một daily seeded course client-only.
- Home link trên result.

### Won't for MVP

Toàn bộ non-goals mục 3.5; đặc biệt không backend, leaderboard, account, shop, nhiều level, power-up, boss hoặc endless procedural mode.

## 10. Solution architecture

### 10.1 Decision

Giữ Vite + TypeScript + Babylon.js 8. Không thêm framework UI hoặc dependency runtime. DOM overlay dùng title/HUD/result; Babylon scene dùng gameplay/rendering. GitHub Pages tiếp tục là static hosting.

### 10.2 Suggested client modules

FE có thể điều chỉnh tên file, nhưng boundaries không được trộn rule với rendering:

```text
src/
  main.ts                 bootstrap, engine fallback, app lifecycle
  game/types.ts           GameState, RunState, Entity contracts
  game/config.ts          immutable tuning/course data
  game/stateMachine.ts    transition + win/fail guards
  game/scoring.ts         pure score/grade functions
  game/course.ts          authored spawn timeline
  game/input.ts           pointer/keyboard -> target lane
  game/simulation.ts      timer, movement, collision, invulnerability
  scene/createScene.ts    camera/light/material/quality
  scene/entities.ts       pooled visual entities
  ui/hud.ts               DOM render from state
  storage.ts              safe localStorage adapter
  testHook.ts             production-safe QA observations/actions
```

Không bắt buộc refactor theo đúng cây nếu tăng rủi ro; bắt buộc giữ config/rules ở một nguồn sự thật và scoring/state transitions có thể test độc lập.

### 10.3 Domain contracts

```text
GamePhase = BOOT | TITLE | COUNTDOWN | PLAYING | PAUSED |
            PORTAL_CHECK | SUCCESS | FAILURE | RESULT

RunState:
  phase
  elapsedMs              0..70000, chỉ tăng khi PLAYING/PORTAL_CHECK
  lane                    0 | 1 | 2
  targetLane              0 | 1 | 2
  shards                  0..18
  shields                 0..3
  combo                   >=0
  score                   >=0 integer
  invulnerableUntilMs
  outcomeReason           null | SHIELDS_DEPLETED | NOT_ENOUGH_SHARDS | SUCCESS
  runIndex

PersistentSettings v1:
  version: 1
  bestScore: non-negative integer
  bestGrade: S | A | B | C | D | null
  soundEnabled: boolean
```

Storage key: `babylon-pilot:v1`. Validate every field; unknown/corrupt data resets defaults without throw.

### 10.4 Course data contract

Mỗi spawn entry:

```text
id: unique string
atMs: integer in 0..65000
kind: SHARD | HAZARD
lane: 0 | 1 | 2
speedMultiplier: optional, default wave speed
```

Validation at startup/dev test:

- exactly 18 SHARD;
- unique ids;
- sorted/non-negative `atMs`;
- valid lane;
- không unavoidable collision pattern;
- first easy shard <=5000ms;
- no new hazard after 65000ms.

### 10.5 Test hook contract

`window.__bgTest` chỉ expose JSON-safe snapshot và deterministic actions; không expose engine internals cần thiết cho gameplay:

```text
ready, engine, phase, elapsedMs, lane, targetLane,
shards, shields, combo, score, outcomeReason,
fpsSamples, pageErrors, runIndex,
actions.start(), actions.setLane(0|1|2), actions.retry()
```

QA cần thêm deterministic simulation seam hoặc injected clock để test scoring/collision/state; không dựa hoàn toàn vào tọa độ world random như smoke hiện tại.

### 10.6 Backend decision record

**Decision:** no backend.

Lý do:

- Core value là moment-to-moment flight và retry, không cần identity/network.
- Static architecture hiện có deploy đơn giản, offline-after-load trong session và không có data privacy burden.
- Leaderboard không đáng tin nếu client tự gửi score mà thiếu server-authoritative simulation/anti-cheat; thêm API lúc này tạo cost nhưng không chứng minh fun.

Trigger xem xét backend sau MVP:

1. FUN-GATE pass;
2. >=30% tester tự nguyện replay >=3 run hoặc CEO quyết định social competition là goal;
3. product chấp nhận account/anonymous identity, moderation, anti-cheat và ops cost.

## 11. Security, privacy và resilience

- Không thu PII, analytics hoặc network request ngoài static assets trong MVP.
- Không render untrusted HTML; strings course/UI nằm local.
- localStorage chỉ chứa best/settings, không secret.
- Clamp/validate state và storage; không để NaN làm loop chết.
- Page visibility pause, context-loss message và WebGPU timeout fallback.
- Audio resume chỉ sau user gesture.

## 12. Performance budget và verification matrix

### 12.1 Must budgets

**Load**

- Canonical HTML/required assets đều 200; ready <=10s cold, <=5s trên stable broadband reference.
- Main JS gzip **<=1.50 MiB** (baseline hiện tại 1,301,559 bytes); không thêm texture/audio network nặng.
- Required initial compressed transfer excluding OG image <=1.75 MiB.

**Runtime**

- Mobile target: median >=30 FPS, 10th percentile >=24 FPS trong full 70s run.
- Desktop target: median >=50 FPS.
- Không freeze liên tục >1s; không context loss trong 2 run liên tiếp.
- Input-to-visible lane response <=100ms; lane complete 180–240ms.
- Full run không tăng entity/observer/listener không giới hạn; sau retry active pooled counts quay về baseline.

**Scene caps at high quality**

- Active gameplay meshes <=80; prefer instances/thin instances/pooling.
- Ambient + burst particles active <=1,800; low tier <=900.
- Dynamic resolution/hardware scaling được phép; ưu tiên ổn định 30 FPS hơn bloom/FXAA.
- Không shadow, realtime reflection hoặc full-screen effect không phục vụ gameplay.

web.dev nêu frame 60Hz khoảng 16.66ms và application work nên nằm khoảng 10ms; với mobile MVP, floor 30 FPS tương ứng frame đều khoảng 33ms, nhưng vẫn ưu tiên consistency. MDN/Babylon guidance hỗ trợ giảm draw calls, batch/instance, skip picking không cần thiết và adaptive hardware scaling.

### 12.2 Reference matrix

Must verify:

1. Mobile Chromium emulation 390×844 touch — full success + fail + retry.
2. Desktop Chrome 1440×900 — keyboard + mouse, full run.
3. Playwright WebKit 390×844 — smoke + full run nếu runner hỗ trợ GPU.
4. Safari iOS thật hoặc BrowserStack tương đương — manual full run, orientation, audio policy.
5. WebGL2 forced/fallback path — full initialization + at least 20s gameplay.
6. `prefers-reduced-motion: reduce` — HUD/controls/readability và reduced effects.

QA evidence phải dùng ledger theo repo cho lệnh required; PM chỉ chấp nhận FRESH evidence đúng current working tree.

### 12.3 Graceful degradation order

Nếu FPS dưới budget, giảm theo thứ tự:

1. bloom/post-process;
2. ambient particle emit/capacity;
3. hardware render scale;
4. mesh segments/material complexity;
5. cosmetic trail.

Không giảm collision update, input sampling, telegraph distance, HUD hoặc gameplay object readability.

## 13. FUN-GATE — bắt buộc trước public promotion

Automated test chỉ chứng minh correctness/performance, không chứng minh vui. Thực hiện moderated playtest với **tối thiểu 10 người**, ưu tiên ít nhất 6 người chưa xem bản cũ; mỗi người chơi tối đa 3 run, không coach sau câu “hãy chơi thử”. Ghi raw sheet/video hoặc notes có timestamp, device, run outcomes.

### 13.1 Metrics

| Signal | Cách đo | PASS threshold |
|---|---|---|
| Comprehension | Nói đúng objective + hazard trước giây 10 | >=9/10 người |
| Control | Lane switch đúng và collect shard đầu không coach | >=9/10 người |
| Fairness | Với mỗi death, hỏi “do mình hay do game?” | >=80% death được quy cho lỗi người chơi |
| Tension arc | Rating 1–5: Wave 3 căng hơn Wave 1 nhưng vẫn đọc được | median >=4 |
| Feedback clarity | Nhận biết collect, hit, shield còn lại, win/fail | >=9/10 đúng cả bốn |
| Replay intent | Tự bấm Retry hoặc nói muốn thử lại, không gợi ý | >=7/10 |
| Fun | “Tôi muốn chơi thêm một lượt” 1–5 | median >=4 và không quá 2 rating <=2 |
| Session fit | Full successful run gameplay | 65–80s |
| Motion comfort | chóng mặt/khó chịu | 0 severe, <=1 mild |

### 13.2 Gate verdict

- **PASS:** tất cả threshold đạt, không P0/P1 usability defect, runtime Must pass.
- **ITERATE:** có fun/replay nhưng một hoặc hai signal dưới threshold; chỉ sửa root cause trong core loop/feedback rồi retest.
- **STOP/PIVOT:** fun median <=2 hoặc replay intent <4/10 sau hai vòng chỉnh core; không cứu bằng meta progression, shop hay backend.

Không được claim “fun” từ FPS, visual polish hoặc lời nhận xét nội bộ. Evidence tối thiểu: participant table ẩn danh, device, run count, outcomes, ratings, observation và summary calculation.

## 14. Release acceptance checklist

### Product/BA

- [ ] Fantasy/objective/risk/failure/progression đúng PRD; không scope creep.
- [ ] Course có đúng 18 shard, 70s, 3 wave; tất cả business rules được test.
- [ ] Success/failure/result/retry đều self-play và automation verify.
- [ ] Score/grade/best storage đúng contract.

### UI/UX

- [ ] Title và control comprehension qua test >=9/10.
- [ ] Mobile portrait + landscape không che gameplay/safe area.
- [ ] Gameplay object khác shape/màu; HUD hierarchy rõ.
- [ ] Feedback clarity, reduced motion, mute/audio fallback pass.

### Architecture/performance

- [ ] WebGPU + forced WebGL2 paths; no uncaught errors.
- [ ] Build/test evidence FRESH trên đúng working tree.
- [ ] Bundle/load/runtime budgets đạt trên matrix.
- [ ] Listener/entity counts không leak qua 2 retry.

### FUN-GATE

- [ ] Raw playtest evidence tồn tại.
- [ ] Threshold và verdict tính từ evidence, không từ opinion.
- [ ] Nếu chưa PASS, không thêm backend/meta feature để che core loop.

## 15. Risks và mitigations

| Risk | Tác động | Mitigation / owner |
|---|---|---|
| 3D forward motion gây khó chịu | Người chơi rời game | Giảm camera roll/FOV pulse, reduced motion, playtest mobile — FE/UX |
| Pattern không đọc kịp trên màn hình thấp | Death bị xem là unfair | Telegraph >=900ms, camera framing theo aspect, author pattern portrait-first — FE |
| Particle/post-process ăn GPU | Input lag, fail performance | Pool, cap, quality tier, degradation order — FE |
| Lane control cảm giác chậm/floaty | Core không vui | Response <=100ms, movement 180–240ms, tune qua FUN-GATE — FE/PM |
| Scope creep vì muốn “progression” | Trễ MVP, không sửa core | Chỉ 3 wave + best local; Won't list là hard boundary — PM |
| Backend leaderboard bị cheat | Mất tin cậy, ops cost | Không backend trước FUN-GATE và server-authoritative decision — PM/Architecture |
| Existing smoke phụ thuộc tọa độ world cũ | False failure/pass | Test hook deterministic + state-level test seam — FE/QA |

## 16. Handoff decision

FE được phép bắt đầu implementation theo MVP này. Ưu tiên theo thứ tự:

1. State machine + deterministic course + pure rules.
2. 3-lane control + collision + win/fail/retry bằng primitive visuals.
3. HUD/wireflow và full-run automation.
4. Gameplay readability/feedback.
5. Performance tuning, audio Should và polish.

Không dành thời gian cho backend, asset pipeline lớn, unlock, nhiều level hoặc leaderboard. Quyết định release cuối cần BA acceptance + performance evidence + FUN-GATE playtest; QA pass riêng không thay thế các gate này.
