/*
 * (c) Copyright 2016 Uwe Voigt
 * All Rights Reserved.
 */
"use strict";

function Test() {

	var testState = {};
	var levels = game.levels;

	console.log("Test inited. Run with Test.run(), loop with Test.loop() and stop with Test.stop()");

	function setup() {
		testState.running = true;
		testState.stop = false;
	}

	function tearDown() {
		testState.running = false;
	}

	Test.run = function() {
		tryExecute();
	}

	Test.loop = function() {
		tryExecute(true);
	}

	Test.stop = function() {
		if (testState.running)
			testState.stop = true;
	}

	function tryExecute(loop) {
		if (!testState.running) {
			setup();
			execute(loop);
		}
	}

	function getTakeableTarget() {
		var point = getRelativePlayerPoint();
		var playerPos = levels.getBoardPos(point.x, point.y);
		for (var distance = 1; distance < 20; distance++) {
			for (var posy = playerPos - distance - levels.boardWidth() * distance, n = posy + 2 * levels.boardWidth() * distance;
					posy < n; posy += levels.boardWidth()) {
				for (var pos = posy, m = pos + 2 * distance; pos < m; pos++) {
					var val = levels.getBoard(pos);
					if (val != undefined && levels.canTake(val))
						return levels.getBoardPoint(pos);
				}
			}
		}
//		levels.forEach(function(val, pos) {
//			if (levels.canTake(val)) {
//				result = levels.getBoardPoint(pos);
//				return true;
//			}
//		}, false);
	}

	function getRandomTarget() {
		var x;
		var y;
		var w = levels.boardWidth();
		var h = levels.boardHeight();
		do {
			x = ~~(Math.random() * w + 1) * Levels.pix;
			y = ~~(Math.random() * h + 1) * Levels.pix;
			var pos = levels.getBoardPos(x, y);
			var val = levels.getBoard(pos);
		} while (!(levels.isEmpty(val) || (val != undefined && levels.canTake(val))));
		return {x: x, y: y, r: true};
	}

	function execute(loop) {
		var finder = new PathFinder(game);
		var path;
		var target = getTakeableTarget();
		if (target == undefined)
			target = getRandomTarget();
		do {
			var point = getRelativePlayerPoint();
			path = finder.find(point.x, point.y, target.x, target.y);
			if (path != null)
				break;
			target = getRandomTarget();
		} while (true);

//		for (var i = 0; i < path.length; i++) {
//			var step = path[i];
//			game.ctx.fillRect(step.x - game.offsetX, step.y - game.offsetY, 10, 10);
//		}
		walkTo(path, 0, target.r);

		function walkTo(path, index, randomTarget) {
			var step = path[index];
			var point = getRelativePlayerPoint();

			var xdif = point.x - step.x;
			var ydif = point.y - step.y;
			var key;
			if (xdif > 0)
				key = "left";
			else if (xdif < 0)
				key = "right";
			else if (ydif > 0)
				key = "up";
			else if (ydif < 0)
				key = "down";

			if (key) {
				keyDown(key);

				var numWaiting = 0;
				var intervalId = setInterval(function() {
					var point = getRelativePlayerPoint();
					if (point.x == step.x && point.y == step.y) {

						clearInterval(intervalId);
						next(path, index, point, key, randomTarget);
					} else {
						if (++numWaiting > 200) {
							if (key)
								keyUp(key);
						}
						if (numWaiting > 500) {
							console.log("waited too long... new path");
							clearInterval(intervalId);
							next(path, path.length, point, undefined, randomTarget);
						}
					}
				}, 1);
			} else {
				next(path, index, point, undefined, randomTarget);
			}
		}

		function next(path, index, playerPoint, key, randomTarget) {
			function isFree(x, y) {
				var pos = levels.getBoardPos(x, y)
				var val = levels.getBoard(pos);
				return !levels.isStone(val);
			}
			function checkNeighbor(x, y) {
				var pos = levels.getBoardPos(x, y)
				var val = levels.getBoard(pos);
				if (levels.canExplode(val)) {
					keyDown("space");
					setTimeout(function() {
						keyUp("space");
					}, 10);
				} else {
					return true;
				}
			}
			if (++index < path.length) {

				// lege nur eine Bombe, wenn weit genug vom Ziel weg, um sich nicht selber einzusperren
				if (path.length - index > 3 && randomTarget) {
					checkNeighbor(playerPoint.x + Levels.pix, playerPoint.y) &&
						checkNeighbor(playerPoint.x - Levels.pix, playerPoint.y) &&
						checkNeighbor(playerPoint.x, playerPoint.y + Levels.pix) &&
						checkNeighbor(playerPoint.x, playerPoint.y - Levels.pix) &&
						game.getPlayer().bombSize > 2 &&
						isFree(playerPoint.x + 1 * Levels.pix, playerPoint.y) && checkNeighbor(playerPoint.x + 2 * Levels.pix, playerPoint.y) &&
						isFree(playerPoint.x - 1 * Levels.pix, playerPoint.y) && checkNeighbor(playerPoint.x - 2 * Levels.pix, playerPoint.y) &&
						isFree(playerPoint.x, playerPoint.y + 1 * Levels.pix) && checkNeighbor(playerPoint.x, playerPoint.y + 2 * Levels.pix) &&
						isFree(playerPoint.x, playerPoint.y - 1 * Levels.pix) && checkNeighbor(playerPoint.x, playerPoint.y - 2 * Levels.pix);
				}

				//
				setTimeout(function() {

					if (key)
						keyUp(key);
					if (testState.stop) {
						keyUp("left"), keyUp("right"), keyUp("up"), keyUp("down");
						console.log("Test stopped");
						tearDown();
					} else
						walkTo(path, index, randomTarget);
				}, 1);
			} else {
				if (key)
					keyUp(key);
//				console.log("Ziel erreicht!");
				if (loop) {
					execute(loop);
				} else {
					tearDown();
				}
			}
		}
	}

	function keyDown(key) {
		keyEvent(Constants.KEYDOWN, key);
	}

	function keyUp(key) {
		keyEvent(Constants.KEYUP, key);
	}

	function keyEvent(name, key) {
		var event = document.createEvent("HTMLEvents");
		event.initEvent(name, true, true);
		event.keyCode = translate(key);
		document.dispatchEvent(event);
	}

	function translate(key) {
		switch (key) {
		default:
			throw "unhandled key " + key;
		case "left":
			return 37;
		case "up":
			return 38;
		case "right":
			return 39;
		case "down":
			return 40;
		case "space":
			return 32;
		}
	}

	function getRelativePlayerPoint() {
		var playerState = game.getPlayer().state;
		var pos = levels.getBoardPos(playerState.x + playerState.Width / 2, playerState.y + playerState.Height / 2);
		return game.levels.getBoardPoint(pos);
	}
}