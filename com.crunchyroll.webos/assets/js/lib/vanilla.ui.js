(function () {

    /**
     * Vanilla UI core lib
     * @global
     * @name V
     */
    window.V = {

        /**
         * Run loop on items
         * @public
         * @name V.each
         * @kind function
         * @param {Array|Object} items
         * @param {Function} callback
         * @return {void}
         */
        each: function (items, callback) {

            if (Array.isArray(items)) {
                items.forEach(callback);
            } else {

                const keys = Object.keys(items);
                for (const key of keys) {
                    callback(items[key], key, items);
                }

            }

        },

        /**
         * Load an plugin on the library
         * @public
         * @name V.extend
         * @kind function
         * @param {Object} library
         * @param {Object} plugin
         * @return {void}
         */
        extend: function (library, plugin) {

            this.each(plugin, function (value, key) {

                if (library[key] !== undefined) {
                    console.warn('Warning, the method {key} is being overwrite be another plugin', key);
                }

                library[key] = value;

            });

        },

        /**
         * Promisify the callback
         * @public
         * @name V.promisify
         * @kind function
         * @param {Object} scope
         * @param {Function} callback
         * @return {Promise}
         */
        promisify: function (scope, callback) {
            return new Promise(function (resolve, reject) {
                try{
                    return callback.apply(scope, [resolve, reject]);
                }catch(error){
                    return reject(error);
                }
            });
        },

        /**
        * Fake promise instance
        * @public
        * @name V.fakePromise
        * @kind function
        * @param {Function} resolve
        * @return {void}
        */
        fakePromise: function (resolve) {
            resolve(this);
        },

        /**
         * Wait the resolution of various promisify callbacks
         * @param {Object} scope
         * @param {Array} callbacks
         * @return {Promise}
         */
        promises: async function (scope, callbacks) {

            const self = this;
            var promises = [];

            for (let index = 0; index < callbacks.length; index++) {
                if( typeof callbacks[index] === 'function' ){
                    promises.push(
                        self.promisify(scope, callbacks[index])
                    );
                }
            }

            await Promise.all(promises);

            return scope;
        }

    };

})();(function (V) {

    // Selector lib
    V.extend(V, {

        /**
         * Select an single element
         * @public
         * @name V.$
         * @kind function
         * @param {String} selector
         * @param {Mixed} context
         * @return {Node}
         */
        $: function (selector, context) {
            context = (context instanceof String) ? this.$(context) : context;
            context = (context instanceof Node) ? context : document;
            return context.querySelector(selector);
        },

        /**
         * Select multiples elements
         * @public
         * @name V.$$
         * @kind function
         * @param {String} selector
         * @param {Mixed} context
         * @return {NodeList}
         */
        $$: function (selector, context) {
            context = (context instanceof String) ? this.$(context) : context;
            context = (context instanceof Node) ? context : document;
            return context.querySelectorAll(selector);
        },

        /**
         * Parse selector and return array of items
         * @public
         * @name V.items
         * @kind function
         * @param {Mixed} element
         * @param {Mixed} context
         * @return {Array}
         */
        items: function (element, context) {

            var items = [];

            if (typeof element == 'string') {
                element = this.$$(element, context);
            }

            if (element instanceof Window) {
                items.push(element);
            }

            if (element instanceof HTMLDocument) {
                items.push(element);
            }

            if (element instanceof Element) {
                items.push(element);
            }

            if (element instanceof NodeList) {
                Array.prototype.forEach.call(element, function (item) {
                    items.push(item);
                });
            }

            return items;
        }

    });

})(window.V);(function (V) {

    // PRIVATE

    /**
     * Attach event to element
     * @private
     * @param {String} action
     * @param {Mixed} element
     * @param {String} event
     * @param {Mixed} selector
     * @param {Mixed} callback
     * @return {Function}
     */
    var _event = function (action, element, event, selector, callback) {

        var items = V.items(element);
        var handler;

        // Determine handler
        if (callback === undefined) {

            // Bind
            handler = selector;
            selector = null;

        } else {

            // Delegated
            handler = function (e) {
                var target = e.target.closest(selector);
                if (target) {
                    callback.apply(target, [e]);
                }
            };

        }

        event = event.split(' ');
        items.forEach(function (item) {

            for (var i = 0; i < event.length; i++) {

                if (action == 'add') {
                    item.addEventListener(
                        event[i],
                        handler.bind(item),
                        false
                    );
                } else {
                    item.removeEventListener(
                        event[i],
                        handler.bind(item),
                        false
                    );
                }

            }
        });

        return handler;
    };

    // PUBLIC

    V.extend(V, {

        /**
         * Add event to element
         * @public
         * @name V.on
         * @kind function
         * @param {Node} element
         * @param {String} event
         * @param {String} selector
         * @param {Function} callback
         * @return {Function}
         */
        on: function (element, event, selector, callback) {
            return _event('add', element, event, selector, callback);
        },

        /**
         * Remove event from element
         * @public
         * @name V.off
         * @kind function
         * @param {Node} element
         * @param {String} event
         * @param {String} selector
         * @param {Function} callback
         * @return {Function}
         */
        off: function (element, event, selector, callback) {
            return _event('remove', element, event, selector, callback);
        },

        /**
         * Trigger event on element
         * @public
         * @name V.trigger
         * @kind function
         * @param {Node} element
         * @param {String} event
         * @return {void}
         */
        trigger: function (element, event) {

            var items = this.items(element);
            var theEvent = document.createEvent('HTMLEvents');

            theEvent.initEvent(event, true, true);

            items.forEach(function (item) {
                item.dispatchEvent(theEvent);
            });

        }

    });

})(window.V);(function (V) {

    // PRIVATE

    /**
     * Global data
     * @private
     * @param {Object}
     */
    var _global = {
        interceptBeforeHooks: [],
        interceptAfterHooks: []
    };

    /**
     * Decode data to the correct format
     * @private
     * @param {mixed} data
     * @return {Object}
     */
    var decodeData = function (data) {

        var result = {};

        if( data instanceof FormData ){
            result = data;
        }else if (typeof data == 'object') {
            result = data;
        }else if (typeof data == 'string') {

            data.split('&').forEach(function (param) {

                const parts = param.replace(/\+/g, ' ').split('=');
                const key = decodeURIComponent(parts.shift());
                const value = parts.length > 0 ? decodeURIComponent(parts.join('=')) : null;

                if (result[key] === undefined) {
                    result[key] = value;
                }

            });

        }

        return result;
    };

    // PUBLIC
    V.extend(V, {

        /**
         * HTTP request lib
         * @name V.http
         */
        http: {

            /**
             * Add interceptor callback before each HTTP request
             * @public
             * @name V.http.interceptBefore
             * @kind function
             * @param {Function} callback
             * @return {void}
             */
            interceptBefore: function (callback) {
                _global.interceptBeforeHooks.push(callback);
            },

            /**
             * Add interceptor callback after each HTTP request
             * @public
             * @name V.http.interceptAfter
             * @kind function
             * @param {Function} callback
             * @return {void}
             */
            interceptAfter: function (callback) {
                _global.interceptAfterHooks.push(callback);
            },

            /**
             * Make HTTP requests
             * @async
             * @public
             * @name V.http.request
             * @kind function
             * @param {String} method
             * @param {String} url
             * @param {Object} data
             * @param {Object} headers
             * @return {Promise}
             */
            request: async function (method, url, data, headers) {

                var request = {
                    method: method,
                    url: url,
                    data: data,
                    headers: headers,
                    options: {},
                    response: null
                };

                request = await V.promises(
                    request,
                    _global.interceptBeforeHooks
                );

                if (request.headers) {
                    request.options.headers = request.headers;
                }
                if (request.method) {
                    request.options.method = request.method;
                }

                var _data = decodeData(request.data);

                if (request.options.method != 'GET') {

                    if( _data instanceof FormData == false ){
                        _data = JSON.stringify(_data);
                    }

                    request.options.body = _data;

                } else {

                    var query = Object.keys(_data).map(function (k) {
                        var _k = encodeURIComponent(k);
                        var _v = encodeURIComponent(_data[k]);
                        return _k + "=" + _v;
                    }).join('&');

                    if (query) {
                        request.url += '?' + query;
                    }

                }

                return fetch(request.url, request.options)
                .then(function (response) {
                    request.response = response;

                    return V.promises(
                        request,
                        _global.interceptAfterHooks
                    );
                })
                .then(function (request) {
                    return request.response;
                })
                .then(function (response) {

                    if (!response.ok) {
                        throw response;
                    }

                    return response.text().then(function (text) {
                        try {
                            var json = JSON.parse(text);
                            return json;
                        } catch (error) {
                            return text;
                        }
                    });
                });
            },

            /**
             * Make GET HTTP requests
             * @public
             * @name V.http.get
             * @kind function
             * @param {String} url
             * @param {Object} data
             * @param {Object} headers
             * @return {Promise}
             */
            get: function (url, data, headers) {
                return this.request('GET', url, data, headers);
            },

            /**
             * Make POST HTTP requests
             * @public
             * @name V.http.post
             * @kind function
             * @param {String} url
             * @param {Object} data
             * @param {Object} headers
             * @return {Promise}
             */
            post: function (url, data, headers) {
                return this.request('POST', url, data, headers);
            },

            /**
             * Make PUT HTTP requests
             * @public
             * @name V.http.put
             * @kind function
             * @param {String} url
             * @param {Object} data
             * @param {Object} headers
             * @return {Promise}
             */
            put: function (url, data, headers) {
                return this.request('PUT', url, data, headers);
            },

            /**
             * Make DELETE HTTP requests
             * @public
             * @name V.http.delete
             * @kind function
             * @param {String} url
             * @param {Object} data
             * @param {Object} headers
             * @return {Promise}
             */
            delete: function (url, data, headers) {
                return this.request('DELETE', url, data, headers);
            }

        }

    });

})(window.V);(function (V) {

    V.extend(V, {

        /**
         * Local storage lib
         * @name V.local
         */
        local: {

            /**
             * Set item on localStorage
             * @public
             * @name V.local.set
             * @kind function
             * @param {String} name
             * @param {Mixed} value
             * @return {Object}
             */
            set: function (name, value) {

                if (value instanceof Object) {
                    value = JSON.stringify(value);
                }

                return localStorage.setItem(name, value);
            },

            /**
             * Retrieve item of localStorage
             * @public
             * @name V.local.get
             * @kind function
             * @param {String} name
             * @param {Boolean} parse
             * @return {Mixed}
             */
            get: function (name, parse) {

                var value = localStorage.getItem(name);

                if (parse == true && value) {
                    value = JSON.parse(value);
                }

                return value;
            }

        }

    });

})(window.V);(function (V) {

    V.extend(V, {

        /**
         * Session storage lib
         * @name V.session
         */
        session: {

            /**
             * Set item on sessionStorage
             * @public
             * @name V.session.set
             * @kind function
             * @param {String} name
             * @param {Mixed} value
             * @return {Object}
             */
            set: function (name, value) {

                if (value instanceof Object) {
                    value = JSON.stringify(value);
                }

                return sessionStorage.setItem(name, value);
            },

            /**
             * Retrieve item of sessionStorage
             * @public
             * @name V.session.get
             * @kind function
             * @param {String} name
             * @param {Boolean} parse
             * @return {Mixed}
             */
            get: function (name, parse) {

                var value = sessionStorage.getItem(name);

                if (parse == true && value) {
                    value = JSON.parse(value);
                }

                return value;
            }

        }

    });

})(window.V);