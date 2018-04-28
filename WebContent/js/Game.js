/*
 * (c) Copyright 2016 Uwe Voigt
 * All Rights Reserved.
 */
"use strict";

/**
 * The Blast-Game.
 * 
 * @param {Number} zoom
 * 
 * @constructor
 */
function Game(zoom) {

	zoom = zoom ? zoom : 1;

	var game = this;
	if (window.Test)
		window.game = this;

	this.zoom = function(n) {
		return n != undefined ? n * zoom : zoom;
	}

	Constants();
	Messages();

	this.canvas = document.getElementById('canvasGame');
	this.canvas.width *= zoom;
	this.canvas.height *= zoom;

	this.canvasWidth = this.canvas.width;
	this.canvasHeight = game.canvas.height;
	this.ctx = this.canvas.getContext("2d");

	this.bgCanvas = document.createElement(Constants.CANVAS);
	this.bgCanvas.width = this.canvasWidth;
	this.bgCanvas.height = this.canvasHeight;
	this.bgCtx = this.bgCanvas.getContext('2d');

	this.menuCanvas = document.createElement(Constants.CANVAS);
	this.menuCanvas.width = this.canvasWidth;
	this.menuCanvas.height = this.canvasHeight;
	this.menuCtx = this.menuCanvas.getContext('2d');

	this.sprites = [];
	this.levels = new Levels(game);

	this.offsetX = 0;
	this.offsetY = 0;
//	this.leftOffset = this.zoom(8);
	var shake = false;
	var shakeX = 0;
	var shakeY = 0;

	var runIds = {};
	var scrollState = {left: [], right: [], up: [], down: []};

	var singlePlayerGame;

	this.imgSprites;

	/**
	 * <ul>
	 * <li> bit 0   loop is running ('Play', 'LevelEnd', 'Pause') </li>
	 * <li> bit 1   key-handling (bei 'Pause' nicht gesetzt)</li>
	 * <li> bit 2   drawing    </li>
	 * <li> bit 3   time counting   (nur bei 'Play' gesetzt)</li>
	 * <li><strong>Play:</strong> 0x01f </li>
	 * <li><strong>LevelEnd:</strong> 0x025 </li>
	 * <li><strong>Pause:</strong> 0x041 </li>
	 * <li><strong>NextLevel:</strong> 0x080 </li>
	 * <li><strong>Menu:</strong> 0x100 </li>
	 * </ul>
	 */
	var gameState;
	var timeAdded;

	var player;

	var keymap = [];
	var keyconfig = {left: 37, right: 39, up: 38, down: 40, putBomb: 32, detonate: 13};

	var soundconfig = {fx: [true, 1], music: [true, 1]};

	/**
	 * @type Info
	 */
	var info;

	var menu;
	var highscore;
	var instructions;
	var options;

	this.multiPlayer;
	this.sound = new Sound(game, soundconfig);
	var dialog;

	var fontFamily = 'Arial';
	var loadCounter;

	function init() {
		$(".color").colorPicker({opacity: false, buildCallback: function($elm) {
			$(".cp-color-picker").css(Constants.BACKGROUNDCOLOR, Constants.YELLOW);
			$elm.find(".cp-xy-slider").mouseup(function() {
				$elm.hide(200);
			})
	    }, renderCallback: function($elm, toggle) {
	    	if (!toggle) {
	    		var color = $(".color").css(Constants.BACKGROUNDCOLOR);
	    		info.playerColor(color);
				setCookie("color", color);
	    	}
	    }});
		var color = Constants.WHITE;
		var cookies = document.cookie.split(/;/);
		for (var i = 0; i < cookies.length; i++) {
			var cookie = cookies[i].trim();
			if (cookie.indexOf("color") == 0) {
				color = cookie.substr(6);
			} else if (cookie.indexOf("keyconfig") == 0) {
				var config = JSON.parse(cookie.substr(10));
				for (var k in config) {
					// das ist aufgrund des Property-Mangling notwendig
					if (keyconfig.hasOwnProperty(k))
						keyconfig[k] = config[k];
				}
			} else if (cookie.indexOf("soundconfig") == 0) {
				var config = JSON.parse(cookie.substr(12));
				for (var k in config) {
					if (soundconfig.hasOwnProperty(k))
						soundconfig[k] = config[k];
				}
			}
		}
		$(".color").css(Constants.BACKGROUNDCOLOR, color);
		$(".scroll").perfectScrollbar({useKeyboard: false});

		document.addEventListener(Constants.MOUSEDOWN, mousedownHandler);
		document.addEventListener(Constants.KEYDOWN, keyHandler);
		document.addEventListener(Constants.KEYUP, keyHandler);
		document.addEventListener(Constants.KEYUP, pauseHandler);

		info = new Info(game);
		dialog = new Dialog();

		initPageHidden();

		loadCounter = 0;
		game.imgSprites = new Image();
		game.imgSprites.onload = imageLoadHandler;
		game.imgSprites.src = "sprites.png";

		var menuFont = new Font();
		menuFont.onload = function() {
			fontFamily = "Screwbal";
			imageLoadHandler();
		};
		menuFont.onerror = function(e) {
			console.log("Error while loading font: " + e);
			imageLoadHandler();
		};
		menuFont.fontFamily = "Screwbal";
		menuFont.src = "fonts/Screwbal.ttf";

		var chatFont = new Font();
		chatFont.onload = function() {
			$("#chatContainer").find("*").css(Constants.FONTFAMILY, "Days");
			$("#mpMsgDlg").css(Constants.FONTFAMILY, "Days");
			info.fontFamily = "Days";
			imageLoadHandler();
		}
		chatFont.onerror = menuFont.onerror;
		chatFont.fontFamily = "Days";
		chatFont.src = "fonts/Days.ttf";
	}

	function imageLoadHandler() {
		if (++loadCounter < 3)
			return;

		prepareImage();
		$("#loading").hide();

		info.init();
		game.levels.endLevel();
	}

	function initPageHidden() {
		var hidden = "hidden";
		if (hidden in document)
			document.addEventListener("visibilitychange", onchange);
		else if ((hidden = "mozHidden") in document)
			document.addEventListener("mozvisibilitychange", onchange);
		else if ((hidden = "webkitHidden") in document)
			document.addEventListener("webkitvisibilitychange", onchange);
		else if ((hidden = "msHidden") in document)
			document.addEventListener("msvisibilitychange", onchange);
		else if ("onfocusin" in document)
			document.onfocusin = document.onfocusout = onchange;
		else
			window.onpageshow = window.onpagehide = window.onfocus = window.onblur = onchange;

		function onchange (evt) {
			var evtMap = { focus:true, focusin:true, pageshow:true, blur:false, focusout:false, pagehide:false };
			evt = evt || window.event;
			var pause = evt.type in evtMap ? evtMap[evt.type] : this[hidden];
			var elapsed = info.pause(pause);
			if (elapsed)
				addTimeToBombs(elapsed);
		}
	}

	this.isSinglePlayerGame = function() {
		return singlePlayerGame;
	}

	this.startSinglePlayerGame = function() {
		if (info.isOpenGame()) {
			this.multiPlayer.registerGame();
			this.multiPlayer.enableControls(false);
		}
		singlePlayerGame = true;

		this.startGame();
	}

	this.startGame = function(board, position, loopDelay) {
		if (!player) {
			player = new Player(this, Levels.pix, Levels.pix, info.playerColor());
		} else {
			player.setPlayerColor(info.playerColor());
		}
		this.canvas.style.cursor = "none";

		dialog.close();
		info.reset();
		player.reset();
		this.levels.reset();
		if (position) {
			player.state.x = position.x;
			player.state.y = position.y;
		}

		this.nextLevel(board, false, loopDelay);
	}

	function initLevel(_board) {
		var levels = game.levels;
		var board = levels.next(_board);

		game.bgCanvas.width = levels.boardWidth() * Levels.pix/* + game.zoom(game.leftOffset * 2)*/;
		game.bgCanvas.height = levels.boardHeight() * Levels.pix;
	
		// nicht im server level... muss geändert werden, evtl. game-meta-data
		if (!_board) {
			levels.init();
		}
		return board;
	}

	this.nextLevel = function(board, addScore, loopDelay) {

		gameState = 0x80;

		if ((!this.multiPlayer || !this.multiPlayer.isActive())) {
			this.sound.playWorld();
			
			if (addScore && !timeAdded) {
				var remaining = info.time();
				console.log("remaining: " + remaining + ", expected score: " + (info.score() + remaining));
				var id = setInterval(function() {
					if (remaining-- > 0) {
						info.score(1);
						info.time(remaining);
					} else {
						clearInterval(id);
					}
				}, 1);
			}
		}
		timeAdded = false;

		fadeBoard(function() {
			board = initLevel(board);
			// last level...
			if (board.end) {
				board.end = false;
				return;
			}

			game.levels.drawBoard(game.bgCtx);
			if (!game.multiPlayer || !game.multiPlayer.isActive() || singlePlayerGame)
				player.setToRandomPos();

			game.sprites.unshift(player);

			player.resetForLevel();

			game.offsetX = 0;
			game.offsetY = 0;

			if (info.isOpenGame() && singlePlayerGame)
				game.multiPlayer.initBoard();

			var delay = drawLevelMessage(board.message);

			setTimeout(function() {

				runLoop(0x1, loopDelay, board.time);
				for (var i = 1; i < player.speed; i++) {
					game.increaseSpeed(30);
				}

				if (!game.multiPlayer || !game.multiPlayer.isActive())
					info.toggleSection(true, "yourGame");
				game.sound.music(!singlePlayerGame, true);
				fadeBoard(function() {
					gameState = 0x1f;
				}, function() {
					game.ctx.drawImage(game.bgCanvas, 0, 0);
				});

			}, delay);
		});
	}

	function fadeBoard(endCallback, paintCallback) {
		var opacity = 0;
		game.ctx.fillStyle = Constants.BLACK;

		var id = setInterval(function() {
			opacity += .05;
			game.ctx.globalAlpha = opacity;
			if (paintCallback)
				paintCallback();
			else
				game.ctx.fillRect(0, 0, game.canvasWidth, game.canvasHeight);
			if (opacity - 1 > 0) {
				game.ctx.globalAlpha = 1;
				clearInterval(id);
				if (endCallback)
					endCallback();
			}
		}, 40);
	}

	function drawLevelMessage(msg) {
		if (!msg || msg.length == 0)
			return 0;
		game.ctx.save();
		game.ctx.fillStyle = Constants.WHITE;
		game.ctx.strokeStyle = Constants.YELLOW;
		game.ctx.shadowBlur = 20;
		game.ctx.shadowColor = Constants.YELLOW;
		game.ctx.font = "bold 30px " + info.fontFamily;
		var offset = ~~((msg.length - 1) / 2) * 40 + (msg.length % 2 == 1 ? 0 : 20);
		var x = game.canvasWidth / 2;
		var y = game.canvasHeight / 2 - offset;
		
		for (var i = 0; i < msg.length; i++) {
			game.ctx.fillText(msg[i], x, y + i * 40);
			game.ctx.strokeText(msg[i], x, y + i * 40);
		}
		game.ctx.restore();
		return 4000;
	}

	this.startMultiplayer = function(showMessage) {
		if (!this.multiPlayer) {
			this.multiPlayer = new Multiplayer(this);
		}
		this.multiPlayer.start(showMessage);
	}

	this.increaseSpeed = function(delay) {
		runLoop(gameState, delay, undefined, true);
	}

	function runLoop(state, delay, time, keepKeymap) {
		delay = delay ? delay : 15;
		if (!keepKeymap)
			keymap.length = 0;
		gameState = state;
		function countTime() {
			info.time(time--);
			if (time < 0) {
				game.sound.playTimeout();
				if (player.life(-1) < 1) {
					setTimeout(game.levels.endLevel, 100);
				} else {
					time += 120;
					timeAdded = true;
					game.levels.spawnEnemies({state: player.getRandomPos()});
				}
			}
		}
		var currentTime = Date.now();

		var id = setInterval(function() {
			if ((gameState & 4) > 0)
				clearSprites();
			if ((gameState & 2) > 0)
				handleKey();
			if ((gameState & 4) > 0) {
				checkScrollState(runIds[id]);
				if (shake) {
					game.offsetX = shakeX;
					game.offsetY = shakeY;
					game.ctx.drawImage(game.bgCanvas, -game.offsetX, -game.offsetY);
				}
				drawSprites();
			}
			if (time != undefined && (gameState & 8) > 0 && Date.now() - currentTime >= 1000) {
				countTime();
				currentTime = Date.now();
			}

			if ((gameState & 1) == 0) {
				clearInterval(id);
				delete runIds[id];
				console.log("leave loop[" + id + "], loopCount: " + countProps(runIds));
				game.removeAllSprites();
			}
		}, delay);
		runIds[id] = {};
		console.log("enter loop[" + id + "] in " + delay + " ms, loopCount: " + countProps(runIds));
	}

	function checkScrollState(scrolling) {
		if (scrolling.active)
			return;
		scrolling.active = true;
	
		var distance = 70 * zoom;
		var offset = 1;
		var directionX = 0, directionY = 0;
		var targetX = game.offsetX, targetY = game.offsetY;
		var maxX = game.bgCanvas.width - game.canvasWidth, maxY = game.bgCanvas.height - game.canvasHeight;

		var directionState;

		if (player.state.x < game.offsetX + distance && game.offsetX > 0) {
			directionX = -offset;
			targetX = Math.max(player.state.x - 2 * distance, 0);
			directionState = scrollState.left;
		} else if (player.state.x + player.state.Width - game.offsetX > game.canvasWidth - distance && game.offsetX < maxX) {
			directionX = offset;
			targetX = Math.min(player.state.x - game.canvasWidth + 2 * distance, maxX);
			directionState = scrollState.right;
		}
		if (player.state.y < game.offsetY + distance && game.offsetY > 0) {
			directionY = -offset;
			targetY = Math.max(player.state.y - 2 * distance, 0);
			directionState = scrollState.up;
		} else if (player.state.y + player.state.Height - game.offsetY > game.canvasHeight - distance && game.offsetY < maxY) {
			directionY = offset;
			targetY = Math.min(player.state.y - game.canvasHeight + 2 * distance, maxY);
			directionState = scrollState.down;
		}
		if (directionX != 0 && targetX != game.offsetX || directionY != 0 && targetY != game.offsetY) {
			for (var s in scrollState) {
				var state = scrollState[s];
				if (state != directionState) {
					for (var i = 0; i < state.length; i++) {
						clearInterval(state[i].id);
						state[i].scrolling.active = false;
					}
					state.length = 0;
				}
			}
			var id = setInterval(function() {
				if ((game.offsetX - targetX) * directionX < 0)
					game.offsetX += directionX;
				if ((game.offsetY - targetY) * directionY < 0)
					game.offsetY += directionY;
		
				game.ctx.drawImage(game.bgCanvas, -game.offsetX, -game.offsetY);
				drawSprites();
		
				if ((game.offsetX - targetX) * directionX >= 0 && (game.offsetY - targetY) * directionY >= 0) {
					clearInterval(id);
					scrolling.active = false;

					for (var i = 0; i < directionState.length; i++) {
						if (directionState[i].id === id) {
							directionState.splice(i, 1);
							break;
						}
					}
				}
			}, 10);
			directionState.push({id: id, scrolling: scrolling});

		} else {
			scrolling.active = false;
		}
	}

	function addTimeToBombs(time) {
		var sprites = game.sprites;
		for (var i = sprites.length - 1; i >= 0; i--) {
			var sprite = sprites[i];
			if (sprite instanceof Bomb) {
				sprite.time(time);
			}
		}
	}

	function pauseHandler(ev) {
		if (ev.keyCode == 80) {
			var elapsed = info.togglePause();
			if (elapsed)
				addTimeToBombs(elapsed);
		}
		if (ev.keyCode == 27 && gameState == 0x41) {
			info.togglePause();
			game.levels.endLevel(true);
			dialog.close();
		}
	}
	function keyHandler(ev) {
		if ((gameState & 2) > 0) {
			keymap[ev.keyCode] = ev.type == Constants.KEYDOWN;
			ev.preventDefault();
		}
	}
	function handleKey() {
		var up = keymap[keyconfig.up];
		var down = keymap[keyconfig.down];
		var left = keymap[keyconfig.left];
		var right = keymap[keyconfig.right];
		if (up)
			player.up();
		else if (down)
			player.down();
		else if (left)
			player.left();
		else if (right)
			player.right();
		if (keymap[keyconfig.putBomb])
			player.putBomb();
		if (!left && !right && !up && !down)
			player.front();
		if (keymap[27]) {
			game.levels.endLevel(true);
			dialog.close();
		}
		if (keymap[keyconfig.detonate]) {
			keymap[keyconfig.detonate] = undefined;
			player.detonate();
		}
		if (keymap[84] && game.multiPlayer) { // 't'
			keymap[84] = undefined;
			game.multiPlayer.chat();
		}
	}

	this.getKeyconfig = function() {
		return keyconfig;
	}

	this.saveKeyconfig = function() {
		setCookie("keyconfig", JSON.stringify(keyconfig));
	}

	this.getSoundconfig = function() {
		return soundconfig;
	}

	this.saveSoundconfig = function() {
		setCookie("soundconfig", JSON.stringify(soundconfig));
	}

	function mousedownHandler(ev) {
		game.canvas.focus();
		if (gameState == 0x1f || gameState == 0x41) {
			var x = ev.pageX - game.canvas.offsetLeft + game.offsetX;
			var y = ev.pageY - game.canvas.offsetTop + game.offsetY;
			var pos = game.levels.getBoardPos(x, y);
			if (x >= game.offsetX && y >= game.offsetY && x < game.canvasWidth + game.offsetX && y < game.canvasHeight + game.offsetY) {
				if (ev.button == 2) {
					for (var i = 0; i < game.sprites.length; i++) {
						var state = game.sprites[i].state;
						var x1 = state.x;
						var y1 = state.y;
						if (x > x1 && y > y1 && x < x1 + state.Width && y < y1 + state.Height) {
							console.log("mouse(" + x + "," + y + ") Sprite: " + game.sprites[i].toDebugString() + " " + JSON.stringify(game.sprites[i].state));
							game.logRect(x1, y1, state.Width, state.Height);
							break;
						}
					}
				} else {
					var val = game.levels.getBoard(pos);
					var canTake = val && val.take ? true : false;
					var p = game.levels.getBoardPoint(pos);
					console.log("mouse(" + x + "," + y + ") Board-pos: " + pos + ", content: " + val + ", canTake: " + canTake +
							"  Board-point: " + p.x + "," + p.y + "  (right button for sprite info)");
				}
			}
		}
	}

	this.logRect = function(x, y, w, h) {
		this.ctx.strokeStyle = Constants.WHITE;
		this.ctx.strokeRect(x - this.offsetX + 1, y - this.offsetY + 1, w - 2, h - 2);
	}

	this.removeSprite = function(state) {
		for (var i = 0; i < this.sprites.length; i++) {
			if (this.sprites[i].state === state) {
				this.sprites.splice(i, 1);
				break;
			}
		}
	}

	this.removeAllSprites = function() {
		for (var i = 0; i < this.sprites.length; i++) {
			this.sprites[i] = undefined;
		}
		this.sprites.length = 0;
	}

	function clearSprites() {
		var sprites = game.sprites;
		for (var i = sprites.length - 1; i >= 0; i--) {
			sprites[i].clearBackground();
		}
	}

	function drawSprites() {
		var sprites = game.sprites;
		for (var i = sprites.length - 1; i >= 0; i--) {
			var sprite = sprites[i];
			sprite.update();
			// sprite potentially removed
			if (sprite === sprites[i])
				sprite.draw();
		}
	}

	this.shakeBackground = function() {
/*
		if (this.shakeActive) // TODO deploy.properties
			return;
		this.shakeActive = true;
		var offsetX = game.offsetX;
		var offsetY = game.offsetY;
		Animation(function(delta) {
			shake = true;
			shakeX = offsetX - delta * 15;
			shakeY = offsetY - delta * 7;
		}, function() {
			shake = false;
			game.offsetX = offsetX;
			game.offsetY = offsetY;
			game.shakeActive = false;
		}, true, Animation.bounce, 500);
*/	}

	this.drawMenu = function(ctx, suppressHandlers) {
		// "this" is not used because the function is called from highscore without this
		if (!menu)
			menu = new Menu(game, fontFamily);
		menu.draw(ctx || game.ctx, suppressHandlers);
		if (game.multiPlayer)
			game.multiPlayer.enableControls(true);
		singlePlayerGame = false;
	}

	function prepareImage() {
		if (zoom == 1)
			return;
		var canvas = document.createElement(Constants.CANVAS);
		canvas.width = game.imgSprites.width;
		canvas.height = game.imgSprites.height;
		var ctx = canvas.getContext('2d');
		ctx.drawImage(game.imgSprites, 0, 0);
		var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		var targetData = ctx.createImageData(canvas.width * zoom, canvas.height * zoom);
		var step = 4 * zoom;
		var dataWidth = canvas.width * 4 * zoom;
		var pixelData = imageData.data;
		for (var i = 0, j = 0; i < pixelData.length; i += 4, ((j += step) % dataWidth) == 0 && (j += dataWidth * (zoom - 1))) {
			var r = pixelData[i];
			var g = pixelData[i + 1];
			var b = pixelData[i + 2];
			var a = pixelData[i + 3];
			put(j, r);
			put(j + 1, g);
			put(j + 2, b);
			put(j + 3, a);
		}
		function put(p, v) {
			for (var i = 0; i < zoom; i++) {
				for (var j = 0, pos = p + dataWidth * i; j < zoom; j++, pos += 4) {
					targetData.data[pos] = v;
				}
			}
		}
		canvas.width = canvas.width * zoom;
		canvas.height = canvas.height * zoom;
		ctx.putImageData(targetData, 0, 0);
		game.imgSprites = canvas;
	}

	this.cancelMenu = function() {
		menu.cancel();
		if (instructions)
			instructions.cancel();
		if (highscore)
			highscore.cancel();
		if (options)
			options.cancel();
	}

	this.isScrolling = function() {
		for (var s in runIds) {
			if (runIds[s].active)
				return true;
		}
		return false;
	}

	/**
	 * @returns {Player}
	 */
	this.getPlayer = function() {
		return player;
	}

	/**
	 * <ul>
	 * <li> bit 0   loop is running ('Play', 'LevelEnd', 'Pause') </li>
	 * <li> bit 1   key-handling (bei 'Pause' nicht gesetzt)</li>
	 * <li> bit 2   drawing    </li>
	 * <li> bit 3   time counting   (nur bei 'Play' gesetzt)</li>
	 * <li><strong>Play:</strong> 0x01f </li>
	 * <li><strong>LevelEnd:</strong> 0x025 </li>
	 * <li><strong>Pause:</strong> 0x041 </li>
	 * <li><strong>NextLevel:</strong> 0x080 </li>
	 * <li><strong>Menu:</strong> 0x100 </li>
	 * </ul>
	 * 
	 * @param {Number} state
	 * @return {Number}
	 */
	this.gameState = function(state) {
		if (state !== undefined)
			gameState = state;
		return gameState;
	}

	/**
	 * @returns {Info}
	 */
	this.getInfo = function() {
		return info;
	}

	this.getHighscore = function() {
		if (!highscore)
			highscore = new Highscore(this);
		return highscore;
	}

	this.getInstructions = function() {
		if (!instructions)
			instructions = new Instructions(this);
		return instructions;
	}

	this.getOptions = function() {
		if (!options)
			options = new Options(this, fontFamily);
		return options;
	}

	this.getHostAndPort = function(port) {
		var runningLocal = document.location.hostname == "";
		port = runningLocal ? "8080" : port ? port : document.location.port;
	    return (runningLocal ? "localhost" : document.location.hostname) + (port ? ":" + port : "");
	}

	this.handleError = function(msg, detail) {
		console.log(msg + (detail != undefined ? " " + JSON.stringify(detail) : ""));
		dialog.show(msg, false, true, 3000, true);
	}

	/**
	 * Shows a message dialog.
	 * 
	 * @param msg the message
	 * @param buttonHandler optional function that is called with true if OK was pressed and false if Cancel was pressed
	 * @param fade true for fading effect when showing
	 * @param autoCloseInterval milliseconds until auto close
	 * @param isError true for error style
	 */
	this.showMessage = function(msg, buttonHandler, fade, autoCloseInterval, isError) {
		dialog.show(msg, buttonHandler, fade, autoCloseInterval, isError);
	}

	function Dialog() {
		var self = this;
		var closeTimeout;

		var dlg = $("#mpMsgDlg");
		var label = $("#mpMsgText");
		var btnOk = $("#mpDlgOk");
		btnOk.click(buttonHandler);
		var btnCancel = $("#mpDlgCancel");
		btnCancel.click(buttonHandler);
		document.getElementById("mpDlgClose").onmousedown = function(ev) {
			if (ev.button == 0) {
				self.cancelHandler();
			}
		};
		dlg.get(0).onkeydown = function(ev) {
			if (ev.keyCode == 27)
				self.cancelHandler();
		}

		function buttonHandler(ev) {
			if (ev.target === btnOk.get(0)) {
				self.close();
				self.handler(true);
			} else if (ev.target === btnCancel.get(0))
				self.cancelHandler();
		}

		this.show = function(msg, handler, fade, autoCloseInterval, isError) {
			if (dlg.css("display") != "none" && label.html().indexOf(msg) == -1) {
				label.append("<div style='border-top: 1px dotted; margin: 2px 0; padding: 2px 0'>" + msg  + "</div>");
			} else {
				label.html("<div>" + msg + "</div>");
			}

			handler ? btnOk.show() : btnOk.hide();
			handler ? btnCancel.show() : btnCancel.hide();
			this.handler = handler;

			if (fade)
				dlg.fadeIn();
			else
				dlg.show();

			if (closeTimeout)
				clearTimeout(closeTimeout);
			if (autoCloseInterval) {
				closeTimeout = setTimeout(this.close, autoCloseInterval);
			}
			if (isError)
				label.children().last().addClass("msgError");
			if (handler)
				btnOk.focus();
		}

		this.cancelHandler = function() {
			if (this.handler)
				this.handler(false);
			this.close();
		}

		this.close = function() {
			dlg.fadeOut();
		}
	}

	function countProps(o) {
		var c = 0;
		for (var p in o)
			c++;
		return c;
	}

	function setCookie(name, value, expiryDays) {
		var d = new Date();
		d.setTime(d.getTime() + ((expiryDays ? expiryDays : 365) * 24 * 60 * 60 * 1000));
		var expires = "expires="+ d.toUTCString();
		document.cookie = name + "=" + value + "; " + expires;
	}

	this.clone = function(val) {
		var clone = {};
		for (var attr in val) {
	        clone[attr] = val[attr];
	    }
		return clone;
	}

	this.escapeHtml = function(unsafe) {
		return unsafe
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}

	this.unescapeHtml = function(safe) {
		return safe
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&#039;/g, "'");
	}

	this.fnName = function(fn) {
		return ((fn.name && ['', fn.name]) || fn.toString().match(/function ([^\(]+)/))[1];
	}

	this.parseColor = function(s) {
		var m = s.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
	    if (!m)
	    	throw "Irregular color value";
	    return m[1] << 16 | m[2] << 8 | m[3];
	}

	this.colorString = function(color) {
		return "rgb(" + (color >> 16) + "," + ((color >> 8) & 0xff) + "," + (color & 0xff) + ")";
	}

	this.colorizeImage = function(sourcePx, targetPx, color) {
		function toRGB(px) {
			return {
				r: px >> 16,
				g: (px >> 8) & 0xff,
				b: px & 0xff
			};
		}

		var targetR = color >> 16;
		var targetG = (color >> 8) & 0xff;
		var targetB = color & 0xff;

		var firstSource = toRGB(sourcePx[0]);

		for (var i = 0; i < targetPx.length; i += 4) {
			var currentR = targetPx[i];
			var currentG = targetPx[i + 1];
			var currentB = targetPx[i + 2];

			for (var j = 0; j < sourcePx.length; j++) {

				var source = toRGB(sourcePx[j]);

				var distanceR = firstSource.r / source.r;
				var distanceG = firstSource.g / source.g;
				var distanceB = firstSource.b / source.b;

				if (currentR == source.r && currentG == source.g && currentB == source.b) {
					var r = targetR / distanceR;
					var g = targetG / distanceG;
					var b = targetB / distanceB;
					targetPx[i] = r;
					targetPx[i + 1] = g;
					targetPx[i + 2] = b;
				}
			}
		}
	}

	init();
}//replace
