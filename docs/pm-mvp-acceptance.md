# Babylon Pilot — MVP và release acceptance

> **SUPERSEDED (2026-08-30):** Tài liệu này mô tả tech pilot cũ và chỉ còn giá trị lịch sử/evidence. Gameplay MVP mới, wireflow, acceptance criteria, architecture và FUN-GATE nằm tại [`game-redesign-prd.md`](./game-redesign-prd.md). Khi có xung đột, PRD mới là nguồn sự thật.

- Gate owner: Product / BA / Solution Architecture / UI/UX
- Quyết định PM: **REQUEST-CHANGES cho bản phát hành hiện tại**
- Canonical public URL đã chốt: **https://thaitrn.github.io/babylon-pilot/**
- Phạm vi: pilot tương tác 3D một màn hình; không thêm account, backend, leaderboard, âm thanh, level hoặc analytics.

## 1. Giá trị người dùng và MVP

Người dùng mở link và lập tức thấy một cảnh cực quang 3D có 10 linh thể. Người dùng chạm/click để tạo burst hạt, thu thập đủ 10 linh thể và thấy bộ đếm tiến từ 0/10 đến 10/10.

### MoSCoW

**Must**

1. Một canonical HTTPS URL công khai, không yêu cầu đăng nhập.
2. Cảnh 3D khởi tạo thành công bằng WebGPU hoặc WebGL2 fallback.
3. Hiển thị đủ canvas, HUD `0/10`, FPS và engine tag; không tràn viewport/safe area.
4. Tap/click tạo burst đúng một lần cho mỗi pointer down; trúng linh thể thì ẩn linh thể và tăng điểm đúng 1.
5. Chơi được đến 10/10 trên mobile và desktop.
6. Build/deploy tái lập từ commit trên `main`; live phải khớp source đã commit và working tree tracked sạch tại lúc bàn giao.
7. Không có uncaught page error, failed app asset, màn hình đen kéo dài hoặc input bị treo.

**Should**

1. Tương tác vẫn phản hồi trong lúc particle chạy; median FPS tối thiểu 20 trong mẫu 10 giây trên thiết bị/browser tham chiếu.
2. Thời gian từ navigation đến `window.__bgTest.ready === true` không quá 10 giây trên mạng ổn định.
3. Metadata chia sẻ cơ bản: description, canonical, Open Graph title/description/image.

**Could**

- Màn hình/animation chúc mừng sau 10/10.
- Nút chơi lại.

**Won't (MVP)**

- Đăng nhập, lưu điểm, backend, leaderboard, nhiều level, sound/music, analytics, PWA/offline.

## 2. Acceptance criteria

### AC-01 — URL và deploy

Given người dùng mở canonical URL,
when response và app assets tải xong,
then URL trả HTTP 200 qua HTTPS, JS chính trả 200, không redirect sang URL khác và game vào trạng thái ready.

Evidence bắt buộc khi FE bàn giao: canonical URL, commit SHA trên `main`, deployment SHA/run URL và timestamp; xác nhận live bundle được tạo từ đúng commit đó.

### AC-02 — Khởi tạo engine

Given browser hỗ trợ WebGPU hoặc WebGL2,
when mở game mới,
then trong tối đa 10 giây `window.__bgTest.ready === true`, engine tag không còn `init…`, canvas có kích thước đúng viewport, không có `window.__initFail`, `pageErrors` rỗng và console không có app error.

WebGPU init lỗi hoặc timeout phải tự fallback sang WebGL2, không để màn hình treo.

### AC-03 — Mobile

Kiểm tra tối thiểu ở viewport 390×844 với touch và một lượt Safari iOS thật hoặc BrowserStack tương đương:

- canvas phủ toàn viewport, body không scroll/overscroll;
- HUD không chạm notch/safe area, đọc được điểm và FPS;
- một tap tạo đúng một input event và ít nhất một burst;
- tap trúng linh thể tăng đúng 1 điểm, không double count;
- resize/orientation không làm canvas sai kích thước hoặc mất input;
- chơi thủ công đến 10/10, không freeze/crash.

### AC-04 — Desktop

Kiểm tra tối thiểu Chrome ở viewport 1440×900:

- canvas phủ viewport, HUD đọc được;
- một click tạo đúng một input event và ít nhất một burst;
- click trúng linh thể tăng đúng 1 điểm;
- resize cửa sổ giữ đúng canvas và input mapping;
- chơi đến 10/10, không uncaught error/freeze.

### AC-05 — Hiệu năng pilot

Trên từng cấu hình tham chiếu, lấy FPS từ test hook trong 10 giây sau khi ready:

- median FPS >= 20;
- không có đoạn freeze liên tục > 1 giây;
- input tạo burst/điểm trong vòng 500 ms theo quan sát hoặc automation.

Nếu thiết bị iOS tham chiếu không đạt, ưu tiên giảm particle/post-processing thay vì thêm feature.

### AC-06 — Release hygiene

- `npm run build` pass trên đúng working tree sẽ phát hành.
- Tất cả file phục vụ build/deploy (bao gồm Vite base config) đã được track và commit.
- Không còn tracked change ngoài ý muốn sau commit.
- Sau deploy, rerun smoke AC-01 đến AC-04 trên live URL, không chỉ trên `file://` hoặc localhost.

## 3. GameHub listing contract

- Title: **Khoa học lung linh**
- Slug: **babylon-pilot**
- Type: **Interactive 3D game / tech pilot**
- Short description: **Chạm hoặc click để thu thập 10 linh thể phát sáng giữa cực quang hạt 3D.**
- Instructions: **Chạm/click vào các linh thể vàng; thu thập đủ 10 để hoàn thành.**
- Tags: **3D, Babylon.js, WebGPU, WebGL2, Particle, Interactive, Mobile**
- Canonical URL: **https://thaitrn.github.io/babylon-pilot/**
- Locale: **vi**
- Orientation: **portrait và landscape responsive**
- Thumbnail/OG image: FE/content cung cấp ảnh 1200×630; không dùng placeholder khi publish GameHub.

## 4. Evidence hiện tại và gap cần sửa

1. `git status --short --branch` tại PM gate: `src/main.ts` đang modified và `vite.config.ts` untracked; `main` đang ở `f7414ef` và ngang `origin/main`. Expected: deploy source đã commit, tracked working tree sạch. Actual: release config và log init chưa nằm trong commit.
2. `src/main.ts:249-257` hiện có bốn `console.log("INIT step…")` chưa commit. Live bundle cũng chứa chuỗi `INIT step1 engine`, trong khi `origin/main:src/main.ts` không có. Expected: live truy vết được về source trên `main`. Actual: live khác source committed.
3. `vite.config.ts:3-5` đặt base `/babylon-pilot/` nhưng file chưa track. Expected: cấu hình bắt buộc cho GitHub Project Pages nằm trong source release. Actual: clone sạch từ `main` không có config này.
4. HTTP probe xác nhận canonical URL và `/babylon-pilot/assets/index-BCsASBbE.js` trả 200. GitHub Deployments API ghi deployment `6123193903` success, environment URL đúng canonical, deploy SHA `382be714531b788567c66097f9ab7f963d6e8440` trên `gh-pages`.
5. Live smoke bằng Playwright/Chrome headless:
   - mobile 390×844: ready=true, engine=WebGPU, canvas=390×844, particleCount=6000, một tap làm taps=1 và score tăng 0→1;
   - desktop 1440×900: ready=true, engine=WebGPU, canvas=1440×900, particleCount=6000, một click làm taps=1 và score tăng 0→1.
   Đây chỉ là smoke Chromium, chưa thay thế Safari iOS thật, full 10/10, resize/orientation và mẫu hiệu năng 10 giây.
6. `index.html:3-8` có viewport/title nhưng chưa có canonical, description hoặc Open Graph metadata. Đây là Should; có thể phát hành pilot nội bộ nếu GameHub giữ metadata riêng, nhưng phải có trước public promotion/share card.
7. `package.json:6-8` chỉ có build, chưa có test script. FE phải cung cấp output build và live smoke; PM không suy diễn PASS từ file script cũ vì `e2e.mjs:4` trỏ tới Chromium cache path không còn tồn tại và `e2e.mjs:12` chỉ mở `file://dist/index.html`.

## 5. Việc FE phải sửa trước release acceptance

1. Chốt giữ/xóa bốn debug init logs; track `vite.config.ts`; commit source/config liên quan lên `main` và để tracked working tree sạch.
2. Build từ commit đó, deploy GitHub Pages, chứng minh live deployment map về đúng commit/build; không tái dùng bundle build từ working tree bẩn.
3. Chạy live smoke cho mobile + desktop theo AC-01–AC-04; thêm lượt Safari iOS thật/tương đương và hoàn thành 10/10.
4. Ghi mẫu FPS 10 giây; nếu median <20, giảm tải particle/post-processing trong scope MVP.
5. Cập nhật smoke test để không hard-code executable đã mất và nhận URL live; hoặc cung cấp lệnh automation tương đương có thể rerun.
6. Cung cấp GameHub thumbnail 1200×630. Metadata Open Graph là Should, không được dùng để trì hoãn pilot nội bộ nếu listing GameHub đã mang đủ title/description/tags.

## 6. Cách PM/QA verify lại

1. Đối chiếu `git status`, `git rev-parse HEAD`, origin main và deployment SHA/run.
2. Chạy build evidence trên đúng commit theo quy định repo.
3. Mở canonical URL và kiểm HTTP/status asset.
4. Chạy live smoke ở 390×844 touch và 1440×900 mouse; kiểm ready, errors, canvas, tap/click, score.
5. Manual Safari iOS + resize/orientation + full 10/10.
6. Chỉ chuyển release gate sang PASS khi evidence đáp ứng toàn bộ Must; Should còn thiếu phải ghi debt/owner rõ ràng.
