/*
 * (c) Copyright 2016 Uwe Voigt
 * All Rights Reserved.
 */
"use strict";

/**
 * @param {Game} game
 * 
 * @constructor
 */
function Sound(game, localConfig) {
	var audioContext;
	var webaudio;
	var mp3Buffer = {};
	var urls = [];
	var names = [ "dyna", "battle", "world", "explode", "take", "burst", "plop", "ding", "timeout", "port", "electric" ];
	var config;

	try {
		audioContext = new (window.AudioContext || window.webkitAudioContext);
		webaudio = true;

		var listener = audioContext.listener;

		var musicVolumeNode1 = audioContext.createGain();
		musicVolumeNode1.connect(audioContext.destination);

		var musicVolumeNode2 = audioContext.createGain();
		musicVolumeNode2.connect(audioContext.destination);

	} catch (e) {
		console.log("No Web Audio API.");
	}

	var directory = "sounds/";
	loadConfig(directory);
	for (var i = 0; i < names.length; i++) {
		// use an object rather than a plain string .. so we can add the property for a playRequest
		var n = names[i];
		urls[i] = {n: n.indexOf(".") != -1 ? n : n + ".mp3"};
		loadAudio(directory, urls[i]);
	}

	this.playExplode = function(position) {
		play(urls[3], position);
	}
	this.playTake = function(position) {
		play(urls[4], position);
	}
	this.playBurst = function(position) {
		play(urls[5], position);
	}
	this.playPlop = function(position) {
		play(urls[6], position);
	}
	this.playDing = function() {
		play(urls[7], 0, true);
	}
	this.playTimeout = function() {
		play(urls[8]);
	}
	this.playPort = function() {
		play(urls[9]);
	}
	this.playElectric = function(position) {
		play(urls[10], position);
	}

	this.music = function(multiplayer, on) {
		music(urls[multiplayer ? 1 : 0], on);
	}
	this.playWorld = function() {
		music(urls[2], true);
	}
	this.togglePause = function(pause) {
		togglePause(this, pause);
	}
	function togglePause(sound, pause) {
		if (sound.musicSource) {
			var musicVolume = sound.musicSource.musicVolume;
			if (pause) {
				fade(musicVolume, 0, function() {
					if (webaudio)
						audioContext.suspend();
					else
						musicVolume.pause();
				});
			} else {
				if (webaudio)
					audioContext.resume();
				else
					musicVolume.play();
				fade(musicVolume, musicVolume.volume);
			}
		}
	}

	function fade(node, to, endCallback) {
		var duration = 500;
		var current = volume(node);
		var dir = -(current - to);
		if (node.fadeIntervalId != undefined)
			clearInterval(node.fadeIntervalId);
		var start = Date.now();
		node.fadeIntervalId = setInterval(function () {
			var timePassed = Date.now() - start;
			var progress = timePassed / duration;
			// progess läuft immer von 0..1
			if (progress > 1)
				progress = 1;
		    var delta = current + dir * progress;
			volume(node, delta);
		    if (progress == 1) {
				clearInterval(node.fadeIntervalId);
				node.fadeIntervalId = undefined;
				if (endCallback)
					endCallback();
			}
		}, 10);
	}

	/**
	 * @param node entweder ein gain node oder ein Audio
	 */
	function volume(node, value) {
		if (value === undefined)
			return webaudio ? node.volume !== undefined ? node.volume :  node.gain.value : node.volume;
		if (webaudio)
			node.gain.setValueAtTime(value, 0);
		else
			node.volume = value;
	}

	function music(url, on) {
		if (localConfig && !localConfig.music[0])
			return;

		var sound = game.sound;
		// sound.musicSource ist ein buffer source im webaudio-fall, ansonsten ein Object
		// sound.musicSource.musicVolume ist ein gain node im webaudio-fall, ansonsten ein Audio

		if (on) {

			var musicVolume = musicVolumeNode1;

			if (sound.musicSource) {
				var src = sound.musicSource;
				if (musicVolume === src.musicVolume) {
					musicVolume = musicVolumeNode2;
					console.log("switch to volume node2");
				}
				console.log("fade out previous music, sound.musicSource=" + sound.musicSource);
				fade(src.musicVolume, 0, function() {
					console.log("stop previous music");
					if (webaudio)
						src.stop();
					else
						src.musicVolume.pause();
				});
			}

			// ein buffer im webaudio-fall, ansonsten ein Audio
			var buffer = mp3Buffer[url.n];
			if (!buffer) {
				// play request if the URL has not yet been loaded
				url.r = true;
				console.log("tried to play " + url.n + " but that is still not loaded.... deferring");
			} else {
				if (webaudio) {
					var source = audioContext.createBufferSource();
					sound.musicSource = source;
					source.musicVolume = musicVolume;
					source.buffer = buffer;
				} else {
					var source = {};
					sound.musicSource = source;
					source.musicVolume = buffer;

					if (buffer.currentTime != 0)
						buffer.currentTime = 0;
				}
				var volume = 1;
				if (config && config[url.n]) {
					var conf = config[url.n];
					// l: loop(boolean)
					// e: end (millis)
					// fi: fadeIn(millis)
					// fo: fadeOut(millis)
					// d: detune
					if (webaudio)
						source.loop = conf.l;
					else
						buffer.loop = conf.l;

					var loopEnd = conf.e;
					source.loopEnd = loopEnd;
					if (conf.v)
						volume = conf.v;
					if (conf.d)
						source.detune.value = conf.d;
					if (conf.r)
						source.playbackRate.value = conf.r;

//					var id = setTimeout(function() {
//						console.log("music timeout... " + url.n + " fading out");
//						fade(musicGainNode, 0, startLoop);
//					}, (loopEnd - 1) * 1000);
					console.log("configured " + url.n + " according to config: "
							+ (function () {
								var s = "";
								var lf = "\r\n";
								if (conf.l) s += lf + "  loop: " + conf.l;
								if (conf.e) s += lf + "  loop end: " + conf.e;
								if (conf.d) s += lf + "  detune: " + conf.d;
								if (conf.v) s += lf + "  volume: " + conf.v;
								if (conf.r) s += lf + "  playbackRate: " + conf.r;
								return s;
							})());
				}
				if (localConfig) {
					volume = localConfig.music[1];
					console.log("configured music volume:" + volume);
				}

				if (webaudio) {
					source.connect(musicVolume);
					source.start();
					musicVolume.gain.setValueAtTime(volume, 0);
					// da gain.value nicht den korrekten Wert wiedergibt
					musicVolume.volume = volume;
				} else {
					buffer.volume = volume;
					buffer.play();
				}
//				var startLoop = function() {
//					console.log(url.n + " fading in");
//					fade(musicVolume, volume);
//				};
//				startLoop();
			}
		} else {
			url.r = false;
			if (sound.musicSource) {
				var src = sound.musicSource;
				console.log("stopping music, sound.musicSource=" + sound.musicSource);
				sound.musicSource = undefined;
				fade(src.musicVolume, 0, function() {
					if (webaudio)
						src.stop();
					else
						src.musicVolume.pause();
				});
			}
		}
	}

	function play(url, position, suppressLocalConfig) {
		if (!suppressLocalConfig && localConfig && !localConfig.fx[0])
			return;

		if (audioContext) {

			var source = audioContext.createBufferSource();
			source.buffer = mp3Buffer[url.n];

			var volumeNode = audioContext.createGain();

			var pannerNode = audioContext.createPanner();
			pannerNode.refDistance = game.canvasWidth / 2;

			var volume = 1;
			if (!suppressLocalConfig && localConfig) {
				volume = localConfig.fx[1];
				console.log("configured fx volume:" + volume);
				volumeNode.gain.setValueAtTime(volume, 0);
			}
			source.connect(volumeNode);

			var listenerx = game.offsetX + game.canvasWidth / 2, listenery = game.offsetY + game.canvasHeight / 2;

			volumeNode.connect(pannerNode);
			pannerNode.connect(audioContext.destination);
			if (position && !Levels.intersects(game.offsetX, game.offsetY, game.offsetX + game.canvasWidth, game.offsetY + game.canvasHeight,
					position.x, position.y, position.x + position.Width, position.y + position.Height)) {
    			listener.setPosition(listenerx, listenery, 1);
    			pannerNode.setPosition(position.x, position.y, 1);
			} else {
    			listener.setPosition(listenerx, listenery, 1);
    			pannerNode.setPosition(listenerx, listenery, 1);
			}
//			console.log("context number of inputs: " + audioContext.destination.numberOfInputs + ", numberOfOutputs: " + audioContext.destination.numberOfOutputs + ", channelcount: " + audioContext.destination.channelCount);
			source.start();
		} else {
//			for (var a in mp3Buffer) {
//				mp3Buffer[a].pause();
//			}
			var audio = mp3Buffer[url.n];
			if (audio.currentTime != 0)
				audio.currentTime = 0;
			audio.play();
		}
	}

	function loadAudio(dir, url) {
		var fullUrl = dir + url.n;
		var request = createRequest(fullUrl);
		if (webaudio) {
			request.responseType = "arraybuffer";
			request.onload = function() {
				try {
					audioContext.decodeAudioData(request.response, function(buffer) {
						mp3Buffer[url.n] = buffer;
						startMusicIfRequested(url);
					}, function(e1) {
						console.log("request error: " + e1);
					});
				} catch (e2) {
					console.log("No sound possible. Error: " + e2.message);
				}
			};
		} else {
			request.onload = function() {
				audio.src = fullUrl;
				mp3Buffer[url.n] = audio;
				startMusicIfRequested(url);
			}
			var audio = new Audio();
		}
		request.send();
	}

	function startMusicIfRequested(url) {
		console.log("successfully loaded " + url.n);
		if (url.r) {
			console.log("a previous attempt to play it has been detected... play it now!");
			music(url, true);
		}
	}

	function loadConfig(dir) {
		var request = createRequest(dir + "config.json");
		request.onload = function() {
			config = JSON.parse(request.response);
			console.log("successfully loaded config: " + JSON.stringify(config));
		}
		request.send();
	}

	function createRequest(url) {
		var request = new XMLHttpRequest();
		request.open('GET', url, true); // POST test!
		return request;
	}
}