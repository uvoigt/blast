/*
 * (c) Copyright 2016 Uwe Voigt
 * All Rights Reserved.
 */
"use strict";

/**
 * @param {Function} drawCallback the delta progress value comes as parameter
 * @param {Function} endCallback
 * @param {Boolean} reverse
 * @param {Function} ease
 * @param {Number} duration
 * @param {Number} delay
 * @param {Boolean} inout
 */
function Animation(drawCallback, endCallback, reverse, ease, duration, delay, inout) {

	if (!ease)
		ease = Animation.bounce;
	if (!delay)
		delay = 10;
	if (!duration)
		duration = 1000;

	function makeReverse(delta) { 
		return function(progress) {
			return delta(1 - progress);
		}
	}
	function makeEaseInOut(delta) { 
		return function(progress) {
			if (progress < .5)
				return delta(2*progress) / 2;
			else
				return (2 - delta(2*(1-progress))) / 2;
		}
	}

	if (reverse)
		ease = makeReverse(ease);
	if (inout)
		ease = makeEaseInOut(ease);

	(function() {
		var start = Date.now();
		var id = setInterval(function() {
			var timePassed = Date.now() - start
			var progress = timePassed / duration
			if (progress > 1)
				progress = 1
		    var delta = ease(progress);
		    drawCallback(delta);
		    if (progress == 1) {
		    	clearInterval(id);
				if (endCallback)
					endCallback();
		    }
		}, delay);
	})();
}

Animation.linear = function(progress) {
	return progress;
}
Animation.bounce = function(progress) {
	for (var a = 0, b = 1; 1; a += b, b /= 2) {
		if (progress >= (7 - 4 * a) / 11) {
			return -Math.pow((11 - 6 * a - 11 * progress) / 4, 2) + Math.pow(b, 2);
		}
	}
}
Animation.elastic = function(progress) {
	var x = 0.5;
	return Math.pow(2, 10 * (progress - 1)) * Math.cos(20 * Math.PI * x / 3 * progress);
}
Animation.quad = function(progress) {
	return Math.pow(progress, 4);
}
