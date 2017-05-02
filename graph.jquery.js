/**
 * jQuery You-Draw-It plugin.
 *
 * Warning. This is an unfinished version, so use it (and I strongly
 * advise you to not) with extreme caution.
 */

(function($) {
    "use strict";

    var GraphDebug = {
        log: function(message, args, settings) {
            if (!settings.debug) {
                return;
            }

            for (var i = 0; i < args.length; i++) {
                message = message.replace(args[i][0], args[i][1]);
            }

            console.log(message);
        }
    };

    var GraphPoint = function(x, y, value) {
        this.x = 0;
        this.y = 0;
        this.value = value;

        if (typeof x !== 'undefined') {
            this.x = x;
        }

        if (typeof y !== 'undefined') {
            this.y = y;
        }
    };

    var GraphLine = function() {
        this.points = [];
        this.addPoint = function(x, y, value) {
            var point = new GraphPoint(x, y, value);
            this.points.push(point);
        };

        this.getLastPoint = function() {
            return this.points[this.points.length - 1];
        };

        this.compile = function() {
            var result = '';

            for (var i = 0; i < this.points.length; i++) {
                if (typeof this.points[i] === 'undefined') {
                    continue;
                }

                var prefix = ' L';

                if (result.length === 0) {
                    prefix = 'M';
                }

                result += '%pref%x %y'
                    .replace('%x', this.points[i].x)
                    .replace('%y', this.points[i].y)
                    .replace('%pref', prefix);
            }

            return result;
        }
    };

    var Graph = function(settings) {
        this.settings = {
            resX: 500,
            resY: 300,
            stepY: 0.05,
            bounds: 0,
            debug: false
        };
        if (typeof settings === 'undefined') {
            this.settings = $.extend(this.settings, settings);
        }

        this.points = {};

        this.map = function(points) {

        };
        this.render = function() {

        }
    };

    $.fn.graphCircle = function(attrs) {
        var defaults = {
            class: '',
            text: '',
            x: 0,
            y: 0,
            r: 5
        };

        attrs = $.extend(defaults, attrs);

        var $container = $('<g/>', {class: 'graph-circle-container ' + attrs.class});

        $('<circle/>', {
            r: 5,
            cx: attrs.x,
            cy: attrs.y
        }).appendTo($container);

        if (attrs.text !== '') {
            $('<text/>', {
                x: attrs.x,
                y: attrs.y,
                dy: '-0.3em'
            }).html(attrs.text).appendTo($container);
        }

        return $container.appendTo(this);
    };

    $.fn.graphRect = function(attrs) {
        var rect = $('<rect/>', attrs);

        if (typeof attrs.width !== 'undefined') {
            rect.attr('width', attrs.width);
        }

        if (typeof attrs.height !== 'undefined') {
            rect.attr('height', attrs.height);
        }

        if (typeof attrs.transform !== 'undefined') {
            rect.attr('transform', attrs.transform);
        }

        rect.appendTo(this);
    };

    $.fn.graph = function(settings) {
        var settingsDefault = {
            resX: 500,
            resY: 300,
            stepY: 0.05,
            points: [0],
            correct: [0],
            bounds: 0,
            textLeft: '',
            textRight: '',
            debug: false
        };

        if (typeof settings === 'undefined') {
            settings = $(this).data('settings');
        }

        // Apply settings.
        settings = $.extend(settingsDefault, settings);

        // Prepare elements.
        var $chart = this.find('.chart');
        var $chartContainer = $chart.find('.graph-container');
        var $gridX = $chart.find('.grid .gridX');
        var $gridY = $chart.find('.grid .gridY');

        // Fetch points data.
        var points = settings.points.concat(settings.correct);
        var bounds = {
            min: 0,
            max: points[0],
            castPosition: function(point) {
                return (1 - (point - this.min) / (this.max - this.min)) * settings.resY;
            },
            castValue: function(position) {
                return (1 - (position / settings.resY)) * this.max;
            }
        };

        // Define callbacks.
        var hidePlaceholder = function(x) {
            $chart.find('.rect-container > *').each(function(i) {
                //if ($(this).attr('x') <= x) {
                    //$(this).css('fill', 'rgba(0,0,0,0)')
                //}
		        if (i < x) {
			        $(this).css('fill', 'rgba(0,0,0,0)');
		        }
            });
        };

        // Find values boundaries.
        for (var i = 0; i < points.length; i++) {
            // bounds.min = Math.min(bounds.min, points[i]);
            bounds.max = Math.max(bounds.max, points[i]);
        }

        // Apply bounds padding.
        // bounds.min -= settings.bounds;
        bounds.max += settings.bounds;

        var linesYCount = Math.round((bounds.max - bounds.min) / settings.stepY);

        var stepWidth = settings.resX / (points.length - 1);
        var stepHeight = settings.resY / linesYCount;

        var leftLine = new GraphLine();
        var rightLine = new GraphLine();
        var areaPath = new GraphLine();

        areaPath.addPoint(0, settings.resY);

        // Clip path setup.
        $chart.find('.clip-path rect').css({
            width: this.attr('width') + 'px'
        });

        // Draw X lines with graph data.
        for (var i = 0; i < points.length; i++) {
            var posX = stepWidth * i;

            // Append a new line.
            $('<line/>', {
                y1: settings.resY,
                transform: 'translate(%x, 0)'.replace('%x', posX)
            }).appendTo($gridX);

            // Prepare lines data.
            var pointsPosY = bounds.castPosition(points[i]);
            if (i < settings.points.length) {
                // Left side points data.
                leftLine.addPoint(posX, pointsPosY, points[i]);
                hidePlaceholder(i);

                // Set clip rectangle dimensions.
                $chart.find('.clip-path rect').attr({
                    width: posX,
                    height: settings.resY
                }).css('width', posX);
            } else {
                // Right side points data.
                // TODO: I really need to rethink that later on.
                if (i === settings.points.length) {
                    rightLine.addPoint(stepWidth * (i - 1), bounds.castPosition(points[i - 1], points[i - 1]));
                }
                rightLine.addPoint(posX, pointsPosY, points[i]);

                // Prepare answer rectangle.
                $chart.find('.rect-container').graphRect({
                    class: 'answer-rect',
                    x: posX - stepWidth,
                    y: 0,
                    height: settings.resY,
                    width: posX / i
                });
            }

            areaPath.addPoint(posX, pointsPosY);
        }

        // Set line data.
        areaPath.addPoint(settings.resX, settings.resY);

        $chart.find('.graph-path-left').attr('d', leftLine.compile());
        $chart.find('.graph-path-right').attr('d', rightLine.compile());
        $chart.find('.correct-graph .area').attr('d', areaPath.compile());

        // Draw Y lines.
        for (var i = 0; i <= linesYCount; i++) {
            var posY = stepHeight * i;

            // Draw a new line.
            $('<line/>', {
                x1: settings.resX,
                transform: 'translate(0, %y)'.replace('%y', posY)
            }).appendTo($gridY);
        }

        // Draw circles.
        if (typeof leftLine.points[0] !== 'undefined') {
            var point = leftLine.points[0];
            $chartContainer.graphCircle({
                x: point.x,
                y: point.y,
                class: 'graph-path-left-point',
                text: point.value
            });
        }

        if (typeof leftLine.points[leftLine.points.length - 1] !== 'undefined') {
            var point = leftLine.points[leftLine.points.length - 1];
            $chartContainer.graphCircle({
                x: point.x,
                y: point.y,
                class: 'graph-path-left-point',
                text: point.value
            });
        }

        $chart.find('.correct-graph').graphCircle({
            class: 'graph-path-right-point',
            x: settings.resX,
            y: rightLine.getLastPoint().y,
            text: rightLine.getLastPoint().value,
            textOffset: 10
        });

        $chartContainer.graphCircle({
            class: 'graph-path-user-point',
            x: settings.resX,
            text: 0,
            textOffset: 10
        }).hide();

        // Draw text.
        if (typeof settings.textLeft !== '') {

        }

        if (typeof settings.textRight !== '') {

        }

        // Prepare ui callbacks.
        $chartContainer.graphRect({
            class: 'graph-ui-drag',
            x: rightLine.points[0].x,
            width: settings.resX - rightLine.points[0].x,
            height: settings.resY
        });

        // Refresh svg container.
        $chart.html($chart.html());

        // Append callbacks.
        var mouseState = {
            interaction: false,
            X: 0,
            Y: 0
        };

        var userLine = new GraphLine();

        var handleInteraction = function(e) {
            // AL.
            if (!mouseState.interaction || typeof e.type === 'undefined') {
                return;
            }

            // Fetch client mouse position.
            if (e.type.indexOf('touch') !== -1) {
                mouseState.x = e.touches[0].clientX;
                mouseState.y = e.touches[0].clientY;
            } else {
                mouseState.x = e.clientX;
                mouseState.y = e.clientY;
            }

            // Cast mouse position onto chart bounding box and clamp it.
            var clientBounds = $chart.find('.graph-ui-drag')[0].getBoundingClientRect();
            var mousePos = {
                x: Math.max(Math.min(mouseState.x - clientBounds.left, clientBounds.width), 0),
                y: Math.max(Math.min(mouseState.y - clientBounds.top, clientBounds.height), 0)
            };
            var pointIndex = Math.round(mousePos.x / stepWidth);
            if (pointIndex === 0) {
                pointIndex = 1;
            }

            var pointPosX = pointIndex * stepWidth;

            // Hide rect fillers.
            // DONE: I'm too tired right now to come up with
            // something relatively descent to describe the issue,
            // so I demand you to just read it and get it. I mean, it's
            // obviously bad, really. Meh.
	        hidePlaceholder(pointIndex);

            // Update user line.
            var pointValue = bounds.castValue(mousePos.y);
            if (userLine.points.length === 0) {
                userLine.addPoint(rightLine.points[0].x, rightLine.points[0].y);
            }
            userLine.points[pointIndex] = new GraphPoint(pointPosX + rightLine.points[0].x, mousePos.y, pointValue);
            $chart.find('.graph-path-user').attr('d', userLine.compile());

            // Debug info.
            GraphDebug.log('Point %i has been modified.', [['%i', pointIndex]], settings);
            GraphDebug.log('Mouse pos: %x %y', [['%x', mousePos.x], ['%y', mousePos.y]], settings);

            // Update the right point.
            var $rightCircle = $chart.find('.graph-path-user-point').show();
            $rightCircle.attr('transform', 'translate(0,%y)'.replace('%y', userLine.getLastPoint().y));
            $rightCircle.find('text').html(userLine.getLastPoint().value);

            // TODO: Reconsider architecture.
            if (userLine.points.length === rightLine.points.length) {
                e.preventDefault();

                // Chart done event.
                $(e.target).hide();
                revealGraph();
            }
        };

        var revealGraph = function() {
            var $graphClip = $chart.find('.clip-path > rect');
            var graphClipWidth = parseInt($graphClip.attr('width'));

            var graphCorrectWidth = $chart.find('.correct-graph')[0].getBoundingClientRect().width;

            $graphClip.prop('widthAttr', graphClipWidth)
                .stop()
                .css('width', '')
                .animate(
                    {
                        widthAttr: graphCorrectWidth
                    },
                    {
                        duration: 800,
                        step: function(now) {
                            $(this).attr('width', now);
                        }
                    }
                );
        };

        $chart.find('.graph-ui-drag')
            .on('touchstart', function(e) {
                mouseState.interaction = true;
                handleInteraction(e);
            })
            .on('touchend mouseleave', function(e) {
                mouseState.interaction = false;
            })
            .on('mousedown', function(e) {
                if (e.which === 1) {
                    mouseState.interaction = true;
                }

                handleInteraction(e);
            })
            .on('mouseup', function(e) {
                if (e.which === 1) {
                    mouseState.interaction = false;
                }
            })
            .on('mousemove touchmove', function(e) {
                e.preventDefault();
                handleInteraction(e);
            });
    };

})(jQuery);
