const problematicBtns = [...document.querySelector('.problematic').querySelectorAll('button')];
const revisedBtns = [...document.querySelector('.revised').querySelectorAll('button')];

['click', 'correct', 'incorrect', 'complete'].forEach((event, idx) => {
	problematicBtns[idx].addEventListener('click', () => {
		console.log('problematic version: ', event);
		const _audio = problematicAudios[event];
		_audio.currentTime = 0;
		_audio.play();
		_audio.addEventListener('play', () => console.log(`problematic ${event} plays`), { once: true });
		_audio.addEventListener('ended', () => console.log(`problematic ${event} ends`), { once: true });
	});

	revisedBtns[idx].addEventListener('click', () => {
		console.log('revised version: ', event);
		play(event);
	});
});

/**
 * HTML Audio 객체를 이용한 방법
 */
const problematicAudios = {
	click: new Audio('./sounds/click.mp3'),
	correct: new Audio('./sounds/correct.mp3'),
	incorrect: new Audio('./sounds/incorrect.mp3'),
	complete: new Audio('./sounds/complete.mp3'),
};

/**
 * Web Audio API를 이용한 방법
 */
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function play(sound) {
	audioContext.resume().then(() => {
		const url = `./sounds/${sound}.mp3`;
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
