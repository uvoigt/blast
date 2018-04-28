/*
 * (c) Copyright 2016 Uwe Voigt
 * All Rights Reserved.
 */
"use strict";

var enemiesLocal = {
	Cat: Cat,
	Drob: Drob,
	BlueDrop: BlueDrop,
	Schlapper: Schlapper,
	BlueGhost: BlueGhost,
	Smiley: Smiley,
	Insect: Insect,
	Crocodile: Crocodile,
	Bird: Bird,
	Bear: Bear,
	Fish: Fish,
	Frog: Frog,
	Blob: Blob,
	Duck: Duck,
	Coin: Coin,
	Ghost : Ghost,
	BigGhost: BigGhost,
	Kegel: Kegel,
	Kreisel: Kreisel,
	Goblin: Goblin
};

function shiftExplode(explodeArray, offset) {
	for (var i = 0; i < 4; i++) {
		explodeArray[i].offset = offset + i;
	}
}

/**
 * Function that describes an enemy.
 * 
 * @param {Game} game
 * 
 * @constructor
 * @base Sprite
 */
function Enemy(game, x, y, imageX, imageY, animType, explodeType, score, walkDelay, walkOverStones, detectBombs, followPlayer) {
	var self = this;

	this.isEnemy = true;

	function finishExplode(sprite) {
		game.removeSprite(sprite.state);
		game.getInfo().score(score);
	    game.levels.checkLevelClean();
	    game.sprites.push(sprite);
	    sprite.state.animOffset++;
	    sprite.isEnemy = false; // allow exit
	}

	function scoreAnim(sprite) {
		var sink = self.constructor.prototype;
		if (!sink.scoreImg) {
			var width = 0;
			var height = game.zoom(5);
			var spritex = [];
			var sc = score;
			for (var decimalPlace = 3; decimalPlace >= 0; decimalPlace--) {
				var mp = Math.pow(10, decimalPlace);
				var num = ~~(sc / mp);
				if (num > 0) {
					width += game.zoom(4);
					spritex.push(44 + 4 * num);
					sc -= num * mp;
				}
			}
			var canvas = document.createElement(Constants.CANVAS);
			canvas.width = width;
			canvas.height = height;
			var ctx = canvas.getContext('2d');

			for (var i = 0; i < spritex.length; i++) {
				ctx.drawImage(game.imgSprites, game.zoom(spritex[i]), game.zoom(86), game.zoom(3), height, game.zoom(4 * i), 0, game.zoom(3), height);
			}
			sink.scoreImg = canvas;
			sink.anim = {imageX: 0, imageY: 0, centralize: true, Width: width, Height: height};
		}
		if (!sprite.scoreAlpha) {
			sprite.scoreAlpha = 1;
			sprite.img = sink.scoreImg;
		}
		game.ctx.globalAlpha = sprite.scoreAlpha;
		sprite.drawAnim(sink.anim);
		game.ctx.globalAlpha = 1; 
		sprite.scoreAlpha -= .002
		if (sprite.scoreAlpha <= 0) {
			game.removeSprite(sprite.state);
		}
	}
	scoreAnim.delay = 10000;

	if (explodeType == 1) {
		var explode = [
			{imageX: game.zoom(321), imageY: game.zoom(240), delay: 200},
			{offset: 1, imageX: game.zoom(321), imageY: game.zoom(240), delay: 200},
			{offset: 2, imageX: game.zoom(321), imageY: game.zoom(240), delay: 200},
			{offset: 3, imageX: game.zoom(321), imageY: game.zoom(240), delay: 200},
			finishExplode, scoreAnim, scoreAnim // die funktionen müssen zweimal hintereinander, da der this.animDelay immer vom vorherigen  offset genommen wird :-/
		];
	} else if (explodeType == 2) {
		// 2 images vom Sprite, dann die drei runden zum Ende
		var explode = [
			{offset: 3, delay: 200},
			{offset: 4, delay: 200},
			{imageX: game.zoom(385), imageY: game.zoom(240), delay: 200},
			{offset: 1, imageX: game.zoom(385), imageY: game.zoom(240), delay: 200},
			{offset: 2, imageX: game.zoom(385), imageY: game.zoom(240), delay: 200},
			finishExplode, scoreAnim, scoreAnim
		];
	} else if (explodeType == 3) {
		// 3 images vom Sprite, dann die drei runden zum Ende
		var explode = [
			{offset: 3, delay: 200},
			{offset: 4, delay: 200},
			{offset: 5, delay: 200},
			{imageX: game.zoom(385), imageY: game.zoom(240), delay: 200},
			{offset: 1, imageX: game.zoom(385), imageY: game.zoom(240), delay: 200},
			{offset: 2, imageX: game.zoom(385), imageY: game.zoom(240), delay: 200},
			finishExplode, scoreAnim, scoreAnim
		];
	} else if (explodeType == 4) {
		// 4 images vom Sprite, dann die drei runden zum Ende
		var explode = [
			{offset: 3, delay: 200},
			{offset: 4, delay: 200},
			{offset: 5, delay: 200},
			{offset: 6, delay: 200},
			{imageX: game.zoom(385), imageY: game.zoom(240), delay: 200},
			{offset: 1, imageX: game.zoom(385), imageY: game.zoom(240), delay: 200},
			{offset: 2, imageX: game.zoom(385), imageY: game.zoom(240), delay: 200},
			finishExplode, scoreAnim, scoreAnim
		];
	}

	var anims;
	if (animType == 1) {
		anims = [0, 1, 0, 2];
	} else if (animType == 2) {
		anims = [0, 1, 2, 1];
	}

	Sprite.call(this, game, x, y, game.zoom(16), game.zoom(18), imageX, imageY, {
		anims: {
			front: anims,
			left: anims,
			right: anims,
			up: anims,
			down: anims,
			explode: explode
		},
		delay: 400
	});

	function checkPlayerCollision(state) {
		var player = game.getPlayer();
		var dist = game.zoom(8);
		if (Levels.intersects(state.x, state.y, state.x + state.Width, state.y + state.Height,
				player.state.x + dist, player.state.y + dist, player.state.x + player.state.Width - dist, player.state.y + player.state.Height - dist)
				&& state.direction != 'explode') {
			player.explode();
		}
	}

	this.canGo = function(x, y) {
		var levels = game.levels;
		var pos;
		switch (this.direction) {
		default:
			pos = levels.getBoardPos(x, y);
			break;
		case 'left':
			if ((y % Levels.pix) != 0)
				return false;
			pos = levels.getBoardPos(x, y);
			break;
		case 'right':
			if ((y % Levels.pix) != 0)
				return false;
			pos = levels.getBoardPos(x + Levels.pix - 1, y);
			break;
		case 'up':
			if ((x % Levels.pix) != 0)
				return false;
			pos = levels.getBoardPos(x, y);
			break;
		case 'down':
			if ((x % Levels.pix) != 0)
				return false;
			pos = levels.getBoardPos(x, y + Levels.pix - 1);
			break;
		}
		var val = levels.getBoard(pos);
		var isBomb = val instanceof Bomb;
		var bombInDirection = detectBombs && isBombInDirection(pos);
		if (walkOverStones) {
			return x >= Levels.pix && y >= Levels.pix &&
			x <= levels.boardWidth() * Levels.pix - 2 * Levels.pix &&
			y <= levels.boardHeight() * Levels.pix - 2 * Levels.pix &&
			!isBomb && !bombInDirection;
		} else {
			return (levels.isEmpty(val) || levels.canTake(val)) &&
				!isBomb && !bombInDirection;
		}
	}

	function isBombInDirection(pos) {
		var levels = game.levels;
		var inc;
		switch (self.direction) {
		default:
			break;
		case 'left':
			inc = -1;
			break;
		case 'right':
			inc = 1;
			break;
		case 'up':
			inc = -levels.boardWidth();
			break;
		case 'down':
			inc = levels.boardWidth();
			break;
		}
		for (var i = 0; i < 4; i++) {
			pos += inc;
			if (levels.getBoard(pos) instanceof Bomb)
				return true;
		}
		return false;
	}

	this.isRemote = x && y;
	if (!this.isRemote) {

		var walk = { delay: walkDelay, last: Date.now() };
		var directions = ['left', 'right', 'up', 'down'];
		var direction = { current: ~~(Math.random() * directions.length), last: Date.now() };

		this.update = function() {
			if (Date.now() > walk.last && this.direction != 'explode') {
				walk.last = Date.now() + walk.delay;
				var prevState = game.clone(this.state);
				checkPlayerCollision(prevState);
	
				if (followPlayer && (this.state.x % Levels.pix) == 0 && (this.state.y % Levels.pix) == 0) {
					var prevDirection = this.direction;
					var playerState = game.getPlayer().state;
	
					var path = PathFinder.getInstance().find(this.state.x, this.state.y,
							playerState.x + playerState.Width / 2, playerState.y + playerState.Height / 2);
					if (path != null && path.length > 1) {
//						for (var i = 0; i < path.length; i++) {
//							var step = path[i];
//							game.ctx.fillRect(step.x, step.y, 10, 10);
//						}

						var step = path[1];
						var xdif = this.state.x - step.x;
						var ydif = this.state.y - step.y;
						if (xdif > 0)
							newDir = 0;
						else if (xdif < 0)
							newDir = 1;
						else if (ydif > 0)
							newDir = 2;
						else if (ydif < 0)
							newDir = 3;
	
						this[directions[newDir]]();
						if (prevState.x != this.state.x || prevState.y != this.state.y) {
							direction.current = newDir;
							return;
						} else {
							this.direction = prevDirection;
						}
					}
				}
	
				if (Date.now() > direction.last) {
					var newDir = direction.current;
					if (direction.next != undefined) {
						newDir = direction.next;
					} else {
						while (newDir == direction.current)
							newDir = ~~(Math.random() * directions.length);
					}
					this.direction = directions[newDir];
					if (this.canGo(prevState.x, prevState.y)) {
						direction.current = newDir;
						direction.next = undefined;
						direction.last = Date.now() + ~~(Math.random() * 10000);
					} else {
						direction.next = newDir;
					}
				}
				this[directions[direction.current]]();
				// blocked?
				if (prevState.x == this.state.x && prevState.y == this.state.y) {
					if (direction.next != undefined) {
						direction.current = direction.next;
						direction.next = undefined;
					} else if (Math.random() <.5) {
						direction.current ^= 2; // cross corner
						if (Math.random() < .5)
							direction.current ^= 1;
					} else {
						direction.current ^= 1; // u turn
					}
	
					this[directions[direction.current]]();
					direction.last = Date.now() + ~~(Math.random() * 10000);
				}
			}
	
			// no animation-reset on direction change, except when exploding
			if (this.direction != this.state.direction) {
				this.state.direction = this.direction;
				if (this.direction == "explode") {
					this.state.animOffset = -1;
					this.animDelay = 0;
				}
			}
	
			Sprite.prototype.update.call(this, true);
		}

		this.updateRemote = function() {
			if (game.multiPlayer && (this.state.oldx != this.state.x || this.state.oldy != this.state.y || this.state.olddir != this.state.direction)) {
				
				game.multiPlayer.updateSprite(this.state, this.id);
				this.state.oldx = this.state.x;
				this.state.oldy = this.state.y;
				this.state.olddir = this.state.direction;
			}
		}

		this.setToRandomPos();

	} else {
		// isRemote
		
		this.update = function() {
			this[this.direction]();
			this.state.x = this.remoteState.x;
			this.state.y = this.remoteState.y;
			Sprite.prototype.update.call(this);
		}
	}
}

/**
 * Implementation of the A* path finder algorithm.
 * 
 * @param {Game} game
 * 
 * @constructor
 */
function PathFinder(game, maxSearchDistance, allowDiagMovement) {
	function comparator(a, b) {
		var f = a.heuristic + a.cost;
		var of = b.heuristic + b.cost;
		return f < of ? -1 : f > of ? 1 : 0;
	}
	function manhattan(x, y, tx, ty) {
		var dx = Math.abs(tx - x);
		var dy = Math.abs(ty - y);
		return  dx + dy;
	}
//	function closest(x, y, tx, ty) {
//		var dx = tx - x;
//		var dy = ty - y;
//		var result = Math.sqrt(dx * dx + dy * dy);
//		return result;
//	}
	var getHeuristicCost = manhattan;

	if (!maxSearchDistance)
		maxSearchDistance = 100;

	var levels = game.levels;
	var levelIndex = 0;

	var openList = [];
	var closedList = [];
	var nodes = [];
	nodes.length = levels.boardWidth() * levels.boardHeight();
	var boardWidthInPixels = 0;
	var boardHeightInPixels = 0;
	init();

	function init() {
		levelIndex = levels.currentLevelIndex();
		boardWidthInPixels = levels.boardWidth() * Levels.pix;
		boardHeightInPixels = levels.boardHeight() * Levels.pix;
		for (var y = 0, i = 0; y < boardHeightInPixels; y += Levels.pix) {
			for (var x = 0; x < boardWidthInPixels; x += Levels.pix, i++) {
				nodes[i] = { x: x, y: y, heuristic: 0, cost: 0};
			}
		}
	}
	this.checkActual = function() {
		if (levelIndex != levels.currentLevelIndex()) {
			init();
		}
	}

	/**
	 * @returns a path as an array of (x, y) steps or null
	 */
	this.find = function(sx, sy, tx, ty) {

		var from = levels.getBoardPos(sx, sy);
		var to = levels.getBoardPos(tx, ty);

		var fromNode = nodes[from];
		fromNode.cost = 0;
		fromNode.depth = 0;
		closedList.length = 0;
		openList.length = 0;
		addToOpen(fromNode);
		nodes[to].parent = undefined;
		
		var maxDepth = 0;
		while ((maxDepth < maxSearchDistance) && (openList.length != 0)) {
			// getFirstInOpen()
			var current = openList[0];
			if (current === nodes[to])
				break;

			// removeFromOpen(current);
			remove(openList, current);
			// addToClosed(current);
			closedList.push(current);
			// search through all the neighbors of the current node evaluating
			// them as next steps
			for (var x = -Levels.pix, n = 2 * Levels.pix; x < n; x += Levels.pix) {
				for (var y = -Levels.pix, m = 2 * Levels.pix; y < m; y += Levels.pix) {
					// not a neighbor, its the current tile
					if ((x == 0) && (y == 0))
						continue;
					// if we're not allowing diagonal movement then only
					// one of x or y can be set
					if (!allowDiagMovement) {
						if ((x != 0) && (y != 0)) {
							continue;
						}
					}
					// determine the location of the neighbor and evaluate it
					var xp = x + current.x;
					var yp = y + current.y;
					if (isValidLocation(sx, sy, xp, yp)) {
						// the cost to get to this node is cost the current plus the movement
						// cost to reach this node. Note that the heuristic value is only used
						// in the sorted open list
						var nextStepCost = current.cost + getMovementCost(/*current.x, current.y, xp, yp*/);
						var pos = levels.getBoardPos(xp, yp);
						var neighbor = nodes[pos];

						// if the new cost we've determined for this node is lower than 
						// it has been previously makes sure the node hasn'e've
						// determined that there might have been a better path to get to
						// this node so it needs to be re-evaluated
						if (nextStepCost < neighbor.cost) {
							if (openList.indexOf(neighbor) != -1) {
								remove(openList, neighbor);
							}
							if (closedList.indexOf(neighbor) != -1) {
								remove(closedList, neighbor);
							}
						}
						// if the node hasn't already been processed and discarded then
						// reset it's cost to our current cost and add it as a next possible
						// step (i.e. to the open list)
						if (openList.indexOf(neighbor) == -1 && closedList.indexOf(neighbor) == -1) {
							neighbor.cost = nextStepCost;
							neighbor.heuristic = getHeuristicCost(xp, yp, tx, ty);
							maxDepth = Math.max(maxDepth, setParent(neighbor, current));
							addToOpen(neighbor);
						}
					}
				}
			}
		}
		// since we'e've run out of search 
		// there was no path. Just return null
		if (nodes[to].parent == null)
			return null;
		
		// At this point we've definitely found a path so we can uses the parent
		// references of the nodes to find out way from the target location back
		// to the start recording the nodes on the way.
		var path = [];
		var target = nodes[to];
		while (target != nodes[from]) {
			path.unshift({x: target.x, y: target.y});
			target = target.parent;
		}
		path.unshift({x: sx, y: sy});
		
		// thats it, we have our path 
		return path;
	}

	function setParent(node, parent) {
		node.depth = parent.depth + 1;
		node.parent = parent;
		return node.depth;
	}

	function addToOpen(node) {
		openList.push(node);
		openList.sort(comparator);
	}

	function getMovementCost(/*sx, sy, tx, ty*/) {
		return 1;
	}

	function isValidLocation(sx, sy, x, y) {
		var invalid = (x < 0) || (y < 0) || (x >= boardWidthInPixels) || (y >= boardHeightInPixels);

		if ((!invalid) && ((sx != x) || (sy != y))) {
			var pos = levels.getBoardPos(x, y);
			var val = levels.getBoard(pos);
			invalid = !(levels.isEmpty(val) || levels.canTake(val));
		}
		return !invalid;
	}

	function remove(list, item) {
		for (var i = 0, n = list.length; i < n; i++) {
			if (list[i] === item) {
				list.splice(i, 1);
				break;
			}
		}
	}
}

PathFinder.getInstance = function() {
	if (!PathFinder.instance)
		PathFinder.instance = new PathFinder(game);
	PathFinder.instance.checkActual();
	return PathFinder.instance;
}

/**
 * Orange drop.
 * 
 * @param {Game} game the game reference
 * 
 * @constructor
 * @base Enemy
 */
function Drob(game, x, y) {

	Enemy.call(this, game, x, y, game.zoom(433), game.zoom(240), 2, 2, 9, 15);
}

/**
 * Pink slimy blob.
 * 
 * @param {Game} game
 * 
 * @constructor
 * @base Enemy
 */
function Blob(game, x, y) {

	Enemy.call(this, game, x, y, game.zoom(321), game.zoom(294), 2, 4, 11, 15);
	this.animation.delay = 350;
}

/**
 * Blue frog.
 * 
 * @param {Game} game
 * 
 * @constructor
 * @base Enemy
 */
function Frog(game, x, y) {
	
	Enemy.call(this, game, x, y, game.zoom(513), game.zoom(258), 2, 4, 13, 15);
	this.animation.delay = 150;
}

/**
 * Green fish.
 * 
 * @param {Game} game
 * 
 * @constructor
 * @base Enemy
 */
function Fish(game, x, y) {
	
	Enemy.call(this, game, x, y, game.zoom(433), game.zoom(294), 2, 4, 14, 15);
	this.animation.delay = 250;
}

/**
 * Damn bear.
 * 
 * @param {Game} game
 * 
 * @constructor
 * @base Enemy
 */
function Bear(game, x, y) {

	Enemy.call(this, game, x, y, game.zoom(433), game.zoom(258), 1, 2, 75, 5, false, false, true);
}

/**
 * Schlapper-Plapper!
 * 
 * @param {Game} game
 * 
 * @constructor
 * @base Enemy
 */
function Schlapper(game, x, y) {

	Enemy.call(this, game, x, y, game.zoom(321), game.zoom(258), 2, 4, 55, 5, true);
	this.animation.delay = 150;
}

/**
 * The violet bird. Shit it off!
 * 
 * @param {Game} game
 * 
 * @constructor
 * @base Enemy
 */
function Bird(game, x, y) {
	
	Enemy.call(this, game, x, y, game.zoom(321), game.zoom(276), 1, 4, 35, 7, true, true);
	this.animation.anims.front = [9, 10, 11, 10];
	this.animation.anims.left = [0, 1, 2, 1];
	this.animation.anims.right = [6, 7, 8, 7];
	this.animation.anims.up = [3, 4, 5, 4];
	this.animation.anims.down = [9, 10, 11, 10];
	this.animation.anims.explode[0].offset = 12;
	this.animation.anims.explode[1].offset = 13;
	this.animation.anims.explode[2].offset = 14;
	this.animation.anims.explode[3].offset = 15;
	this.animation.delay = 200;

}

/**
 * Sick crocodile.
 * 
 * @param {Game} game
 * 
 * @constructor
 * @base Enemy
 */
function Crocodile(game, x, y) {
	
	Enemy.call(this, game, x, y, game.zoom(321), game.zoom(312), 2, 4, 29, 14, undefined, true);
}

/**
 * Blue water drop.
 * 
 * @param {Game} game
 * 
 * @constructor
 * @base Enemy
 */
function BlueDrop(game, x, y) {
	
	Enemy.call(this, game, x, y, game.zoom(545), game.zoom(294), 2, 3, 13, 15);
}

/**
 * Violet insect or whatever.
 * 
 * @param {Game} game
 * 
 * @constructor
 * @base Enemy
 */
function Insect(game, x, y) {
	
	Enemy.call(this, game, x, y, game.zoom(433), game.zoom(312), 2, 4, 25, 9);
	this.animation.delay = 200;
}

/**
 * Yellow Smiley, not the coin!
 * 
 * @param {Game} game
 * 
 * @constructor
 * @base Enemy
 */
function Smiley(game, x, y) {
	
	Enemy.call(this, game, x, y, game.zoom(545), game.zoom(312), 2, 3, 23, 9);
	this.animation.delay = 250;
}

/**
 * Small, blue ghost.
 * 
 * @param {Game} game
 * 
 * @constructor
 * @base Enemy
 */
function BlueGhost(game, x, y) {
	
	Enemy.call(this, game, x, y, game.zoom(321), game.zoom(330), 2, 4, 19, 13);
}

/**
 * Orange cat.
 * 
 * @param {Game} game
 * 
 * @constructor
 * @base Enemy
 */
function Cat(game, x, y) {
	
	Enemy.call(this, game, x, y, game.zoom(433), game.zoom(330), 2, 4, 21, 12);
	this.animation.delay = 200;
}

/**
 * Fat violet duck.
 * 
 * @param {Game} game
 * 
 * @constructor
 * @base Enemy
 */
function Duck(game, x, y) {
	
	Enemy.call(this, game, x, y, game.zoom(321), game.zoom(348), 1, 2, 19, 14);
	this.animation.anims.front = [9, 10, 11, 10];
	this.animation.anims.left = [0, 1, 2, 1];
	this.animation.anims.right = [6, 7, 8, 7];
	this.animation.anims.up = [3, 4, 5, 4];
	this.animation.anims.down = [9, 10, 11, 10];
	this.animation.anims.explode[0].offset = 12;
	this.animation.anims.explode[1].offset = 13;
}

/**
 * Fast yellow coin.
 * 
 * @param {Game} game
 * 
 * @constructor
 * @base Enemy
 */
function Coin(game, x, y) {
	
	Enemy.call(this, game, x, y, game.zoom(513), game.zoom(240), 1, 2, 23, 2, true);
	this.animation.anims.front = [0, 1, 3, 2];
	this.animation.anims.left = this.animation.anims.front;
	this.animation.anims.right = this.animation.anims.front;
	this.animation.anims.up = this.animation.anims.front;
	this.animation.anims.down = this.animation.anims.front;
	this.animation.delay = 100;
}

/**
 * White ghost.
 * 
 * @param {Game} game
 * 
 * @constructor
 * @base Enemy
 */
function Ghost(game, x, y) {

	Enemy.call(this, game, x, y, game.zoom(321), game.zoom(384), 1, 4, 21, 11);
	this.animation.anims.front = [0, 1, 10, 9];
	this.animation.anims.left = [4, 5, 4, 5]; // die Längen dürfen nicht unterschiedlich sein, da der Offset beim Richtungswechsel erhalten bleibt
	this.animation.anims.right = [6, 7, 6, 7];
	this.animation.anims.up = [2, 3, 8, 3];
	this.animation.anims.down = this.animation.anims.front;
	shiftExplode(this.animation.anims.explode, 11);
}

/**
 * Yellow Kegel.
 * 
 * @param {Game} game
 * 
 * @constructor
 * @base Enemy
 */
function Kegel(game, x, y) {

	Enemy.call(this, game, x, y, game.zoom(513), game.zoom(366), 2, 4, 29, 8);
	this.animation.delay = 150;
}

/**
 * Colored Kreisel.
 * 
 * @param {Game} game
 * 
 * @constructor
 * @base Enemy
 */
function Kreisel(game, x, y) {

	Enemy.call(this, game, x, y, game.zoom(321), game.zoom(366), 1, 4, 31, 7);
	this.animation.anims.front = [5, 4, 3, 2, 1, 7, 7];
	this.animation.anims.left = this.animation.anims.front;
	this.animation.anims.right = this.animation.anims.front;
	this.animation.anims.up = this.animation.anims.front;
	this.animation.anims.down = this.animation.anims.front;
	shiftExplode(this.animation.anims.explode, 8);
	this.animation.delay = 80;
}

/**
 * Green goblin.
 * 
 * @param {Game} game
 * 
 * @constructor
 * @base Enemy
 */
function Goblin(game, x, y) {

	Enemy.call(this, game, x, y, game.zoom(321), game.zoom(402), 2, 4, 27, 7);
	this.animation.anims.front = [3, 4, 5, 4];
	this.animation.anims.left = [0, 1, 2, 1];
	this.animation.anims.right = [6, 7, 8, 7];
	this.animation.anims.up = [9, 10, 11, 10];
	this.animation.anims.down = this.animation.anims.front;
	this.animation.anims.explode[0].offset = 12;
	this.animation.anims.explode[1].offset = 13;
	shiftExplode(this.animation.anims.explode, 12);
}

/**
 * Big multi colored ghost.
 * 
 * @param {Game} game
 * 
 * @constructor
 * @base Enemy
 */
function BigGhost(game, x, y) {
	Enemy.call(this, game, x, y, 0, 0, 2, 2, 99, 5, false, true);
	this.state.Height = game.zoom(24);
	this.animation.anims.left = [9, 10, 11, 10];
	this.animation.anims.right = [3, 4, 5, 4];
	this.animation.anims.up = [6, 7, 8, 7];
	for (var i = 0; i < 5; i++) {
		var explode = this.animation.anims.explode[i];
		explode.imageX = game.zoom(513);
		explode.imageY = game.zoom(420);
		explode.Width = game.zoom(22);
		explode.Height = game.zoom(24);
		explode.offset = i;
	}
	this.centralize = true;
	var lifeState = 4;
	this.explode = function() {
		if (lifeState <= 0) {
			this.img = undefined;
			Sprite.prototype.explode.call(this);
		} else {
			if (this.hurtTime || !this.canChangeDirection())
				return;
			this.hurtTime = Date.now() + 1500;
			lifeState--;
			this.imageY = (4 - lifeState) * this.state.Height;
			console.log("lifeState: " + lifeState + ", this.imageY: " + this.imageY);
		}
	}
	this.draw = function() {
		if (this.hurtTime) {
			if (Date.now() > this.hurtTime) {
				this.hurtTime = 0;
			}
		}
		Sprite.prototype.draw.call(this);
	}

	if (!BigGhost.img)
		BigGhost.img = prepareImage();
	this.img = BigGhost.img;

	function prepareImage() {

		var sourcePx = [0xF3F3F3,0xB3B3B3,0x828282,0x636363];

		var width = game.zoom(302), height = game.zoom(24);
		var canvas = document.createElement(Constants.CANVAS);
		canvas.width = width;
		canvas.height = 4 * height;
		var ctx = canvas.getContext('2d');

		var fromX = game.zoom(321);
		var fromY = game.zoom(420);
		function colorize(y, color) {
			ctx.drawImage(game.imgSprites, fromX, fromY, width, height, 0, y, width, height);
			var imageData = ctx.getImageData(0, y, width, height);
			game.colorizeImage(sourcePx, imageData.data, color);
			ctx.putImageData(imageData, 0, y);
		}
		colorize(0, 0x00F3F3);
		colorize(height, 0x53D800);
		colorize(2 * height, 0xFFD800);
		colorize(3 * height, 0xFF0000);
//		setTimeout(function() {
//			game.bgCtx.drawImage(canvas, 0, 0);
//			game.ctx.drawImage(canvas, 0, 0);
//		}, 5000);
		return canvas;
	}

}