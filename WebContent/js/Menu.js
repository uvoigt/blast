/*
 * (c) Copyright 2016 Uwe Voigt
 * All Rights Reserved.
 */
"use strict";

/**
 * Creates the menu handler and renderer.
 * 
 * @param {Game} game
 * @param {String} fontFamily
 * 
 * @constructor
 */
function Menu(game, fontFamily) {
	var menuItems = [];
	var selectedOffset;

	/**
	 * Returns true if either ESC, ENTER or SPACE has been pressed or the left mouse button has been clicked.
	 * 
	 * @param ev the event
	 * @returns {Boolean}
	 */
	Menu.isClickEvent = function(ev) {
		return ev.button == 0 || (ev.type == Constants.KEYDOWN && (ev.keyCode == 27 || ev.keyCode == 13 || ev.keyCode == 32));
	}

	Menu.prototype.draw = function(ctx, suppressHandlers) {
		game.gameState(0x100);

		menuItems.length = 0;
		selectedOffset = undefined;

		var yOffset = this.createMenuItems(ctx, menuItems, suppressHandlers);
		if (ctx.textBaseline == Constants.MIDDLE && yOffset != undefined)
			distributeItems(yOffset); 
		for (var i = 0; i < menuItems.length; i++) {
			menuItems[i].draw();
		}

		if (!suppressHandlers) {
			document.addEventListener(Constants.KEYDOWN, keydownHandler);
			document.addEventListener(Constants.KEYUP, keyupHandler);
		}

		if (selectedOffset != undefined) {
			menuItems[selectedOffset].clear();
			menuItems[selectedOffset].draw(2, true);
		}
	}

	this.draw = Menu.prototype.draw;

	function distributeItems(yOffset) {
		var fontSize = menuItems[0].size;
		var offset = ~~((menuItems.length - 1) / 2) * fontSize + (menuItems.length % 2 == 1 ? 0 : 20);
		var y = game.canvasHeight / 2 - offset + (yOffset ? yOffset : 0);
		for (var i = 0; i < menuItems.length; i++) {
//			console.log(menuItems[i].mText() + " - prev y: " + menuItems[i].y + ", new y: " + (y + i * fontSize));
			menuItems[i].y = y + i * fontSize;
		}
	}

	Menu.prototype.cancel = unregisterHandlers;
	this.cancel = unregisterHandlers;

	this.createMenuItems = function(ctx, menuItems, suppressHandlers) {
		var textX = game.canvasWidth / 2;
		var textHeight = game.zoom(39);
		ctx.textAlign = Constants.CENTER;
		ctx.textBaseline = Constants.MIDDLE;

		var y = 30;

		var play = this.createText(ctx, textX, game.zoom(y), textHeight, Messages.get(Messages._21));
		if (!suppressHandlers) {
			play.registerHandler(function() {
				unregisterHandlers();
				setTimeout(function() {
					game.startSinglePlayerGame();
				}, 200);
			});
		}
		menuItems.push(play);
		var multiPlay = this.createText(ctx, textX, game.zoom(y += 50), textHeight, Messages.get(Messages._22));
		if (!suppressHandlers) {
			multiPlay.registerHandler(function() {
				setTimeout(function() {
					game.startMultiplayer(true);
				}, 200);
			});
		}
		menuItems.push(multiPlay);
		var options = this.createText(ctx, textX, game.zoom(y += 50), textHeight, Messages.get(Messages._24));
		if (!suppressHandlers) {
			options.registerHandler(function() {
				unregisterHandlers();
				clearAll();
				game.getOptions().draw();
			});
		}
		menuItems.push(options);
		var highscore = this.createText(ctx, textX, game.zoom(y += 50), textHeight, Messages.get(Messages._23));
		if (!suppressHandlers) {
			highscore.registerHandler(function() {
				unregisterHandlers();
				clearAll();
				game.getHighscore().draw();
			});
		}
		menuItems.push(highscore);
		var instructions = this.createText(ctx, textX, game.zoom(y += 50), textHeight, Messages.get(Messages._25));
		if (!suppressHandlers) {
			instructions.registerHandler(function() {
				unregisterHandlers();
				clearAll();
				game.getInstructions().draw();
			});
		}
		menuItems.push(instructions);
		// yOffset
		return -5;
	}

	// from the outside or subclasses: this.cancel
	function unregisterHandlers() {
		for (var i = 0; i < menuItems.length; i++) {
			menuItems[i].unregisterHandler();
		}
		document.removeEventListener(Constants.KEYDOWN, keydownHandler);
		document.removeEventListener(Constants.KEYUP, keyupHandler);
	}

	function clearAll() {
		menuItems.length = 0;
	}

	function restore() {
		if (selectedOffset >= 0) {
			menuItems[selectedOffset].clear();
			menuItems[selectedOffset].draw();
		}
	}

	function keydownHandler(ev) {
		if (ev.keyCode == 38) { // up
			restore();
			selectedOffset = selectedOffset != undefined && selectedOffset > 0 ? selectedOffset - 1 : menuItems.length - 1;
			menuItems[selectedOffset].clear();
			menuItems[selectedOffset].draw(2, true);
		} else if (ev.keyCode == 40) { // down
			restore();
			selectedOffset = selectedOffset != undefined && selectedOffset < menuItems.length - 1 ? selectedOffset + 1 : 0;
			menuItems[selectedOffset].clear();
			menuItems[selectedOffset].draw(2, true);
		} else if (ev.keyCode == 13 || ev.keyCode == 32) {
			restore();
			selectedOffset = selectedOffset ? selectedOffset : 0;
			menuItems[selectedOffset].draw(0, true);
			if (menuItems[selectedOffset].action) {
				menuItems[selectedOffset].action(ev);
			}
		} else if (ev.keyCode == 84 && game.multiPlayer) { // 't'
			game.multiPlayer.chat();
			ev.preventDefault();
		}
	}
	function keyupHandler(ev) {
		if (ev.keyCode == 13 || ev.keyCode == 32) {
			if (selectedOffset != undefined) {
				menuItems[selectedOffset].clear();
				menuItems[selectedOffset].draw(2, true);
			}
		}
	}

	this.createText = function(ctx, x, y, size, text, pStrokeStyle, pFillStyle, emphasizeOffset) {
		return new Menu.MenuText(ctx, x, y, size, text, pStrokeStyle, pFillStyle, emphasizeOffset, this);
	}

	this.setSelectedOffset = function(text) {
		selectedOffset = menuItems.indexOf(text);
	}

	Menu.getCommonMaxCharWidth = function(ctx, text) {
		var max = 0;
		for (var i = 0; i < text.length; i++) {
			var width = ctx.measureText(text[i]).width;
			if (width > max)
				max = width;
		}
		return max;
	}

	/**
	 * Creates a line of text.
	 * 
	 * @param ctx
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number} size
	 * @param {String} text
	 * @param {String} pStrokeStyle
	 * @param {String} pFillStyle
	 * @param {Number} emphasizeOffset
	 * @param {Menu} menu
	 * 
	 * @constructor
	 */
	Menu.MenuText = function(ctx, x, y, size, text, pStrokeStyle, pFillStyle, emphasizeOffset, menu) {
		this.x = x;
		this.y = y;
		this.size = size + game.zoom(10);

		Menu.MenuText.draw = function(menuText, ctx, x, y, size, text, sizeOffset, emphasize, iStrokeStyle, iFillStyle) {
			sizeOffset = sizeOffset ? game.zoom(sizeOffset) : 0;
			if (menuText)
				menuText.sizeOffset = sizeOffset;
			// "italic small-caps bold 12px arial"
			ctx.font = "bold " + (size + sizeOffset) + "px " + fontFamily;
			var width = ctx.measureText(text).width;
			if (menuText)
				menuText.Width = width;

			var fillStyle = iFillStyle;
			if (!fillStyle) {
				fillStyle = ctx.createLinearGradient(x - width / 2, 0, x + width / 2, 0);
				fillStyle.addColorStop(0, Constants.DARKGREY);
				if (emphasize) {
					fillStyle.addColorStop(0.2, Constants.YELLOW);
					fillStyle.addColorStop(0.5, "#ffff00");
					fillStyle.addColorStop(0.8, Constants.YELLOW);
				} else {
					fillStyle.addColorStop(0.5, Constants.YELLOW);
				}
				fillStyle.addColorStop(1, Constants.DARKGREY);
			}

			var strokeStyle = iStrokeStyle;
			if (!strokeStyle) {
				strokeStyle = ctx.createLinearGradient(x - width / 2, 0, x + width / 2, 0);
				strokeStyle.addColorStop(0, Constants.YELLOW);
				strokeStyle.addColorStop(0.5, Constants.DARKGREY);
				strokeStyle.addColorStop(1, Constants.YELLOW);
			}
			ctx.strokeStyle = strokeStyle;
			ctx.strokeText(text, x, y);
			ctx.fillStyle = fillStyle;
			ctx.fillText(text, x, y);
		}

		this.draw = function(sizeOffset, emphasize, iStrokeStyle, iFillStyle) {
			Menu.MenuText.draw(this, ctx, this.x, this.y, this.size, text, sizeOffset, emphasize, iStrokeStyle || pStrokeStyle, iFillStyle || pFillStyle);
		}

		this.clear = function() {
			var width = this.Width + game.zoom(14);
			var height = this.size + this.sizeOffset;
			var x = ctx.textAlign == Constants.CENTER ? this.x - width / 2 - game.zoom(3) : 0;
			var y = ctx.textBaseline == Constants.MIDDLE ? this.y - this.size / 2 : this.y - game.zoom(4);
			ctx.drawImage(game.bgCanvas, Math.max(x, 0), y, width, height, x, y, width, height);
//			ctx.strokeRect(x, y, width, height, x, y, width, height);
		}

		/**
		 * @param {String} t
		 * @returns {String}
		 */
		this.mText = function(t) {
			if (t !== undefined)
				text = t;
			return text;
		}

		var self = this;
		var mousemoveHandler;
		var mousedownHandler;
		var mouseupHandler;

		this.registerHandler = function(action) {
			this.action = action;
			mousemoveHandler = function(ev) {
				if (inside(ev)) {
					if (menu)
						menu.setSelectedOffset(self);
					if (!action.fMousedown) { // reuse field defined in deploy props
						self.clear()
						self.draw(emphasizeOffset != undefined ? emphasizeOffset : 2, true);
					} else if (action.mousedrag) {
						action.mousedrag(ev);
					}
				} else {
					self.clear()
					self.draw();
					action.fMousedown = false;
				}
			}
			mousedownHandler = function(ev) {
				if (ev.button == 0 && inside(ev)) {
					action.fMousedown = true;
					self.clear()
					self.draw(0, true);
				}		
			}
			mouseupHandler = function(ev) {
				action.fMousedown = false;
				if (ev.button == 0 && inside(ev)) {
					self.clear()
					self.draw(emphasizeOffset != undefined ? emphasizeOffset : 2, true);
					if (action) {
						action(ev);
						ev.stopImmediatePropagation();
					}
				}		
			}
			game.canvas.addEventListener(Constants.MOUSEMOVE, mousemoveHandler, false);
			game.canvas.addEventListener(Constants.MOUSEDOWN, mousedownHandler, false);
			game.canvas.addEventListener(Constants.MOUSEUP, mouseupHandler, false);
		}

		this.unregisterHandler = function() {
			game.canvas.removeEventListener(Constants.MOUSEMOVE, mousemoveHandler);
			game.canvas.removeEventListener(Constants.MOUSEDOWN, mousedownHandler);
			game.canvas.removeEventListener(Constants.MOUSEUP, mouseupHandler);
		}

		function inside(ev) {
			var x = ev.pageX - game.canvas.offsetLeft;
			var y = ev.pageY - game.canvas.offsetTop;
			var height = self.size + self.sizeOffset;
			var xInside = ctx.textAlign == Constants.CENTER ?
					x >= self.x - self.Width / 2 && x <= self.x + self.Width / 2 :
						x >= self.x && x <= self.x + self.Width;
			var yInside = ctx.textBaseline == Constants.MIDDLE ?
					y >= self.y - height / 2 && y <= self.y + height / 2 :
						y >= self.y && y <= self.y + self.size;

			return xInside && yInside;
		}
	}
}
