/*
 * (c) Copyright 2016 Uwe Voigt
 * All Rights Reserved.
 */
"use strict";

/**
 * @param {Game} game
 */
function Levels(game) {
	var self = this;
	var board = {b: [], w: 0, h: 0};
	var clip;
	var pix = Levels.pix = game.zoom(16);

	// since the gradient painted relative to the position which as aligned to offsetX and offsetY
	// a separate bgImage must be filled and painted back to the original background afterwards
	var extraBgCanvas = document.createElement(Constants.CANVAS);
	extraBgCanvas.width = game.canvasWidth;
	extraBgCanvas.height = game.canvasHeight;
	var extraBgCtx = extraBgCanvas.getContext('2d');

	var currentLevel;
	var currentLevelIndex = -1;

	this.reset = function() {
		currentLevelIndex = -1;//13;
		// this is for testing
		for (var i = 0; i < currentLevelIndex; i++) {
			var sprite = {remove: function() {}};
			var level = allLevels[i];
			createDynamicItems(level);
			for (var p in level.items) {
				if (p == 'E')
					continue;
				var item = items[items[p].below];
				item.take.call(sprite, game.getPlayer());
			}
		}
	}
	this.updateBoard = function(updatedItems) {

		// get the current bombs
		var bombs;
		var sprites = game.sprites;
		for (var i = sprites.length - 1; i >= 0; i--) {
			var sprite = sprites[i];
			if (sprite instanceof Bomb) {
				if (!bombs)
					bombs = [];
				bombs.push(sprite);
			}
		}

		for (var i = 0; i < updatedItems.length; i++) {
			var updatedItem = updatedItems[i];
			var pos = updatedItem.p;
			var val = updatedItem.v;
			var prevVal = this.getBoard(pos);
			var point = this.getBoardPoint(pos);

			var deleteAgain = false;
			if (this.isEmpty(prevVal)) {

				// wir dürfen keine neuen Steine in den Streubereich von Bomben legen, da sonst
				// die Längen-Detection (lane) der Bombe durcheinander kommt
				if (bombs) {
					for (var j = 0; j < bombs.length; j++) {
						var bomb = bombs[j];
						if (bomb.isInRange(point.x, point.y)) {
							deleteAgain = true;
							console.log("updated value at " + pos + " is in range of bomb " + bomb);
							break;
						}
					}
				}

				if (!deleteAgain) {
					this.putBoard(pos, val);
					var item = items[val];
					drawItem(game.bgCtx, item, point.x, point.y);
					var x = point.x - game.offsetX;
					var y = point.y - game.offsetY;
					if (x + pix >= 0 && y + pix >= 0 && x < game.canvasWidth && y < game.canvasHeight) {
						drawItem(game.ctx, item, x, y);
					}
				}
			} else {
				deleteAgain = true;
				console.log("updated value at " + pos + " not empty! " + prevVal.constructor.name);
			}
			if (deleteAgain) {
				// leider muss die Position zurückgemeldet werden, ansonsten bleibt der Stein im Server-Level
				this.putBoard(pos, currentLevel.empty);
				game.multiPlayer.setBoard(pos);
			}
		}
		console.log("updated values: " + JSON.stringify(updatedItems));
		if (window.Test && Test.run) {
			Test.stop();
			setTimeout(Test.loop, 500);
		}
	}
	this.boardWidth = function() {
		return board.w;
	}
	this.boardHeight = function() {
		return board.h;
	}
	this.currentLevelIndex = function() {
		return currentLevelIndex;
	}

	/**
	 * Iterates over the board
	 * 
	 * @param {Function} doit the iterator with val, pos as argument, if it returns true, the iterator is stopped
	 * @param {Boolean} includingBorder true if the first and last row should be iterated as well
	 */
	/*this.forEach = function(doit, includingBorder) {
		for (var i = includingBorder ? 0 : board.w, n = includingBorder ? board.b.length : board.b.length - board.w; i < n; i++) {
			if (doit(board.b[i], i))
				break;
		}
	}*/
	this.addBoard2Msg = function(msg) {
		msg.board = game.clone(board);
		// die board meta daten sind eigentlich nur für den Server-Game-Rebuild
		// setRandomPosition sollte im Client erfolgen, wobei erst nach diesem Setzen ein weiterer Server-Handshake
		// mit entergame-Message an erfolgen kann.
		msg.board.e = currentLevel.empty;
		msg.board.x = currentLevel.block;
		msg.board.s = currentLevel.stone;

		msg.board.i = currentLevelIndex;
		delete msg.board.time; 
		delete msg.board.message; 
		return msg;
	}

	function Level(width, height, imageOffset, enemies, items, time, message, borderType, stoneDefs, noExit, numStones, init) {
		if (!stoneDefs) {
			this.empty = ' ';
			this.block = 'x';
			this.stone = 's';
		} else {
			this.empty = stoneDefs.empty;
			this.block = stoneDefs.block;
			this.stone = stoneDefs.stone;
		}
		this.Width = width;
		this.Height = height;
		this.imageOffset = imageOffset;
		this.stones = numStones !== undefined ? numStones : width * height / 7;
		this.enemies = enemies;
		this.items = items;
		this.time = time ? time : 300;
		this.message = message;
		this.borderType = borderType;
		if (!noExit)
			this.items.E = 1;
		this.init = init;
	}

	var allLevels = [
	/*0*/			new Level(19, 19, 0, {Drob: 5 }, { F: 1 }, 240, Messages.get(Messages._13)), // Item: Fire
	/*world 1*/		new Level(19, 19, 0, {Drob: 5, Blob: 1 }, { B: 1 }, 240), // Item: Bomb
	/*min: 5*/		new Level(19, 19, 0, {Drob: 5, Blob: 1 }, { R: 1 }, 240), // Item: Running shoe
	/*max: 17*/		new Level(19, 19, 0, {Drob: 5, Blob: 2, Frog: 1 }, { M: 1 }, 240), // Remote bomb
					new Level(19, 39, 0, {Drob: 7, Blob: 3, Frog: 2 }, { N: 1 }), // Item: walk over bombs
					new Level(19, 39, 0, {Drob: 8, Blob: 4, Frog: 3 }, { L: 1 }), // Item: Life
					new Level(19, 39, 0, {Drob: 8, Blob: 4, Frog: 3, Bear: 1, Schlapper: 1 }, { O: 1 }), // Item: walk over stones

//					new Level(19, 19, 0, {Drob: 1}, { }, 120, "Win the race!", 0, { empty: 'w', block: 'x' }, true, 0, function() {
//						game.getPlayer().setCanoe();
//					}),

	/*7*/			new Level(39, 19, 1, {Frog: 4, Bird: 2, Crocodile: 4, BlueDrop: 3 }, { F: 1 }, undefined, Messages.get(Messages._14)), // Item: Fire
	/*world 2*/		new Level(19, 39, 1, {Frog: 4, Bird: 2, Crocodile: 4, BlueDrop: 4 }, { Q: 1 }), // Item: Armor
	/*min: 13*/		new Level(39, 19, 1, {Frog: 4, Bird: 2, Crocodile: 5, BlueDrop: 4, Bear: 1 }, { R: 1 }), // Item: Running shoe
	/*max: 22*/		new Level(19, 39, 1, {Frog: 4, Bird: 3, Crocodile: 5, BlueDrop: 4, Schlapper: 1, Bear: 1 }, { N: 1 }), // Item: walk over bombs
					new Level(39, 19, 1, {Frog: 5, Bird: 3, Crocodile: 5, BlueDrop: 4, Schlapper: 2 , Bear: 2 }, { M: 1 }), // Item: Remote bomb
					new Level(29, 29, 1, {Frog: 5, Bird: 3, Crocodile: 5, BlueDrop: 4, Schlapper: 2 , Bear: 3 }, { L: 1 }), // Item: Life
					new Level(29, 29, 1, {Frog: 5, Bird: 3, Crocodile: 5, BlueDrop: 4, Schlapper: 2 , Bear: 3 }, { O: 1 }), // Item: Walk over stones

	/*14*/			new Level(19, 39, 2, {Frog: 4, Bird: 2, Fish: 4, BlueGhost: 2, Bear: 2 }, {B: 1}, undefined, Messages.get(Messages._15), 1), // Item: Bomb
	/*world 3*/		new Level(39, 19, 2, {Frog: 4, Bird: 2, Fish: 4, BlueGhost: 2, Bear: 2 }, {N: 1}, undefined, undefined, 1), // Item: walk over Bombs
	/*min: 14*/		new Level(39, 19, 2, {Frog: 4, Bird: 2, Fish: 4, BlueGhost: 2, Schlapper: 1, Bear: 2 }, {Q: 1}, undefined, undefined, 1), // Item: Armor
	/*max: 25*/		new Level(19, 39, 2, {Frog: 4, Bird: 3, Fish: 4, BlueGhost: 2, Schlapper: 1, Bear: 2 }, {M: 1}, undefined, undefined, 1), // Item: Remote bomb
					new Level(39, 19, 2, {Frog: 5, Bird: 3, Fish: 5, BlueGhost: 3, Schlapper: 2, Bear: 2 }, {L: 1}, undefined, undefined, 1), // Item: Life
					new Level(29, 29, 2, {Frog: 5, Bird: 3, Fish: 5, BlueGhost: 4, Schlapper: 3, Bear: 3 }, {R: 1}, undefined, undefined, 1), // Item: Running shoe
					new Level(29, 29, 2, {Frog: 6, Bird: 4, Fish: 5, BlueGhost: 4, Schlapper: 3, Bear: 3 }, {O: 1}, undefined, undefined, 1), // Item: walk over Stones

	/*21*/			new Level(19, 39, 5, {Frog: 4, Bird: 2, Smiley: 4, Insect: 3, Bear: 2 }, { B: 1 }, undefined, Messages.get(Messages._16)), // Item: Bomb
	/*world 4*/		new Level(39, 19, 5, {Frog: 4, Bird: 2, Smiley: 4, Insect: 3, Bear: 2 }, { L: 1 }), // Item: Life
	/*min: 15*/		new Level(39, 19, 5, {Frog: 4, Bird: 2, Smiley: 4, Insect: 3, Bear: 2 }, { N: 1}), //  Item: walk over Bombs
	/*max: 26*/		new Level(19, 39, 5, {Frog: 4, Bird: 3, Smiley: 4, Insect: 3, Schlapper: 1, Bear: 3 }, {M: 1}), // Item: Remote bomb
					new Level(19, 39, 5, {Frog: 5, Bird: 3, Smiley: 4, Insect: 3, Schlapper: 2, Bear: 3 }, {F: 1}), // Item: Fire
					new Level(29, 29, 5, {Frog: 5, Bird: 3, Smiley: 5, Insect: 4, Schlapper: 2, Bear: 3 }, {O: 1}), // Item: walk over Stones
					new Level(29, 29, 5, {Frog: 6, Bird: 4, Smiley: 5, Insect: 4, Schlapper: 3, Bear: 4 }, {B: 1}), // Item: Bomb
					// im Original verliert der Spieler beim Tod, Remote-Bomb und die Walk-Over-Eigenschaften... hier ist das erstmal nicht so

	/*28*/			new Level(39, 19, 6, {Frog: 4, Bird: 2, Duck: 3, Cat: 5, Bear: 2 }, {N: 1}, undefined, Messages.get(Messages._17)), // Item: walk over Bombs
	/*world 5*/		new Level(39, 19, 6, {Frog: 4, Bird: 2, Duck: 3, Cat: 6, Bear: 3 }, {F: 1}), // Item: Fire
	/*min: 16*/		new Level(19, 39, 6, {Frog: 4, Bird: 2, Duck: 3, Cat: 6, Schlapper: 1, Bear: 3 }, {Q: 1}), // Item: Armor
	/*max: 27*/		new Level(39, 19, 6, {Frog: 4, Bird: 3, Duck: 3, Cat: 6, Schlapper: 1, Bear: 3 }, {B: 1}), // Item: Bomb
					new Level(39, 19, 6, {Frog: 5, Bird: 3, Duck: 4, Cat: 6, Schlapper: 1, Bear: 3 }, {M: 1}), // Item: Remote bomb
					new Level(29, 29, 6, {Frog: 5, Bird: 3, Duck: 5, Cat: 6, Schlapper: 2, Bear: 3 }, {O: 1}), // Item: walk over Stones
					new Level(29, 29, 6, {Frog: 6, Bird: 4, Duck: 5, Cat: 6, Schlapper: 3, Bear: 3 }, {L: 1}), // Item: Life

	/*35*/			new Level(39, 19, 7, {Frog: 4, Bird: 2, Kreisel: 4, Ghost: 4, Bear: 3 }, {B: 1}, undefined, Messages.get(Messages._18)), // Item: Bomb
	/*world 6*/		new Level(19, 39, 7, {Frog: 4, Bird: 2, Kreisel: 4, Ghost: 4, Bear: 4 }, {N: 1}), // Item: walk over bombs
	/*min: 17*/		new Level(39, 19, 7, {Frog: 4, Bird: 2, Kreisel: 4, Ghost: 4, Schlapper: 2, Bear: 4 }, {F: 1}), // Item: Fire
	/*max: 29*/		new Level(39, 19, 7, {Frog: 4, Bird: 3, Kreisel: 5, Ghost: 4, Schlapper: 2, Bear: 4 }, {B: 1}), // Item: Bomb
					new Level(19, 39, 7, {Frog: 5, Bird: 3, Kreisel: 5, Ghost: 4, Schlapper: 2, Bear: 4 }, {F: 1}), // Item: Fire
					new Level(29, 29, 7, {Frog: 5, Bird: 3, Kreisel: 6, Ghost: 4, Schlapper: 3, Bear: 4 }, {L: 1}), // Item: Life
					new Level(29, 29, 7, {Frog: 6, Bird: 4, Kreisel: 6, Ghost: 4, Schlapper: 4, Bear: 4, BigGhost: 1 }, {M: 1}), // Item: Remote bomb
					// der BigGhost ist eigentlich im BossLevel

	/*42*/			new Level(39, 19, 4, {Frog: 4, Bird: 2, Kegel: 4, Goblin: 4, Schlapper: 1, Bear: 3 }, {B: 1}, undefined, Messages.get(Messages._19)), // Item: Bomb
	/*world 7*/		new Level(19, 39, 4, {Frog: 4, Bird: 2, Kegel: 4, Goblin: 4, Schlapper: 1, Bear: 4 }, {L: 1}), // Item: Life
	/*min: 18*/		new Level(19, 39, 4, {Frog: 4, Bird: 2, Kegel: 4, Goblin: 4, Schlapper: 2, Bear: 4 }, {N: 1}), // Item: walk over Bombs
	/*max: 30*/		new Level(39, 19, 4, {Frog: 4, Bird: 3, Kegel: 5, Goblin: 4, Schlapper: 2, Bear: 4 }, {M: 1}), // Item: Remote bomb
					new Level(39, 19, 4, {Frog: 5, Bird: 3, Kegel: 5, Goblin: 4, Schlapper: 2, Bear: 4 }, {L: 1}), // Item: Life
					new Level(29, 29, 4, {Frog: 5, Bird: 3, Kegel: 6, Goblin: 5, Schlapper: 3, Bear: 4 }, {B: 1}), // Item: Bomb
					new Level(29, 29, 4, {Frog: 6, Bird: 4, Kegel: 7, Goblin: 5, Schlapper: 4, Bear: 4 }, {O: 1}), // Item: walk over Stones

	/*49*/			new Level(39, 19, 3, {Drob: 3, BlueDrop: 3, Frog: 5, Bird: 3, Schlapper: 2, Bear: 5 }, {L: 1}, undefined, Messages.get(Messages._20)), // Item: Life
	/*world 8*/		new Level(39, 19, 3, {Drob: 3, BlueDrop: 3, Frog: 5, Bird: 3, Schlapper: 2, Bear: 5, Coin: 2 }, {F: 1}), // Item: Fire
	/*min: 21*/		new Level(19, 39, 3, {Drob: 3, BlueDrop: 3, Frog: 5, Bird: 3, Schlapper: 2, Bear: 5, Coin: 2 }, {N: 1}), // Item: walk over Bombs
	/*max: 36*/		new Level(39, 19, 3, {Drob: 4, BlueDrop: 4, Frog: 5, Bird: 4, Schlapper: 2, Bear: 5, Coin: 2 }, {M: 1}), // Item: Remote bomb
					new Level(39, 19, 3, {Drob: 4, BlueDrop: 4, Frog: 6, Bird: 4, Schlapper: 2, Bear: 5, Coin: 2 }, {B: 1}), // Item: Bomb
					new Level(29, 29, 3, {Drob: 5, BlueDrop: 5, Frog: 6, Bird: 4, Schlapper: 3, Bear: 5, Coin: 2 }, {L: 1}), // Item: Life
					new Level(29, 29, 3, {Drob: 6, BlueDrop: 6, Frog: 7, Bird: 5, Schlapper: 4, Bear: 6, Coin: 2 }, {N: 1}), // Item: walk over bombs
					//
	/*56*/		//	new Level(19, 19, 1, { Drob: 5 }, { B: 1, F: 1, R: 1 }, 180, undefined, undefined, { empty: 'w', block: 'x', stone: 'i' })
					//
	];

	function createDynamicItems(level) {
		// dynamically update these items
		items[' '].imagex = 0;
		items[' '].imagey = adjustLevelImage(level, 0);
		items.s.imagex = game.zoom(128);
		items.s.imagey = adjustLevelImage(level, 16);
		
		items.x.imagex = game.zoom(48);
		items.x.imagey = adjustLevelImage(level, 0);
		
		items.F = { referrer: items[level.stone], below: 'f', highlight: true }; // stone with fire
		items.B = { referrer: items[level.stone], below: 'b', highlight: true }; // stone with bomb
		items.R = { referrer: items[level.stone], below: 'r', highlight: true }; // stone with normal running shoe
		items.Y = { referrer: items[level.stone], below: 'y', highlight: true }; // stone with extreme running shoe
		items.L = { referrer: items[level.stone], below: 'l', highlight: true }; // life
		items.M = { referrer: items[level.stone], below: 'm', highlight: true }; // remote bomb
		items.N = { referrer: items[level.stone], below: 'n', highlight: true }; // walk over bombs
		items.O = { referrer: items[level.stone], below: 'o', highlight: true }; // walk over stones
		items.Q = { referrer: items[level.stone], below: 'q', highlight: true }; // armor
		items.E = { referrer: items[level.stone], below: 'e' }; // stone with exit
	}

	var itemAnim = {front: [fade], explode: [function(sprite) {
		game.sound.playPlop(sprite.state);
		sprite.remove();
	}]};

	function fade(sprite) {
		if (Date.now() > sprite.fadeTime || sprite.fadeTime == undefined) {
			sprite.fadeTime = Date.now() + 10;
			if (sprite.alpha == undefined) {
				sprite.alpha = 1;
				sprite.alphaDir = -0.01;
			} else {
				sprite.alpha += sprite.alphaDir;
			}
			if (sprite.alpha <= 0.1) {
				sprite.alphaDir = 0.01;
			} else if (sprite.alpha >= 1) {
				sprite.alphaDir = -0.01;
			}
		}
		game.ctx.globalAlpha = sprite.alpha;
		sprite.drawAnim(0);
		game.ctx.globalAlpha = 1;
	}

	var items = {
			'x': { }, // side wall
			'X': { imagex: game.zoom(185), imagey: game.zoom(114)}, // side wall multiplayer
			's': { canExplode: true }, // stones that can explode
			'S': { imagex: game.zoom(201), imagey: game.zoom(114), canExplode: true }, // stones that can explode multiplayer
			'p': { imagex: game.zoom(185), imagey: game.zoom(82) }, // palm
			'i': { imagex: game.zoom(331)/*201*/, imagey: game.zoom(82), blinkx: game.zoom(315), canExplode: true }, // island
			'f': { imagex: game.zoom(185), imagey: game.zoom(130), anim: itemAnim,
				take: function(who) {
					who.bombSize++;
					return takeItem(this, who);
				}}, // fire
			'b': { imagex: game.zoom(201), imagey: game.zoom(130), anim: itemAnim,
				take: function(who) {
					who.bombNum++;
					return takeItem(this, who);
				}}, // bomb
			'y': { imagex: game.zoom(217), imagey: game.zoom(130), anim: itemAnim,
				take: function(who) {
					if (!who.isRemote)
						game.increaseSpeed();
					return takeItem(this, who);
				}}, // extreme running shoe
			'r': { imagex: game.zoom(201), imagey: game.zoom(146), anim: itemAnim,
				take: function(who) {
					who.speed++;
					if (!who.isRemote)
						game.increaseSpeed(30);
					return takeItem(this, who);
				}}, // normal running shoe
			'l': { imagex: game.zoom(185), imagey: game.zoom(146), anim: itemAnim,
				take: function(who) {
					game.getPlayer().life(1);
					return takeItem(this, who);
				}}, // life
			'm': { imagex: game.zoom(217), imagey: game.zoom(146), anim: itemAnim,
				take: function(who) {
					who.remoteBomb = true;
					return takeItem(this, who);
				}}, // remote bomb
			'n': { imagex: game.zoom(137), imagey: game.zoom(146), anim: itemAnim,
				take: function(who) {
					who.walkOverBombs = true;
					return takeItem(this, who);
				}}, // walk over bombs
			'o': { imagex: game.zoom(153), imagey: game.zoom(146), anim: itemAnim,
				take: function(who) {
					who.walkOverStones = true;
					return takeItem(this, who);
				}}, // walk over stones
			'q': { imagex: game.zoom(169), imagey: game.zoom(146), anim: itemAnim,
				take: function(who) {
					who.armored = true;
					return takeItem(this, who);
				}}, // armor
			' ': { }, // empty
			'_': { imagex: game.zoom(169), imagey: game.zoom(114) }, // plain multiplayer background
			'w': { imagex: game.zoom(153), imagey: game.zoom(82) }, // water
			'e': { imagex: game.zoom(121), imagey: game.zoom(130),
				explode: function() {
					checkLast(this);
				}, anim: {front: [0, 1, 2, 1], explode: [function(sprite) {
						sprite.front(true);
						self.spawnEnemies(sprite);
					}], grow: [
					{imageX: game.zoom(249), imageY: game.zoom(130), offset: 0, Width: game.zoom(16), Height: game.zoom(20), delay: 150, centralize: true},
					{imageX: game.zoom(249), imageY: game.zoom(130), offset: 1, Width: game.zoom(16), Height: game.zoom(20), delay: 150, centralize: true},
					{imageX: game.zoom(249), imageY: game.zoom(130), offset: 2, Width: game.zoom(16), Height: game.zoom(20), delay: 150, centralize: true},
					{imageX: game.zoom(249), imageY: game.zoom(130), offset: 3, Width: game.zoom(16), Height: game.zoom(20), delay: 150, centralize: true},
					function(sprite) {
						sprite.state.animOffset--;
						sprite.draw();
					}]},
				take: function(who) {
					if (!isLevelClean())
						return false;
					self.removeBoard(self.getBoardPos(this.state.x, this.state.y));
					var index = game.sprites.indexOf(this);
					game.sprites.splice(index, 1);
					game.sprites.splice(0, 0, this);
					game.gameState(game.gameState() & 0xfff5); // disable keys and stop timer
					who.teleport = this;
					who.teleport.prevDir = who.direction;
					who.teleport.prevOffset = who.state.animOffset;
					who.direction = "beam";
					this.direction = "grow";
					this.canChangeDirection = function() {
						return this.direction != 'grow';
					}
					return true;
				}}, // exit
	};

	function takeItem(sprite, who) {
		game.sound.playTake(sprite.state);
		sprite.remove(who);
		return true;
	}

	/*
	 * nicht clip, da es sonst ein name-clash mit ctx.clip gibt (prop-mangling) 
	 */
	this.doclip = function() {
		if (clip) {
			game.ctx.save();
			game.ctx.beginPath();
			game.ctx.rect(clip.x, clip.y, clip.w, clip.h);
			game.ctx.clip();
		}
	}
	this.unclip = function() {
		if (clip) {
			game.ctx.restore();
		}
	}
	this.next = function(_board) {
		if (++currentLevelIndex >= allLevels.length) {
			setTimeout(bomberChamp, 2000);
			board.w = game.canvasWidth / pix;
			board.h = game.canvasHeight / pix;
			board.end = true;
			return board;
		}
		if (_board) {
			if (_board.i !== undefined)
				currentLevel = allLevels[_board.i];
			else // dann ist es das Server-Level
				currentLevel = { empty: _board.e, block: _board.x, stone: _board.s };
			board = _board;
		} else {
			currentLevel = allLevels[currentLevelIndex];
			var player = game.getPlayer();
			player.armored = false;

			if (!board.message)
				board.message = [];
			else
				board.message.length = 0;

			if (currentLevel.message) {
				var msg = currentLevel.message.split(/\n/);
				for (var i = 0; i < msg.length; i++) {
					board.message.push(msg[i]);
				}
				// beim Beginn einer Welt werden einige Items zurückgesetzt
				player.remoteBomb = false;
				player.walkOverBombs = false;
				player.walkOverStones = false;
			}
			board.message.push(Messages.get(Messages._12, currentLevelIndex + 1));
			fillBoard(currentLevel);
		}
		createDynamicItems(currentLevel);
		if (currentLevel.init) {
			currentLevel.init();
		}

		return board;
	}
	this.init = function() {
		// das ist eigentlich nur zum Testen der bomberChamp-message
		if (!currentLevel)
			return;
		for (var e in currentLevel.enemies) {
			var num = currentLevel.enemies[e];
			for (var i = 0; i < num; i++) {
				var sprite = new enemiesLocal[e](game);
				game.sprites.push(sprite);
			}
		}
	}

	function fillBoard(level) {
		if (level.empty == undefined || level.block == undefined ||
				level.stones == undefined || level.enemies == undefined ||
				level.time == undefined)
			throw "incorrect level definition";

		board.w = level.Width;
		board.h = level.Height;
		board.time = level.time;
		board.b.length = 0;
		var array = board.b;
		for (var i = 0; i < level.Width; i++) {
			for (var j = 0; j < level.Height; j++) {
				var pos = j * level.Width + i;
				// levels.stones ist der Indikator für ein leeres Level
				if ((level.stones > 0 && j % 2 == 0 && i % 2 == 0)
						|| j == 0 || j == level.Height - 1
						|| i == 0 || i == level.Width -1) {
					array[pos] = level.block;
				} else {
					array[pos] = level.empty;
				}
			}
		}

		for (var i = 0; i < level.stones; i++) {
			do {
				var pos = ~~(Math.random() * (array.length - 2 * level.Width)) + level.Width;
			} while (array[pos] != level.empty);
			array[pos] = level.stone;
		}

		var items = game.clone(level.items);
		for (var item in items) {
			for (var j = items[item]; j > 0; j--) {
				if (level.stones > 0) {
					var pos = 0;
					while (array[pos] != level.stone) {
						pos = ~~(Math.random() * array.length);
					}
					array[pos] = item;
				}
			}
		}
	}
	function isLevelClean() {
		var clean = true;
		for (var i = 0; i < game.sprites.length; i++) {
			if (game.sprites[i].isEnemy)
				clean = false;
		}
		return clean;
	}
	this.checkLevelClean = function() {
		if (isLevelClean()) {
			highlightItems();
		}
	}

	function checkLast(last) {
		for (var i = 0; i < board.b.length; i++) {
			var val = board.b[i];
			if (val == currentLevel.block || val == currentLevel.empty || val == last || val instanceof Bomb)
				continue;
			return;
		}
		if (!isLevelClean())
			return;
		var block = new Block(game, 0, 0, game.zoom(233), game.zoom(130), itemAnim, true);
		block.take = function(who) {
			game.getInfo().score(500);
			return takeItem(this, who);
		}
		var point = block.setToRandomPos();
		var pos = self.getBoardPos(point.x, point.y);
		self.putBoard(pos, block);
		game.sprites.push(block);
	}

	function highlightItems() {
		var blinkAnim = {front: [0, 1], explode: [function(sprite) {
			if (sprite.val) {
				sprite.remove();
				internalExplode(sprite.val, self.getBoardPos(sprite.state.x, sprite.state.y));
				sprite.val = undefined;
			}
		}]};
		for (var i = 0; i < board.b.length; i++) {
			var val = board.b[i];
			var item = items[val];
			if (self.isStone(val) && item.highlight) {
				var point = self.getBoardPoint(i);
				// TODO item.blinkx berücksichtigen. z.Z. wird das nur von der Insel verwendet
				var block = new Block(game, point.x, point.y, item.referrer.imagex, item.referrer.imagey, blinkAnim);
				block.animation.delay = 400;
				// dies ist nur, damit der Block wie ein Block-Item behandelt wird, z.B. beim schräg dagegenstoßen
				block.take = function() { };
				block.val = val; // TODO deploy.props
				self.putBoard(i, block);
				game.sprites.push(block);
			}
		}
	}

	this.spawnEnemies = function(block) {
		if (block.enemiesSpawned)
			return;
		block.enemiesSpawned = true;
		setTimeout(function() {
			var enemies = [Schlapper, Coin, Bear, Bird, Frog];
			var enemy = enemies[~~(Math.random() * enemies.length)];
			for(var i = 0; i < 4; i++) {
				var sprite = new enemy(game);
				sprite.state.x = block.state.x;
				sprite.state.y = block.state.y;
				game.sprites.push(sprite);
			}
			block.enemiesSpawned = false;
		}, 800);
	}

	this.isEmpty = function(val) {
		return val === currentLevel.empty;
	}
	/**
	 * @returns {Boolean} true, if the value is not the empty value and an item is defined for it
	 */
	this.isStone = function(val) {
		return val !== currentLevel.empty && items[val] !== undefined;
	}
	this.isBlock = function(val) {
		return val === currentLevel.block;
	}
	this.canTake = function(val) {
		return val.take;
	}
	this.canExplode = function(val) {
		var item = items[val];
		return item && (item.canExplode || item.referrer && item.referrer.canExplode);
	}
	this.explode = function(pos) {
		var val = this.getBoard(pos);
		if (typeof val == 'object')
			return;
		internalExplode(val, pos);
	}
	function internalExplode(val, pos) {
		var item = items[val];
		var point = self.getBoardPoint(pos);
		var hasBelow = item.below;
		if (hasBelow) {
	    	if (game.multiPlayer) {
	    		self.putBoard(pos, item.below);
	    		game.multiPlayer.setBoard(pos);
	    	}
			item = items[item.below];
		}
		var block = createBlock(item, point.x, point.y, pos);
		if (item.explode) // das hat bisher nur der exit
			item.explode.call(block);
		if (!hasBelow)
			block.explode();
	}
	function createBlock(item, x, y, pos) {
		var block = new Block(game, x, y, item.imagex, item.imagey, item.anim);
		block.take = item.take;
		self.putBoard(pos, block);
		game.sprites.push(block);
		return block;
	}
	/**
	 * @returns {Boolean} true if the item has been taken, false else
	 */
	this.take = function(pos, who) {
		var val = this.getBoard(pos);
		console.log("call take on [" + pos + "] " + val);
		return val.take.call(val, who);
	}
	function drawBorder(ctx) {
		var img = game.imgSprites;
		// left outer
//		for (var i = 0, n = board.h - 1; i < n; i++) {
//			drawBorderImage(ctx, img, 96, 16, 0, i * 16);
//		}

		// top left 
		var offset = 0;
		drawBorderImage(ctx, img, 64, 0, offset, 0);
		if (currentLevel.borderType == 1) {
			for (var i = 1, n = board.h - 1; i < n; i += 2) {
				drawBorderImage(ctx, img, 256, 0, offset, i * 16);
				drawBorderImage(ctx, img, 272, 0, offset, (i + 1) * 16);
			}
		} else {
			// left inner
			drawBorderImage(ctx, img, 256, 0, offset, 16);
			// border item1
			drawBorderImage(ctx, img, 272, 0, offset, 2 * 16);
			drawBorderImage(ctx, img, 288, 0, offset, 3 * 16);
			// left inner
			for (var i = 4, n = board.h - 4; i < n; i++) {
				drawBorderImage(ctx, img, 256, 0, offset, i * 16);
			}
			// border item2
			drawBorderImage(ctx, img, 272, 0, offset, (board.h - 4) * 16);
			drawBorderImage(ctx, img, 288, 0, offset, (board.h - 3) * 16);
			// left inner
			drawBorderImage(ctx, img, 256, 0, offset, (board.h - 2) * 16);
		}

		// top
		for (var i = 1, n = board.w - 1; i < n; i += 2) {
			drawBorderImage(ctx, img, 80, 0, offset + 16 * i, 0, game.zoom(32));
		}
		// bottom left
//		drawBorderImage(ctx, img, 112, 16, 0, (board.h - 1) * 16);
		// bottom
		for (var i = 1, n = board.w - 1; i < n; i += 3) {
			drawBorderImage(ctx, img, 192, 0, offset + 16 * i, (board.h - 1) * 16, game.zoom(48));
		}
		
		// upper right
		drawBorderImage(ctx, img, 112, 0, board.w * 16 - 16 + offset, 0);
//		drawBorderImage(ctx, img, 304, 0, board.w * 16 + offset, 0);
		if (currentLevel.borderType == 1) {
			for (var i = 1, n = board.h - 1; i < n; i += 2) {
				drawBorderImage(ctx, img, 128, 0, board.w * 16 - 16 + offset, i * 16);
				drawBorderImage(ctx, img, 144, 0, board.w * 16 - 16 + offset, (i + 1) * 16);
			}
		} else {
			// right inner
			drawBorderImage(ctx, img, 128, 0, board.w * 16 - 16 + offset, 16);
			// border item1
			drawBorderImage(ctx, img, 144, 0, board.w * 16 - 16 + offset, 2 * 16);
			drawBorderImage(ctx, img, 160, 0, board.w * 16 - 16 + offset, 3 * 16);
			// right inner
			for (var i = 4, n = board.h - 4; i < n; i++) {
				drawBorderImage(ctx, img, 128, 0, board.w * 16 - 16 + offset, i * 16);
			}
			// border item2
			drawBorderImage(ctx, img, 144, 0, board.w * 16 - 16 + offset, (board.h - 4) * 16);
			drawBorderImage(ctx, img, 160, 0, board.w * 16 - 16 + offset, (board.h - 3) * 16);
			// right inner
			drawBorderImage(ctx, img, 128, 0, board.w * 16 - 16 + offset, (board.h - 2) * 16);
		}
		// right outer
//		for (var i = 0, n = board.h - 1; i < n; i++) {
//			drawBorderImage(ctx, img, 304, 0, board.w * 16 + offset, i * 16);
//		}
		// bottom right
//		drawBorderImage(ctx, img, 16, 16, board.w * 16 + offset, (board.h - 1) * 16);
		// bottom left inner
		drawBorderImage(ctx, img, 240, 0, offset, (board.h - 1) * 16);
		// bottom right inner
		drawBorderImage(ctx, img, 176, 0, board.w * 16 - 16 + offset, (board.h - 1) * 16);
	}
	function drawBorderImage(ctx, img, imageX, imageY, x, y, width) {
		ctx.drawImage(img, game.zoom(0 + imageX), adjustLevelImage(currentLevel, imageY), width ? width : pix, pix,
				game.zoom(x), game.zoom(y), width ? width : pix, pix);
	}
	function adjustLevelImage(level, y) {
		return game.zoom(level.imageOffset * 2 * 16) + game.zoom(240 + y) + game.zoom(level.imageOffset);
	}
	this.drawBoard = function(ctx) {
		var time = Date.now();

		for (var i = 0; i < board.b.length; i++) {
			var point = this.getBoardPoint(i);
//			point.x += game.leftOffset;
			var val = board.b[i];
			var item = items[val];
			if (item.anim) {
				createBlock(item, point.x, point.y, i);
			} else {
				drawItem(ctx, item, point.x, point.y);
//				if (val != currentLevel.stone && val != currentLevel.block && val != currentLevel.empty)
//					ctx.strokeText(val, point.x + 1, point.y + 8);
			}
		}
		drawBorder(ctx);
		console.log("draw board needed " + (Date.now() - time) + "ms");
	}
	this.clear = function(ctx, x, y) {
		this.drawItem(ctx, currentLevel.empty, x, y);
	}
	this.drawItem = function(ctx, val, x, y) {
		drawItem(ctx, items[val], x, y);
	}
	function drawItem(ctx, item, x, y) {
		if (!item)
			return;
		if (item.referrer)
			item = item.referrer;
		if (item) {
			var w = item.Height ? item.Height : pix;
			var h = item.Width ? item.Width : pix;
			self.drawImage(ctx, game.imgSprites, item.imagex, item.imagey, x, y, w, h);
		}
	}
	this.drawImage = function(ctx, img, imgx, imgy, x, y, w, h) {
		this.doclip();
		ctx.drawImage(img, imgx, imgy, w, h, x, y, w, h);
		this.unclip();
	}
	this.getBoardPoint = function(pos) {
		return { x: (pos % board.w) * pix, y: (~~(pos / board.w) * pix)};
	}
	this.getBoardPos = function(x, y) {
		return ~~(y / pix) * board.w + ~~(x / pix);
	}
	/**
	 * @return {String} the current value at the position
	 */
	this.getBoard = function(pos) {
		return pos >= 0 && pos < board.b.length ? board.b[pos] : undefined;
	}
	this.putBoard = function(pos, val) {
		board.b[pos] = val;
	}
	this.removeBoard = function(pos) {
		board.b[pos] = currentLevel.empty;
	}
    Levels.intersects = function(r1x, r1y, r1x1, r1y1, r2x, r2y, r2x1, r2y1) {
    	//console.log("intersects: " + r1x + "," + r1y + "," + r1x1 + "," + r1y1 + "," + r2x + "," + r2y + "," + r2x1 + "," + r2y1);
        return ((r2x1 < r2x || r2x1 > r1x) &&
                (r2y1 < r2y || r2y1 > r1y) &&
                (r1x1 < r1x || r1x1 > r2x) &&
                (r1y1 < r1y || r1y1 > r2y));
    }
	this.endLevel = function(canceled, deferral) {
		if (game.gameState() == 0x25 || game.gameState() == 0x100)
			return;
		game.gameState(0x25);
		internalEndLevel(canceled, deferral);
	}

	function internalEndLevel(canceled, deferral) {
		if (game.isScrolling()) {
			setTimeout(function() {
				internalEndLevel(canceled, deferral);
			}, 150);
			return;
		}
		if (deferral) {
			setTimeout(function() {
				internalEndLevel(canceled);
			}, deferral);
			return;
		}
		if (game.multiPlayer)
			game.multiPlayer.leaveGame();
		var rect = {x: 0, x1: game.canvasWidth - pix, y: 0, y1: game.canvasHeight - pix};
		var pos = {x: 0, y: 0, state: 0};
		clip = {x: 2, y: pix + 2, w: game.canvasWidth - 4, h: game.canvasHeight - pix - 4};
		var gradient = game.ctx.createLinearGradient(0, 0, game.canvasWidth, game.canvasHeight);
		gradient.addColorStop(0, "#880000"); // red
		gradient.addColorStop(0.15, "#883300"); // orange
		gradient.addColorStop(0.3, "#888800"); // yellow
		gradient.addColorStop(0.45, "#001000"); // green
		gradient.addColorStop(0.6, "#3d6876"); // lightblue
		gradient.addColorStop(0.75, "#080012"); // indigo
		gradient.addColorStop(0.9, "#7c127c"); //violet
		game.ctx.fillStyle = gradient;
		game.bgCtx.fillStyle = gradient;
		extraBgCtx.fillStyle = gradient;

		var loopCount = 0;
		var time = Date.now();

		function loop() {
			fillBorder(pos);
			fillGradient(pos);
			switch (pos.state) {
			case 0:
				if (pos.x >= rect.x1) {
					pos.state++;
					pos.y += pix;
					clip.w = Math.max(clip.w - pix, 0);
				} else {
					pos.x += pix;
				}
				break;
			case 1:
				if (pos.y >= rect.y1) {
					pos.state++;
					pos.x -= pix;
					clip.h = Math.max(clip.h - pix, 0);
				} else {
					pos.y += pix;
				}
				break;
			case 2:
				if (pos.x <= rect.x) {
					pos.state++;
					pos.y -= pix;
					rect.y += pix;
					clip.x += pix; clip.w = Math.max(clip.w - pix, 0);
				} else {
					pos.x -= pix;
				}
				break;
			case 3:
				if (pos.y <= rect.y) {
					pos.state = 0;
					clip.y += pix; clip.h = Math.max(clip.h - pix, 0);
					pos.x += pix;
					rect.x = pos.x;
					rect.x1 -= pix;
					rect.y1 -= pix;
				} else {
					pos.y -= pix;
				}
				break;
			}
			if (rect.y < rect.y1) {
				setTimeout(loop, 5);
			} else if (--loopCount == 0) {
				game.removeAllSprites();
				fillGradient(pos);
				// copy back the background image
				game.bgCtx.drawImage(extraBgCanvas, 0, 0);
				game.canvas.style.cursor = "";
				clip = null;
				console.log("time for endLevel: " + (Date.now() - time)  + "ms");
				game.sound.music();
				if (!canceled) {
					game.gameState(0x100);
					game.getHighscore().checkScore(currentLevelIndex + 1);
				} else {
					game.drawMenu();
				}
			}
		};
		for (var i = 0, n = Math.pow(3, game.zoom()); i < n; i++, loopCount++) {
			setTimeout(loop, 2);
		}
	}
	function fillGradient(pos) {
		game.ctx.fillRect(pos.x, pos.y, pix, pix);
		extraBgCtx.fillRect(pos.x, pos.y, pix, pix);
		game.bgCtx.fillRect(pos.x + game.offsetX, pos.y + game.offsetY, pix, pix);
	}
	function fillBorder(pos) {
		var ctx = game.ctx;
		var gradient = ctx.fillStyle;
		ctx.fillStyle = Constants.BLACK;
		switch (pos.state) {
		case 0:
			ctx.fillRect(pos.x, pos.y + pix, pix, 2);
			break;
		case 1:
			ctx.fillRect(pos.x - 2, pos.y, 2, pix);
			break;
		case 2:
			ctx.fillRect(pos.x, pos.y - 2, pix, 2);
			break;
		case 3:
			ctx.fillRect(pos.x + pix, pos.y, 2, pix);
			break;
		}
		ctx.fillStyle = gradient;
	}

	function bomberChamp() {
		game.ctx.fillStyle = Constants.BLACK;
		game.menuCtx.textAlign = Constants.CENTER;
		game.menuCtx.textBaseline = Constants.MIDDLE;
		game.menuCtx.clearRect(0, 0, game.canvasWidth, game.canvasHeight);
		champText(game.menuCtx, Messages.get(Messages._40), 80, "#FFD800");
		game.sound.playExplode();
		Animation(drawAnim, champ1, true);
	}
	function champText(ctx, text, size, color, offset) {
		var x = game.canvasWidth / 2;
		var y = game.canvasHeight / 2;
		if (offset)
			y += game.zoom(offset);
		var menuText = new Menu.MenuText(ctx, x, y, game.zoom(size), text, Constants.WHITE, color);
		menuText.draw();
		return menuText;
	}
	function champ1() {
		setTimeout(function() {
			game.menuCtx.clearRect(0, 0, game.canvasWidth, game.canvasHeight);
			champText(game.menuCtx, Messages.get(Messages._41), 80, "#FFA03A");
			game.sound.playExplode();
			Animation(drawAnim, champ2, true);
		}, 1000);
	}
	function champ2() {
		setTimeout(function() {
			game.menuCtx.clearRect(0, 0, game.canvasWidth, game.canvasHeight);
			champText(game.menuCtx, Messages.get(Messages._42), 80, "#FF5E19");
			game.sound.playExplode();
			Animation(drawAnim, champ3, true);
		}, 1000);
	}
	function champ3() {
		currentLevelIndex = -1;
		setTimeout(function() {
			game.menuCtx.clearRect(0, 0, game.canvasWidth, game.canvasHeight);
			champText(game.menuCtx, Messages.get(Messages._43), 100, Constants.RED, -50);
			champText(game.menuCtx, Messages.get(Messages._44), 100, Constants.RED, 50);
			for (var i = 0; i < 6; i++) {
				game.sound.playExplode();
			}

			Animation(function(delta) {
				var scale = 1 - delta;
				var ctx = game.ctx;
				ctx.fillRect(0, 0, game.canvasWidth, game.canvasHeight);
				ctx.save();
				ctx.translate(game.canvasWidth / 2, game.canvasHeight / 2);
				ctx.rotate(2 * scale * Math.PI);
				ctx.translate(-game.canvasWidth / 2, -game.canvasHeight / 2);
				ctx.drawImage(game.menuCanvas,
						(1 - scale) * game.canvasWidth / 2,
						(1 - scale) * game.canvasHeight / 2,
						game.canvasWidth * scale, game.canvasHeight * scale);
				ctx.restore();
			}, colorize, true);
		}, 1000);
	}
	function drawAnim(delta) {
		game.ctx.fillRect(0, 0, game.canvasWidth, game.canvasHeight);
		game.ctx.drawImage(game.menuCanvas, 0, -game.canvasHeight * delta);
	}
	var colorizeId;
	function colorize() {
		registerHandlers();
		var color = 0xFF0000;
		var dir = -3;
		var t1, t2;
		colorizeId = setInterval(function() {
			var colorString = game.colorString(color);
			if (!t1) {
				t1 = champText(game.ctx, Messages.get(Messages._43), 100, colorString, -50);
				t2 = champText(game.ctx, Messages.get(Messages._44), 100, colorString, 50);
			} else {
				t1.draw(0, 0, 0, colorString);
				t2.draw(0, 0, 0, colorString);
			}
			var red = (color >> 16) + dir;
			if (red <= 0 || red >= 0xff)
				dir = -dir;
			color = red << 16;
		}, 1);
	}
	function handler(ev) {
		if (!Menu.isClickEvent(ev))
			return;
		unregisterHandlers();
		clearInterval(colorizeId);
		self.endLevel();
	}
	function registerHandlers() {
		game.canvas.addEventListener(Constants.MOUSEUP, handler);
		document.addEventListener(Constants.KEYDOWN, handler);
	}
	function unregisterHandlers() {
		game.canvas.removeEventListener(Constants.MOUSEUP, handler);
		document.removeEventListener(Constants.KEYDOWN, handler);
	}
}