
V.component('[data-navigation-keyboard]', {

    /**
     * Keys mapping
     * @var {Object}
     */
    keys: {
        STOP: 413,
        PAUSE: 19,
        PLAY: 415,
        OK: 13,
        FORWARD: 417,
        BACKWARD: 412,
        BACK: 461,
        RIGHT: 39,
        LEFT: 37,
        UP: 38,
        DOWN: 40,
        INFO: 457
    },

    /**
     * Find next/closest available navigable element
     * @param {String} direction
     * @param {Element} element
     * @param {Array} items
     */
    findClosest: function(direction, element, items){

        var matches = [];
        var current = element.getBoundingClientRect();

        // Find matches
        items.forEach(function(itemElement){

            if( itemElement === element ){
                return;
            }

            var item = itemElement.getBoundingClientRect();

            // Item not visible in document
            if( item.width == 0 || item.height == 0 ){
                return;
            }

            var diff = false;

            if( direction == 'up' ){
                if( item.top < current.top ){
                    diff = current.top - item.top;
                }
            }else if( direction == 'down' ){
                if( item.top > current.bottom ){
                    diff = item.top - current.bottom;
                }
            }else if( direction == 'left' ){
                if( item.left < current.left ){
                    diff = current.left - item.left;
                }
            }else if( direction == 'right' ){
                if( item.left > current.right ){
                    diff = item.left - current.right;
                }
            }

            if( diff !== false ){
                matches.push({
                    element: itemElement,
                    diff: diff,
                    xDiff: Math.abs(current.top - item.top),
                    yDiff: Math.abs(current.left - item.left)
                });
            }
        });

        // Sort elements
        matches = matches.sort(function(a, b){
            return (a.diff + a.xDiff + a.yDiff) - (b.diff + b.xDiff + b.yDiff);
        });

        return (matches.length) ? matches[0].element : null;
    },

    /**
     * Constructor
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    constructor: function(resolve, reject){

        var self = this;
        var keys = self.keys;
        var _keys = Object.values(keys);

        // Events
        V.on(window, 'keydown', function(e){
            if( _keys.indexOf(e.keyCode) !== -1
                && self.handleKeyPress(e.keyCode) ){
                e.preventDefault();
            }
        });

        // V.on(window, 'blur', function(e){
        //     self.handleKeyPress(keys.PAUSE);
        // });

        // V.on(window, 'focus', function(e){
        //     self.handleKeyPress(keys.PLAY);
        // });

        // Public
        window.handleKeyPress = function(key){
            return self.handleKeyPress(key);
        };

        window.setActiveElement = function(element){
            return self.setActiveElement(element);
        };

        resolve(this);

    },

    /**
     * On render
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    onRender: function(resolve, reject){

        var self = this;
            self.lastKey = null;
            self.lastKeyTime = null;
            self.activeElement = null;
            self.cursorVisible = false;

        V.on(document, 'cursorStateChange', function(e){

            self.cursorVisible = e.detail.visibility;

            if( !self.activeElement ){
                return;
            }

            if( self.cursorVisible ){
                self.activeElement.classList.remove('hover');
            }else{
                self.activeElement.classList.add('hover');
            }

        });

        resolve(this);

    },

    /**
     * Set the current active element for navigation
     * @param {Element} element
     * @return {void}
     */
    setActiveElement: function(element){

        if( this.activeElement ){
            this.activeElement.classList.remove('hover');
            this.activeElement.blur();
        }

        element.scrollIntoViewIfNeeded();
        element.classList.add('hover');

        if( element.nodeName !== 'INPUT' ){
            element.focus();
        }

        this.activeElement = element;

    },

    /**
     * Handle key press
     * @param {Number} key
     * @return {Boolean}
     */
    handleKeyPress: function(key){

        var self = this;
        var body = document.body;
        var videoActive = body.classList.contains('video-active');
        var result;

        if( videoActive ){
            result = self.handleKeyOnVideo(key);
        }else{
            result = self.handleKeyNavigation(key);
        }

        self.lastKey = key;
        self.lastKeyTime = new Date();

        return result;
    },

    /**
     * Handle key press for navigation
     * @param {Number} key
     * @return {Boolean}
     */
    handleKeyNavigation: function(key){

        var self = this;
        var keys = self.keys;
        var current = self.activeElement;

        if( !current ){
            return;
        }

        var directions = {};
            directions[ keys.RIGHT ] = 'right';
            directions[ keys.LEFT ] = 'left';
            directions[ keys.UP ] = 'up';
            directions[ keys.DOWN ] = 'down';

        // OK / INFO
        if( key == keys.OK || key == keys.INFO ){

            if( current && current.classList.contains('select') ){
                current.firstChild.click();
            }else if( current && current.nodeName == 'INPUT' ){
                current.focus();
            }else if( current ){
                current.click();
            }

            return true;

        // RIGHT / LEFT / UP / DOWN
        }else if( directions[key] ){

            var parent = current.parentElement;
            var items = [];
            var closest = null;

            while( parent && closest == null ){
                items = Array.from( V.$$('[tabindex]', parent) );
                closest = self.findClosest(directions[key], current, items);
                parent = parent.parentElement;
            }

            if( closest != null ){
                self.setActiveElement(closest);
            }

            return true;
        }

        return false;
    },

    /**
     * Handle key press specific to video
     * @param {Number} key
     * @return {Boolean}
     */
    handleKeyOnVideo: function(key){

        var self = this;
        var keys = self.keys;

        // STOP
        if( key == keys.STOP ){
            window.stopVideo();
            return true;

        // PAUSE
        }else if( key == keys.PAUSE ){
            window.pauseVideo();
            return true;

        // PLAY
        }else if( key == keys.PLAY ){
            window.playVideo();
            return true;

        // OK
        }else if( key == keys.OK ){
            window.toggleVideo();
            return true;

        // FORWARD
        }else if( key == keys.FORWARD ){
            window.forwardVideo();
            return true;

        // BACKWARD
        }else if( key == keys.BACKWARD ){
            window.backwardVideo();
            return true;

        // RIGHT
        }else if( key == keys.RIGHT ){
            window.forwardVideo();
            return true;

        // LEFT
        }else if( key == keys.LEFT ){
            window.backwardVideo();
            return true;

        // BACK
        }else if( key == keys.BACK ){
            window.pauseVideo();
            window.hideVideo();
            return true;

        // UP (behavior as left navigation)
        // DOWN (behavior as right navigation)
        }else if( key == keys.UP || key == keys.DOWN ){

            var current = self.activeElement;
            var parent = V.$('.vjs-extra-action-bar');
            var items = Array.from( V.$$('[tabindex]', parent) );

            var closest = self.findClosest(
                (key == keys.UP) ? 'left' : 'right',
                current,
                items
            );

            if( closest != null ){
                self.setActiveElement(closest);
            }

            return true;
        }

        return false;
    }

});