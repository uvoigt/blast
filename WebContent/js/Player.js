/*
 * (c) Copyright 2016 Uwe Voigt
 * All Rights Reserved.
 */
"use strict";

/**
 * @param {Game} game
 * @param {Number} x the horizontal position
 * @param {Number} y the vertical position
 * @param {Number} color the player color
 * 
 * @constructor
 * @base Sprite
 */
function Player(game, x, y, color, lives) {
	this.bombSize = 1;
	this.bombNum = 1;
	this.currentBombNum = 0;

	function additionalAnims(anims, index, count) {
		var anim = anims[index];
		var offset = anim.offset;
		while (--count >= 0) {
			var a = game.clone(anim);
			a.offset = ++offset;
			anims.splice(++index, 0, a);
		}
	}

	/**
	 * Die Bomben in der Reihenfolge des Legens.
	 * Die Referenz currentBomb wird für das Überschreiten verwendet.
	 */
	var bombs = [];

	if (!lives)
		lives = 3;
	var self = this;

	var img = prepareImage(color);

	var canoeAnims = {
		front: [0],
		down: [0, 1, 0, 2],
		up: [3, 4, 3, 5],
		left: [{imageX: game.zoom(176), imageY: game.zoom(165), offset: 2, Width: game.zoom(31), Height: game.zoom(25)},
			{imageX: game.zoom(176), imageY: game.zoom(165), offset: 1, Width: game.zoom(31), Height: game.zoom(25)},
			{imageX: game.zoom(176), imageY: game.zoom(165), offset: 0, Width: game.zoom(31), Height: game.zoom(25)},
			{imageX: game.zoom(176), imageY: game.zoom(165), offset: 3, Width: game.zoom(31), Height: game.zoom(25)}],
		right: [{imageX: game.zoom(176), imageY: game.zoom(118), offset: 3, Width: game.zoom(31), Height: game.zoom(25)}
		        ]
	};
	additionalAnims(canoeAnims.left, 3, 4);

	Sprite.call(this, game, x ? x : 0, y ? y : 0, game.zoom(19), game.zoom(22), 0, 0, {
		anims : {
			front: [
			    {offset: 0, delay: 12000},
				{offset: 1, delay: 4500},
				{offset: 2, delay: 250},
				{offset: 3, delay: 250},
				{offset: 1, delay: 2500}
			],
			down: [ 0, 5, 0, 6 ],
			up : [ 7, 8, 7, 9 ],
			left: [ 10, 11, 10, 12 ],
			right: [ 13, 14, 13, 15 ],
			explode: [
				{imageY: game.zoom(22), offset: 0, Width: game.zoom(21), Height: game.zoom(22), delay: 300},
				{imageY: game.zoom(22), offset: 1, Width: game.zoom(21), Height: game.zoom(22)},
				function(sprite) { // death
					console.log("death: lives: " + lives + ", test: " + (window.Test && Test.run));
					if (lives < 1 && !(window.Test && Test.run)) {
						game.removeSprite(self.state);
						if (!self.isRemote)
							game.levels.endLevel(false, 1000);
					}
					// suppress calling it again
					sprite.front(true); 
				}
			],
			grilled: [{imageX: game.zoom(126), imageY: game.zoom(22), offset: 0, map: {left: 2, right: 3, down: 0, front: 0, up: 1}}],
			beam: [
				stepInTeleport, stepInTeleport,
				{imageX: game.zoom(48), imageY: game.zoom(44), offset: 0, Width: game.zoom(17), Height: game.zoom(20), delay: 150, centralize: true},
			       function() { game.nextLevel(undefined, true); }]
		},
		delay: 200
	}, 'front', img);
	additionalAnims(this.animation.anims.explode, 1, 4);
	additionalAnims(this.animation.anims.beam, 2, 17);

	this.reset = function() {
		this.bombNum = 1;
		this.bombSize = 1;
		this.speed = 1;
		this.armored = false;
		this.remoteBomb = false;
		this.walkOverBombs = false;
		this.walkOverStones = false;
		this.life(0, 3);
	}
	this.resetForLevel = function() {
		this.front(true);
//		this.direction = "beam"; // zum Testen der Levels
		this.currentBombNum = 0;
		bombs.length = 0;
	}
	this.life = function(inc, num) {
		if (inc || num) {
			lives = (inc ? lives + inc : num);
			console.log("lives: " + lives);
			if (!this.isRemote)
				game.getInfo().life(lives);
		}
		return lives;
	}

	this.canChangeDirection = function() {
		return this.direction != "beam"
			&& Sprite.prototype.canChangeDirection.call(this);
	}
	this.updateRemote = function() {
		if (game.multiPlayer && (this.state.oldx != this.state.x || this.state.oldy != this.state.y || this.state.olddir != this.state.direction)) {
			game.multiPlayer.setState(this.state);
			this.state.oldx = this.state.x;
			this.state.oldy = this.state.y;
			this.state.olddir = this.state.direction;
		}
	}
	this.setCanoe = function() {
		this.imageY = game.zoom(164);
		this.state.Width = game.zoom(29);
		this.state.Height = game.zoom(31);
		this.img = game.imgSprites;
		this.animation.anims = canoeAnims;
	}

	function getInWaterAnim(player, animate, moving) {
		if (!player.inWaterAnim) {
			player.inWaterAnim = [{img: game.imgSprites, imageX: game.zoom(405), imageY: game.zoom(57), offset: 0, Width: game.zoom(16), Height: game.zoom(22), centralize: true},
					{img: game.imgSprites, imageX: game.zoom(405), imageY: game.zoom(56), offset: 1, Width: game.zoom(16), Height: game.zoom(22), centralize: true},
					{img: game.imgSprites, imageX: game.zoom(405), imageY: game.zoom(56), offset: 2, Width: game.zoom(16), Height: game.zoom(22), centralize: true},
					{img: game.imgSprites, imageX: game.zoom(405), imageY: game.zoom(56), offset: 3, Width: game.zoom(16), Height: game.zoom(22), centralize: true},
					{img: game.imgSprites, imageX: game.zoom(405), imageY: game.zoom(56), offset: 4, Width: game.zoom(16), Height: game.zoom(22), centralize: true},
					];
			player.inWaterAnimOffset = 0;
			player.nextInWaterAnim = 0;
		}
		if (animate) {
			if (Date.now() > player.nextInWaterAnim) {
				player.nextInWaterAnim = Date.now() + (moving ? 50 : 250);
				if (++player.inWaterAnimOffset >= (moving ? 3 : player.inWaterAnim.length))
					player.inWaterAnimOffset = moving ? 0 : 3;
			}
		}
		return player.inWaterAnim[player.inWaterAnimOffset];
	}
	function getArmorAnim(player, animate) {
		if (!player.armorAnim) {
			player.armorAnim = [{img: game.imgSprites, imageX: game.zoom(404), imageY: game.zoom(22), offset: 0, Width: game.zoom(32), Height: game.zoom(32), centralize: true},
					{img: game.imgSprites, imageX: game.zoom(404), imageY: game.zoom(22), offset: 1, Width: game.zoom(32), Height: game.zoom(32), centralize: true}];
			player.armorAnimOffset = 0;
			player.nextArmorAnim = 0;
		}
		if (animate) {
			if (Date.now() > player.nextArmorAnim) {
				player.nextArmorAnim = Date.now() + 50;
				if (++player.armorAnimOffset >= player.armorAnim.length)
					player.armorAnimOffset = 0;
			}
		}
		return player.armorAnim[player.armorAnimOffset];
	}
	function getGrilledAnim(player) {
		if (Date.now() < player.nextGrilled) {
			if (player.grilledOn) {
				var anim = player.animation.anims['grilled'][0];
				anim.offset = anim.map[player.state.direction];
				return anim;
			} else {
				return null;
			}
		} else {
			player.nextGrilled = Date.now() + 100;
			player.grilledOn = !player.grilledOn;
		}
	}
	/*
	 * Das ist ein wenig kompliziert: wiederholtes Aufrufen von explode soll den Spieler nicht im State 'explode' lähmen,
	 * sondern die states sollen weiterhin änderbar sein bis zum finalen 'explode'.
	 */
	this.explode = function() {
		if (this.hurtTime || !this.canChangeDirection() || lives <= 0 || window.Test && Test.run)
			return;
		this.hurtTime = Date.now() + 1500;
		this.grilledOn = true;
		self.life(-1);
		if (game.multiPlayer && !self.isRemote)
			game.multiPlayer.decLife();
		if (lives < 1) {
			game.sound.playBurst(this.state);
			this.hurtTime = 0;
			this.state.x -= 1; // Korrektur, da die Explode-Anim etwas größer ist
			Sprite.prototype.explode.call(this);
		} else {
			game.sound.playElectric(this.state);
		}
	}
	this.clearBackground = function() {
		if (this.armored) {
			var anim = getArmorAnim(this);
			Sprite.prototype.clearBackground.call(this, anim);
		} else {
			Sprite.prototype.clearBackground.call(this);
		}		
	}
	this.draw = function() {
		if (this.hurtTime) {
			if (Date.now() > this.hurtTime) {
				this.hurtTime = 0;
			} else {
				var anim = getGrilledAnim(this);
				if (anim != null) {
					this.drawAnim(anim);
				} else {
					Sprite.prototype.draw.call(this);
				}
			}
		} else {
			Sprite.prototype.draw.call(this);
		}
		var notExplodeAndNotBeam = this.state.direction != 'explode' && this.state.direction != 'beam';
		if (this.armored && notExplodeAndNotBeam) {
			var anim = getArmorAnim(this, true);
			this.drawAnim(anim);
		}
		var currentLevelIndex = game.levels.currentLevelIndex();
		if (currentLevelIndex >= 14 && currentLevelIndex <= 20 && notExplodeAndNotBeam) {
			var anim = getInWaterAnim(this, true, this.state.direction != 'front');
			this.drawAnim(anim);
		}
	}
	this.canGo = function(x, y) {
		var result = true;
		var emptyCount = 0;
		var incx = game.zoom(1.5), incy = game.zoom(2.5);
		var width = this.state.Width - 1.3 * incx, height = this.state.Height - 1.5 * incy;
		var levels = game.levels;
		var statex, statey;

		switch (this.direction) {
		case 'left': // top left and bottom left
			checkAt(x + incx, y + incy, x + width, y + height, 0, -1);
			checkAt(x + incx, y + height, x + width, y - height, 0, 1);
			// test other side of the player rect if it is on top of a bomb
			if (this.currentBomb != undefined)
				checkAt(x + width, y + incy) && checkAt(x + width, y + height);
			break;
		case 'right': // top right and bottom right
			checkAt(x + width, y + incy, x - width, y + height, 0, -1);
			checkAt(x + width, y + height, x - width, y - height, 0, 1);
			if (this.currentBomb != undefined)
				checkAt(x + incx, y + incy) && checkAt(x + incx, y + height);
			break;
		case 'up': // top left and top right
			checkAt(x + incx, y + incy, x + width, y + height, -1, 0);
			checkAt(x + width, y + incy, x - width, y + height, 1, 0);
			if (this.currentBomb != undefined)
				checkAt(x + incx, y + height) && checkAt(x + width, y + height);
			break;
		case 'down': // bottom left and bottom right
			checkAt(x + incx, y + height, x + width, y - height, -1, 0);
			checkAt(x + width, y + height, x - width, y - height, 1, 0);
			if (this.currentBomb != undefined)
				checkAt(x + incx, y + incy) && checkAt(x + width, y + incy);
			break;
		}

		function checkAt(x1, y1, x2, y2, dx, dy) {
			var pos = levels.getBoardPos(x1, y1);
			var val = levels.getBoard(pos);
			if (levels.isEmpty(val)) {
				emptyCount++;

				if (dy)
					statey = dy;
				if (dx)
					statex = dx;
			} else if (x2 != undefined) {
				var isCurrentBomb = (val.originator === self || val.unfair) && val == self.currentBomb;
				var isBomb = val instanceof Bomb;
				var isStone = levels.isStone(val) || val.val; // val ist ein Property des blinking stone
				var isBlock = levels.isBlock(val);
				var canTake = levels.canTake(val) && !val.val;

				if (isBlock || isStone || isBomb || canTake) {

					var point = levels.getBoardPoint(pos);
					if (canTake || !isBlock && isStone && self.walkOverStones || isBomb && self.walkOverBombs) {
						var moveBeside = true;
						if (canTake && Levels.intersects(x1, y1, x2, y2, point.x + 3, point.y + 3, point.x + Levels.pix - 3, point.y + Levels.pix - 3)) {
							moveBeside = !levels.take(pos, self);
						}
						if (moveBeside) {
							if (dy)
								statey = dy;
							if (dx)
								statex = dx;
						}
						return true;
					}
					if (!isCurrentBomb &&
							(isBlock || isStone && !self.walkOverStones || isBomb && !self.walkOverBombs) &&
							Levels.intersects(x1, y1, x2, y2, point.x, point.y, point.x + Levels.pix, point.y + Levels.pix)) {
						result = false;
					}
				}
			}
			return result;
		}
		if (emptyCount == 4 && this.currentBomb != undefined) {
			this.currentBomb = undefined;
		}
		if (!result) {
			if (statex) {
				this.state.x += statex;
				this.direction = statex < 0 ? 'left' : 'right';
			}
			if (statey) {
				this.state.y += statey;
				this.direction = statey < 0 ? 'up' : 'down';
			}
		}
		return result;
	}
	this.putBomb = function(pPos, size) {
		var pos = pPos;
		if (pPos == undefined) {
			var x = this.state.x + this.state.Width / 2;
			var y = this.state.y + this.state.Height / 2;
			pos = game.levels.getBoardPos(x, y);
		}
		var val = game.levels.getBoard(pos);
		if (game.levels.isEmpty(val) && this.currentBomb == undefined && (this.currentBombNum < this.bombNum || pPos != undefined)) {
			var point = game.levels.getBoardPoint(pos);
			var bomb = new Bomb(game, this, point.x, point.y, size ? size : this.bombSize, this.remoteBomb);
			game.sprites.push(bomb);
			game.levels.putBoard(pos, bomb);
			this.currentBomb = bomb;
			this.currentBombNum++;
			bombs.push(bomb);
			if (game.multiPlayer && pPos == undefined)
				game.multiPlayer.putBomb(pos, this.bombSize);
		}
	}
	this.removeBomb = function() {
		return bombs.shift();
	}
	this.detonate = function() {
		if (bombs.length > 0 && bombs[0].isRemoteBomb())
			bombs[0].explode();
	}

	this.setToRandomPos = function () {
		var levels = game.levels;
		function enemyInDistance(x, y, distance) {
			for (var i = 0; i < game.sprites.length; i++) {
				var sprite = game.sprites[i];
				if (!sprite.isEnemy)
					continue;
				if (Math.abs(sprite.state.x - x) < distance * Levels.pix && Math.abs(sprite.state.y - y) < distance * Levels.pix)
					return true;
			}
			return false;
		}
		function canCrossBorder(x, y) {
			// in jede Richtung, entweder ein oder zwei Felder und dann im rechten Winkel weg
			var directions = [-1, 0, 1, 0, 0, -1, 0, 1];
			for (var i = 0; i < 4; i++) {
				for (var j = 1; j < 3; j++) {
					var path = PathFinder.getInstance().find(x, y, x + j * directions[2 * i], y + j * directions[((2 * i) ^ 4 ) + 1]);
					if (path != null)
						return true;
				}
			}
			return false;
		}
		(function randomPos() {
			/*
			 * der Spieler muss selbst auf einer freien Position stehen
			 * der nächste Feind muss mindestens 3 Felder entfernt sein
			 * der Spieler muss mindestens um die Ecke gehen können.
			 */
			var pos = levels.getBoardPos(~~(Math.random() * Math.min(game.canvasWidth, levels.boardWidth() * Levels.pix)),
					~~(Math.random() * Math.min(game.canvasHeight, levels.boardHeight() * Levels.pix)));
			var point = levels.getBoardPoint(pos);
			if (levels.isEmpty(levels.getBoard(pos)) &&
					!enemyInDistance(point.x, point.y, 3) &&
					canCrossBorder(point.x, point.y)) {
				self.state.x = point.x - game.zoom(1.5);
				self.state.y = point.y - game.zoom(2.5);
			} else {
				randomPos();
			}
		})();
	}

	this.setPlayerColor = function(color) {
		img = prepareImage(color, img);
	}

	function animateTeleport() {
		if (++self.teleport.prevOffset >= self.animation.anims[self.teleport.prevDir].length)
			self.teleport.prevOffset = 0;

		var difx = (self.teleport.state.x - game.zoom()) - self.state.x;
		var dify = (self.teleport.state.y - game.zoom(2)) - self.state.y;
		var adifx = Math.abs(difx);
		var adify = Math.abs(dify);
		// a bit faster than one pixel
		var offx = (adifx / difx) * (adifx > 1 ? 2 : 1);
		var offy = (adify / dify) * (adify > 1 ? 2 : 1);
		if (offx)
			self.state.x += offx;
		if (offy)
			self.state.y += offy;
	}
	function stepInTeleport() {
		var state = self.state;
		var teleport = self.teleport;
		// move into teleport
		if (state.x != teleport.state.x - game.zoom() || state.y != teleport.state.y - game.zoom(2)) {
			if (self.animate != animateTeleport) {
				teleport.prevAnimate = self.animate;
				self.animate = animateTeleport;
			}
			state.animOffset = 0;
			var anim = self.animation.anims[teleport.prevDir][teleport.prevOffset];
			self.drawAnim(anim);
		} else {
			// start anim
			game.sound.playPort();
			teleport.remove();
			self.animate = teleport.prevAnimate;
			delete self.teleport;
			state.animOffset = 2;
			state.y -= game.zoom();
			state.x -= 1;
		}
	}

	function prepareImage(color, img) {
		if (img && img.color == color)
			return img;

		var sourcePx = [0xF3F3F3,0xB2B2B2,0xD3D3D3,0x929292,0x4C4C4C/*,0xF300B2*/];

		var width = game.zoom(354), height = game.zoom(80); // reserve extra 16 pixels in height
		var canvas = img ? img : document.createElement(Constants.CANVAS);
		canvas.width = width;
		canvas.height = height;
		canvas.color = color;
		var ctx = canvas.getContext('2d');

		ctx.drawImage(game.imgSprites, 0, game.zoom(16), width, height, 0, 0, width, height);
		// extra image (teleport)
		ctx.drawImage(game.imgSprites, 0, game.zoom(62), Levels.pix, Levels.pix, 0, game.zoom(64), Levels.pix, Levels.pix);
		var imageData = ctx.getImageData(0, 0, width, height);

		game.colorizeImage(sourcePx, imageData.data, color);
		ctx.putImageData(imageData, 0, 0);
		return canvas;
	}
}
