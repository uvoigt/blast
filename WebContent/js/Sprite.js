/*
 * (c) Copyright 2016 Uwe Voigt
 * All Rights Reserved.
 */
"use strict";

//var directions = {
//	front: 1,
//	left: 2,
//	right: 3,
//	up: 4,
//	down: 5,
//	explode: 6
//};

/**
 * @param {Game} game
 * @param {Number} x initial horizontal position
 * @param {Number} y initial vertical position
 * @param {Number} width sprite width
 * @param {Number} height sprite height
 * @param {Number} imageX horizontal starting position within the image containing the sprite
 * @param {Number} imageY vertical starting position within the image containing the sprite
 * @param animation structure describing how to animate the sprite
 *         if it contains a member 'delay', this is the time in milliseconds to pause between the animations
 * @param direction default direction is 'front'
 * @param {Image} img the optional player image
 * 
 * @constructor
 */
function Sprite(game, x, y, width, height, imageX, imageY, animation, direction, img) {
	this.imageX = imageX;
	this.imageY = imageY;
	this.direction = direction ? direction : 'front';
	this.state = { x: x, y: y, Width: width, Height: height, direction: this.direction, animOffset: 0 };
	this.animation = animation;
	var step = 1;
	this.img = img;

	this.getDelay = function() {
		var anim = this.animation.anims[this.state.direction][this.state.animOffset];
		return anim && anim.delay != undefined ? anim.delay : this.animation.delay;
	}
	this.animDelay = Date.now() + this.getDelay(this.state);

	Sprite.prototype.clearBackground = function(anim) {
		if (!anim)
			anim = this.animation.anims[this.state.direction][this.state.animOffset];
		var h = anim.Height ? anim.Height : this.state.Height;
		var w = anim.Width ? anim.Width : this.state.Width;
		var x = this.state.x;
		var y = this.state.y;
		if (anim.centralize) {
			// es ist nur ein anim state zu zentralisieren
			x += this.state.Width / 2 - w / 2;
			y += this.state.Height / 2 - h / 2
		} else if (this.centralize) {
			// es ist das Sprite zu zentralisieren
			x += Levels.pix / 2 - w / 2;
			y += Levels.pix / 2 - h / 2;
		}
		var x1 = x - game.offsetX/* + game.leftOffset*/;
		var y1 = y - game.offsetY;
		if (x1 + w >= 0 && y1 + h >= 0 && x1 < game.canvasWidth && y1 < game.canvasHeight) {
			game.levels.drawImage(game.ctx, game.bgCanvas, x/* + game.leftOffset*/, y, x1, y1, w, h);
		}
	}
	this.clearBackground = Sprite.prototype.clearBackground;

	Sprite.prototype.draw = function() {
		var anim = this.animation.anims[this.state.direction][this.state.animOffset];
		if (typeof anim == 'function') {
			anim(this);
		} else {
			this.drawAnim(anim);
		}
	}
	this.draw = Sprite.prototype.draw;

	this.drawAnim = function(anim) {
		var offset = typeof anim == 'number' ? anim : (anim.offset != undefined ? anim.offset : 0);
		var imagex = anim.imageX != undefined ? anim.imageX : this.imageX;
		var imagey = anim.imageY != undefined ? anim.imageY : this.imageY;
		var h = anim.Height ? anim.Height : this.state.Height;
		var w = anim.Width ? anim.Width : this.state.Width;
		var image = anim.img ? anim.img : this.img ? this.img : game.imgSprites;
		var x = this.state.x - game.offsetX/* + game.leftOffset*/;
		var y = this.state.y - game.offsetY;
		if (anim.centralize) {
//			var oldx = x;
//			var oldy = y;
			x += (this.state.Width - w) / 2;
			y += (this.state.Height - h) / 2;
//			console.log("drawing central at: " + x + ", " + y + " instead of " + oldx + ", " + oldy);
		} else if (this.centralize) {
			x += (Levels.pix - w) / 2;
			y += (Levels.pix - h) / 2;
		}

		if (x + w >= 0 && y + h >= 0 && x < game.canvasWidth && y < game.canvasHeight) {
			game.levels.drawImage(game.ctx, image, imagex + w * offset, imagey, x, y, w, h);
		}
	}

	Sprite.prototype.update = function() {
		if (this.direction != this.state.direction) {
			this.state.direction = this.direction;
			this.state.animOffset = -1;
			this.animDelay = 0;
		}
		
		this.updateRemote();
		
		var delay = this.getDelay();
		if (delay) {
			if (Date.now() >= this.animDelay) {
				this.animate();
				delay = this.getDelay();
				this.animDelay = Date.now() + delay;
//				console.log('animate ' + this.toDebugString() + '  dir: ' + this.state.direction + ', offset:' + this.state.animOffset + ', delay: ' + delay);
			}
		}
	}
	this.update = Sprite.prototype.update;

	Sprite.prototype.canChangeDirection = function() {
		return this.direction != 'explode';
	}
	this.canChangeDirection = Sprite.prototype.canChangeDirection;

	this.updateRemote = function() {
	}

	/**
	 * @param {Number} x
	 * @param {Number} y
	 */
	this.canGo = function() {
		return true;
	}
	this.front = function(force) {
		if (force || this.canChangeDirection()) {
			this.direction = 'front';
		}
	}
	this.left = function() {
		if (this.canChangeDirection()) {
			this.direction = 'left';
			if (this.state.x >= step && this.canGo(this.state.x - step, this.state.y))
				this.state.x -= step;
		}
	}
	this.right = function() {
		if (this.canChangeDirection()) {
			this.direction = 'right';
			if (this.state.x < game.bgCanvas.width - width && this.canGo(this.state.x + step, this.state.y))
				this.state.x += step;
		}
	}
	this.up = function() {
		if (this.canChangeDirection()) {
			this.direction = 'up';
			if (this.state.y >= step && this.canGo(this.state.x, this.state.y - step))
				this.state.y -= step;
		}
	}
	this.down = function() {
		if (this.canChangeDirection()) {
			this.direction = 'down';
			if (this.state.y < game.bgCanvas.height - height && this.canGo(this.state.x, this.state.y + step))
				this.state.y += step;
		}
	}
	Sprite.prototype.explode = function() {
		if (this.canChangeDirection()) {
			console.log(this.toDebugString() + ' exploding... at ' + JSON.stringify(this.state));
			this.direction = 'explode';
		}
	}
	this.explode = Sprite.prototype.explode;

	this.animate = function() {
		var state = this.state;
		if (++state.animOffset >= this.animation.anims[state.direction].length)
			state.animOffset = 0;
	}
	this.setToRandomPos = function() {
		var pos = this.getRandomPos();
		this.state.x = pos.x;
		this.state.y = pos.y;
		return pos;
	}
	this.getRandomPos = function() {
		var x = Levels.pix * (~~(Math.random() * (game.levels.boardWidth() - 2)) + 1);
		var y = Levels.pix * (~~(Math.random() * (game.levels.boardHeight() - 2)) + 1);
		if (!this.canGo(x, y)) {
			return this.getRandomPos();
		}
		return {x: x, y: y};
	}
	this.toDebugString = function() {
		return this.constructor.name;
	}

//	this.getBoardRelativePoint = function() {
//		var pos = levels.getBoardPos(this.state.x + this.state.Width / 2, this.state.y + this.state.Height / 2);
//		return game.levels.getBoardPoint(pos);
//	}
}


// margins to the explosion beam
// offset 0 = end, offset 1 other
//Bomb.margins = [[5, 4], [4, 3], [3, 1], [6, 5]];

/**
 * A bomb!
 * 
 * @param {Game} game the game reference
 * @param {Player} player the player refeence
 * @param {Number} x the horizontal position
 * @param {Number} y the vertical position
 * @param {Number} size the explosion length
 * @param {Boolean} remoteBomb true if it is a remote bomb
 * 
 * @constructor
 * @base Sprite
 */
function Bomb(game, player, x, y, size, remoteBomb) {
	this.originator = player;
	Sprite.call(this, game, x, y, Levels.pix, Levels.pix, 0, /*game.zoom(133)*/0, {
		anims: {
			front: [ 0, 1, 2, 1 ]
		},
		delay: 200
	});
	var lane = [];

	var explode = { time: remoteBomb ? Number.MAX_VALUE : Date.now() + 4000, animation: [0, 1, 2, 1, 0, 3], offset: -1 };

	this.isRemoteBomb = function() {
		return remoteBomb;
	}

	this.isInRange = function(x, y) {
		var realSize = size * Levels.pix;
		return x == this.state.x && this.state.y - realSize <= y && this.state.y + realSize >= y ||
				y == this.state.y && this.state.x - realSize <= x && this.state.x + realSize >= x;
	}

	this.explode = function() {
		if (!explode.running) {
			explode.time = 0;
			lane.length = 0;
			var x = this.state.x - game.offsetX;
			var y = this.state.y - game.offsetY;
			if (x > 0 && y > 0 && x < game.canvasWidth && y < game.canvasHeight)
				game.shakeBackground();
		}
	}

	this.time = function(offset) {
		if (!remoteBomb)
			explode.time += offset;
	}

	this.draw = function() {
		if (explode.running) {
			drawExplosion(this.state, 0x3);
		}
		if (Date.now() >= explode.time) {
			if (!explode.running) {
				game.sound.playExplode(this.state);
				this.originator.removeBomb();
			}
			explode.running = true;
			explode.time = Date.now() + 55; // 75 ursprünglich
			if (++explode.offset >= explode.animation.length) {
				drawExplosion(this.state, 0x2);
				var pos = game.levels.getBoardPos(this.state.x, this.state.y);
				game.levels.removeBoard(pos);
				game.removeSprite(this.state);
				delete this.originator;
			} else if (explode.offset == 4) {
				// etwa nach der halben Explosion kann eine neue Bombe gelegt werden
				this.originator.currentBombNum--;
			}
		} else if (!explode.running) {
			Sprite.prototype.draw.call(this);
		}
	}
	function drawPart(sx, sy, x, y, width, height, clear, draw, offset, dist) {
		if (offset != undefined && lane[offset] <= dist)
			return;
		var x1 = x - game.offsetX/* + game.leftOffset*/;
		var y1 = y - game.offsetY;
		if (x1 + width >= 0 && y1 + height >= 0 && x1 < game.canvasWidth && y1 < game.canvasHeight) {
			if (clear) {
				game.ctx.drawImage(game.bgCanvas, x/* + game.leftOffset*/, y, width, height, x1, y1, width, height);
//				console.log("clearEx: " + x + "," + y + "," + width + "," + height + "," + x1 + "," + y1 + "," + width + "," + height);
			}
			if (draw) {
				game.ctx.drawImage(game.imgSprites, sx, sy, width, height, x1, y1, width, height);
//				console.log("drawEx: " + sx * zoom + "," + sy * zoom + "," + width + "," + height + "," + x1 + "," + y1 + "," + width + "," + height);
			}
		}
	}
	function drawExplosion(state, mask) {
		game.levels.doclip();
		var offValue = explode.animation[explode.offset];
		var offset = offValue * 7 * Levels.pix + game.zoom(48);
//		var margins = Bomb.margins[offValue];
		var clear = (mask & 2) > 0;
		var draw = (mask & 1) > 0;
		var width = Levels.pix, height = Levels.pix;

		if (draw)
			checkSingleReaction(state.x, state.y/*, undefined, undefined, game.zoom(5)*/); // heavily dependent on the sprite size!
		drawPart(offset, 0, state.x, state.y, width, height, clear, draw);

		for (var i = 1; i < size; i++) {
			if (draw) {
//				var margin = game.zoom(margins[1]);
				checkSingleReaction(state.x - i * Levels.pix, state.y, 0, i/*, margin*/);
				checkSingleReaction(state.x + i * Levels.pix, state.y, 1, i/*, margin*/);
				checkSingleReaction(state.x, state.y + i * Levels.pix, 2, i/*, margin*/);
				checkSingleReaction(state.x, state.y - i * Levels.pix, 3, i/*, margin*/);
			}
			drawPart(offset + game.zoom(32), 0, state.x - width * i, state.y, width, height, clear, draw, 0, i);
			drawPart(offset + game.zoom(32), 0, state.x + width * i, state.y, width, height, clear, draw, 1, i);
			drawPart(offset + game.zoom(80), 0, state.x, state.y + height * i, width, height, clear, draw, 2, i);
			drawPart(offset + game.zoom(80), 0, state.x, state.y - height * i, width, height, clear, draw, 3, i);
		}
		if (draw) {
//			var margin = game.zoom(margins[0]);
			checkSingleReaction(state.x - size * Levels.pix, state.y, 0, i/*, margin*/);
			checkSingleReaction(state.x + size * Levels.pix, state.y, 1, i/*, margin*/);
			checkSingleReaction(state.x, state.y + size * Levels.pix, 2, i/*, margin*/);
			checkSingleReaction(state.x, state.y - size * Levels.pix, 3, i/*, margin*/);
		}
		drawPart(offset + game.zoom(16), 0, state.x - width * size, state.y, width, height, clear, draw, 0, i);
		drawPart(offset + game.zoom(48), 0, state.x + width * size, state.y, width, height, clear, draw, 1, i);
		drawPart(offset + game.zoom(64), 0, state.x, state.y + height * size, width, height, clear, draw, 2, i);
		drawPart(offset + game.zoom(96), 0, state.x, state.y - height * size, width, height, clear, draw, 3, i);
		game.levels.unclip();
	}
	function checkSingleReaction(x, y, offset, dist, margin) {
		var pos = game.levels.getBoardPos(x, y);
		var val = game.levels.getBoard(pos);
		if (offset != undefined) {
			var isStone = game.levels.isStone(val);
			var canExplode = game.levels.canExplode(val);
//			console.log("check at " + pos + " '" + val + "' " + isStone + ", " + canExplode);
			if (lane[offset] <= dist)
				return;
			if (isStone || canExplode) {
				lane[offset] = dist;
				if (canExplode)
					game.levels.explode(pos);
				return;
			}
		}
		checkSpriteReaction(x, y, margin);
		// die Distance muss gesetzt werden, um nicht mehrfach sprite.explode aufzurufen
		// das darf allerdings nur bei einem blinking Block (sprite.val) passieren!
		if (val instanceof Bomb || (val instanceof Block && val.val)) {
			lane[offset] = dist;
			val.explode();
		}
	}
	function checkSpriteReaction(x, y) {
		if (x < 0 || y < 0)
			return;
		var x1 = x + Levels.pix;// - (margin | 0);
		var y1 = y + Levels.pix;// - (margin | 0);
//		x += (margin | 0);
//		y += (margin | 0);
		for (var i = 0, n = game.sprites.length; i < n; i++) {
			var sprite = game.sprites[i];
			var state = sprite.state;
			if (sprite instanceof Bomb || sprite.armored)
				continue;
//			if (Levels.intersects(state.x, state.y, state.x + state.Width, state.y + state.Height, x, y, x1, y1)) {
			// sprite.state.Width and state.Height would be unfair
			if (Levels.intersects(state.x + 4, state.y + 5, state.x + Levels.pix, state.y + Levels.pix, x, y, x1, y1)) {
				sprite.explode();
			}
		}
	}
}

/**
 * Creates a block animation or an item.
 * 
 * @param {Game} game the game reference
 * @param {Number} x initial horizontal position
 * @param {Number} y initial vertical position
 * @param {Number} imageX horizontal starting position within the image containing the sprite
 * @param {Number} imageY vertical starting position within the image containing the sprite
 * @param anims the animations
 * 
 * @constructor
 * @base Sprite
 */
function Block(game, x, y, imageX, imageY, anims, dontRemoveBg) {
	Sprite.call(this, game, x, y, Levels.pix, Levels.pix, imageX, imageY, {
		anims: anims != undefined ? anims : {
			front: [0],
			explode: [1, 2, 3, 4, 5, 6, function(sprite) {
				sprite.remove();
			}]
		},
		delay: 100
	});
	// remove upper block image from background
	if (!dontRemoveBg)
		game.levels.clear(game.bgCtx, this.state.x, this.state.y);

	/*
	 * who is given as a special function for item blocks which can be taken by the player
	 */
	this.remove = function(who) {
		game.removeSprite(this.state);
    	var pos = game.levels.getBoardPos(this.state.x, this.state.y);
    	game.levels.removeBoard(pos);
    	// who.isRemote verhindert, dass alle gleichzeitig den Status des Remote-Boards setzen!
    	if (game.multiPlayer && (!who || !who.isRemote))
    		game.multiPlayer.setBoard(pos, who ? who.state : undefined);
		var x = this.state.x - game.offsetX/* + game.leftOffset*/;
		var y = this.state.y - game.offsetY;
		if (x + this.state.Width >= 0 && y + this.state.Height >= 0 && x < game.canvasWidth && y < game.canvasHeight) {
			game.levels.clear(game.ctx, x, y);
		}
	}

	/*
	 * a Block normally cannot "go". This is for the "setToRandomPos" to not choose
	 * a position a player or block is on.
	 */
	this.canGo = function(x, y) {
		for (var i = game.sprites.length - 1; i >= 0; i--) {
			var state = game.sprites[i].state;
			if (state.x == x && state.y == y) {
				return false;
			}
		}
		var pos = game.levels.getBoardPos(x, y);
		var val = game.levels.getBoard(pos);
		return game.levels.isEmpty(val);
	}
}
