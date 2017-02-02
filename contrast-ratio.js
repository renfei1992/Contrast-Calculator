function $(expr, con) {
	return typeof expr === 'string'? (con || document).querySelector(expr) : expr;
}

function $$(expr, con) {
	return Array.prototype.slice.call((con || document).querySelectorAll(expr));
}

// Make each ID a global variable
// Many browsers do this anyway (it’s in the HTML5 spec), so it ensures consistency
$$('[id]').forEach(function(element) { window[element.id] = element; });

var messages = {
	'semitransparent': 'Please put in the Hex Code of the color starting with "#"',
	'fail': 'The contrast is NOT high enough!',
	'aa-large': 'The contrast is ONLY GOOD for "large scale" text of 18 pt regular or 14 pt bold, or larger',
	'aa': 'The contrast is GOOD for most of text size.',
	'aaa': 'EXCELLENT contrast, good for any size text!'
};

var canvas = document.createElement('canvas'),
    ctx = canvas.getContext('2d');

canvas.width = canvas.height = 16;
document.body.appendChild(canvas);

incrementable.onload = function() {
	if (window.Incrementable) {
		new Incrementable(background);
		new Incrementable(foreground);
	}
};

if (window.Incrementable) {
	incrementable.onload();
}

var output = $('output');

var levels = {
	'fail': {
		range: [0, 3],
		color: '#BDBDBD'
	},
	'aa-large': {
		range: [3, 4.5],
		color: '#9E9E9E'
	},
	'aa': {
		range: [4.5, 7],
		color: '#616161'
	},
	'aaa': {
		range: [7, 22],
		color: '#212121'
	}
};

function rangeIntersect(min, max, upper, lower) {
	return (max < upper? max : upper) - (lower < min? min : lower);
}

function updateLuminance(input) {
	input.title = 'Relative luminance: ';

	var color = input.color;

	if (input.color.alpha < 1) {
		input.title += color.overlayOn(Color.BLACK).luminance + ' - ' + color.overlayOn(Color.WHITE).luminance;
	}
	else {
		input.title += color.luminance;
	}
}

function update() {
	if (foreground.color && background.color) {
		if (foreground.value !== foreground.defaultValue || background.value !== background.defaultValue) {
			window.onhashchange = null;

			location.hash = '#' + encodeURIComponent(foreground.value) + '-on-' + encodeURIComponent(background.value);

			setTimeout(function() {
				window.onhashchange = hashchange;
			}, 10);
		}

		var contrast = background.color.contrast(foreground.color);

		updateLuminance(background);
		updateLuminance(foreground);

		var min = contrast.min,
		    max = contrast.max,
		    range = max - min,
		    classes = [], percentages = [];

		for (var level in levels) {
			var bounds = levels[level].range,
			    lower = bounds[0],
			    upper = bounds[1];

			if (min < upper && max >= lower) {
				classes.push(level);

				percentages.push({
					level: level,
					percentage: 100 * rangeIntersect(min, max, upper, lower) / range
				});
			}
		}
		
		if(contrast.ratio<3&&contrast.ratio>=1){
			$('strong', output).textContent = "Bad";
		}
		else if(contrast.ratio<4.5&&contrast.ratio>=3){
			$('strong', output).textContent = "Fair";
		}
		else if(contrast.ratio<7){
			$('strong', output).textContent = "Good";
		}
		else if(contrast.ratio>=7&&contrast.ratio<=21){
			$('strong', output).textContent = "Great";
		}

		//$('strong', output).textContent = contrast.ratio;

		var error = $('.error', output);

		if (contrast.error) {
			error.textContent = '±' + contrast.error;
			error.title = min + ' - ' + max;
		}
		else {
			error.textContent = '';
			error.title = '';
		}

		if (classes.length <= 1) {
			results.textContent = messages[classes[0]];
			output.style.backgroundImage = '';
			output.style.backgroundColor = levels[classes[0]].color;
		}
		else {
			var fragment = document.createDocumentFragment();

			var p = document.createElement('p');
			p.textContent = messages.semitransparent;
			fragment.appendChild(p);

			var ul = document.createElement('ul');

			var message = '<p></p><ul>';

			results.textContent = '';
			results.appendChild(fragment);

			// Create gradient illustrating levels
			var stops = [], previousPercentage = 0;

			for (var i=0; i < 2 * percentages.length; i++) {
				var info = percentages[i % percentages.length];

				var level = info.level;
				var color = levels[level].color,
				    percentage = previousPercentage + info.percentage / 2;

				stops.push(color + ' ' + previousPercentage + '%', color + ' ' + percentage + '%');

				previousPercentage = percentage;
			}

			if (PrefixFree.functions.indexOf('linear-gradient') > -1) {
				// Prefixed implementation
				var gradient = 'linear-gradient(-45deg, ' + stops.join(', ') + ')';

				output.style.backgroundImage = PrefixFree.prefix + gradient;
			}
			else {
				var gradient = 'linear-gradient(135deg, ' + stops.join(', ') + ')';

				output.style.backgroundImage = gradient;
			}
		}

		output.className = classes.join(' ');

		ctx.clearRect(0, 0, 16, 16);

		ctx.fillStyle = background.color + '';
		ctx.fillRect(0, 0, 8, 16);

		ctx.fillStyle = foreground.color + '';
		ctx.fillRect(8, 0, 8, 16);

		$('link[rel="shortcut icon"]').setAttribute('href', canvas.toDataURL());
	}
}

function colorChanged(input) {
	input.style.width = input.value.length * .56 + 'em';
	input.style.width = input.value.length + 'ch';

	var isForeground = input == foreground;

	var display = isForeground? foregroundDisplay : backgroundDisplay;

	var previousColor = getComputedStyle(display).backgroundColor;

	// Match a 6 digit hex code, add a hash in front.
	if(input.value.match(/^[0-9a-f]{6}$/i)) {
		input.value = '#' + input.value;
	}

	display.style.background = input.value;

	var color = getComputedStyle(display).backgroundColor;

	if (color && input.value && (color !== previousColor || color === 'transparent' || color === 'rgba(0, 0, 0, 0)')) {
		// Valid & different color
		if (isForeground) {
			backgroundDisplay.style.color = input.value;
			document.getElementById("shape").style.backgroundColor = input.value;
		}

		input.color = new Color(color);

		return true;
	}

	return false;
}

function hashchange() {

	if (location.hash) {
		var colors = location.hash.slice(1).split('-on-');

		foreground.value = decodeURIComponent(colors[0]);
		background.value = decodeURIComponent(colors[1]);
		document.getElementById("shape").style.backgroundColor = decodeURIComponent(colors[0]);
		document.getElementById("word").style.color = decodeURIComponent(colors[1]);
	}
	else {
		foreground.value = foreground.defaultValue;
		background.value = background.defaultValue;
		document.getElementById("shape").style.backgroundColor = foreground.defaultValue;
		document.getElementById("word").style.color = background.defaultValue;
	}

	background.oninput();
	foreground.oninput();
}

background.oninput =
foreground.oninput = function() {
	var valid = colorChanged(this);

	if (valid) {
		update();
	}
};

swap.onclick = function() {
	var backgroundColor = background.value;
	background.value = foreground.value;
	foreground.value = backgroundColor;

	colorChanged(background);
	colorChanged(foreground);

	update();
};

window.encodeURIComponent = (function(){
	var encodeURIComponent = window.encodeURIComponent;

	return function (str) {
		return encodeURIComponent(str).replace(/[()]/g, function ($0) {
			return escape($0);
		});
	};
})();

window.decodeURIComponent = (function(){
	var decodeURIComponent = window.decodeURIComponent;

	return function (str) {
		return str.search(/%[\da-f]/i) > -1? decodeURIComponent(str) : str;
	};
})();

(onhashchange = hashchange)();