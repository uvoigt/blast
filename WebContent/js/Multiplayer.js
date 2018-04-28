/*
 * (c) Copyright 2016 Uwe Voigt
 * All Rights Reserved.
 */
"use strict";

/**
 * @param {Game} game
 */
function Multiplayer(game) {
	var websocket;
	var players = {};
	var hasOpponents = false;
	var nextStateTime = Date.now();
	var activeInGame;

	var playerList = document.getElementById("mpListPlayers");
	playerList.addEventListener("dblclick", doChat);
	var gameList = document.getElementById("mpListGames");
	gameList.addEventListener("dblclick", enterGame);
	var chatContainer = $("#chatContainer");
	var chatText = document.getElementById("chatTxt");
	var jChatText = $(chatText);
	chatContainer.on("click", function() {
		chatText.focus();
	});
	jChatText.on("focus blur", function() {
		chatContainer.toggleClass("inactive");
	});

	// send ping message all 4 minutes to keep SSL session alive
	setInterval(function() {
		ping();
	}, 1000 * 60 * 4);

	function ping() {
		sendMessage({c: "p"});
	}

	this.start = function(showMessage) {
		if (showMessage) {
			game.getInfo().toggleSection(true, "activeGames", "activePlayers");
			game.getInfo().toggleSection(false, "yourGame");
			game.showMessage(Messages.get(Messages._2), false, true, 5000);
		}
		this.enableControls(true);
		// open connection
		ping();
	}

	this.putBomb = function(pos, size) {
		if (!activeInGame)
			return;
		sendMessage({c: "b", b: pos, s: size});
	}

	this.setBoard = function(pos, point) {
		if (!activeInGame)
			return;
		var val = game.levels.getBoard(pos);
		var msg = {c: "U", p: pos, v: val};
		if (point) {
			msg.x = point.x;
			msg.y = point.y;
		}
		sendMessage(msg);
		console.log("set board pos: " + pos + ": " + val + (point ? " with player point: " + JSON.stringify(point) : ""));
	}

	this.setState = function(state) {
		if (activeInGame && (Date.now() > nextStateTime || state.direction == 'front')) {
			sendMessage({c: "u", x: state.x, y: state.y, d: state.direction});
			nextStateTime = Date.now() + 5;
		}
	}

	this.updateSprite = function(state, spriteId) {
		if (activeInGame && hasOpponents)
			sendMessage({c: "s", x: state.x, y: state.y, d: state.direction, s: spriteId});
	}

	this.decLife = function() {
		if (activeInGame)
			sendMessage({c: "f"});
	}

	this.setPlayerName = function(name, color) {
		sendMessage({c: "n", name: name, color: color});
	}

	this.setGameName = function(name) {
		sendMessage({c: "g", name: name});
	}

	this.setPlayerColor = function(color) {
		sendMessage({c: "c", color: color});
	}

	this.leaveGame = function() {
		if (activeInGame) {
			activeInGame = false;
			for (var p in players) {
				delete players[p];
			}
			hasOpponents = false;
			sendMessage({c: "v"});
		}
	}

	this.isActive = function() {
		return activeInGame;
	}

	this.enableControls = function(enabled) {
		$(gameList).prop("disabled", !enabled);
	}

	// hier kommt ein mouse-event als Parameter,
	function doChat() {
		// das ich nicht weitergeben möchte
		if (getSelected(playerList).length > 0)
			game.multiPlayer.chat();
	}

	this.chat = function(msg) {
		var list = $("#chatList");

		if (!chatText.onkeydown) {
			var commands = {cls: function() { list.children().remove() }};
			document.getElementById("chatClose").onmousedown = function(ev) {
				if (ev.button == 0) {
					chatContainer.hide();
				}
			};

			chatText.onkeyup = function(ev) {
				ev.stopPropagation();
			}
			chatText.onkeydown = function(ev) {
				ev.stopPropagation();
				switch (ev.keyCode) {
				case 13:
					var msg = game.escapeHtml(chatText.value);
					if (!msg)
						break;
					if (msg.length > 200)
						msg = msg.substr(0, 200);
					if (msg in commands) {
						commands[msg]();
					} else {
						var recipients = getSelected(playerList);
						if (!chatContainer.messages)
							chatContainer.messages = [];
						chatContainer.messages.push(msg);
						chatContainer.messagesOffset = chatContainer.messages.length;
						sendMessage({c: "t", recipients: recipients, text: msg});
						game.multiPlayer.chat({"You": msg});
					}
					chatText.value = "";
					break;
				case 27:
					chatContainer.hide();
					break;
				case 38: // up
					if (!chatContainer.messages)
						break;
					if (chatContainer.messagesOffset == undefined)
						chatContainer.messagesOffset = chatContainer.messages.length;
					if (chatContainer.messagesOffset > 0)
						chatContainer.messagesOffset--;
					chatText.value = game.unescapeHtml(chatContainer.messages[chatContainer.messagesOffset]);
					break;
				case 40: // down
					if (!chatContainer.messages)
						break;
					if (chatContainer.messagesOffset == undefined)
						chatContainer.messagesOffset = 0;
					if (chatContainer.messagesOffset < chatContainer.messages.length - 1) {
						chatContainer.messagesOffset++;
						chatText.value = game.unescapeHtml(chatContainer.messages[chatContainer.messagesOffset]);
					} else {
						chatText.value = "";
						chatContainer.messagesOffset = chatContainer.messages.length;
					}
					break;
				}
			}
		}

		chatContainer.show();
		if (msg) {
			for (var p in msg) {
				var sender = parseInt(p);
				sender = !isNaN(sender) ? getPlayerName(sender) : p;
				list.append("<div>" + sender + ": " + msg[p] + "</div>");
				var children = list.children();
				if (children.length > 3)
					children.first().remove();
				var index = indexOf(playerList, p);
				if (index != -1)
					playerList.selectedIndex = index;
			}
		} else {
			// only focus container when 'T' was pressed, not on an incoming message
			chatText.focus();
		}
	}

	function updatePlayerList() {
		sendMessage({c: "l"});
	}

	function updateGameList() {
		sendMessage({c: "L"});
	}

	function sendMessage(message) {
		if (websocket == undefined) {
			try {
				websocket = new WebSocket("@ws@://" + game.getHostAndPort("@wsport@") + location.pathname + "ws?n="
						+ game.getInfo().playerName() + "&c=" + game.getInfo().playerColor());
			} catch (e) {
				game.handleError(Messages.get(Messages._3), e);
				return;
			}

			websocket.onopen = function() {
				sendMessage(message);
				setTimeout(function() {
					updateGameList();
					updatePlayerList();
				}, 500);
			};
			websocket.onmessage = function(evt) {
				handleMessage(evt)
			};
			websocket.onerror = function(evt) {
				if (websocket.readyState == 3) { // CLOSED
					game.handleError(Messages.get(Messages._3), evt);
				} else {
					console.log(evt);
				}
			};
			websocket.onclose = function() {
				websocket = undefined;
				playerList.options.length = 0;
				gameList.options.length = 0;
				if (activeInGame) {
					activeInGame = false;
					if (game.gameState() == 0x41)
						game.getInfo().togglePause();
					setTimeout(game.levels.endLevel, 100);
				}
			};
			window.addEventListener("beforeunload", closeSocket, false);
		} else {
			if (websocket.readyState == 0) { // CONNECTING
				setTimeout(function() {
					sendMessage(message);
				}, 500);
			} else {
				doSend(message);
			}
		}
	}

	function doSend(message) {
		try {
			websocket.send(JSON.stringify(message));
		} catch (e) {
			if (websocket.readyState == 3) { // CLOSED
				websocket = undefined;
			} else {
				game.handleError(Messages.get(Messages._4), e);
			}
		}
	}

	function handleMessage(message) {
		var payload = JSON.parse(message.data);
//		console.debug("received message: " + message.data);
		if (payload.r) {
			switch (payload.r) {
			default:
				throw "unknown response " + payload.r;
			case "p": // playerList
				fillList(playerList, payload.list);
				game.sound.playDing();
				break;
			case "g": // gameList
				fillList(gameList, payload.list);
				break;
			case "n": // playerName
				updatePlayerList();
				break;
			case "c": // playerColor
				var option = getOptionFromPlayerList(payload.i);
				if (option)
					option.style.color = game.colorString(payload.c);
				if (activeInGame && players[payload.i]) 
					players[payload.i].setPlayerColor(payload.c);
				break;
			case "N": // newName
				game.getInfo().playerName(payload.n);
				game.showMessage(Messages.get(Messages._5, payload.n), false, false, 5000);
				if (game.gameState() == 0x1f)
					game.multiPlayer.registerGame();
				break;
			case "r": // requestEnter
				game.showMessage(Messages.get(Messages._36, getPlayerName(payload.i)), function(ok) {
					sendMessage({c: "a", d: ok ? "accept" : "refuse", i: payload.i}); // answerRequest
				}, true);
				break;
			case "w": // waitToAccept
				game.showMessage(Messages.get(Messages._37, getPlayerName(payload.i)));
				break;
			case "a": // accepted
				game.showMessage(Messages.get(Messages._38, getPlayerName(payload.i)), false, true);
				break;
			case "R": // refused
				game.showMessage(Messages.get(Messages._39, getPlayerName(payload.i)), false, true, 3000);
				game.multiPlayer.enableControls(true);
				break;
			case "s": // startGame
				// nur für den Moment: wenn die Position angegeben ist, dann ist es ein "enterGame"
				startPlaying(payload.opponents, payload.board, payload.position);
				break;
			case "P": // newPlayer
				// if we are the host of the game, send back all enemy positions
				if (game.isSinglePlayerGame()) {
					var currentId = 0;
					var sprites = {}; // e.g. {drop: {i: 1, x: 12, y: 90}}
					for (var i = 0; i < game.sprites.length; i++) {
						var sprite = game.sprites[i];
						if (sprite.isEnemy) {
							sprite.id = ++currentId;
							var name = game.fnName(sprite.constructor);
							var ids = sprites[name];
							if (ids == undefined)
								sprites[name] = ids = [];
							ids.push({i: sprite.id, x: sprite.state.x, y: sprite.state.y})
						}
					}
					sendMessage({c: "I", s: sprites, p: payload.i}); // send sprite name and IDs to the new player
				}
				addRemotePlayer(payload.i, payload.c, payload.l, payload.p);
				game.showMessage(Messages.get(Messages._9, getPlayerName(payload.i)), false, true, 3000);
				break;
			case "I": // spriteIds
				if (!activeInGame)
					break;
				for (var e in payload.s) {
					var infos = payload.s[e];
					for (var i = 0; i < infos.length; i++) {
						var info = infos[i];
						var sprite = new enemiesLocal[e](game, info.x, info.y);
						sprite.id = info.i;
						sprite.remoteState = {x: info.x, y: info.y};
						game.sprites.push(sprite);
					}
				}
				break;
			case "u": // state
				if (!activeInGame)
					break;
				var rp = players[payload.i];
				if (rp) {
					if (rp.state.x != payload.x || rp.state.y != payload.y || (payload.d && rp.state.direction != payload.d)) {
						rp.remoteState.x = payload.x;
						rp.remoteState.y = payload.y;
						if (payload.d)
							rp.direction = payload.d;
					} else {
						rp.front(true);
					}
				}
				break;
			case "S": // sprite
				if (!activeInGame)
					break;
				// update sprite positions
				// müsste eigentlich aus der function update aufgerufen werden!
				for (var i = 0; i < game.sprites.length; i++) {
					var sprite = game.sprites[i];
					if (sprite.isEnemy && sprite.id == payload.s) {
						sprite.remoteState.x = payload.x;
						sprite.remoteState.y = payload.y;
						if (payload.d)
							sprite.direction = payload.d;
						break;
					}
				}
				break;
			case "l": // life // TODO das wird nicht aufgerufen... muss wohl auch nicht
				if (!activeInGame)
					break;
				var rp = players[payload.i];
				if (rp)
					rp.life(0, payload.l);
				break;
			case "b": // bomb
				if (!activeInGame)
					break;
				var rp = players[payload.i];
				if (rp) {
					console.log("put bomb at " + payload.b + " by " + rp.toDebugString());
					rp.putBomb(payload.b, payload.s);
					var player = game.getPlayer();
					var playerState = player.state;
					var bombState = rp.currentBomb ? rp.currentBomb.state : undefined;
					if (bombState && Levels.intersects(bombState.x, bombState.y, bombState.x + bombState.Width, bombState.y + bombState.Height,
							playerState.x, playerState.y, playerState.x + playerState.Width, playerState.y + playerState.Height) && !player.currentBomb) {
						player.currentBomb = rp.currentBomb;
						player.currentBomb.unfair = true;
					}
					rp.currentBomb = undefined;
				}
				break;
			case "t": // chat
				game.multiPlayer.chat(payload.msg);
				game.sound.playDing();
				break;
			case "v": // leftGame
				if (activeInGame) {
					var rp = players[payload.i];
					if (rp) {
						game.removeSprite(rp.state);
						delete players[rp.id];
						rp.clearBackground();
						hasOpponents = false;
						for (var p in players) {
							hasOpponents = true;
							break;
						}
						game.showMessage(Messages.get(Messages._10, getPlayerName(rp.id)), false, true, 3000);
					}
				}
				updateGameList();
				break;
			case "e":
				if (!activeInGame)
					break;
				game.levels.updateBoard(payload.i);
				break;
			case "d": // playerDisconnected
				updatePlayerList();
				updateGameList();
				break;
			}
		} else if (payload.error) {
			game.handleError(payload.error);
		}
	}

	function closeSocket() {
		if (websocket) {
			websocket.close();
		}
	}

	function fillList(htmlSelect, list) {
		htmlSelect.options.length = 0;
		for (var i = 0; i < list.length; i++) {
			var option = new Option();
			var entry = list[i];
			var text = entry.n;
			if (entry.p != undefined)
				text += " (" + entry.p + ")";
			option.value = entry.i;
			option.text = text;
			if (entry.c)
				option.style.color = game.colorString(entry.c);
			htmlSelect.options.add(option);
		}
	}

	function getSelected(list) {
		var selected = [];
		for (var i = 0; i < list.options.length; i++) {
			var option = list.options[i];
			if (option.selected) {
				var n = parseInt(option.value);
				if (isNaN(n))
					throw "wrong value";
				selected.push(n);
			}
		}
		return selected;
	}

	function getPlayerName(id) {
		var option = getOptionFromPlayerList(id);
		return option ? option.text : undefined;
	}

	function getOptionFromPlayerList(id) {
		for (var i = 0; i < playerList.options.length; i++) {
			var option = playerList.options[i];
			if (option.value == id)
				return option;
		}
	}

	function indexOf(list, val) {
		for (var i = 0; i < list.options.length; i++) {
			if (list.options[i].value == val) {
				return i;
			}
		}
		return -1;
	}

	this.registerGame = function() {
		var gameName = game.getInfo().gameName();
		if (!gameName)
			gameName = Messages.get(Messages._1, game.getInfo().playerName());
		var msg = {c: "r", name: gameName, status: game.getInfo().gameStatus()};
		// wenn das Spiel schon läuft, muss das Board hinzu
		// ansonsten wird es in nextLevel durch initBoard hinzugefügt
		if (game.gameState() == 0x1f)
			game.levels.addBoard2Msg(msg);
		sendMessage(msg);
		activeInGame = true;
	}
	this.deregisterGame = function() {
		sendMessage({c: "d"});
		activeInGame = false;
	}
	this.initBoard = function() {
		sendMessage(game.levels.addBoard2Msg({c: "i"}));
	}

	function enterGame() {
		var selected = getSelected(gameList);
		if (selected.length != 1) {
			game.handleError(Messages.get(Messages._0));
		} else {
			game.multiPlayer.enableControls(false);
			gameList.blur();
			sendMessage({c: "e", game: selected[0]});
		}
	}

	function startPlaying(opponents, board, position) {
		game.cancelMenu();

		activeInGame = true;
		game.startGame(board, position, 10);

		for (var i = 0; i < opponents.length; i++) {
			var opponent = opponents[i];
			addRemotePlayer(opponent.i, opponent.c, opponent.l, opponent.p);
		}
	}

	function addRemotePlayer(id, color, lives, position) {
		var rp = new RemotePlayer(id, color, lives, position);
		console.log("adding remote player " + getPlayerName(id) + " at " + JSON.stringify(position));
		players[rp.id] = rp;
		game.sprites.push(rp);
		hasOpponents = true;
	}

	function RemotePlayer(id, color, lives, position) {
		this.id = id;
		this.isRemote = true;
		this.remoteState = position;
		if (!position)
			this.setToRandomPos();

		Player.call(this, game, position.x, position.y, color, lives);
		this.toDebugString = function() {
			return this.constructor.name + " " + this.id;
		}
		this.updateRemote = function() {
		}
		this.update = function() {
			this[this.direction]();
			this.state.x = this.remoteState.x;
			this.state.y = this.remoteState.y;
			Sprite.prototype.update.call(this);
		}
	}
}
