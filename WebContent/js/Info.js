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
function Info(game) {
	var self = this;

	this.fontFamily = 'Arial';

	var canvas = document.getElementById('canvasInfo');
	canvas.width *= game.zoom();
	canvas.height *= game.zoom();
	var canvasWidth = canvas.width;
	var canvasHeight = canvas.height;
	var ctx = canvas.getContext("2d");
	var sections = {};

	var timeLabel = $("#time");
	var scoreLabel = $("#infoScore");
	var livesContainer = $("#infoLives");
	var nameLabel = $("#playerName");
	var nameInput = $("#playerNameInput");
	var gameLabel = $("#gameName");
	var gameInput = $("#gameNameInput");
	var replacement = "Unnamed";
	nameInput.prop(Constants.PLACEHOLDER, replacement);
	gameInput.prop(Constants.PLACEHOLDER, replacement);

	function NameInputHandler(input, label, callback) {
		function stopEditing() {
			input.hide();
			label.show();
		}
		this.fBlur = function() {
			// in contrast to callback() call defines 'this' in context of the callee
			callback.call(self, game.escapeHtml(input.val()));
			stopEditing();
		}
		this.fKeyup = function(ev) {
			ev.stopPropagation();
		}
		this.fKeydown = function(ev) {
			ev.stopPropagation();
			switch (ev.keyCode) {
			case 13:
				this.blur();
				break;
			case 27:
				input.val(replace(label.html()));
				this.blur();
				break;
			}
		}
		this.fMousedown = function(ev) {
			input.show();
			label.hide();
			ev.preventDefault();
			input.val(replace(label.html()));
			input.eq(0).focus();
		};
		function replace(value) {
			return value == replacement ? "" : value;
		}
	}

	var score;
	var playerName = game.escapeHtml(nameInput.val());
	var playerColor = game.parseColor($(".color").css(Constants.BACKGROUNDCOLOR));
	var gameName = game.escapeHtml(gameInput.val());

	var gameRadios = $("[name='infoOthers']");
	gameRadios.click(function() {
		if (this.id == 'r1') {
			if (game.multiPlayer)
				game.multiPlayer.deregisterGame();
		} else {
			game.startMultiplayer();
			// ein neues Spiel wird automatisch registriert,
			// falls kein Playername angegeben ist und der Server einen zuteilt (newName)
			if (game.gameState() == 0x1f && playerName) {
				game.multiPlayer.registerGame();
			}
		}
	});
	gameRadios.first().prop("checked", true);

	fillBackground();

	this.init = function() {
		this.draw();

		var nameHandler = new NameInputHandler(nameInput, nameLabel, this.playerName);
		var gameHandler = new NameInputHandler(gameInput, gameLabel, this.gameName);

		nameLabel.mousedown(nameHandler.fMousedown);
		nameInput.keydown(nameHandler.fKeydown);
		nameInput.keyup(nameHandler.fKeyup);
		nameInput.blur(nameHandler.fBlur);
		gameLabel.mousedown(gameHandler.fMousedown);
		gameInput.keydown(gameHandler.fKeydown);
		gameInput.keyup(gameHandler.fKeyup);
		gameInput.blur(gameHandler.fBlur);

		var container = showContainer(true);
		container.find("*").css(Constants.FONTFAMILY, this.fontFamily);

		container.children().first().children().each(function() {
			sections[this.id] = new Section($(this));
		});
	}

	this.reset = function() {
		score = 0;
		scoreLabel.html(score);
	}

	this.life = function(num) {
		// the container shows num - 1 symbols
		if (num) {
			var n = num - 1;
			while (n < livesContainer.children().length)
				livesContainer.children().last().remove();
			while (n > livesContainer.children().length)
				livesContainer.append("<div class='life' />");
		}
	}
	this.time = function(num) {
		if (num == undefined || num < 0)
			return timeLabel.time;
		var m = ~~(num / 60) + ":";
		var s = ~~(num % 60) + "";
		timeLabel.time = num;
		timeLabel.html(m + (s.length < 2 ? "0" + s : s));
	}
	this.score = function(num) {
		if (!num)
			return score;
		if (game.gameState() == 0x1f || game.gameState() == 0x80) {
			score += num;
			scoreLabel.html(score);
		}
	}
	this.playerName = function(newName) {
		if (newName == undefined || newName == playerName)
			return playerName;
		playerName = newName;
		if (game.multiPlayer)
			game.multiPlayer.setPlayerName(playerName, playerColor);
		this.draw();
	}
	this.playerColor = function(newColor) {
		if (newColor != undefined) {
			playerColor = game.parseColor(newColor);
			if (game.getPlayer())
				game.getPlayer().setPlayerColor(playerColor);
			if (game.multiPlayer)
				game.multiPlayer.setPlayerColor(playerColor);
		}
		return playerColor;
	}
	this.gameName = function(newName) {
		if (newName == undefined || newName == gameName)
			return gameName;
		gameName = newName;
		if (game.multiPlayer)
			game.multiPlayer.setGameName(gameName);
		this.draw();
	}
	this.gameStatus = function() {
		return $("[name='infoOthers']:checked").prop("value");	
	}
	this.isOpenGame = function() {
		return !gameRadios.first().prop("checked");
	}

	this.draw = function() {
		nameLabel.html(playerName ? playerName : nameInput.prop(Constants.PLACEHOLDER));
		scoreLabel.html(score);
		gameLabel.html(gameName ? gameName : gameInput.prop(Constants.PLACEHOLDER));
		drawVersion();
	}
	/**
	 * @returns the time elapsed within the pause
	 */
	this.togglePause = function() {
		switch (game.gameState()) {
		case 0x41:
			return this.pause();
		case 0x1f:
		case 0x15: // Spezialfall -> beam
			this.pause(true);
		}
	}
	var time = 0;
	this.pause = function(pause) {
		if (pause) {
			time = Date.now();
			game.sound.togglePause(true);
			this.prevDir = game.gameState(); // kleiner Missbrauch eines bereits bekannten Properties
			game.gameState(0x41);
			showContainer(false);
			ctx.fillStyle = Constants.BLACK;
			ctx.fillRect(0, 0, canvasWidth, canvasHeight);
			ctx.fillStyle = Constants.WHITE;
			ctx.font = "bold " + game.zoom(20) + "px Arial";
			ctx.save();
			ctx.textAlign = Constants.CENTER;
			ctx.rotate(270 * Math.PI / 180);
			ctx.fillText("Pause", game.zoom(-150), game.zoom(50));
			ctx.restore();
		} else {
			game.sound.togglePause();
			showContainer(true);
			game.gameState(this.prevDir);
			fillBackground();
			this.draw();
			return Date.now() - time;
		}
	}
	this.toggleSection = function(open) {
		for (var i = 1; i < arguments.length; i++) {
			if (open)
				sections[arguments[i]].open();
			else
				sections[arguments[i]].close();
		}
	}

	function showContainer(show) {
		var container = $("#infoContainer");
		container.css("visibility", show ? "visible" : "hidden");
		return container;
	}

	function fillBackground() {
		var r = 91, g = 26, b = 0;
		function rgb() {
			return "rgb(" + r + "," + g + "," + b + ")";
		};
		ctx.fillStyle = rgb();
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);
		for (var i = 10; i >= 0; i--) {
			r-=4; g = Math.max(g - 4, 0);
			ctx.strokeStyle = rgb();
			ctx.strokeRect(i, i, canvasWidth - 2 * i, canvasHeight - 2 * i);
		}
	}

	function drawVersion() {
		var version = $("meta[name=Version]").prop("content");
		ctx.font = "9px Arial";
		ctx.textAlign = Constants.CENTER;
		ctx.strokeText(version, canvasWidth / 2, canvasHeight - 10);
	}

	function Section(fieldset) {
		var legend = fieldset.children().eq(0);
		legend.mousedown(toggle);
		legend.css("cursor", "pointer");

		this.open = function() {
			getChildren().slideDown(100);
		}
		this.close = function() {
			getChildren().slideUp(100);
		}

		function toggle(ev) {
			ev.preventDefault();
			if (ev.button != 0)
				return;
			getChildren().slideToggle(100);
		}

		function getChildren() {
			return fieldset.children().not("legend");
		}
	}
}