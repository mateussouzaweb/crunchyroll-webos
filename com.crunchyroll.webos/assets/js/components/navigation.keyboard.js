
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
        INFO: 457,
        TAB: 9,
        SPACE: 32,
        BACKSPACE: 8,
        DELETE: 46
    },

    /**
     * Find on parent elements the closest available navigable element
     * @param {String} direction
     * @param {Element} element
     * @param {Element} parent
     * @return {mixed}
     */
    findClosestOnParents: function(direction, element, parent){

        var self = this;
        var items = [];
        var closest = null;

        while( parent && closest == null ){
            items = Array.from( V.$$('[tabindex]', parent) );
            closest = self.findClosest(direction, element, items);
            parent = parent.parentElement;
        }

        return closest;
    },

    /**
     * Find next/closest available navigable element
     * @param {String} direction
     * @param {Element} element
     * @param {Array} items
     * @return {mixed}
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
     * Find the next TAB stop element respecting only [tabindex]
     * @param {String} direction
     * @param {Element} element
     * @return {Element}
     */
    findTabStopElement: function(direction, element){

        var items = Array.from( V.$$('[tabindex]') );
        var index;

        items = items.filter(function(item){
            return item.offsetWidth > 0
                  || item.offsetHeight > 0
                  || item === element;
        });

        index = items.indexOf(element);
        index = (direction == 'next') ? index + 1 : index - 1;

        return items[index] || items[0];
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
                && self.handleKeyPress(e) ){
                e.preventDefault();
            }
        });

        // Public
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
            self.usingMouse = false;

        var handleMouse = function(){

            if( self.usingMouse ){
                document.body.classList.add('mouse');
            }else{
                document.body.classList.remove('mouse');
            }

            if( !self.activeElement ){
                return;
            }

            if( self.usingMouse ){
                self.activeElement.classList.remove('hover');
            }else{
                self.activeElement.classList.add('hover');
            }

        }

        V.on(document, 'cursorStateChange', function(e){
            self.usingMouse = e.detail.visibility;
            handleMouse();
        });

        V.on(document, 'mouseenter mousemove', function(e){
            self.usingMouse = true;
            handleMouse();
        });

        V.on(document, 'mouseleave', function(e){
            self.usingMouse = false;
            handleMouse();
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
     * @param {Event} event
     * @return {Boolean}
     */
    handleKeyPress: function(event){

        var self = this;
        var body = document.body;
        var videoActive = body.classList.contains('video-active');
        var result;

        if( videoActive ){
            result = self.handleKeyOnVideo(event);
        }else{
            result = self.handleKeyNavigation(event);
        }

        self.lastKey = event.keyCode;
        self.lastKeyTime = new Date();

        return result;
    },

    /**
     * Handle key press for navigation
     * @param {Event} event
     * @return {Boolean}
     */
    handleKeyNavigation: function(event){

        var self = this;
        var keys = self.keys;
        var current = self.activeElement;
        var key = event.keyCode;

        if( !current ){
            return;
        }

        var directions = {};
            directions[ keys.RIGHT ] = 'right';
            directions[ keys.LEFT ] = 'left';
            directions[ keys.UP ] = 'up';
            directions[ keys.DOWN ] = 'down';

        // OK / INFO / SPACE
        if( key == keys.OK
            || key == keys.INFO
            || key == keys.SPACE ){

            if( current && current.classList.contains('select') ){
                current.firstChild.click();
            }else if( current && current.nodeName == 'INPUT' ){
                current.focus();
            }else if( current ){
                current.click();
            }

            return true;

        // TAB
        }else if( key == keys.TAB ){

            var next = self.findTabStopElement(
                (event.shiftKey) ? 'prev' : 'next',
                current
            );

            if( next != null ){
                self.setActiveElement(next);
            }

            return true;

        // RIGHT / LEFT / UP / DOWN
        }else if( directions[key] ){

            var closest = self.findClosestOnParents(
                directions[key],
                current,
                current.parentElement
            );

            if( closest != null ){
                self.setActiveElement(closest);
            }

            return true;
        }

        return false;
    },

    /**
     * Handle key press specific to video
     * @param {Event} event
     * @return {Boolean}
     */
    handleKeyOnVideo: function(event){

        var self = this;
        var keys = self.keys;
        var key = event.keyCode;

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

        // OK / SPACE
        }else if( key == keys.OK
                  || key == keys.SPACE ){
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
        }else if( key == keys.BACK
                  || key == keys.BACKSPACE
                  || key == keys.DELETE ){
            window.pauseVideo();
            window.hideVideo();
            return true;

        // UP (behavior as left navigation)
        // DOWN (behavior as right navigation)
        }else if( key == keys.UP
                  || key == keys.DOWN ){

            var current = self.activeElement;
            var parent = self.element;

            var closest = self.findClosestOnParents(
                (key == keys.UP) ? 'left' : 'right',
                current,
                parent
            );

            if( closest != null ){
                self.setActiveElement(closest);
            }

            return true;
        }

        return false;
    }

});