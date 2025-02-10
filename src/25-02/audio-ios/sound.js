/**
 * 웹 페이지의 모든 사운드를 관리하는 함수
 * 여러 사운드를 동시에 재생하고 제어할 수 있습니다.
 *
 * @example
 * // Sound 함수 호출
 * const soundManager = Sound();
 *
 * // 사운드 파일 로드
 * soundManager.load('bgm', './sounds/background.mp3');
 * soundManager.load('effect', './sounds/effect.mp3');
 *
 * // 배경음악 재생 (반복 재생)
 * soundManager.play('bgm', true);
 *
 * // 효과음 재생 (배경음악과 동시 재생)
 * soundManager.play('effect');
 */
function Sound() {
	const audioContext = new (window.AudioContext || window.webkitAudioContext)();
	const sounds = new Map(); // 로드된 사운드 버퍼를 저장
	const activeSources = new Map(); // 현재 재생 중인 소스들을 저장

	/**
	 * 사운드 파일을 로드합니다.
	 * @param {string} id - 사운드를 구분할 고유 ID
	 * @param {string} url - 사운드 파일 경로
	 */
	function load(id, url) {
		fetch(url)
			.then((response) => response.arrayBuffer())
			.then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
			.then((audioBuffer) => {
				sounds.set(id, audioBuffer);
			})
			.catch((error) => {
				console.error(`사운드 로드 실패 (${id}):`, error);
			});
	}

	/**
	 * 사운드를 재생합니다.
	 * @param {string} id - 재생할 사운드 ID
	 * @param {boolean} loop - 반복 재생 여부
	 */
	function play(id, loop = false) {
		const buffer = sounds.get(id);
		if (!buffer) {
			console.error(`사운드가 없습니다: ${id}`);
			return;
		}

		audioContext.resume().then(() => {
			const source = audioContext.createBufferSource();
			source.buffer = buffer;
			source.loop = loop;

			const gainNode = audioContext.createGain();
			source.connect(gainNode);
			gainNode.connect(audioContext.destination);

			source.start(0);

			if (!activeSources.has(id)) {
				activeSources.set(id, []);
			}
			activeSources.get(id).push({ source, gainNode });

			source.onended = () => {
				const sources = activeSources.get(id);
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
	function pause(id) {
		if (activeSources.has(id)) {
			const currentTime = audioContext.currentTime;
			activeSources.get(id).forEach(({ source }) => {
				source.stop(currentTime);
			});
			activeSources.set(id, []);
		}
	}

	/**
	 * 재생 중인 사운드를 완전히 정지합니다.
	 * @param {string} id - 정지할 사운드 ID
	 */
	function stop(id) {
		if (activeSources.has(id)) {
			activeSources.get(id).forEach(({ source }) => {
				source.stop(0);
			});
			activeSources.set(id, []);
		}
	}

	/**
	 * 사운드를 앞으로 이동합니다.
	 * @param {string} id - 이동할 사운드 ID
	 * @param {number} seconds - 앞으로 이동할 초 단위 시간
	 */
	function forward(id, seconds = 5) {
		if (activeSources.has(id)) {
			const sources = activeSources.get(id);
			sources.forEach(({ source, gainNode }) => {
				const offset = (source.buffer.duration + source.playbackTime + seconds) % source.buffer.duration;
				source.stop(0);
				const newSource = audioContext.createBufferSource();
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
	function backward(id, seconds = 5) {
		if (activeSources.has(id)) {
			const sources = activeSources.get(id);
			sources.forEach(({ source, gainNode }) => {
				const offset = Math.max(0, source.playbackTime - seconds);
				source.stop(0);
				const newSource = audioContext.createBufferSource();
				newSource.buffer = source.buffer;
				newSource.connect(gainNode);
				newSource.start(0, offset);
				source = newSource;
			});
		}
	}

	return {
		load,
		play,
		pause,
		stop,
		forward,
		backward,
	};
}
