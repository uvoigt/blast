/*
 * (c) Copyright 2016 Uwe Voigt
 * All Rights Reserved.
 */
"use strict";

/**
 * A global message bundle.
 * 
 * @constructor
 */
function Messages() {

	var language = "en";

	/**
	 * You must select exactly one game!
	 */
	Messages._0 = 0;
	/**
	 * {0}'s play
	 */
	Messages._1 = 1;
	/**
	 * For playing a multiplayer game, simply double-click on one of the games in the 'Games' list.
	 */
	Messages._2 = 2;
	/**
	 * No connection to the server possible
	 */
	Messages._3 = 3;
	/**
	 * Cannot communicate with the server
	 */
	Messages._4 = 4;
	/**
	 * Your randomly chosen name is '{0}'. You can change the name by clicking on it.
	 */
	Messages._5 = 5;
	/**
	 * Highscore not available.
	 */
	Messages._6 = 6;
	/**
	 * Highscore could not be saved.
	 */
	Messages._7 = 7;
	/**
	 * Highscore could not be loaded.
	 */
	Messages._8 = 8;
	/**
	 * {0} has entered the game
	 */
	Messages._9 = 9;
	/**
	 * {0} has left the game
	 */
	Messages._10 = 10;
	/**
	 * You did not choose yourself a name. Enter one now and press 'OK' afterwards or press 'Cancel' to do without an entry in the highscore.
	 */
	Messages._11 = 11;
	/**
	 * Level {0}.
	 */
	Messages._12 = 12;
	/**
	 * You are in between the walls
	 */
	Messages._13 = 13;
	/**
	 * Now you are in the rocky desert
	 */
	Messages._14 = 14;
	/**
	 * You have to cross the river now
	 */
	Messages._15 = 15;
	/**
	 * Fight your way through the woods
	 */
	Messages._16 = 16;
	/**
	 * You are now in the icy heights
	 */
	Messages._17 = 17;
	/**
	 * Congrats! You entered the lobby of the castle
	 */
	Messages._18 = 18;
	/**
	 * Now you are within the first floor
	 */
	Messages._19 = 19;
	/**
	 * This is the penthouse. You are almost done!
	 */
	Messages._20 = 20;
	/**
	 * Ready to blast!
	 */
	Messages._21 = 21;
	/**
	 * Blast opponents!
	 */
	Messages._22 = 22;
	/**
	 * Highscore
	 */
	Messages._23 = 23;
	/**
	 * Options
	 */
	Messages._24 = 24;
	/**
	 * Instructions
	 */
	Messages._25 = 25;
	/**
	 * Top blasters
	 */
	Messages._26 = 26;
	/**
	 * Past 10 days best 
	 */
	Messages._27 = 27;
	/**
	 * Left
	 */
	Messages._28 = 28;
	/**
	 * Right
	 */
	Messages._29 = 29;
	/**
	 * Up
	 */
	Messages._30 = 30;
	/**
	 * Down
	 */
	Messages._31 = 31;
	/**
	 * Put bomb
	 */
	Messages._32 = 32;
	/**
	 * Detonate bomb
	 */
	Messages._33 = 33;
	/**
	 * Choose one of the functions to change the key you want to use for it.
	 */
	Messages._34 = 34;
	/**
	 * Now press the desired key for {0} or hit ESC to leave it unchanged.
	 */
	Messages._35 = 35;
	/**
	 * {0} requests to enter your game.
	 */
	Messages._36 = 36;
	/**
	 * Waiting for {0} to accept the request to enter the game...
	 */
	Messages._37 = 37;
	/**
	 * {0} accepted the request.
	 */
	Messages._38 = 38;
	/**
	 * {0} refused the request.
	 */
	Messages._39 = 39;
	/**
	 * You
	 */
	Messages._40 = 40;
	/**
	 * Are
	 */
	Messages._41 = 41;
	/**
	 * The
	 */
	Messages._42 = 42;
	/**
	 * Bomber
	 */
	Messages._43 = 43;
	/**
	 * Champ!
	 */
	Messages._44 = 44;
	/**
	 * Sound and music
	 */
	Messages._45 = 45;
	/**
	 * Key configuration
	 */
	Messages._46 = 46;

	var bundles = {
		en : [
				"You must select exactly one game!",
				"{0}'s play",
				"For playing a multiplayer game, simply double-click on one of the games in the 'Games' list.",
				"No connection to the server possible",
				"Cannot communicate with the server",
				"Your randomly chosen name is '{0}'. You can change the name by clicking on it.",
				"Highscore not available.", //
				"Highscore could not be saved.",
				"Highscore could not be loaded.", //
				"{0} has entered the game", //
				"{0} has left the game",
				"You did not choose yourself a name. Enter one now and press 'OK' afterwards or press 'Cancel' to do without an entry in the highscore.",
				"Level {0}", //
				"You are in between the walls",
				"Now you are in the rocky desert",
				"You have to cross the river now",
				"Fight your way through the woods",
				"You are now in the icy heights",
				"Congratulations!\nYou entered the lobby of the castle",
				"Now you are within the first floor",
				"This is the penthouse.\nYou are almost done!",
				"Ready to blast!", //
				"Blast opponents!", //
				"Highscore", //
				"Options", //
				"Instructions", //
				"Top blasters", //
				"Past 10 days best", //
				"Left", "Right", "Up", "Down", "Put bomb", "Detonate bomb",
				"Choose one of the functions\nto change the key you want to use for it.",
				"Now press the desired key for '{0}'\nor hit ESC to leave it unchanged.",
				"{0} requests to enter your game.",
				"Waiting for {0} to accept the request to enter the game...",
				"{0} accepted the invitation.",
				"{0} refused the invitation.",
				"You", "Are", "The", "Bomber", "Champ!", //
				"Sound and music",
				"Key configuration"],
		de : []
	}

	/**
	 * @param {String}
	 *            l
	 */
	Messages.setLanguage = function(l) {
		language = l;
	}

	/**
	 * Returns the message from the bundle for the actual language.
	 * Optional arguments can be specified as substitutes.
	 * 
	 * @param {Number} num
	 * @returns {String}
	 */
	Messages.get = function(num) {
		var bundle = bundles[language];
		return bundle ? format(bundle[num], arguments) : undefined;
	}

	/**
	 * @param {String} pattern
	 * @returns {String}
	 */
	function format(pattern, args) {
		for (var i = 1; i < args.length; i++) {
			pattern = pattern.replace(new RegExp("\\{" + (i - 1) + "\\}"), args[i]);
		}
		return pattern;
	}
}
