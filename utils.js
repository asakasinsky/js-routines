window.utils = (function (window, document, Math) {
    'use strict';

    if (!String.prototype.trim) {
        (function () {
            // Вырезаем BOM и неразрывный пробел
            String.prototype.trim = function () {
                return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
            };
        })();
    }

    var _getElementsByClassName = function () {
        if (document.getElementsByClassName == undefined) {
            document.getElementsByClassName = function (className) {
                var hasClassName = new RegExp("(?:^|\\s)" + className + "(?:$|\\s)");
                var allElements = document.getElementsByTagName("*");
                var results = [];
                var element;
                for (var i = 0;
                    (element = allElements[i]) != null; i++) {
                    var elementClass = element.className;
                    if (elementClass && elementClass.indexOf(className) != -1 && hasClassName.test(elementClass)) {
                        results.push(element);
                    }
                }
                return results;
            }
        }
    };

    var _grace_degradation = function () {
        _getElementsByClassName();
    }
    _grace_degradation();

    var u = {};

    var _elementStyle = document.createElement('div').style;
    var _vendor = (function () {
        var vendors = ['t', 'webkitT', 'MozT', 'msT', 'OT'],
            transform,
            i = 0,
            l = vendors.length;

        for (; i < l; i++) {
            transform = vendors[i] + 'ransform';
            if (transform in _elementStyle) return vendors[i].substr(0, vendors[i].length - 1);
        }

        return false;
    })();

    function _prefixStyle(style) {
        if (_vendor === false) return false;
        if (_vendor === '') return style;
        return _vendor + style.charAt(0).toUpperCase() + style.substr(1);
    }

    u.getTransformProperty = function () {
        var properties = [
            'WebkitTransform',
            'msTransform',
            'MozTransform',
            'OTransform',
            'transform'
        ];
        var p;
        while (p = properties.shift()) {
            if (typeof _elementStyle[p] !== 'undefined') {
                return p;
            }
        }
        return false;
    };


    u.getTransformDeclarations = function (transformstyle) {
        var obj = (transformstyle.match(/([\w]+)\(([^\)]+)\)/g) || [])
            // make pairs of prop and value
            .map(function (it) {
                return it.replace(/\)$/, '').split(/\(/);
            })
            // convert to key-value map/object
            .reduce(
                function (m, it) {
                    return m[it[0]] = it[1], m;
                }, {}
            );
        return obj;
    }

    /**
     * Retrieves element transformation as a matrix
     *
     * Note that this will only take translate and rotate in account,
     * also it always reports px and deg, never % or turn!
     *
     * @param elementId
     * @return string matrix
     */
    u.cssToMatrix = function (element) {
        if (!element.nodeName) {
            return false;
        }
        var style = window.getComputedStyle(element);
        return style.getPropertyValue('-webkit-transform') ||
            style.getPropertyValue('-moz-transform') ||
            style.getPropertyValue('-ms-transform') ||
            style.getPropertyValue('-o-transform') ||
            style.getPropertyValue('transform');
    };

    /**
     * How to extract position, rotation and scale from matrix SVG
     * http://stackoverflow.com/a/16372587
     *
     * transform - CSS | MDN
     * https://developer.mozilla.org/en-US/docs/Web/CSS/transform
     *
     * Find the Rotation and Skew of a Matrix transformation
     * http://stackoverflow.com/a/5108516
     *
     *
     * [matrixToTransformObj description]
     * @param  {[type]} matrixProperty [description]
     * @return {[type]}                [description]
     */
    u.matrixToTransformObj = function (matrixProperty) {
        // this happens when there was no rotation yet in CSS
        if (matrixProperty === 'none') {
            matrixProperty = 'matrix(0,0,0,0,0)';
        }
        var _DEG2RAD = Math.PI / 180;
        var _RAD2DEG = 180 / Math.PI;

        var rotate = 0;
        var scaleX = 0;
        var scaleY = 0;
        var skewX = 0;
        var skewY = 0;

        var i;
        var n;
        var dec;
        var rnd = 100000;

        var matrix = matrixProperty.match(/([-+]?[\d\.]+)/g);
        // Форсируем 2D
        matrix = (matrix.length > 6) ? [
                matrix[0],
                matrix[1],
                matrix[4],
                matrix[5],
                matrix[12],
                matrix[13]
            ] :
            matrix;

        i = matrix.length;
        while (--i > -1) {
            n = Number(matrix[i]);
            matrix[i] = (dec = n - (n |= 0)) ? ((dec * rnd + (dec < 0 ? -0.5 : 0.5)) | 0) / rnd + n : n;
            // convert strings to Numbers and round to 5 decimal places to avoid
            // issues with tiny numbers. Roughly 20x faster than Number.toFixed().
            // We also must make sure to round before dividing so that values
            // like 0.9999999999 become 1 to avoid glitches in browser rendering
            // and interpretation of flipped/rotated 3D matrices. And don't just
            // multiply the number by rnd, floor it, and then divide by rnd because
            // the bitwise operations max out at a 32-bit signed integer, thus it
            // could get clipped at a relatively low value (like 22,000.00000 for example).
        }

        var a = matrix[0] || 0;
        var b = matrix[1] || 0;
        var c = matrix[2] || 0;
        var d = matrix[3] || 0;

        // Make sure matrix is not singular
        if (a * d - b * c) {
            skewY = (Math.round(
                Math.atan2(
                    parseFloat(b),
                    parseFloat(a)
                ) * _RAD2DEG) || 0).toString() + 'deg';

            skewX = -(Math.round(
                Math.atan2(
                    parseFloat(d),
                    parseFloat(c)
                ) * _RAD2DEG - 90) || 0).toString() + 'deg';

            rotate = skewY;

            scaleX = Math.sqrt(a * a + b * b);
            scaleY = Math.sqrt(c * c + d * d);
        }

        return {
            rotate: rotate,
            scaleX: scaleX,
            scaleY: scaleY,
            skewX: skewX,
            skewY: skewY,
            translateX: matrix[4],
            translateY: matrix[5]
        };
    };
    u.getTransformObj = function (selector) {
        var el = document.querySelector(selector);
        var matrix = u.cssToMatrix(el);
        var transformObj = u.matrixToTransformObj(matrix);
        return transformObj;
    };


    /**
     * Swap the elements in an array at indexes x and y.
     *
     * @param (a) The array.
     * @param (x) The index of the first element to swap.
     * @param (y) The index of the second element to swap.
     * @return {Array} A new array with the elements swapped.
     */
    u.swapArrayElements = function (a, x, y) {
        if (a.length === 1) {
            return a;
        }
        a.splice(y, 1, a.splice(x, 1, a[y])[0]);
        return a;
    };

    u.closest = function (el, fn) {
        while (el) {
            if (fn(el)) {
                return el;
            }
            el = el.parentNode;
        }
        return false;
    };

    /*
     * Is property defined?
     */
    u.isDefined = function (property) {
        // workaround https://github.com/douglascrockford/JSLint/commit/24f63ada2f9d7ad65afc90e6d949f631935c2480
        var propertyType = typeof property;

        return propertyType !== 'undefined';
    };

    /*
     * Is property a function?
     */
    u.isFunction = function (property) {
        return typeof property === 'function';
    };

    /*
     * Is property an object?
     *
     * @return bool Returns true if property is null, an Object, or subclass of Object (i.e., an instanceof String, Date, etc.)
     */
    u.isObject = function (property) {
        return typeof property === 'object';
    };

    /*
     * Is property a string?
     */
    u.isString = function (property) {
        return typeof property === 'string' || property instanceof String;
    };

    u.isArray = function (collection) {
        if (Array.isArray) {
            return Array.isArray(collection);
        }
        return Object.prototype.toString.call(collection) === '[object Array]';
    };

    // Взял у Красимира Тонева
    // http://krasimirtsonev.com/blog/article/Javascript-template-engine-in-just-20-line
    u.templateEngine = function (html, options) {
        var re = /{{([^%>]+)?}}/g;
        var reExp = /(^( )?(if|for|else|switch|case|break|{|}))(.*)?/g;
        var code = 'var r=[];\n';
        var cursor = 0;
        var match;
        var add = function (line, js) {
            js ? (code += line.match(reExp) ? line + '\n' : 'r.push(' + line + ');\n') :
                (code += line !== '' ? 'r.push("' + line.replace(/"/g, '\\"') + '");\n' : '');
            return add;
        };
        while (match = re.exec(html)) {
            add(html.slice(cursor, match.index))(match[1], true);
            cursor = match.index + match[0].length;
        }
        add(html.substr(cursor, html.length - cursor));
        code += 'return r.join("");';
        return new Function(code.replace(/[\r\t\n]/g, '')).apply(options);
    };


    u.guid = function () {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    };

    u.prefixStyle = function (style) {
        return _prefixStyle(style);
    }

    u.getTime = Date.now || function getTime() {
        return new Date().getTime();
    };

    u.extend = function (target, obj) {
        for (var i in obj) {
            target[i] = obj[i];
        }
    };

    u.momentum = function (current, start, time, lowerMargin, wrapperSize, deceleration) {
        var distance = current - start,
            speed = Math.abs(distance) / time,
            destination,
            duration;
        deceleration = deceleration === undefined ? 0.0006 : deceleration;

        destination = current + (speed * speed) / (2 * deceleration) * (distance < 0 ? -1 : 1);
        duration = speed / deceleration;

        if (destination < lowerMargin) {
            destination = wrapperSize ? lowerMargin - (wrapperSize / 2.5 * (speed / 8)) : lowerMargin;
            distance = Math.abs(destination - current);
            duration = distance / speed;
        } else if (destination > 0) {
            destination = wrapperSize ? wrapperSize / 2.5 * (speed / 8) : 0;
            distance = Math.abs(current) + destination;
            duration = distance / speed;
        }
        return {
            destination: Math.round(destination),
            duration: duration
        };
    };

    var _transform = _prefixStyle('transform');

    u.extend(u, {
        hasTransform: _transform !== false,
        hasPerspective: _prefixStyle('perspective') in _elementStyle,
        hasTouch: 'ontouchstart' in window,
        hasPointer: navigator.msPointerEnabled,
        hasTransition: _prefixStyle('transition') in _elementStyle
    });

    // This should find all Android browsers lower than build 535.19 (both stock browser and webview)
    u.isBadAndroid = /Android /.test(window.navigator.appVersion) && !(/Chrome\/\d/.test(window.navigator.appVersion));

    u.extend(u.style = {}, {
        transform: _transform,
        transitionTimingFunction: _prefixStyle('transitionTimingFunction'),
        transitionDuration: _prefixStyle('transitionDuration'),
        transitionDelay: _prefixStyle('transitionDelay'),
        transformOrigin: _prefixStyle('transformOrigin')
    });

    u.hasClass = function (el, cls) {
        var result = false;
        try {
            result = (el.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)'))[0] !== -1) ? true : false;
        } catch (e) {
            result = false;
        }
        return result;
    };

    u.addClass = function (el, cls) {
        if (!this.hasClass(el, cls)) {
            el.className += " " + cls;
            return true;
        } else {
            return false;
        }
    };

    u.removeClass = function (el, cls) {
        if (this.hasClass(el, cls)) {
            var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
            el.className = el.className.replace(reg, ' ');
        }
    };

    u.bindEvent = function (elem, evType, fn, useCapture) {
        useCapture = useCapture || false;
        if (elem.addEventListener) {
            elem.addEventListener(evType, fn, useCapture);
            return true;
        } else if (elem.attachEvent) {

            var eProp = evType + fn;
            elem['e' + eProp] = fn;
            elem[eProp] = function () {
                elem['e' + eProp](window.event);
            }
            var r = elem.attachEvent('on' + evType, elem[eProp]);
            return r;
        } else {
            elem['on' + evType] = fn;
        }
    };

    u.unbindEvent = function (elem, evType, fn, useCapture) {
        useCapture = useCapture || false;
        if (elem.removeEventListener) {
            elem.removeEventListener(evType, fn, useCapture);
            return true;
        } else if (elem.detachEvent) {

            var eProp = evType + fn;
            var r = elem.detachEvent('on' + evType, elem[eProp]);
            elem[eProp] = null;
            elem["e" + eProp] = null;
            return r;
        } else {
            elem['on' + evType] = fn;
        }
    };

    u.offset = function (el) {
        var left = -el.offsetLeft,
            top = -el.offsetTop;

        // jshint -W084
        while (el = el.offsetParent) {
            left -= el.offsetLeft;
            top -= el.offsetTop;
        }
        // jshint +W084

        return {
            left: left,
            top: top
        };
    };

    u.ease = {
        quadratic: {
            style: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            fn: function (k) {
                return k * (2 - k);
            }
        },
        circular: {
            style: 'cubic-bezier(0.1, 0.57, 0.1, 1)', // Not properly "circular" but this looks better, it should be (0.075, 0.82, 0.165, 1)
            fn: function (k) {
                return Math.sqrt(1 - (--k * k));
            }
        },
        back: {
            style: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            fn: function (k) {
                var b = 4;
                return (k = k - 1) * k * ((b + 1) * k + b) + 1;
            }
        },
        bounce: {
            style: '',
            fn: function (k) {
                if ((k /= 1) < (1 / 2.75)) {
                    return 7.5625 * k * k;
                } else if (k < (2 / 2.75)) {
                    return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
                } else if (k < (2.5 / 2.75)) {
                    return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
                } else {
                    return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
                }
            }
        },
        elastic: {
            style: '',
            fn: function (k) {
                var f = 0.22,
                    e = 0.4;

                if (k === 0) {
                    return 0;
                }
                if (k === 1) {
                    return 1;
                }

                return (e * Math.pow(2, -10 * k) * Math.sin((k - f / 4) * (2 * Math.PI) / f) + 1);
            }
        }
    }

    return u;
})(window, document, Math);
