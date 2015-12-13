/*global Touch: true */
/*global utils: true */

(function (window, utils) {
    'use strict';

    var defaults = {
        // 'longTap': true,
        onLongTap: function () {},
        onStart: function () {},
        onMove: function () {},
        onEnd: function () {},
    };

    var Touch = function (options) {
        options = options || {};
        this.options = {};
        $.extend(this.options, defaults, options);
        this.longTapEventEnabled = true;
        this.init();
    };

    Touch.prototype = {
        name: 'Touch',
        version: '0.1',
        longTapTimeout: null,
        longTapDelay: 750,
        longTapFired: false,

        touchEventPolyfill: function (e) {
            return {
                clientX: e.clientX,
                clientY: e.clientY,
                pageX: e.pageX,
                pageY: e.pageY,
                screenX: e.screenX,
                screenY: e.screenY,
                target: e.target,
                identifier: 'touchEventPolyfill'
            };
        },

        init: function () {
            this.isTouchSupported = !!('ontouchstart' in window);
            this._resetSettings();
            this._bind(this.options.$el);
        },

        destroy: function () {
            this._unBind(this.options.$el);
        },

        _checkTouch: function (changedTouches) {
            var i;
            for (i in changedTouches) {
                if (changedTouches[i].identifier === this.touch.startTouch.identifier) {
                    return true;
                }
                return false;
            }
        },

        longTap: function (e) {
            this.longTapTimeout = null;
            var longTapEvent = $.Event('longTap', {
                bubbles: false,
                changedTouches: e.changedTouches
            });
            if (this.touch.startTime) {
                // this.options.$el.trigger(longTapEvent);
                this.longTapFired = true;
                this.options.onLongTap(this.touch);
            }
        },

        cancelLongTap: function () {
            if (this.longTapTimeout) {
                clearTimeout(this.longTapTimeout);
            }
            this.longTapTimeout = null
        },

        _start: function (e) {
            // jQuery's originalEvent property
            e = (typeof e.originalEvent !== 'undefined') ? e.originalEvent : e;
            if ((typeof e.changedTouches === 'undefined')) {
                e.changedTouches = [this.touchEventPolyfill(e)];
            }

            if (typeof(e.changedTouches) === 'undefined' ||
                e.changedTouches.length === 0) {
                return;
            }
            var _this = this;
            var event = e;
            this.touch.startTime = utils.getTime();

            if (this.longTapEventEnabled) {
                this.longTapTimeout = setTimeout(function () {
                    _this.longTap(event);
                }, _this.longTapDelay)
            }

            e.preventDefault();
            utils.extend(this.touch.startTouch, e.changedTouches[0]);

            this.touch.detecting = true;

            this.touch.x = this.touch.startTouch.pageX;
            this.touch.y = this.touch.startTouch.pageY;

            this.options.onStart(this.touch);
        },

        _move: function (e) {
            // jQuery's originalEvent property
            e = (typeof e.originalEvent !== 'undefined') ? e.originalEvent : e;
            if ((typeof e.changedTouches === 'undefined')) {
                e.changedTouches = [this.touchEventPolyfill(e)];
            }

            if ((!this.touch.started &&
                    !this.touch.detecting) ||
                typeof(e.changedTouches) === 'undefined' ||
                e.changedTouches.length === 0) {
                return;
            }
            this.touch.currentTouch = e.changedTouches[0];
            this.touch.newY = e.changedTouches[0].pageY;
            this.touch.newX = e.changedTouches[0].pageX;
            // Oпределение
            if (this.touch.detecting) {
                if (!this._checkTouch(e.changedTouches)) {
                    return;
                }
                /*
                    Скроллит или листает?
                    Если смещение больше по оси х, чем по у, значит, пользователь листает.
                */
                this.touch.deltaX = this.touch.newX - this.touch.x;
                this.touch.deltaY = this.touch.newY - this.touch.y;
                if (Math.abs(this.touch.deltaX) >= Math.abs(this.touch.deltaY)) {
                    this.touch.horizontalDirection = true;
                } else {
                    this.touch.verticalDirection = true;
                }
                e.preventDefault();
                this.touch.started = true;
                this.touch.startTime = utils.getTime();
                this.touch.detecting = false;
                this.cancelLongTap();
            }
            if (this.touch.started) {
                e.preventDefault();
                if (!this._checkTouch(e.changedTouches)) {
                    return;
                }
                this.touch.deltaX = this.touch.newX - this.touch.x;
                this.touch.deltaY = this.touch.newY - this.touch.y;
                this.touch.isMooving = true;
                this.options.onMove(this.touch);
            }
        },

        _end: function (e) {
            if (!this.touch.detecting && !this.touch.started) {
                return;
            }
            this.cancelLongTap();
            // if (longTapTimeout) clearTimeout(longTapTimeout);
            if (!this._checkTouch(e.changedTouches)) {
                this.touch.started = false;
                this.touch.isMooving = false;
                this.touch.velocity = (utils.getTime() - this.touch.startTime);
                this.options.onEnd(this.touch);
                this._resetSettings();
                return;
            }
            e.preventDefault();
            if (this.touch.started) {
                this.touch.isMooving = false;
                this.touch.velocity = (utils.getTime() - this.touch.startTime);
                this.options.onEnd(this.touch);
                this._resetSettings();
            } else if (this.longTapFired) {
                this.longTapFired = false;
                this.options.onEnd(this.touch);
            }

        },

        _bind: function ($el) {
            var _this = this;
            $el.on('touchstart', function (e) {
                    _this._start(e);
                })
                .on('mousedown', function (e) {
                    _this._start(e);
                })
                .on('touchmove', function (e) {
                    _this._move(e);
                })
                .on('mousemove', function (e) {
                    _this._move(e);
                })
                .on('touchend touchcancel mouseup mouseleave', function (e) {
                    _this._end(e);
                });
        },

        _unBind: function ($el) {
            $el.off('touchstart touchmove touchend touchend touchcancel mousedown mousemove mouseup mouseleave transitionend webkitTransitionEnd');
        },

        _resetSettings: function () {
            this.touch = {
                fingerCount: 0,
                detecting: false,
                started: false,
                startTouch: {},
                currentTouch: {},
                newX: false,
                newY: false,
                deltaX: false,
                deltaY: false,
                x: false,
                y: false,
                horizontalDirection: false,
                verticalDirection: false,
                startTime: 0,
                velocity: 0,
                isMooving: false
            };
            this.touch.detecting = false;
            this.enabled = true;
            this.swipeTo = false;
            this.touch_move_rate = 0;
        }
    };

    if (typeof exports !== 'undefined') {
        exports.Touch = Touch;
    } else {
        window.Touch = Touch;
    }

})(window, utils);
