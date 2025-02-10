# IOS(Safari, mac, etc...)에서 오디오 재생 문제

## 주요 문제점

-   사용자의 상호작용 없이는 음원을 재생할 수 없다.
-   백그라운드 오디오 재생이 제한된다.
-   미디어 세션이 제한되어, 완벽한 제어(소리 중간에 소리를 낸다거나 하는 행위)가 어렵다.
-   동시 재생이 어렵다.

## 해결 방안

-   사용자 상호작용 후 오디오를 재생하도록 보장한다.
-   Web Audio API를 이용하여, 미디어 제어를 한다.

## 문제가 있는 버전 (Audio 객체 이용)

```js
const _audio = new Audio('/path/sound.mp3');
_audio.currentTime = 0;
_audio.play();
_audio.addEventListener('play', () => {}, { once: true });
_audio.addEventListener('ended', () => {}, { once: true });
```

## 개선된 버전 (Web Audio API)

```js
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
function play(sound) {
	audioContext.resume().then(() => {
		const url = '/path/sound.mp3';
		fetch(url)
			.then((response) => response.arrayBuffer())
			.then((data) => audioContext.decodeAudioData(data))
			.then((buffer) => {
				const source = audioContext.createBufferSource();
				source.buffer = buffer;
				source.connect(audioContext.destination);
				source.start(0);
			})
			.catch((err) => console.error('Audio playback failed:', err));
	});
}
```

### 개선된 버전의 장점

-   더 정교한 오디오 제어가 가능
-   여러 소리를 동시에 재생 가능
-   오디오 처리와 조작이 더 유연함
-   iOS Safari에서도 안정적으로 작동

## 사용할 수 있는 객체

```javascript
/**
 * 웹 페이지의 모든 사운드를 관리하는 클래스
 * 여러 사운드를 동시에 재생하고 제어할 수 있습니다.
 *
 * @example
 * // Sound 클래스 인스턴스 생성
 * const soundManager = new Sound();
 *
 * // 사운드 파일 로드
 * await soundManager.load('bgm', './sounds/background.mp3');
 * await soundManager.load('effect', './sounds/effect.mp3');
 *
 * // 배경음악 재생 (반복 재생)
 * soundManager.play('bgm', true);
 *
 * // 효과음 재생 (배경음악과 동시 재생)
 * soundManager.play('effect');
 *
 * // 개별 제어
 * soundManager.pause('bgm');    // 배경음악만 일시정지
 * soundManager.stop('effect');  // 효과음만 정지
 * soundManager.forward('bgm', 10);  // 배경음악 10초 앞으로
 * soundManager.backward('bgm', 5);  // 배경음악 5초 뒤로
 */
class Sound {
	constructor() {
		this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
		this.sounds = new Map(); // 로드된 사운드 버퍼를 저장
		this.activeSources = new Map(); // 현재 재생 중인 소스들을 저장
	}

	/**
	 * 사운드 파일을 로드합니다.
	 * @param {string} id - 사운드를 구분할 고유 ID
	 * @param {string} url - 사운드 파일 경로
	 */
	async load(id, url) {
		try {
			const response = await fetch(url);
			const arrayBuffer = await response.arrayBuffer();
			const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
			this.sounds.set(id, audioBuffer);
		} catch (error) {
			console.error(`사운드 로드 실패 (${id}):`, error);
		}
	}

	/**
	 * 사운드를 재생합니다.
	 * @param {string} id - 재생할 사운드 ID
	 * @param {boolean} loop - 반복 재생 여부
	 */
	play(id, loop = false) {
		const buffer = this.sounds.get(id);
		if (!buffer) {
			console.error(`사운드가 없습니다: ${id}`);
			return;
		}

		this.audioContext.resume().then(() => {
			const source = this.audioContext.createBufferSource();
			source.buffer = buffer;
			source.loop = loop;

			const gainNode = this.audioContext.createGain();
			source.connect(gainNode);
			gainNode.connect(this.audioContext.destination);

			source.start(0);

			if (!this.activeSources.has(id)) {
				this.activeSources.set(id, []);
			}
			this.activeSources.get(id).push({ source, gainNode });

			source.onended = () => {
				const sources = this.activeSources.get(id);
				const index = sources.findIndex((s) => s.source === source);
				if (index > -1) {
					sources.splice(index, 1);
				}
			};
		});
	}

	/**
	 * 재생 중인 사운드를 일시정지합니다.
	 * @param {string} id - 일시정지할 사운드 ID
	 */
	pause(id) {
		if (this.activeSources.has(id)) {
			const currentTime = this.audioContext.currentTime;
			this.activeSources.get(id).forEach(({ source }) => {
				source.stop(currentTime);
			});
			this.activeSources.set(id, []);
		}
	}

	/**
	 * 재생 중인 사운드를 완전히 정지합니다.
	 * @param {string} id - 정지할 사운드 ID
	 */
	stop(id) {
		if (this.activeSources.has(id)) {
			this.activeSources.get(id).forEach(({ source }) => {
				source.stop(0);
			});
			this.activeSources.set(id, []);
		}
	}

	/**
	 * 사운드를 앞으로 이동합니다.
	 * @param {string} id - 이동할 사운드 ID
	 * @param {number} seconds - 앞으로 이동할 초 단위 시간
	 */
	forward(id, seconds = 5) {
		if (this.activeSources.has(id)) {
			const sources = this.activeSources.get(id);
			sources.forEach(({ source, gainNode }) => {
				const offset = (source.buffer.duration + source.playbackTime + seconds) % source.buffer.duration;
				source.stop(0);
				const newSource = this.audioContext.createBufferSource();
				newSource.buffer = source.buffer;
				newSource.connect(gainNode);
				newSource.start(0, offset);
				source = newSource;
			});
		}
	}

	/**
	 * 사운드를 뒤로 이동합니다.
	 * @param {string} id - 이동할 사운드 ID
	 * @param {number} seconds - 뒤로 이동할 초 단위 시간
	 */
	backward(id, seconds = 5) {
		if (this.activeSources.has(id)) {
			const sources = this.activeSources.get(id);
			sources.forEach(({ source, gainNode }) => {
				const offset = Math.max(0, source.playbackTime - seconds);
				source.stop(0);
				const newSource = this.audioContext.createBufferSource();
				newSource.buffer = source.buffer;
				newSource.connect(gainNode);
				newSource.start(0, offset);
				source = newSource;
			});
		}
	}
}

export default Sound;
```
