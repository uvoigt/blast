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
function Highscore(game) {
	var highscore = "";
	var canceled;
	var state;
	var token;

	function createRequest(onloadCallback, requestToken) {
		var request = new XMLHttpRequest();
		request.open("POST", "@http@://" + game.getHostAndPort() + location.pathname + "mp", true);
		request.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=utf-8");
		if (requestToken)
			request.setRequestHeader(Constants.PID, 1);
		request.withCredentials = true;
		request.timeout = 8000;
		function onError() {
			game.handleError(Messages.get(Messages._6));
			exitToMenu();
		}
		request.ontimeout = onError;
		request.onerror = onError;
		request.onload = function() {
			if (!isError(request, Messages.get(Messages._8))) {
				parseResponse(request.responseText);
				token = request.getResponseHeader(Constants.PID);
			}
			onloadCallback();
		}
		return request;
	}

	function parseResponse(text) {
		try {
			highscore = JSON.parse(text);
		} catch(e) {
			game.handleError(Messages.get(Messages._6));
		}
	}

	function getHighscore(onloadCallback, allTime, requestToken) {
		var request = createRequest(onloadCallback, requestToken);
		var c = "c=listHighscore";
		if (allTime)
			c += "&a=y"
		request.send(c);
	}
	function saveHighscore(level, onloadCallback) {
		var request = createRequest(function() {
			if (highscore.length > 0 && highscore[0] == "No") {
				exitToMenu();
			} else {
				onloadCallback();
			}
		});
		request.setRequestHeader(Constants.PID, token);
		request.send("c=saveHighscore&n=" + encodeURIComponent(game.getInfo().playerName()) + "&s=" + game.getInfo().score() + "&l=" + level);
	}
	this.checkScore = function(level) {
		var score = game.getInfo().score();
		if (!score) {
			exitToMenu();
			return;
		}

		var self = this;
		getHighscore(function() {
			var lowestScore = highscore.length > 0 ? highscore[highscore.length - 1].s : 0;
			if (score > lowestScore || highscore.length < 9 || game.getInfo().playerName() != "") { // übertrage bei vorhandenem Name mal alle! Scores zum Server
				var nameWasEmpty;
				(function tryAndSave() {
					if (game.getInfo().playerName() == "") {
						nameWasEmpty = true;
						game.showMessage(Messages.get(Messages._11), function(ok) {
							if (ok)
								tryAndSave();
							else
								exitToMenu();
						}, true);
					} else {
						// sonst ist das Token ggf. nicht mehr valide!
						if (nameWasEmpty)
							self.checkScore(level);
						else
							saveHighscore(level, score > lowestScore || highscore.length < 9 ? self.draw : exitToMenu); // s.oben
					}
				})();
			} else {
				exitToMenu();
			}
		}, false, true);
	}
	function drawHighscore(ctx, heading) {
		var x = 20;
		var y = game.zoom(50);
		function drawLine(offset, content) {
			var color = Constants.YELLOW;
			if (!content) {
				var entry = highscore[offset];
				if (entry.x)
					color = Constants.RED;
			}
			Menu.MenuText.draw(undefined, ctx, x, y + offset * game.zoom(30), game.zoom(30), game.unescapeHtml(entry.n), 0, 0, Constants.DARKGREY, color);
//			ctx.textAlign = "end";
			var num = entry.s.toString();
			console.log(entry.n + ":" + num);
			var sample = "";
			for (var i = 0; i <= 9; i++)
				sample += i;
			var commonWidth = Menu.getCommonMaxCharWidth(ctx, sample);
			for (var n = num.length - 1, i = n; i >= 0; i--) {
				var width = ctx.measureText(num[i]).width;
				var x1 = game.canvasWidth - x - (n - i) * commonWidth - width / 2;
				console.log("x: " + x1);
				Menu.MenuText.draw(undefined, ctx, x1, y + offset * game.zoom(30), game.zoom(30), num[i], 0, 0, Constants.DARKGREY, color);
			}
			ctx.textAlign = Constants.START;
		}
		
		if (highscore.length > 0) {
			drawLine(0);
			for (var i = 0; i < highscore.length; i++) {
				drawLine(i);
			}
			// erst jetzt ist der Font gesetzt
			drawHeading(ctx, heading);
		}
	}
	function drawHeading(ctx, text) {
		ctx.save();
		ctx.fillStyle = Constants.YELLOW;
		ctx.shadowBlur = 20;
		ctx.shadowColor = Constants.DARKGREY;
		ctx.textAlign = Constants.CENTER;
		ctx.textBaseline = Constants.MIDDLE;
		var width = ctx.measureText(text).width;
		var x = game.canvasWidth / 2;
		var y = 30;
		var margin = 20;
		ctx.fillRect(margin, y, x - width / 2 - margin, 2);
		ctx.strokeRect(margin, y, x - width / 2 - margin, 3);
		ctx.fillRect(game.canvasWidth - margin, y, -x + width / 2 + margin, 2);
		ctx.strokeRect(game.canvasWidth - margin, y, -x + width / 2 + margin, 3);
		ctx.fillText(text, x, y);
		ctx.strokeText(text, x, y);
		ctx.restore();
	}

	this.draw = function() {
		canceled = false;
		state = 1;
		if (highscore.length == 0) {
			getHighscore(doAnimate);
		} else {
			doAnimate();
		}
		function doAnimate() {
			// wenn die erste highscore leer ist, lade die top-liste
			if (highscore.length == 0) {
				state = 2;
				getHighscore(function() {
					rotate(registerHandlers, false, Messages.get(Messages._26));
				}, true);
			} else {
				rotate(registerHandlers);
			}
		}
	}

	function rotate(callback, startBig, heading) {
		// first, prepare the canvas
		game.menuCtx.clearRect(0, 0, game.menuCanvas.width, game.menuCanvas.height);
		drawHighscore(game.menuCtx, heading || Messages.get(Messages._27));
		Animation(function(delta) { // 0...1
			var scale = startBig ? 1 - delta : delta;

			var ctx = game.ctx;
			ctx.drawImage(game.bgCanvas, 0, 0);
			ctx.save();
			ctx.translate(game.canvasWidth / 2, game.canvasHeight / 2);
			ctx.rotate(2 * delta * Math.PI);
			ctx.translate(-game.canvasWidth / 2, -game.canvasHeight / 2);
			var extScale = scale * 120 + 1;
			var extTranslate = (game.canvasWidth / 2 - extScale * game.canvasWidth / 2);
			ctx.translate(extTranslate, extTranslate);
			ctx.scale(extScale, extScale);
			game.drawMenu(ctx, true);
			ctx.scale(1 / extScale, 1 / extScale);
			ctx.translate(-extTranslate, -extTranslate);
			ctx.drawImage(game.menuCanvas,
					(1 - scale) * game.canvasWidth / 2,
					(1 - scale) * game.canvasHeight / 2,
					game.canvasWidth * scale, game.canvasHeight * scale);
			ctx.restore();
		}, callback, false, Animation.quad, 1500, 0, true);
	}

	function handler(ev) {
		if (!Menu.isClickEvent(ev))
			return;
		if (state == 1) {
			state = 2;
			unregisterHandlers();

			// prepare canvas
			var ctx = game.menuCtx;
			game.menuCanvas.width = 2 * game.canvasWidth;
			drawHighscore(ctx, Messages.get(Messages._27));
			getHighscore(function() {
				ctx.translate(game.canvasWidth, 0);
				drawHighscore(ctx, Messages.get(Messages._26));
				ctx.translate(-game.canvasWidth, 0);
				Animation(function(delta) {
					game.ctx.drawImage(game.bgCanvas, 0, 0);
					game.ctx.drawImage(game.menuCanvas, -game.menuCanvas.width * delta - game.canvasWidth, 0);
				}, function() {
					game.menuCanvas.width = game.canvasWidth;
					registerHandlers();
				}, true, Animation.elastic, 1500);
			}, true);
		} else {
			unregisterHandlers();
			rotate(function() {
				game.ctx.drawImage(game.bgCanvas, 0, 0);
				exitToMenu();
			}, true, Messages.get(Messages._26));
		}
	}

	function exitToMenu() {
		highscore = "";
		game.ctx.drawImage(game.bgCanvas, 0, 0);
		game.drawMenu();
	}

	function registerHandlers() {
		if (!canceled) {
			game.canvas.addEventListener(Constants.MOUSEUP, handler);
			document.addEventListener(Constants.KEYDOWN, handler);
		}
	}

	function unregisterHandlers() {
		game.canvas.removeEventListener(Constants.MOUSEUP, handler);
		document.removeEventListener(Constants.KEYDOWN, handler);
	}

	this.cancel = function() {
		unregisterHandlers();
		canceled = true;
	}

	function isError(request, msg) {
		if (request.responseText.length == 0 || request.responseText.indexOf("<html>") == 0) {
			game.handleError(msg, request.statusText);
			return true;
		}
	}
}