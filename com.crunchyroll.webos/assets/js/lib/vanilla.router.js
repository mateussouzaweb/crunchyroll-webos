(function (V) {

    // PRIVATE

    /**
     * Global data
     * @private
     * @var {Object}
     */
    var _global = {
        routes: [],
        beforeChangeHooks: [],
        afterChangeHooks: []
    };

    /**
     * @private
     * @var {Boolean}
     */
    var _prevent = false;

    /**
     * Abstract router
     * @private
     * @var {Object}
     */
    var _abstractRoute = {

        path: null,
        regex: null,
        location: null,
        query: {},
        params: {},

        /**
         * Retrieve route param value
         * @public
         * @name V.router.$active.getParam
         * @kind function
         * @param {String} name
         * @return {mixed}
         */
        getParam: function (name) {

            if (name === undefined) {
                return this.params;
            }

            if (this.params[name] !== undefined) {
                return this.params[name];
            }

            return undefined;
        },

        /**
         * Retrieve query param value
         * @public
         * @name V.router.$active.getQuery
         * @kind function
         * @param {String} name
         * @return {mixed}
         */
        getQuery: function (name) {

            if (name === undefined) {
                return this.query;
            }

            if (this.query[name] !== undefined) {
                return this.query[name];
            }

            return undefined;
        },

        /**
         * Retrieve parsed route path location
         * @public
         * @name V.router.$active.getLocation
         * @kind function
         * @return {String}
         */
        getLocation: function () {

            var params = this.params;
            var location = this.path;

            for (const key in params) {
                if (params.hasOwnProperty(key)) {
                    location = location.replace(':' + key, params[key]);
                }
            }

            return location;
        }

    }

    // PUBLIC
    V.extend(V, {

        /**
         * Abstract router
         * @private
         * @var {Object}
         */
        _abstractRoute: _abstractRoute,

        /**
         * HTTP router lib
         * @name V.router
         */
        router: {

            /**
             * Route mode definition
             * @public
             * @var {String}
             */
            $mode: window.history.pushState ? 'history' : 'hash',

            /**
             * Active route definition
             * @public
             * @var {Object}
             */
            $active: null,

            /**
             * Add callback before each route transition
             * @public
             * @name V.router.beforeChange
             * @kind function
             * @param {Function} callback
             * @return {Void}
             */
            beforeChange: function (callback) {
                _global.beforeChangeHooks.push(callback);
            },

            /**
             * Add callback after each route transition
             * @public
             * @name V.router.afterChange
             * @kind function
             * @param {Function} callback
             * @return {Void}
             */
            afterChange: function (callback) {
                _global.afterChangeHooks.push(callback);
            },

            /**
             * Normalize string path
             * @public
             * @name V.router.normalizePath
             * @kind function
             * @param {String} path
             * @return {String}
             */
            normalizePath: function (path) {

                path = path.replace(window.location.origin, '');
                path = path.replace(new RegExp('[/]*$'), '');
                path = path.replace(new RegExp('^[/]*'), '');
                path = ('/' + path).replace('//', '/').replace('/?', '?');

                return path;
            },

            /**
             * Add route to routes
             * @public
             * @name V.router.add
             * @kind function
             * @param {Object} definition
             * @return {void}
             */
            add: function (definition) {

                if (Array.isArray(definition)) {
                    var self = this;
                    definition.forEach(function (item) {
                        self.add(item);
                    });
                    return;
                }

                var route = Object.assign(
                    {},
                    V._abstractRoute,
                    definition
                );

                route.path = this.normalizePath(route.path);

                var regex = route.path;
                var pattern = ['(:[a-zA-Z]+)'];
                var replace = ['([^\/]+)'];

                pattern.forEach(function (value, index) {
                    regex = regex.replace(
                        new RegExp(value, 'g'), replace[index]
                    );
                });

                regex = new RegExp('^' + regex + '$', 'i');
                route.regex = regex;

                _global.routes.push(route);

            },

            /**
             * Process route change
             * @public
             * @name V.router.change
             * @kind function
             * @param {String} location
             * @param {Boolean} replace
             * @return {Void}
             */
            change: async function (location, replace) {

                var routeChange = function(resolve){

                    if( this.replace ){
                        _prevent = true;
                        if( V.router.$mode === 'history' ){
                            history.pushState({}, null, this.location);
                        } else {
                            window.location.hash = this.location;
                        }
                        _prevent = false;
                    }

                    var next = this.next;

                    if( !next ){
                        V.router.$active = null;
                        return resolve(this);
                    }

                    var query = V.router.retrieveQueryFor(
                        window.location.search
                    );
                    var params = V.router.retrieveParamsFor(
                        this.location, next
                    );

                    next.query = query;
                    next.params = params;

                    V.router.$active = next;

                    resolve(this);
                };

                try {

                    location = this.normalizePath(location);

                    var change = {
                        previous: V.router.$active,
                        next: V.router.getMatch(location),
                        location: location,
                        replace: replace
                    }

                    // if (!change.next) {
                    //     throw 'Route not found: ' + location;
                    // }

                    await V.promises(change, [].concat(
                        _global.beforeChangeHooks,
                        [routeChange],
                        _global.afterChangeHooks
                    ));

                } catch (error) {
                    console.warn(error);
                }

            },

            /**
             * Process URL and retrieve route params
             * @public
             * @name V.router.retrieveParamsFor
             * @kind function
             * @param {String} path
             * @param {Object} match
             * @return {Object}
             */
            retrieveParamsFor: function (path, match) {

                var params = {};
                var parts = this.normalizePath(match.path).split('/').filter(Boolean);
                var url = this.normalizePath(path).split('/').filter(Boolean);

                url.forEach(function (value, index) {
                    if (parts[index] !== undefined && ':'.charCodeAt(0) === parts[index].charCodeAt(0)) {
                        const key = parts[index].substr(1);
                        params[key] = decodeURIComponent(value);
                    }
                });

                return params;
            },

            /**
             * Process URL and retrieve query params
             * @public
             * @name V.router.retrieveQueryFor
             * @kind function
             * @param {String} search
             * @return {Object}
             */
            retrieveQueryFor: function (search) {

                var query = {};

                search = search.trim().replace(/^(\?|#|&)/, '')

                if (search == '') {
                    return query;
                }

                search.split('&').forEach(function (param) {

                    const parts = param.replace(/\+/g, ' ').split('=');
                    const key = decodeURIComponent(parts.shift());
                    const value = parts.length > 0 ? decodeURIComponent(parts.join('=')) : null;

                    if (query[key] === undefined) {
                        query[key] = value;
                    }

                });

                return query;
            },

            /**
             * Match the route based on given path
             * @public
             * @name V.router.getMatch
             * @kind function
             * @param {String} path
             * @return {Null|Object}
             */
            getMatch: function (path) {

                var url = this.normalizePath(path);
                var routes = _global.routes;
                var match = null;

                for (let index = 0; index < routes.length; index++) {
                    const item = routes[index];

                    if (url.match(item.regex)) {
                        match = item;
                        break;
                    }
                }

                return match;
            },

            /**
             * Redirect route to given location path
             * @public
             * @name V.router.redirect
             * @kind function
             * @param {String} location
             * @return {void}
             */
            redirect: function (location) {
                this.change(location, true);
            },

            /**
             * Go back to the previous route
             * @public
             * @name V.router.goBack
             * @kind function
             * @param {Number} level
             * @return {void}
             */
            goBack: function (level) {

                if (level == undefined) {
                    level = -1;
                }

                window.history.go(level);
            }

        }

    });

    // API & EVENTS
    V.on(window, 'popstate', function () {

        if( _prevent ){
            return;
        }

        var path = ( V.router.$mode === 'hash' )
            ? window.location.hash.replace('#', '')
            : window.location.pathname;

        path = V.router.normalizePath(path);
        V.router.change(path);

    });

    V.on(document, 'click', 'a', function (e) {

        var link = e.currentTarget;
        var location = window.location;

        var stripHash = function (location) {
            return location.href.replace(/#.*/, '');
        }

        // Middle click, cmd click, and ctrl click should open
        // links in a new tab as normal.
        if (e.which > 1
            || e.metaKey
            || e.ctrlKey
            || e.shiftKey
            || e.altKey) {
            return;
        }

        // Ignore cross origin links
        if (link.protocol && location.protocol !== link.protocol
            || link.hostname && location.hostname !== link.hostname) {
            return;
        }

        // Ignore case when a hash is being tacked on the current URL
        if (V.router.$mode !== 'hash'
            && link.href.indexOf('#') > -1
            && stripHash(link) == stripHash(location)) {
            return;
        }

        // Ignore when opening a new or in the same tab
        // _blank, _self, ...
        if (link.target
            && link.target !== ''){
            return;
        }

        // Ignore event with default prevented
        if (e.defaultPrevented) {
            return;
        }

        V.router.redirect(this.href);
        e.preventDefault();

    });

})(window.V);