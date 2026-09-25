# 광평중학교 음악중점반 홍보 모션그래픽 (30초 · 16:9)

- `index.html`: 브라우저에서 바로 재생되는 단일 파일(폰트·음원 내장, 1920×1080 캔버스)
- `gwangpyeong-music-promo.mp4`: 완성 영상(1080p 30fps, H.264 + AAC)
- `bgm.mp3`: 오리지널 BGM(128 BPM, 16마디 = 30초). 샘플 없이 코드로 합성한 곡이라 상업적으로 써도 됩니다.

## 다시 만들기 (src/)
1. `node music.mjs`: `bgm.wav`와 `events.json`(킥·클랩·스탭·멜로디 타이밍)을 만듭니다.
2. `node build.mjs`: `src.html`에 폰트 서브셋·음원·이벤트를 넣어서 단일 HTML로 빌드합니다.
3. `node video.mjs`: Playwright로 900프레임을 렌더링한 뒤 ffmpeg로 MP4를 만듭니다(`npm i ffmpeg-static` 필요).

악기 목록은 `src.html`의 `INSTR` 배열에서 바꿀 수 있습니다.
