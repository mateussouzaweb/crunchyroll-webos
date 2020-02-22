/**
 * Make request on Crunchyroll API
 * @param {String} method
 * @param {String} endpoint
 * @param {Object} data
 * @return {Promise}
 */
function apiRequest(method, endpoint, data){

    var url = 'https://api.crunchyroll.com';
        url += endpoint + '.0.json';

    data.version = '0';
    data.connectivity_type = 'ethernet';

    if( method == 'POST' ){

        var formData = new FormData();
        for ( var key in data ) {
            formData.append(key, data[key]);
        }

        return V.http.request(method, url, formData);
    }

    return V.http.request(method, url, data);
}

/**
 * Create UUID V4
 * @return {String}
 */
function createUuid(){
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.
    replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Format time
 * @param {Number} time
 * @return {Object}
 */
function formatTime(time){

    var result = new Date(time * 1000).toISOString().substr(11, 8);
    var minutes = result.substr(3, 2);
    var seconds = result.substr(6, 2);

    return {
        m: minutes,
        s: seconds
    }
}

/**
 * Find next/closest available navigable element
 * @param {String} direction
 * @param {Element} element
 * @param {Array} items
 */
function findClosest(direction, element, items){

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
}

V.component('[data-keyboard-navigation]', {

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
                closest = findClosest(directions[key], current, items);
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

            var closest = findClosest(
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

V.component('[data-history-navigation]', {

    /**
     * Constructor
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    constructor: function(resolve, reject){

        var self = this;

        // Public
        window.pushHistory = function(route){
            return self.pushHistory(route);
        };
        window.resetHistory = function(){
            return self.resetHistory();
        };

        resolve(this);

    },

    /**
     * Push history on navigation
     * @param {String} route
     * @return {void}
     */
    pushHistory: function(route){

        // PUSH
        history.pushState({
            route: route
        }, document.title);

    },

    /**
     * Reset browsing history
     * @return {void}
     */
    resetHistory: function(){
        history.go(0);
    }

});

V.component('[data-loading]', {

    /**
     * Constructor
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    constructor: function(resolve, reject){

        var self = this;

        // Public
        window.showLoading = function(){
            return self.showLoading();
        };
        window.hideLoading = function(){
            return self.hideLoading();
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

        // Private
        self.on('show', function(e){
            e.preventDefault();
            self.showLoading();
        });

        self.on('hide', function(e){
            e.preventDefault();
            self.hideLoading();
        });

        resolve(this);

    },

    /**
     * Show loading box
     * @return {void}
     */
    showLoading: function(){
        var element = this.element;
            element.classList.add('active');
    },

    /**
     * Hide loading box
     * @return {void}
     */
    hideLoading: function(){
        var element = this.element;
            element.classList.remove('active');
    }

});

V.component('[data-login]', {

    /**
     * Constructor
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    constructor: function(resolve, reject){

        var self = this;

        // Public
        window.showLogin = function(){
            return self.showLogin();
        };
        window.hideLogin = function(){
            return self.hideLogin();
        }
        window.makeLogin = function(){
            return self.makeLogin();
        }
        window.makeLogout = function(){
            return self.makeLogout();
        }
        window.getSessionData = function(){
            return self.getSessionData();
        }
        window.isLoggedIn = function(){
            return self.isLoggedIn();
        }

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
            self.firstLogin = false;

        // Private
        self.on('show', function(e){
            e.preventDefault();
            self.showLogin();
        });

        self.on('hide', function(e){
            e.preventDefault();
            self.hideLogin();
        });

        self.on('submit', 'form', function(e){
            e.preventDefault();
            self.makeLogin();
        });

        self.on('login', function(e){
            e.preventDefault();
            self.makeLogin();
        });

        self.on('logout', function(e){
            e.preventDefault();
            self.makeLogout();
        });

        // Init
        self.loadSessionData();

        if( !self.isLoggedIn() ){
            self.firstLogin = true;
            self.showLogin();
        }

        resolve(this);
    },

    /**
     * Retrieve login data
     * @return {Object}
     */
    getSessionData: function(){

        var data = localStorage.getItem('cr');
            data = ( data ) ? JSON.parse(data) : {};

        return data;
    },

    /**
     * Set login data
     * @param {Object} data
     * @return {void}
     */
    setSessionData: function(data){
        localStorage.setItem('cr', JSON.stringify(data));
        window.updateMenu();
    },

    /**
     * Load login data
     * @return {void}
     */
    loadSessionData: function(){

        var self = this;
        var element = self.element;
        var data = this.getSessionData();

        if( data.email ){
            V.$('input#email', element).value = data.email;
        }
        if( data.password ){
            V.$('input#password', element).value = data.password;
        }
        if( data.locale ){
            V.$('select#locale', element).value = data.locale;
        }

    },

    /**
     * Return if is logged in
     * @return {Boolean}
     */
    isLoggedIn: function(){

        var data = this.getSessionData();

        if( data.expires &&
            new Date() < new Date(data.expires) ){
            return true;
        }

        // Clear all session data
        this.setSessionData({});

        return false;
    },

    /**
     * Show login box
     * @return {void}
     */
    showLogin: function(){
        var element = this.element;
            element.classList.add('active');

        window.setActiveElement( V.$('#login label') );
    },

    /**
     * Hide login box
     * @return {void}
     */
    hideLogin: function(){
        var element = this.element;
            element.classList.remove('active');
    },

    /**
     * Try make login on Crunchyroll
     * @return {Promise}
     */
    makeLogin: function(){

        var self = this;
        var element = this.element;

        var message = V.$('#message', element);
            message.innerHTML = '';

        var email = V.$('input#email', element);
        var password = V.$('input#password', element);
        var locale = V.$('select#locale', element);

        var accessToken = 'LNDJgOit5yaRIWN';
        var deviceType = 'com.crunchyroll.windows.desktop';
        var deviceId = createUuid();
        var sessionId = null;

        window.showLoading();

        return apiRequest('GET', '/start_session', {
            access_token: accessToken,
            device_type: deviceType,
            device_id: deviceId,
            locale: locale.value
        })
        .then(function(response){

            if( response.error ){
                throw new Error('Session cannot be started.');
            }

            sessionId = response.data.session_id;

            return apiRequest('POST', '/login', {
                session_id: sessionId,
                account: email.value,
                password: password.value,
                locale: locale.value
            });
        })
        .then(function(response){

            if( response.error ){
                throw new Error('Invalid login.');
            }

            self.setSessionData({
                accessToken: accessToken,
                deviceType: deviceType,
                deviceId: deviceId,
                sessionId: sessionId,
                locale: locale.value,
                email: email.value,
                password: password.value,
                userId: response.data.user.user_id,
                userName: response.data.user.username,
                auth: response.data.auth,
                expires: response.data.expires
            });

            self.hideLogin();
            window.hideLoading();

            if( self.firstLogin ){
                self.firstLogin = false;
                V.trigger('.menu-link.active', 'click');
            }

            return response;
        })
        .catch(function(error){

            password.value = '';
            message.innerHTML = error.message;

            self.showLogin();
            window.hideLoading();

        });
    },

    /**
     * Try make logout on Crunchyroll
     * @return {Promise}
     */
    makeLogout: function(){

        if( !this.isLoggedIn() ){
            this.showLogin();
            return Promise.resolve();
        }

        var self = this;
        var element = this.element;

        var password = V.$('input#password', element);
            password.value = '';

        var message = V.$('#message', element);
            message.innerHTML = '';

        var data = this.getSessionData();

        self.showLogin();
        window.showLoading();

        return apiRequest('POST', '/logout', {
            session_id: data.sessionId,
            locale: data.locale
        }).then(function(response){

            // Clear all session data
            self.setSessionData({});
            self.firstLogin = true;

            window.hideLoading();

            return response;
        })
        .catch(function(error){
            message.innerHTML = error.message;
            window.hideLoading();
        });
    }

});

V.component('[data-menu]', {

    /**
     * Constructor
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    constructor: function(resolve, reject){

        var self = this;

        // Public
        window.updateMenu = function(){
            return self.updateMenu();
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
        var element = this.element;
        var content = V.$('#content');

        self.on('click', '.menu-link', function(e){

            e.preventDefault();

            V.$('.menu-link.active', element).classList.remove('active');
            this.classList.add('active');

            var html = '';
                html += '<div class="inside" ';
                html += 'data-' + this.dataset.content + '>';
                html += '</div>';

            content.innerHTML = html;
            V.mount(content);

            window.setActiveElement(this);

        });

        self.on('click', '.account-logout', function(e){
            window.makeLogout();
            window.resetHistory();
        });

        self.updateMenu();

        if( window.isLoggedIn() ){
            V.trigger('.menu-link.active', 'click');
        }

        resolve(this);
    },

    /**
     * Update menu
     * @return {void}
     */
    updateMenu: function(){

        var element = this.element;

        if( !element ){
            return;
        }

        var data = window.getSessionData();
        var name = V.$('.account-name', element);

        if( data.userName ){
            name.innerHTML = data.userName
            element.classList.add('logged');
        }else{
            name.innerHTML = '';
            element.classList.remove('logged');
        }

    }

});

V.component('[data-queue]', {

    /**
     * Constructor
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    constructor: function(resolve, reject){

        var self = this;

        // Public
        window.listQueue = function(){
            return self.listQueue();
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

        // Private
        self.on('show-queue', function(e){
            e.preventDefault();
            self.listQueue();
        });

        resolve(this);

    },

    /**
     * After render
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    afterRender: async function(resolve, reject){
        await this.listQueue();
        resolve(this);
    },

    /**
     * List queue
     * @return {Promise}
     */
    listQueue: function(){

        var data = window.getSessionData();
        var self = this;
        var element = self.element;
        var html = '';

        var fields = [
            'image.full_url',
            'image.fwide_url',
            'image.fwidestar_url',
            'image.height',
            'image.large_url',
            'image.medium_url',
            'image.small_url',
            'image.thumb_url',
            'image.wide_url',
            'image.widestar_url',
            'image.width',
            'media.availability_notes',
            'media.available',
            'media.available_time',
            'media.bif_url',
            'media.class',
            'media.clip',
            'media.collection_id',
            'media.collection_name',
            'media.created',
            'media.description',
            'media.duration',
            'media.episode_number',
            'media.free_available',
            'media.free_available_time',
            'media.free_unavailable_time',
            'media.media_id',
            'media.media_type',
            'media.name',
            'media.playhead',
            'media.premium_available',
            'media.premium_available_time',
            'media.premium_only',
            'media.premium_unavailable_time',
            'media.screenshot_image',
            'media.series_id',
            'media.series_name',
            'media.stream_data',
            'media.unavailable_time',
            'media.url',
            'last_watched_media',
            'last_watched_media_playhead',
            'most_likely_media',
            'most_likely_media_playhead',
            'ordering',
            'playhead',
            'queue_entry_id',
            'series',
            'series.class',
            'series.collection_count',
            'series.description',
            'series.genres',
            'series.in_queue',
            'series.landscape_image',
            'series.media_count',
            'series.media_type',
            'series.name',
            'series.portrait_image',
            'series.publisher_name',
            'series.rating',
            'series.series_id',
            'series.url',
            'series.year'
        ];

        window.pushHistory('queue');
        window.showLoading();

        return apiRequest('POST', '/queue', {
            session_id: data.sessionId,
            locale: data.locale,
            media_types: 'anime',
            fields: fields.join(',')
        }).then(function(response){

            if( response.error
                && response.code == 'bad_session' ){
                return window.makeLogin().then(function(){
                    return self.listQueue();
                });
            }

            html += '<h1>Queue</h1>';
            html += '<div class="list-items">';
                response.data.map(function(item){
                    html += self.toQueue(item);
                }).join('');
            html += '</div>';

            element.innerHTML = html;
            V.mount(element);

            window.hideLoading();
            window.setActiveElement( V.$('#content .list-item') );

        })
        .catch(function(error){
            window.hideLoading();
        });
    },

    /**
     * Transform data to queue item
     * @param {Object} data
     * @return {String}
     */
    toQueue: function(data){

        var html = '';
        var serie = data.series;
        var episode = data.last_watched_media;
        var playhead = episode.playhead;
        var duration = episode.duration;

        html += '<div class="list-item queue-item" tabindex="-1"';
        html += 'data-episode ';
        html += 'data-episode-id="{EPISODE_ID}" ';
        html += 'data-episode-number="{EPISODE_NUMBER}" ';
        html += 'data-episode-name="{EPISODE_NAME}" ';
        html += 'data-episode-duration="{EPISODE_DURATION}" ';
        html += 'data-episode-playhead="{EPISODE_PLAYHEAD}" ';
        html += 'data-episode-premium="{EPISODE_PREMIUM}" ';
        html += 'data-serie-id="{SERIE_ID}" ';
        html += 'data-serie-name="{SERIE_NAME}">';
            html += '<div class="list-item-image">';
                html += '<img src="{EPISODE_IMAGE}" />';
            html += '</div>';
            html += '<div class="list-item-info">';
                html += '<h2>{SERIE_NAME}</h2>';
                html += '<h3>{EPISODE_NUMBER} - {EPISODE_NAME}</h3>';
            html += '</div>';
        html += '</div>';

        html = html
        .replace('{EPISODE_ID}', episode.media_id)
        .replace('{SERIE_NAME}', serie.name)
        .replace('{SERIE_NAME}', serie.name)
        .replace('{SERIE_ID}', serie.series_id)
        .replace('{EPISODE_NAME}', episode.name)
        .replace('{EPISODE_NAME}', episode.name)
        .replace('{EPISODE_NUMBER}', episode.episode_number)
        .replace('{EPISODE_NUMBER}', episode.episode_number)
        .replace('{EPISODE_IMAGE}', episode.screenshot_image.full_url)
        .replace('{EPISODE_DURATION}', duration)
        .replace('{EPISODE_PLAYHEAD}', playhead)
        .replace('{EPISODE_PREMIUM}', (!episode.free_available) ? 1 : 0);

        return html;
    }

});

V.component('[data-history]', {

    /**
     * Constructor
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    constructor: function(resolve, reject){

        var self = this;

        // Public
        window.listHistory = function(){
            return self.listHistory();
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

        // Private
        self.on('show-history', function(e){
            e.preventDefault();
            self.listHistory();
        });

        resolve(this);

    },

    /**
     * After render
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    afterRender: async function(resolve, reject){
        await this.listHistory();
        resolve(this);
    },

    /**
     * List history
     * @return {Promise}
     */
    listHistory: function(){

        var data = window.getSessionData();
        var self = this;
        var element = self.element;
        var html = '';

        var fields = [
            'media',
            'media.availability_notes',
            'media.available',
            'media.available_time',
            'media.bif_url',
            'media.class',
            'media.clip',
            'media.collection_id',
            'media.collection_name',
            'media.created',
            'media.description',
            'media.duration',
            'media.episode_number',
            'media.free_available',
            'media.free_available_time',
            'media.free_unavailable_time',
            'media.media_id',
            'media.media_type',
            'media.name',
            'media.playhead',
            'media.premium_available',
            'media.premium_available_time',
            'media.premium_only',
            'media.premium_unavailable_time',
            'media.screenshot_image',
            'media.series_id',
            'media.series_name',
            'media.stream_data',
            'media.unavailable_time',
            'media.url',
            'playhead',
            'timestamp',
            'series',
            'series.class',
            'series.collection_count',
            'series.description',
            'series.genres',
            'series.in_queue',
            'series.landscape_image',
            'series.media_count',
            'series.media_type',
            'series.name',
            'series.portrait_image',
            'series.publisher_name',
            'series.rating',
            'series.series_id',
            'series.url',
            'series.year'
        ];

        window.pushHistory('history');
        window.showLoading();

        return apiRequest('POST', '/recently_watched', {
            session_id: data.sessionId,
            locale: data.locale,
            fields: fields.join(','),
            limit: 8,
            offset: 0
        }).then(function(response){

            if( response.error
                && response.code == 'bad_session' ){
                return window.makeLogin().then(function(){
                    return self.listHistory();
                });
            }

            html += '<h1>History</h1>';
            html += '<div class="list-items">';
                response.data.map(function(item){
                    html += self.toHistory(item);
                }).join('');
            html += '</div>';

            element.innerHTML = html;
            V.mount(element);

            window.hideLoading();
            window.setActiveElement( V.$('#content .list-item') );

        })
        .catch(function(){
            window.hideLoading();
        });
    },

    /**
     * Transform data to history item
     * @param {Object} data
     * @return {String}
     */
    toHistory: function(data){

        var html = '';
        var serie = data.series;
        var episode = data.media;
        var playhead = episode.playhead;
        var duration = episode.duration;

        html += '<div class="list-item history-item" tabindex="-1"';
        html += 'data-episode ';
        html += 'data-episode-id="{EPISODE_ID}" ';
        html += 'data-episode-number="{EPISODE_NUMBER}" ';
        html += 'data-episode-name="{EPISODE_NAME}" ';
        html += 'data-episode-duration="{EPISODE_DURATION}" ';
        html += 'data-episode-playhead="{EPISODE_PLAYHEAD}" ';
        html += 'data-episode-premium="{EPISODE_PREMIUM}" ';
        html += 'data-serie-id="{SERIE_ID}" ';
        html += 'data-serie-name="{SERIE_NAME}">';
            html += '<div class="list-item-image">';
                html += '<img src="{EPISODE_IMAGE}" />';
            html += '</div>';
            html += '<div class="list-item-info">';
                html += '<h2>{SERIE_NAME}</h2>';
                html += '<h3>{EPISODE_NUMBER} - {EPISODE_NAME}</h3>';
            html += '</div>';
        html += '</div>';

        html = html
        .replace('{EPISODE_ID}', episode.media_id)
        .replace('{SERIE_ID}', serie.series_id)
        .replace('{SERIE_NAME}', serie.name)
        .replace('{SERIE_NAME}', serie.name)
        .replace('{EPISODE_NAME}', episode.name)
        .replace('{EPISODE_NAME}', episode.name)
        .replace('{EPISODE_NUMBER}', episode.episode_number)
        .replace('{EPISODE_NUMBER}', episode.episode_number)
        .replace('{EPISODE_IMAGE}', episode.screenshot_image.full_url)
        .replace('{EPISODE_DURATION}', duration)
        .replace('{EPISODE_PLAYHEAD}', playhead)
        .replace('{EPISODE_PREMIUM}', (!episode.free_available) ? 1 : 0);

        return html;
    }

});

V.component('[data-series]', {

    /**
     * Constructor
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    constructor: function(resolve, reject){

        var self = this;

        // Public
        window.listSeries = function(){
            return self.listSeries();
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

        // Private
        self.on('show-series', function(e){
            e.preventDefault();
            self.listSeries();
        });

        self.on('change', 'select' , function(e){
            self.listSeries();
        });

        self.on('change', 'input' , function(e){
            self.listSeries();
        });

        resolve(this);

    },

    /**
     * After render
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    afterRender: async function(resolve, reject){
        await this.listSeries();
        resolve(this);
    },

    /**
     * List series
     * @return {Promise}
     */
    listSeries: function(){

        var data = window.getSessionData();
        var self = this;
        var element = self.element;
        var html = '';

        // Filter option
        var filter = 'popular';
        var search = '';

        if( V.$('select#filter', element) ){
            filter = V.$('select#filter', element).value;
        }

        if( V.$('input#search', element) ){
            search = V.$('input#search', element).value;
        }

        if( search ){
            filter = 'prefix:' + search;
        }

        // Fields option
        var fields = [
            'series.series_id',
            'series.name',
            'series.in_queue',
            'series.description',
            'series.portrait_image',
            'series.landscape_image',
            'series.media_count',
            'series.publisher_name',
            'series.year',
            'series.rating',
            'series.url',
            'series.media_type',
            'series.genres',
            'series.etp_guid',
            'image.wide_url',
            'image.fwide_url',
            'image.widestar_url',
            'image.fwidestar_url',
            'image.full_url'
        ];

        window.pushHistory('series/' + filter);
        window.showLoading();

        return apiRequest('POST', '/list_series', {
            session_id: data.sessionId,
            locale: data.locale,
            media_type: 'anime',
            filter: filter,
            fields: fields.join(','),
            limit: 20,
            offset: 0
        }).then(async function(response){

            if( response.error
                && response.code == 'bad_session' ){
                return window.makeLogin().then(function(){
                    return self.listSeries();
                });
            }

            html += '<h1>Series</h1>';
            html += '<div class="list-filters">';
                html += await self.getFilters(filter, search);
            html += '</div>';
            html += '<div class="list-items">';
                response.data.map(function(item){
                    html += self.toSerie(item);
                }).join('');
            html += '</div>';

            element.innerHTML = html;
            V.mount(element);

            window.hideLoading();
            window.setActiveElement( V.$('#content .list-item') );

        })
        .catch(function(error){
            window.hideLoading();
        });
    },

    /**
     * Retrieve series filter
     * @param {String} selected,
     * @param {String} search
     * @return {String}
     */
    getFilters: async function(selected, search){

        var data = window.getSessionData();
        var options = [];
        var categories = [];
        var html = '';

        // Retrieve options
        options.push({id: '', name: '--- FILTERS'});
        options.push({id: 'alpha', name: 'Alphabetical'});
        options.push({id: 'featured', name: 'Featured'});
        options.push({id: 'newest', name: 'Newest'});
        options.push({id: 'popular', name: 'Popular'});
        options.push({id: 'updated', name: 'Updated'});
        options.push({id: 'simulcast', name: 'Simulcasts'});

        // Retrieve categories
        window.categoriesData = window.categoriesData || {};

        if( window.categoriesData[ data.locale ] ){
            categories = window.categoriesData[ data.locale ];

        }else{

            await apiRequest('POST', '/categories', {
                session_id: data.sessionId,
                locale: data.locale,
                media_type: 'anime'
            }).then(function(response){

                categories.push({id: '-', name: '--- GENRES'});
                response.data.genre.map(function(item){
                    categories.push({id: item.tag, name: item.label});
                });

                // categories.push({id: '-', name: '--- SEASONS'});
                // response.data.season.map(function(item){
                //     categories.push({id: item.tag, name: item.label});
                // });

                window.categoriesData[ data.locale ] = categories;

            });

        }

        categories.map(function(item){
            options.push({id: 'tag:' + item.id, name: item.name});
        });

        // Create select
        html += '<div class="select" tabindex="-1">';
        html += '<select id="filter">';
        html += options.map(function(option){
            return '<option {SELECTED} value="{VALUE}">{LABEL}</option>'
                .replace('{SELECTED}', (option.id == selected) ? 'selected="selected"' : '')
                .replace('{VALUE}', option.id)
                .replace('{LABEL}', option.name);
        }).join('');
        html += '</select>';
        html += '</div>';

        html += '<input type="text" id="search" value="{VALUE}" placeholder="{LABEL}" tabindex="-1">'
            .replace('{VALUE}', search)
            .replace('{LABEL}', 'Search');

        return html;
    },

    /**
     * Transform data to serie item
     * @param {Object} data
     * @return {String}
     */
    toSerie: function(data){

        var html = '';

        html += '<div class="list-item serie-item" tabindex="-1"';
        html += 'data-serie ';
        html += 'data-serie-id="{SERIE_ID}" ';
        html += 'data-serie-name="{SERIE_NAME}">';
            html += '<div class="list-item-image">';
                html += '<img src="{SERIE_IMAGE}" width="640" height="960" />';
            html += '</div>';
            html += '<div class="list-item-info">';
                html += '<h2>{SERIE_NAME}</h2>';
                // html += '<p>{SERIE_DESCRIPTION}</p>';
            html += '</div>';
        html += '</div>';

        html = html
        .replace('{SERIE_ID}', data.series_id)
        .replace('{SERIE_NAME}', data.name)
        .replace('{SERIE_NAME}', data.name)
        .replace('{SERIE_DESCRIPTION}', data.description)
        .replace('{SERIE_IMAGE}', data.portrait_image.full_url);

        return html;
    }

});

V.component('[data-episodes]', {

    /**
     * Constructor
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    constructor: function(resolve, reject){

        var self = this;

        // Public
        window.listEpisodes = function(){
            return self.listEpisodes();
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

        // Private
        self.on('show-episodes', function(e){
            e.preventDefault();
            self.listEpisodes();
        });

        self.on('change', 'select' , function(e){
            self.listEpisodes();
        });

        resolve(this);

    },

    /**
     * After render
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    afterRender: async function(resolve, reject){
        await this.listEpisodes();
        resolve(this);
    },

    /**
     * List episodes
     * @return {Promise}
     */
    listEpisodes: function(){

        var data = window.getSessionData();
        var self = this;
        var element = self.element;
        var html = '';

        var serieId = element.dataset.serieId;
        var serieName = element.dataset.serieName;
        var sort = 'desc';
        var fields = [
            'most_likely_media',
            'media',
            'media.name',
            'media.description',
            'media.episode_number',
            'media.duration',
            'media.playhead',
            'media.screenshot_image',
            'media.media_id',
            'media.series_id',
            'media.series_name',
            'media.collection_id',
            'media.url',
            'media.free_available'
        ];

        if( V.$('select#sort', element) ){
            sort = V.$('select#sort', element).value;
        }

        window.pushHistory('episodes/' + serieId + '/' + sort);
        window.showLoading();

        return apiRequest('POST', '/list_media', {
            session_id: data.sessionId,
            locale: data.locale,
            series_id: serieId,
            sort: sort,
            fields: fields.join(','),
            limit: 30,
            offset: 0
        }).then(async function(response){

            if( response.error
                && response.code == 'bad_session' ){
                return window.makeLogin().then(function(){
                    return self.listEpisodes();
                });
            }

            html += '<h1>';
                html += '<small>Serie /</small><br/>';
                html += serieName + ' - Episodes';
            html += '</h1>';
            html += '<div class="list-filters">';
                html += await self.getFilters(sort);
            html += '</div>';
            html += '<div class="list-items">';
                response.data.map(function(item){
                    html += self.toEpisode(item);
                }).join('');
            html += '</div>';

            element.innerHTML = html;
            V.mount(element);

            window.hideLoading();
            window.setActiveElement( V.$('#content .list-item') );

        })
        .catch(function(error){
            window.hideLoading();
        });
    },

    /**
     * Retrieve episodes filter
     * @param {String} sort
     * @return {String}
     */
    getFilters: async function(sort){

        var options = [];
        var html = '';

        // Retrieve options
        options.push({id: 'asc', name: 'Ascending'});
        options.push({id: 'desc', name: 'Descending'});

        html += '<div class="select" tabindex="-1">';
        html += '<select id="sort">';
        html += options.map(function(option){
            return '<option {SELECTED} value="{VALUE}">{LABEL}</option>'
                .replace('{SELECTED}', (option.id == sort) ? 'selected="selected"' : '')
                .replace('{VALUE}', option.id)
                .replace('{LABEL}', option.name);
        }).join('');
        html += '</select>';
        html += '</div>';

        return html;
    },

    /**
     * Transform data to episode item
     * @param {Object} data
     * @return {String}
     */
    toEpisode: function(data){

        var self = this;
        var element = self.element;
        var html = '';

        var serieId = element.dataset.serieId;
        var serieName = element.dataset.serieName;

        html += '<div class="list-item episode-item" tabindex="-1"';
        html += 'data-episode ';
        html += 'data-episode-id="{EPISODE_ID}" ';
        html += 'data-episode-number="{EPISODE_NUMBER}" ';
        html += 'data-episode-name="{EPISODE_NAME}" ';
        html += 'data-episode-duration="{EPISODE_DURATION}" ';
        html += 'data-episode-playhead="{EPISODE_PLAYHEAD}" ';
        html += 'data-episode-premium="{EPISODE_PREMIUM}" ';
        html += 'data-serie-id="{SERIE_ID}" ';
        html += 'data-serie-name="{SERIE_NAME}">';
            html += '<div class="list-item-image">';
                html += '<img src="{EPISODE_IMAGE}" />';
            html += '</div>';
            html += '<div class="list-item-info">';
                html += '<h3>{EPISODE_NUMBER} - {EPISODE_NAME}</h3>';
            html += '</div>';
        html += '</div>';

        html = html
        .replace('{SERIE_ID}', serieId)
        .replace('{SERIE_NAME}', serieName)
        .replace('{SERIE_NAME}', serieName)
        .replace('{EPISODE_ID}', data.media_id)
        .replace('{EPISODE_NAME}', data.name)
        .replace('{EPISODE_NAME}', data.name)
        .replace('{EPISODE_NUMBER}', data.episode_number)
        .replace('{EPISODE_NUMBER}', data.episode_number)
        .replace('{EPISODE_IMAGE}', data.screenshot_image.full_url)
        .replace('{EPISODE_DURATION}', data.duration)
        .replace('{EPISODE_PLAYHEAD}', data.playhead)
        .replace('{EPISODE_PREMIUM}', (!data.free_available) ? 1 : 0);

        return html;
    }

});

V.component('[data-serie]', {

    /**
     * On render
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    onRender: function(resolve, reject){

        var self = this;
        var element = this.element;
        var content = V.$('#content');

        self.on('click', function(e){

            e.preventDefault();

            var html = '';
                html += '<div class="inside" ';
                html += 'data-episodes ';
                html += 'data-serie-id="{SERIE_ID}" ';
                html += 'data-serie-name="{SERIE_NAME}">';
                html += '</div>';

            html = html
                .replace('{SERIE_ID}', element.dataset.serieId)
                .replace('{SERIE_NAME}', element.dataset.serieName);

            content.innerHTML = html;
            V.mount(content);

        });

        resolve(this);
    }

});

V.component('[data-episode]', {

    /**
     * On render
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    onRender: function(resolve, reject){

        var self = this;
        var element = this.element;

        self.on('click', function(e){

            e.preventDefault();

            window.episodeId = element.dataset.episodeId;
            window.episodeNumber = element.dataset.episodeNumber;
            window.episodeName = element.dataset.episodeName;
            window.serieId = element.dataset.serieId;
            window.serieName = element.dataset.serieName;

            window.showVideo();
            window.loadVideo().then(function(){
                window.playVideo();
            });

        });

        resolve(this);
    },

    /**
     * After render
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    afterRender: function(resolve, reject){

        var self = this;
        var element = self.element;

        var duration = element.dataset.episodeDuration;
        var playhead = element.dataset.episodePlayhead;
        var premium = element.dataset.episodePremium;
        var progress = (100 / Number(duration)) * Number(playhead);

        if( progress ){
            V.$('.list-item-image', element).innerHTML += '<div class="list-item-progress" style="width: ' + progress + '%">&nbsp;</div>';
        }

        if( premium == 1 ){
            V.$('.list-item-image', element).innerHTML += '<div class="list-item-premium">&nbsp;</div>';
        }

        resolve(this);
    }

});

V.component('[data-video]', {

    /**
     * Constructor
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    constructor: function(resolve, reject){

        var self = this;

        // Public
        window.showVideo = function(){
            return self.showVideo();
        };
        window.hideVideo = function(){
            return self.hideVideo();
        };
        window.loadVideo = function(){
            return self.loadVideo();
        };
        window.playVideo = function(){
            return self.playVideo();
        };
        window.pauseVideo = function(){
            return self.pauseVideo();
        };
        window.stopVideo = function(){
            return self.stopVideo();
        };
        window.toggleVideo = function(){
            return self.toggleVideo();
        }
        window.forwardVideo = function(){
            return self.forwardVideo();
        }
        window.backwardVideo = function(){
            return self.backwardVideo();
        }
        window.setWatched = function(){
            return self.setWatched();
        }

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
        var element = this.element;
        var video = V.$('video', element);
            video.controls = false;

        self.video = video;
        self.playing = false;

        // Video Events
        V.on(video, 'click', function(e){
            e.preventDefault();
            self.toggleVideo();
        });

        V.on(video, 'loadedmetadata', function(e){
            self.initializeVideo();
        });

        V.on(video, 'timeupdate', function(e){
            self.updateTimeElapsed();
            self.updateProgress();
        });

        // UI Events
        self.on('click', '.video-extra-play', function(e){
            e.preventDefault();
            self.toggleVideo();
        });

        self.on('click', '.video-extra-watched', function(e){
            e.preventDefault();
            self.setWatched();
        });

        self.on('click', '.video-extra-episodes', function(e){
            e.preventDefault();
            self.pauseVideo();
            self.hideVideo();
            self.listRelatedEpisodes();
        });

        self.on('click', '.video-extra-close', function(e){
            e.preventDefault();
            self.pauseVideo();
            self.hideVideo();
        });

        var controlsTimeout = null;
        V.on(element, 'mouseenter mousemove', function(e){

            element.classList.add('show-controls');

            if( controlsTimeout ){
                window.clearTimeout(controlsTimeout);
            }

            controlsTimeout = window.setTimeout(function(){
                element.classList.remove('show-controls');
            }, 2000); // 2s

        });

        V.on(element, 'mouseleave', function(e){
            element.classList.remove('show-controls');
        });

        self.on('mousemove', 'input[type="range"]', function(e){
            self.updateSeekTooltip(e);
        });

        self.on('input', 'input[type="range"]', function(e){
            self.skipAhead(e.target.dataset.seek);
        });

        // Private
        self.on('show', function(e){
            e.preventDefault();
            self.showVideo();
        });

        self.on('hide', function(e){
            e.preventDefault();
            self.hideVideo();
        });

        self.on('load', function(e){
            e.preventDefault();
            self.loadVideo();
        });

        self.on('play', function(e){
            e.preventDefault();
            self.playVideo();
        });

        self.on('pause', function(e){
            e.preventDefault();
            self.pauseVideo();
        });

        self.on('stop', function(){
            e.preventDefault();
            self.stopVideo();
        });

        self.on('toggle', function(){
            e.preventDefault();
            self.toggleVideo();
        });

        self.on('forward', function(){
            e.preventDefault();
            self.forwardVideo();
        });

        self.on('backward', function(){
            e.preventDefault();
            self.backwardVideo();
        });

        self.on('watched', function(){
            e.preventDefault();
            self.setWatched();
        });

        resolve(this);
    },

    /**
     * List related episodes
     * @return {void}
     */
    listRelatedEpisodes: function(){

        var serieId = window.serieId;
        var serieName = window.serieName;
        var content = V.$('#content');

        var html = '';
            html += '<div class="inside" ';
            html += 'data-episodes ';
            html += 'data-serie-id="{SERIE_ID}" ';
            html += 'data-serie-name="{SERIE_NAME}">';
            html += '</div>';

        html = html
            .replace('{SERIE_ID}', serieId)
            .replace('{SERIE_NAME}', serieName);

        content.innerHTML = html;
        V.mount(content);

    },

    /**
     * Show video
     * @return {void}
     */
    showVideo: function(){

        var self = this;
        var element = self.element;
        var playButton = V.$('.video-extra-play', element);

        element.classList.add('active');
        document.body.classList.add('video-active');
        window.setActiveElement(playButton);

    },

    /**
     * Hide video
     * @return {void}
     */
    hideVideo: function(){

        var self = this;
        var element = self.element;

        element.classList.remove('active');
        document.body.classList.remove('video-active');

    },

    /**
     * Load video
     * @return {Promise}
     */
    loadVideo: function(){

        if( !Hls.isSupported() ) {
            throw Error('Video format not supported.');
        }

        var self = this;
        var element = self.element;
        var video = self.video;
        var title = V.$('.video-title-bar', element);

        var episodeId = window.episodeId;
        var episodeNumber = window.episodeNumber;
        var episodeName = window.episodeName;
        var serieId = window.serieId;
        var serieName = window.serieName;

        if( self.lastEpisodeId == episodeId ){
            return Promise.resolve();
        }

        self.lastEpisodeId = episodeId;
        title.innerHTML = serieName + ' / EP ' + episodeNumber + ' - ' + episodeName;

        var data = window.getSessionData();
        var fields = [
            'media.stream_data',
            'media.media_id',
            'media.playhead',
            'media.duration'
        ];

        window.pushHistory('video/' + episodeId);
        element.classList.add('video-loading');

        return apiRequest('POST', '/info', {
            session_id: data.sessionId,
            locale: data.locale,
            media_id: episodeId,
            fields: fields.join(',')
        }).then(function(response){

            var streams = response.data.stream_data.streams;
            var stream = streams[ streams.length - 1 ].url;

            var startTime = response.data.playhead || 0;
            var duration = response.data.duration || 0;

            if( startTime / duration > 0.85 || startTime < 30 ){
                startTime = 0;
            }

            return new Promise(function (resolve, reject){

                var hls = new Hls();
                    hls.loadSource(stream);
                    hls.attachMedia(video);

                hls.on(Hls.Events.MANIFEST_PARSED, function(){
                    element.classList.remove('video-loading');
                    element.classList.add('video-loaded');
                    video.currentTime = startTime;
                    resolve(response);
                });

                return response;
            });
        });
    },

    /**
     * Initialize video
     * @return {void}
     */
    initializeVideo: function(){

        var self = this;
        var element = self.element;
        var video = self.video;
        var duration = V.$('.duration', element);
        var seek = V.$('input[type="range"]', element);
        var progress = V.$('progress', element);

        var time = Math.round(video.duration);
        var format = formatTime(time);

        duration.innerText = format.m + ':' + format.s;
        duration.setAttribute('datetime', format.m + 'm ' + format.s + 's');

        seek.setAttribute('max', time);
        progress.setAttribute('max', time);

    },

    /**
     * Play video
     * @return {void}
     */
    playVideo: function(){

        var self = this;
        var element = self.element;
        var video = self.video;

        video.play();
        element.classList.remove('video-paused');
        element.classList.add('video-playing');

        self.playing = true;
        self.trackProgress();

    },

    /**
     * Pause video
     * @return {void}
     */
    pauseVideo: function(){

        var self = this;
        var element = self.element;
        var video = self.video;

        video.pause();
        element.classList.remove('video-playing');
        element.classList.add('video-paused');

        self.playing = false;
        self.stopTrackProgress();

    },

    /**
     * Stop video
     * @return {void}
     */
    stopVideo: function(){

        var self = this;

        self.pauseVideo();
        self.skipAhead(0);

    },

    /**
     * Toggle video
     * @return {void}
     */
    toggleVideo: function(){

        var self = this;

        if( self.playing ){
            self.pauseVideo();
        } else {
            self.playVideo();
        }

    },

    /**
     * Forward video
     * @return {void}
     */
    forwardVideo: function(){

        var self = this;
        var video = self.video;

        self.skipAhead(video.currentTime + 10);

    },

    /**
     * Backward video
     * @return {void}
     */
    backwardVideo: function(){

        var self = this;
        var video = self.video;

        self.skipAhead(video.currentTime - 10);

    },

    /**
     * Skip ahead video
     * @param {Number} skipTo
     * @return {void}
     */
    skipAhead: function(skipTo){

        var self = this;
        var element = self.element;
        var video = self.video;
        var seek = V.$('input[type="range"]', element);
        var progress = V.$('progress', element);

        video.currentTime = skipTo;
        seek.value = skipTo;
        progress.value = skipTo;

    },

    /**
     * Update seek tooltip text and position
     * @param {Event} event
     * @return {void}
     */
    updateSeekTooltip: function(event){

        var self = this;
        var element = self.element;
        var tooltip = V.$('.tooltip', element);
        var seek = V.$('input[type="range"]', element);

        var skipTo = Math.round(
            (event.offsetX / event.target.clientWidth)
            * parseInt(event.target.getAttribute('max'), 10)
        );

        var format = formatTime(skipTo);

        seek.dataset.seek = skipTo;
        tooltip.textContent = format.m + ':' + format.s;
        tooltip.style.left = event.pageX + 'px';

    },

    /**
     * Update video time elapsed
     * @return {void}
     */
    updateTimeElapsed: function(){

        var self = this;
        var element = self.element;
        var video = self.video;
        var elapsed = V.$('.elapsed', element);

        var time = Math.round(video.currentTime);
        var format = formatTime(time);

        elapsed.innerText = format.m + ':' + format.s;
        elapsed.setAttribute('datetime', format.m + 'm ' + format.s + 's');

    },

    /**
     * Update video progress
     * @return {void}
     */
    updateProgress: function(){

        var self = this;
        var element = self.element;
        var video = self.video;
        var seek = V.$('input[type="range"]', element);
        var progress = V.$('progress', element);

        seek.value = Math.floor(video.currentTime);
        progress.value = Math.floor(video.currentTime);

    },

    /**
     * Start progress tracking
     * @return {void}
     */
    trackProgress: function(){

        var self = this;

        if( self.trackTimeout ){
            self.stopTrackProgress();
        }

        self.trackTimeout = window.setTimeout(function(){
            self.updatePlaybackStatus();
        }, 30000); // 30s

    },

    /**
     * Stop progress tracking
     * @return {void}
     */
    stopTrackProgress: function(){

        var self = this;

        if( self.trackTimeout ){
            window.clearTimeout(self.trackTimeout);
        }

    },

    /**
     * Update playback status at Crunchyroll
     * @return {Promise}
     */
    updatePlaybackStatus: function(){

        var self = this;
        var video = self.video;
        var data = window.getSessionData();

        var elapsed = 30;
        var elapsedDelta = 30;
        var playhead = video.currentTime;

        return apiRequest('POST', '/log', {
            session_id: data.sessionId,
            locale: data.locale,
            event: 'playback_status',
            media_id: episodeId,
            playhead: playhead,
            elapsed: elapsed,
            elapsedDelta: elapsedDelta
        }).then(function(response){
            self.trackProgress();
        });
    },

    /**
     * Set video as watched at Crunchyroll
     * @return {Promise}
     */
    setWatched: function(){

        // var self = this;
        // var video = self.video;
        // var data = window.getSessionData();

        // var elapsed = 30;
        // var elapsedDelta = 30;
        // var playhead = video.duration;

        // return apiRequest('POST', '/log', {
        //     session_id: data.sessionId,
        //     locale: data.locale,
        //     event: 'playback_status',
        //     media_id: episodeId,
        //     playhead: playhead,
        //     elapsed: elapsed,
        //     elapsedDelta: elapsedDelta
        // }).then(function(response){
        //     self.stopTrackProgress();
        // });
    }

});

window.addEventListener('load', function(){
    V.mount(document.body);
}, false);