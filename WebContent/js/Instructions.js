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
function Instructions(game) {
	var canceled;
	var texts = [
			[{x: 185, y: 130}, "More fire range"],
			[{x: 201, y: 130}, "One more bomb to lay"],
			[{x: 201, y: 146}, "Huiii..."],
			[{x: 185, y: 146}, "An extra life"],
			[{x: 217, y: 146}, "Remote bombs"],
			[{x: 137, y: 146}, "Walk over bombs"],
			[{x: 153, y: 146}, "Walk over stones"],
			[{x: 169, y: 146}, "Armor"],
			"",
			[1],
			"T - Chat with other player(s)",
			"P - Pause game",
			];

	this.draw = function() {
		canceled = false;
		// prepare canvas
		var ctx = game.menuCtx;
		game.menuCanvas.height = 2 * game.canvasHeight;
		ctx.clearRect(0, 0, game.menuCanvas.width, game.menuCanvas.height);
		drawText(ctx);
		ctx.translate(0, game.canvasHeight);
		game.drawMenu(ctx, true);
		ctx.translate(0, -game.canvasHeight);
		(function() {
			Animation(drawAnim, function() {
				if (!canceled) {
					game.canvas.addEventListener(Constants.MOUSEUP, handler);
					document.addEventListener(Constants.KEYDOWN, handler);
				}
			}, true);
		})();
	}

	function drawAnim(delta) {
		game.ctx.drawImage(game.bgCanvas, 0, 0);
		game.ctx.drawImage(game.menuCanvas, 0, -game.canvasHeight * delta);
	}

	function drawText(ctx) {
		var x = game.zoom(10);
		var y = game.zoom(23);
		ctx.textAlign = "left";
		ctx.textBaseline = Constants.MIDDLE;

		var textHeight = game.zoom(15);
		var lineHeight = game.zoom(10);
		var startX = x;
		for (var i = 0; i < texts.length; i++) {
			var t = texts[i];
			if (t instanceof Array) {
				for (var j = 0; j < t.length; j++) {
					drawLine(t[j]);
				}
			} else {
				drawLine(t);
			}
		}

		function drawLine(t) {
			if (typeof t == "number") {
				if (t == 1) {
					ctx.strokeStyle = Constants.BLACK;
					ctx.strokeRect(x, y - 2 * lineHeight, game.canvasWidth - 40, 1);
					ctx.strokeStyle = Constants.YELLOW;
					ctx.strokeRect(x, y - 2 * lineHeight, game.canvasWidth - 40, 1);
				}
			} else if (typeof t == "object") {
				ctx.drawImage(game.imgSprites, game.zoom(t.x), game.zoom(t.y), Levels.pix, Levels.pix, x, y - Levels.pix / 2, Levels.pix, Levels.pix);
				x += game.zoom(20);
			} else {
				var text = new Menu.MenuText(ctx, x, y, textHeight, t, Constants.DARKGREY, Constants.YELLOW);
				text.draw();
				y += textHeight + lineHeight;
				x = startX;
			}
		}
	}

	function handler(ev) {
		if (!Menu.isClickEvent(ev))
			return;
		unregisterHandlers();

		// prepare canvas
		var ctx = game.menuCtx;
		ctx.clearRect(0, 0, game.menuCanvas.width, game.menuCanvas.height);
		game.drawMenu(ctx, true);
		ctx.translate(0, game.canvasHeight);
		drawText(ctx);
		ctx.translate(0, -game.canvasHeight);
		canceled = false;
		Animation(drawAnim, function() {
			game.menuCanvas.height = game.canvasHeight;
			if (!canceled)
				game.drawMenu();
		}, true);
	}

	function unregisterHandlers() {
		game.canvas.removeEventListener(Constants.MOUSEUP, handler);
		document.removeEventListener(Constants.KEYDOWN, handler);
	}

	this.cancel = function() {
		unregisterHandlers();
		game.menuCanvas.height = game.canvasHeight;
		canceled = true;
	}
}