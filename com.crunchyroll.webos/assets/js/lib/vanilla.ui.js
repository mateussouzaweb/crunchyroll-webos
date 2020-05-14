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
                return callback.apply(scope, [resolve, reject]);
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
        beforeConstructorHooks: [],
        afterConstructorHooks: [],
        beforeDestructorHooks: [],
        afterDestructorHooks: []
    };

    // PUBLIC

    V.extend(V, {

        /**
         * Abstract component
         * @private
         * @var {Object}
         */
        _abstractComponent: {

            /**
             * Component DOM element
             * @public
             * @name V.component.element
             * @var {Node}
             */
            element: null,

            /**
             * Component DOM selector
             * @public
             * @name V.component.element
             * @var {String}
             */
            selector: null,

            /**
             * Component namespace
             * @private
             * @name V.component.namespace
             * @var {String}
             */
            namespace: null,

            /**
             * Component constructor
             * @public
             * @name V.component.constructor
             * @kind function
             * @param {Function} resolve
             * @param {Function} reject
             * @return {Promise}
             */
            constructor: V.fakePromise,

            /**
             * Component destructor
             * @public
             * @name V.component.destructor
             * @kind function
             * @param {Function} resolve
             * @param {Function} reject
             * @return {Promise}
             */
            destructor: V.fakePromise
        },

        /**
         * Global components registry
         * @private
         * @var {Object}
         */
        _components: [],

        /**
         * Add global callback before component constructor
         * @public
         * @name V.beforeConstructor
         * @kind function
         * @param {Function} callback
         * @return {void}
         */
        beforeConstructor: function (callback) {
            _global.beforeConstructorHooks.push(callback);
        },

        /**
         * Add global callback after component constructor
         * @public
         * @name V.afterConstructor
         * @kind function
         * @param {Function} callback
         * @return {void}
         */
        afterConstructor: function (callback) {
            _global.afterConstructorHooks.push(callback);
        },

        /**
         * Add global callback before component destructor
         * @public
         * @name V.beforeDestructor
         * @kind function
         * @param {Function} callback
         * @return {void}
         */
        beforeDestructor: function (callback) {
            _global.beforeDestructorHooks.push(callback);
        },

        /**
         * Add global callback after component destructor
         * @public
         * @name V.afterDestructor
         * @kind function
         * @param {Function} callback
         * @return {void}
         */
        afterDestruct: function (callback) {
            _global.afterDestructorHooks.push(callback);
        },

        /**
         * Create new component
         * @public
         * @name V.component
         * @kind function
         * @param {String} selector
         * @param {Object} data
         * @return {Promise}
         */
        component: async function (selector, data) {

            var component = Object.assign(
                {},
                this._abstractComponent,
                data
            );

            component.selector = selector;
            component.namespace = selector.replace(/[\W_]+/g, '_');

            try {

                var callbacks = [].concat(
                    _global.beforeConstructorHooks,
                    [component.constructor],
                    _global.afterConstructorHooks
                );

                await this.promises(component, callbacks);
                this._components.push(component);

            } catch (error) {
                console.warn('Component construct error:', error);
            }

            return component;
        },

        /**
         * Remove component
         * @public
         * @name V.removeComponent
         * @kind function
         * @param {String} selector
         * @return {Promise}
         */
        removeComponent: async function (selector) {

            var component = null;
            var index = null;

            this._components.forEach(function (theComponent, theIndex) {
                if (theComponent.selector == selector) {
                    component = theComponent;
                    index = theIndex;
                }
            });

            if (!component) {
                return selector;
            }

            try {

                var callbacks = [].concat(
                    _global.beforeDestructorHooks,
                    [component.destructor],
                    _global.afterDestructorHooks
                );

                await this.promises(component, callbacks);
                delete this._components[index];

            } catch (error) {
                console.warn('Component destruct error:', error);
            }

            return selector;
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
        beforeMountHooks: [],
        afterMountHooks: []
    };

    // PUBLIC

    V.extend(V._abstractComponent, {

        /**
         * Component before mount
         * @public
         * @name V.component.beforeMount
         * @kind function
         * @param {Function} resolve
         * @param {Function} reject
         * @return {Promise}
         */
        beforeMount: V.fakePromise,

        /**
         * Component on mount
         * @public
         * @name V.component.onMount
         * @kind function
         * @param {Function} resolve
         * @param {Function} reject
         * @return {Promise}
         */
        onMount: V.fakePromise,

        /**
         * Component after mount
         * @public
         * @name V.component.afterMount
         * @kind function
         * @param {Function} resolve
         * @param {Function} reject
         * @return {Promise}
         */
        afterMount: V.fakePromise

    });

    V.extend(V, {

        /**
         * Add global callback before component mount
         * @public
         * @name V.beforeMount
         * @kind function
         * @param {Function} callback
         * @return {void}
         */
        beforeMount: function (callback) {
            _global.beforeMountHooks.push(callback);
        },

        /**
         * Add global callback after component mount
         * @public
         * @name V.afterMount
         * @kind function
         * @param {Function} callback
         * @return {void}
         */
        afterMount: function (callback) {
            _global.afterMountHooks.push(callback);
        },

        /**
         * Mount components on given target child elements
         * @public
         * @name V.mount
         * @kind function
         * @param {Node} target
         * @return {Promise}
         */
        mount: async function (target) {

            var promises = [];

            V._components.forEach(function (component) {

                V.items(component.selector, target)
                .forEach(function (element) {

                    if (element._components === undefined) {
                        element._components = {};
                    }

                    var key = component.namespace;

                    // Already mounted
                    if (element._components[key] !== undefined) {
                        return;
                    }

                    element._components[key] = {};
                    element.dataset.vid = Math.random().toString(16).substr(2, 8);

                    component.element = element;

                    var callbacks = [].concat(
                        _global.beforeMountHooks,
                        [component.beforeMount]
                        [component.onMount],
                        [component.afterMount],
                        _global.afterMountHooks
                    );

                    promises.push(
                        V.promises(component, callbacks)
                    );

                });

            });

            await Promise.all(promises);

            return target;
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
        beforeRenderHooks: [],
        afterRenderHooks: []
    };

    // PUBLIC

    V.extend(V._abstractComponent, {

        /**
         * Component should render
         * @public
         * @name V.component.shouldRender
         * @kind function
         * @param {Function} resolve
         * @param {Function} reject
         * @return {Promise}
         */
        shouldRender: V.fakePromise,

        /**
         * Component before render
         * @public
         * @name V.component.beforeRender
         * @kind function
         * @param {Function} resolve
         * @param {Function} reject
         * @return {Promise}
         */
        beforeRender: V.fakePromise,

        /**
         * Component on render
         * @public
         * @name V.component.onRender
         * @kind function
         * @param {Function} resolve
         * @param {Function} reject
         * @return {Promise}
         */
        onRender: V.fakePromise,

        /**
         * Component after render
         * @public
         * @name V.component.afterRender
         * @kind function
         * @param {Function} resolve
         * @param {Function} reject
         * @return {Promise}
         */
        afterRender: V.fakePromise

    });

    V.extend(V, {

        /**
         * Add global callback before component render
         * @public
         * @name V.beforeRender
         * @kind function
         * @param {Function} callback
         * @return {void}
         */
        beforeRender: function (callback) {
            _global.beforeRenderHooks.push(callback);
        },

        /**
         * Add global callback after component render
         * @public
         * @name V.afterRender
         * @kind function
         * @param {Function} callback
         * @return {void}
         */
        afterRender: function (callback) {
            _global.afterRenderHooks.push(callback);
        }

    });

    // API

    /**
     * Render component
     * @private
     * @param {Function} resolve
     * @return {Promise}
     */
    var render = async function (resolve) {

        var component = this;

        try {

            var callbacks = [].concat(
                [ component.shouldRender ],
                _global.beforeRenderHooks,
                [ component.beforeRender ],
                [ component.onRender ],
                [ component.afterRender ],
                _global.afterRenderHooks
            );

            await V.promises(component, callbacks);

            // Mount child elements
            await V.mount(component.element);

        } catch (error) {
            console.warn('Component render error:', error);
            //reject(error);
        }

        return resolve(component);
    }

    V.afterMount(render);

})(window.V);(function (V) {

    // PRIVATE

    /**
     * Global data
     * @private
     * @param {Object}
     */
    var _global = {
        beforeDestroyHooks: [],
        afterDestroyHooks: []
    };

    // PUBLIC

    V.extend(V._abstractComponent, {

        /**
         * Component before destroy
         * @public
         * @name V.component.beforeDestroy
         * @kind function
         * @param {Function} resolve
         * @param {Function} reject
         * @return {Promise}
         */
        beforeDestroy: V.fakePromise,

        /**
         * Component on destroy
         * @public
         * @name V.component.onDestroy
         * @kind function
         * @param {Function} resolve
         * @param {Function} reject
         * @return {Promise}
         */
        onDestroy: V.fakePromise,

        /**
         * Component after destroy
         * @public
         * @name V.component.afterDestroy
         * @kind function
         * @param {Function} resolve
         * @param {Function} reject
         * @return {Promise}
         */
        afterDestroy: V.fakePromise

    });

    V.extend(V, {

        /**
         * Add global callback before component destroy
         * @public
         * @name V.beforeDestroy
         * @kind function
         * @param {Function} callback
         * @return {void}
         */
        beforeDestroy: function (callback) {
            _global.beforeDestroyHooks.push(callback);
        },

        /**
         * Add global callback after component destroy
         * @public
         * @name V.afterDestroy
         * @kind function
         * @param {Function} callback
         * @return {void}
         */
        afterDestroy: function (callback) {
            _global.afterDestroyHooks.push(callback);
        },

        /**
         * destroy components on given target child elements
         * @public
         * @name V.destroy
         * @kind function
         * @param {Node} target
         * @return {Promise}
         */
        destroy: async function (target) {

            var promises = [];

            V._components.forEach(function (component) {
                V.items(component.selector, target)
                .forEach(function (element) {

                    if (element._components === undefined) {
                        return;
                    }

                    var key = component.namespace;
                    if (element._components[key] === undefined) {
                        return;
                    }

                    component.element = element;
                    delete element._components[key];

                    var callbacks = [].concat(
                        _global.beforeDestroyHooks,
                        [ component.beforeDestroy ],
                        [ component.onDestroy ],
                        [ component.afterDestroy ],
                        _global.afterDestroyHooks
                    );

                    promises.push(
                        V.promises(component, callbacks)
                    );

                });
            });

            await Promise.all(promises);

            return target;
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
        events: {}
    };

    // PUBLIC

    V.extend(V._abstractComponent, {

        /**
         * Attach event on component
         * @public
         * @name V.component.on
         * @kind function
         * @param {String} event
         * @param {String|Function} selector
         * @param {Function} callback
         * @return {void}
         */
        on: function (event, selector, callback) {

            var self = this;

            if (callback === undefined) {
                callback = selector;
                selector = self.selector;
            } else {
                selector = self.selector + ' ' + selector;
            }

            var vid = self.element.dataset.vid;
            vid = '[data-vid="' + vid + '"]';

            var fn = function (e) {

                var element = e.target.closest(vid);

                if (!element) {
                    return;
                }

                self.element = element;
                callback.apply(e.target.closest(selector), [e]);

            };

            if (!_global.events[event]) {
                _global.events[event] = {};
            }

            _global.events[event][selector] = V.on(
                document, event, selector, fn
            );

        },

        /**
         * Remove event on component
         * @public
         * @name V.component.off
         * @kind function
         * @param {String} event
         * @param {String} selector
         * @return {void}
         */
        off: function (event, selector) {

            if (selector) {
                selector = self.selector + ' ' + selector;
            } else {
                selector = self.selector;
            }

            if (!_global.events[event]) {
                return;
            }

            var fn = _global.events[event][selector];

            if (!fn) {
                return;
            }

            delete _global.events[event][selector];

            V.off(document, event, selector, fn);

        }

    });

})(window.V);(function (V) {

    // PUBLIC

    V.extend(V._abstractComponent, {

        /**
         * Set element data
         * @public
         * @name V.component.set
         * @kind function
         * @param {String} key
         * @param {mixed} value
         * @return {Object}
         */
        set: function (key, value) {

            this
                .element
                ._components[this.namespace][key] = value;

            return this;
        },

        /**
         * Get element data
         * @public
         * @name V.component.get
         * @kind function
         * @param {String} key
         * @param {mixed} defaultValue
         * @return {mixed}
         */
        get: function (key, defaultValue) {

            var value = this
                .element
                ._components[this.namespace][key];

            if (value === undefined) {
                return defaultValue;
            }

            return value;
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
                        } catch (e) {
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