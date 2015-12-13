(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports);
    } else {
        factory((root.dragscroll = {}));
    }
}(this, function (exports) {
    'use strict';
    var _window = window;
    var _document = document;
    var touch_capable = (typeof _window.ontouchstart !== 'undefined');
    var mousemove = (touch_capable) ? 'touchmove' : 'mousemove';
    var mouseup = (touch_capable) ? 'touchend' : 'mouseup';
    var mousedown = (touch_capable) ? 'touchstart' : 'mousedown';
    var EventListener = 'EventListener';
    var addEventListener = 'add' + EventListener;
    var removeEventListener = 'remove' + EventListener;

    var dragged = [];
    var reset = function (i, el) {
        for (i = 0; i < dragged.length;) {
            el = dragged[i++];
            el[removeEventListener](mousedown, el.md, 0);
            _window[removeEventListener](mouseup, el.mu, 0);
            _window[removeEventListener](mousemove, el.mm, 0);
        }

        dragged = _document.getElementsByClassName('dragscroll');
        for (i = 0; i < dragged.length;) {
            (function (el, lastClientX, lastClientY, pushed) {
                el[addEventListener](
                    mousedown,
                    el.md = function (e) {
                        console.log(e);
                        if (window.spMapDrag) {
                            return;
                        }
                        pushed = 1;
                        lastClientX = (!touch_capable) ? e.clientX : e.changedTouches[0].clientX;
                        lastClientY = (!touch_capable) ? e.clientY : e.changedTouches[0].clientY;
                        // e.preventDefault();
                        // e.stopPropagation();
                    }, 0
                );

                _window[addEventListener](
                    mouseup, el.mu = function () {
                        if (window.spMapDrag) {
                            return;
                        }
                        pushed = 0;
                    }, 0
                );

                _window[addEventListener](
                    mousemove,
                    el.mm = function (e, scroller) {
                        if (window.spMapDrag) {
                            return;
                        }
                        scroller = el.scroller || el;
                        if (pushed) {
                            scroller.scrollLeft -=
                                (-lastClientX + (lastClientX = (!touch_capable) ? e.clientX : e.changedTouches[0].clientX));
                            scroller.scrollTop -=
                                (-lastClientY + (lastClientY = (!touch_capable) ? e.clientY : e.changedTouches[0].clientY));
                        }
                        // e.preventDefault();
                        // e.stopPropagation();
                    }, 0
                );
            })(dragged[i++]);
        }
    };

    document.addEventListener(
        'DOMContentLoaded',
        function () {
            reset();
        }
    );

    // if (_document.readyState === 'complete') {
    // } else {
    //     _window[addEventListener]('load', reset, 0);
    // }

    exports.reset = reset;
}));
