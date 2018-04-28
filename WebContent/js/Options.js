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
function Options(game, fontFamily) {
	var self = this;
	var canceled;

	/**
	 * @type SoundOptions
	 */
	var soundOptions;
	/**
	 * @type KeyOptions
	 */
	var keyOptions;

	function getKeyOptions() {
		if (!keyOptions)
			keyOptions = new KeyOptions(game);
		return keyOptions;
	}

	function getSoundOptions() {
		if (!soundOptions)
			soundOptions = new SoundOptions(game);
		return soundOptions;
	}

	Menu.call(this, game, fontFamily);

	function drawAnim(delta) {
		game.ctx.drawImage(game.bgCanvas, 0, 0);
		game.ctx.drawImage(game.menuCanvas, -game.menuCanvas.width * delta - game.canvasWidth, 0);
	}

	function setupCtx(ctx) {
		ctx.textAlign = Constants.CENTER;
		ctx.textBaseline = Constants.MIDDLE;
	}

	function stopImmediatePropagation(ev) {
		ev.stopImmediatePropagation();
	}


	function exitOptionsHandler(ev) {
		if (!Menu.isClickEvent(ev))
			return;

		console.log("exitOptionsHandler");
		unregisterHandlers();

		// prepare canvas
		var ctx = game.menuCtx;
		ctx.clearRect(0, 0, game.menuCanvas.width, game.menuCanvas.height);
		Menu.prototype.draw.call(self, ctx, true);
		ctx.translate(game.canvasWidth, 0);
		game.drawMenu(ctx, true);
		ctx.translate(-game.canvasWidth, 0);
		canceled = false;

		Animation(drawAnim, function() {
			// reset menuCanvas width back to default
			game.menuCanvas.width = game.canvasWidth;
			if (!canceled)
				game.drawMenu();
		}, true, Animation.elastic);
	}

	function unregisterHandlers() {
		Menu.prototype.cancel();
		game.canvas.removeEventListener(Constants.MOUSEUP, exitOptionsHandler);
		document.removeEventListener(Constants.KEYDOWN, exitOptionsHandler);
	}

	this.createMenuItems = function(ctx, menuItems, suppressHandlers) {
		var textX = game.canvasWidth / 2;
		var textHeight = game.zoom(30);

		var keys = this.createText(ctx, textX, game.canvasHeight / 2 - textHeight, textHeight, Messages.get(Messages._46));
		if (!suppressHandlers) {
			keys.registerHandler(function(ev) {
				stopImmediatePropagation(ev);
				unregisterHandlers();
				getKeyOptions().draw();
			});
		}
		menuItems.push(keys);
		var sound = this.createText(ctx, textX, game.canvasHeight / 2 + textHeight, textHeight, Messages.get(Messages._45));
		if (!suppressHandlers) {
			sound.registerHandler(function(ev) {
				stopImmediatePropagation(ev);
				unregisterHandlers();
				getSoundOptions().draw();
			});
		}
		menuItems.push(sound);
		// yOffset
		return -35;
	}

	this.draw = function() {
		// prepare canvas and double the width of the menuCanvas
		game.menuCanvas.width = 2 * game.canvasWidth;
		var ctx = game.menuCtx;
		setupCtx(ctx);

		ctx.clearRect(0, 0, game.menuCanvas.width, game.menuCanvas.height);
		game.drawMenu(ctx, true);
		ctx.translate(game.canvasWidth, 0);
		Menu.prototype.draw.call(this, ctx, true);
		ctx.translate(-game.canvasWidth, 0);
		canceled = false;

		Animation(drawAnim, function() {
			if (!canceled) {
				game.ctx.drawImage(game.bgCanvas, 0, 0);
				Menu.prototype.draw.call(self, game.ctx);

				game.canvas.addEventListener(Constants.MOUSEUP, exitOptionsHandler);
				document.addEventListener(Constants.KEYDOWN, exitOptionsHandler);
			}
		}, true, Animation.elastic);
	}

	this.cancel = function() {
		game.menuCanvas.width = game.canvasWidth;
		canceled = true;
		unregisterHandlers();
		if (keyOptions)
			keyOptions.cancel();
		if (soundOptions)
			soundOptions.cancel();
	}

	/**
	 * @param {Game} game
	 * 
	 * @constructor
	 */
	function SoundOptions(game) {
		var canceled;
		var soundfx, music, slidefx, slidemusic;

		this.draw = function() {
			// prepare canvas
			var ctx = game.menuCtx;
			setupCtx(ctx);
			ctx.clearRect(0, 0, game.menuCanvas.width, game.menuCanvas.height);
			Menu.prototype.draw.call(self, ctx, true); // draw options menu
			ctx.translate(game.canvasWidth, 0);
			drawSoundMenu(ctx, true);
			ctx.translate(-game.canvasWidth, 0);
			canceled = false;

			Animation(drawAnim, function() {
				if (!canceled) {
					game.ctx.drawImage(game.bgCanvas, 0, 0);
					drawSoundMenu(game.ctx);

					game.canvas.addEventListener(Constants.MOUSEUP, exitSoundOptionsHandler);
					document.addEventListener(Constants.KEYDOWN, exitSoundOptionsHandler);
				}
			}, true, Animation.elastic);
		}

		var on = "\u2611";
		var off = "\u2610";

		function drawSoundMenu(ctx, suppressHandlers) {
			ctx.textAlign = Constants.START;
			
			var x = 20;
			var y = game.canvasHeight / 2;
			var height = game.zoom(14);
			soundfx = new Menu.MenuText(ctx, x, y - height, height, "  Sound FX", Constants.DARKGREY, Constants.YELLOW);
			music = new Menu.MenuText(ctx, x, y + height, height, "  Music", Constants.DARKGREY, Constants.YELLOW);
			slidefx = new Slider(ctx, y - height, Constants.YELLOW, Constants.YELLOW);
			slidemusic = new Slider(ctx, y + height, Constants.YELLOW, Constants.YELLOW);
			var soundconfig = game.getSoundconfig();
			if (!suppressHandlers) {
				soundfx.registerHandler(createOnOffHandler(soundfx, soundconfig.fx));
				music.registerHandler(createOnOffHandler(music, soundconfig.music));
				slidefx.registerHandler(createSlideHandler(slidefx, soundconfig.fx));
				slidemusic.registerHandler(createSlideHandler(slidemusic, soundconfig.music));
			}

			soundfx.mText((soundconfig.fx[0] ? on : off) + soundfx.mText().substr(1))
			music.mText((soundconfig.music[0] ? on : off) + music.mText().substr(1))
			slidefx.draw(0, 0, soundconfig.fx[1]);
			slidemusic.draw(0, 0, soundconfig.music[1]);
			soundfx.draw();
			music.draw();
		}

		function createOnOffHandler(textItem, subconfig) {
			return function() {
				subconfig[0] = !subconfig[0];
				game.saveSoundconfig();
				textItem.clear();
				textItem.mText((subconfig[0] ? on : off) + textItem.mText().substr(1))
				textItem.draw();
			}
		}

		function createSlideHandler(textItem, subconfig) {
			var handler = function(ev) {
				var x = ev.pageX - game.canvas.offsetLeft;
				var newValue = (x - textItem.x) / 10 / game.zoom(15);
				newValue = Math.round(newValue * 10) / 10; // Runden !
				subconfig[1] = newValue;
				game.saveSoundconfig();
				textItem.clear();
				textItem.draw(0, 0, subconfig[1]);
			};
			handler.mousedrag = function(ev) {
				handler(ev);
			}
			return handler;
		}

		function Slider(ctx, y, strokeStyle, fillStyle) {
			var x = game.canvasWidth - 10 * game.zoom(15) - game.zoom(20);
			var size = game.zoom(10);
			y -= size / 2;
			this.sizeOffset = 0;
			Menu.MenuText.call(this, ctx, x, y, size, null, strokeStyle, fillStyle, 0);

			/* a und b dienen nur der Kompatibilität mit super.draw */
			this.draw = function(a, b, value) {
				if (value === undefined)
					value = this.value;
				else
					this.value = value;
				var uiValue = value * 10 * game.zoom(15);
				var width = 10 * game.zoom(15);
				var height = size;
				this.Width = width;
				ctx.fillStyle = fillStyle;
				ctx.strokeStyle = strokeStyle;
				var radius = game.zoom(4);
				function createRoundRect() {
					ctx.beginPath();
					ctx.moveTo(x + radius, y); // top left
					ctx.lineTo(x + width - radius, y); // top right
					ctx.quadraticCurveTo(x + width, y, x + width, y + radius); // top right
					ctx.lineTo(x + width, y + height - radius); // bottom right
					ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height); // bottom right
					ctx.lineTo(x + radius, y + height); //  // bottom left
					ctx.quadraticCurveTo(x, y + height, x, y + height - radius);  // bottom left
					ctx.lineTo(x, y + radius); // top left
					ctx.quadraticCurveTo(x, y, x + radius, y); // top left
					ctx.closePath();
				}
				createRoundRect();
				ctx.stroke();

				if (value == 1) {
					createRoundRect();
					ctx.fill();
				} else if (value > 0) {
					ctx.beginPath();
					ctx.moveTo(x + radius, y); // top left
					ctx.lineTo(x + uiValue, y); // pos
					ctx.lineTo(x + uiValue, y + height); // bottom right
					ctx.lineTo(x + radius, y + height); //  // bottom left
					ctx.quadraticCurveTo(x, y + height, x, y + height - radius);  // bottom left
					ctx.lineTo(x, y + radius); // top left
					ctx.quadraticCurveTo(x, y, x + radius, y); // top left
					ctx.closePath();
					ctx.fill();
				}
			}

			this.clear = function() {
				ctx.drawImage(game.bgCanvas, x, y, this.Width, size, x, y, this.Width, size);
			}
		}

		function exitSoundOptionsHandler(ev) {
			if (!Menu.isClickEvent(ev))
				return;

			console.log("exitSoundOptionsHandler");

			unregisterHandlers();
	
			// prepare canvas
			var ctx = game.menuCtx;
			ctx.clearRect(0, 0, game.menuCanvas.width, game.menuCanvas.height);
			drawSoundMenu(ctx, true);
			ctx.translate(game.canvasWidth, 0);
			game.drawMenu(ctx, true);
			ctx.translate(-game.canvasWidth, 0);
			canceled = false;
			Animation(drawAnim, function() {
				// reset menuCanvas width back to default
				game.menuCanvas.width = game.canvasWidth;
				if (!canceled)
					game.drawMenu();
			}, true, Animation.elastic);
		}

		function unregisterHandlers() {
			soundfx.unregisterHandler();
			music.unregisterHandler();
			slidefx.unregisterHandler();
			slidemusic.unregisterHandler();
			game.canvas.removeEventListener(Constants.MOUSEUP, exitSoundOptionsHandler);
			document.removeEventListener(Constants.KEYDOWN, exitSoundOptionsHandler);
		}

		this.cancel = function() {
			canceled = true;
			unregisterHandlers();
		}
	}

	/**
	 * @param {Game} game
	 * 
	 * @constructor
	 */
	function KeyOptions(game) {
		var canceled;
		var textItems = {};
		var selectedItem;
		var x = game.canvasWidth / 2;
		var isWaitingForKey = false;

		Menu.call(this, game, fontFamily);

		this.createMenuItems = function(ctx, menuItems, suppressHandlers) {
			var keyconfig = game.getKeyconfig();
			var y = game.zoom(25);
			var msgOffset = Messages._28;
			for (var k in keyconfig) {
				var keycode = keyconfig[k];
				var msg = Messages.get(msgOffset) + "  [" + mapSymbol(keycode) + "]";
				var text = this.createText(ctx, x, y, game.zoom(14), msg, Constants.DARKGREY, Constants.YELLOW);
				if (!suppressHandlers)
					text.registerHandler(createActionHandler(k, Messages.get(msgOffset)));
				menuItems.push(text);
				textItems[k] = text;

				y += game.zoom(25);
				msgOffset++;
			}
			additionalMsg(ctx, Messages.get(Messages._34), true);
		}

		this.draw = function() {
			// prepare canvas
			var ctx = game.menuCtx;
			setupCtx(ctx);
			ctx.clearRect(0, 0, game.menuCanvas.width, game.menuCanvas.height);
			Menu.prototype.draw.call(self, ctx, true); // draw options menu
			ctx.translate(game.canvasWidth, 0);
			Menu.prototype.draw.call(this, ctx, true); // draw key menu
			additionalMsg(ctx, Messages.get(Messages._34));
			ctx.translate(-game.canvasWidth, 0);
			canceled = false;

			Animation(drawAnim, function() {
				if (!canceled) {
					game.ctx.drawImage(game.bgCanvas, 0, 0);
					Menu.prototype.draw.call(keyOptions, game.ctx);
					additionalMsg(game.ctx, Messages.get(Messages._34));

					game.canvas.addEventListener(Constants.MOUSEUP, exitKeyOptionsHandler);
					document.addEventListener(Constants.KEYDOWN, exitKeyOptionsHandler);
				}
			}, true, Animation.elastic);
		}

		function additionalMsg(ctx, message, dontDraw) {
			var msg = message.split(/\n/);
			var y = game.zoom(230);
			for (var i = 0; i < msg.length; i++) {
				var text = new Menu.MenuText(ctx, x, y, game.zoom(7), msg[i], Constants.DARKGREY, Constants.YELLOW);
				if (!dontDraw) {
					if (textItems[i] != undefined)
						textItems[i].clear();
					text.draw();
				}
				textItems[i] = text;
				y += game.zoom(20);
			}
		}
	
		function createActionHandler(property, func) {
			return function(ev) {
				if (isWaitingForKey)
					return;
				// ansonsten wird der keydownHandler durch cancel gleich wieder entfernt
				stopImmediatePropagation(ev);

				unregisterHandlers(true);

				selectedItem = property;
				document.addEventListener(Constants.KEYDOWN, keydownHandler);
				isWaitingForKey = true;

				additionalMsg(game.ctx, Messages.get(Messages._35, func));
			}
		}
	
		function keydownHandler(ev) {
			ev.preventDefault();
			if (ev.keyCode != 27) {
				var keyconfig = game.getKeyconfig();
				keyconfig[selectedItem] = ev.keyCode;
				game.saveKeyconfig();
				console.log("keyCode: " + ev.keyCode + ", char: " + ev.charCode);
	
				var text = textItems[selectedItem];
				text.clear();
				text.mText(text.mText().replace(/\[.*\]/, "[" + mapSymbol(ev.keyCode) + "]"));
				text.draw();
			}
			document.removeEventListener(Constants.KEYDOWN, keydownHandler);
			additionalMsg(game.ctx, Messages.get(Messages._34));
			registerHandlers();
			isWaitingForKey = false;
		}
	
		function exitKeyOptionsHandler(ev) {
			if (!Menu.isClickEvent(ev))
				return;

			console.log("exitKeyOptionsHandler");
	
			unregisterHandlers();
			// menu key handlers must be removed
			Menu.prototype.cancel();

			// prepare canvas
			var ctx = game.menuCtx;
			ctx.clearRect(0, 0, game.menuCanvas.width, game.menuCanvas.height);
			Menu.prototype.draw.call(keyOptions, ctx, true);
			additionalMsg(ctx, Messages.get(Messages._34));
			ctx.translate(game.canvasWidth, 0);
			game.drawMenu(ctx, true);
			ctx.translate(-game.canvasWidth, 0);
			canceled = false;
			Animation(drawAnim, function() {
				// reset menuCanvas width back to default
				game.menuCanvas.width = game.canvasWidth;
				if (!canceled)
					game.drawMenu();
			}, true, Animation.elastic);
		}
	
		function unregisterHandlers(suppressClear) {
			for (var k in textItems) {
				textItems[k].unregisterHandler();
				if (!suppressClear) {
					textItems[k].clear();
					delete textItems[k];
				}
			}
	
			game.canvas.removeEventListener(Constants.MOUSEUP, exitKeyOptionsHandler);
			document.removeEventListener(Constants.KEYDOWN, exitKeyOptionsHandler);
		}

		function registerHandlers() {
			var msgOffset = Messages._28;
			for (var k in textItems) {
				if (isNaN(parseInt(k))) {
					textItems[k].registerHandler(createActionHandler(k, Messages.get(msgOffset)));
					msgOffset++;
				}
			}
	
			game.canvas.addEventListener(Constants.MOUSEUP, exitKeyOptionsHandler);
			document.addEventListener(Constants.KEYDOWN, exitKeyOptionsHandler);
		}

		function mapSymbol(num) {
			var m = (function() {
				switch (num) {
				default:
					return num;
				case 32:
					return "Space";
				case 8: // backspace
					return 0x232B;
				case 16:
					return "Shift";
				case 17:
					return "Control";
				case 18:
					return "Alt";
				case 13:
					return 0x23CE;
				case 37: // left
					return 0x21E6;
				case 38: // up
					return 0x21E7;
				case 39: // right
					return 0x21E8;
				case 40: // down
					return 0x21E9;
				}
			})();
			return typeof m == 'number' ? String.fromCharCode(m) : m;
		}
	
		this.cancel = function() {
			canceled = true;
			isWaitingForKey = false;
			unregisterHandlers(true);
			document.removeEventListener(Constants.KEYDOWN, keydownHandler);
		}
	}
}