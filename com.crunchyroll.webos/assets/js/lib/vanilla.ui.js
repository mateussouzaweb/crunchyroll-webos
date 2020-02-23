(function () {

    // Core lib
    var Core = {

        /**
         * Run loop on items
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
         * @param {Object} plugin
         * @return {void}
         */
        extend: function (plugin) {

            const self = this;

            self.each(plugin, function (value, key) {

                if (self[key] !== undefined) {
                    console.warn('Warning, the method {key} is being overwrite be another plugin', key);
                }

                self[key] = value;

            });

        },

        /**
         * Promisify the callback
         * @param {Object} scope
         * @param {Function} callback
         * @return {Promise}
         */
        promisify: function (scope, callback) {
            return new Promise(function (resolve, reject) {
                return callback.apply(scope, [resolve, reject]);
            });
        }

    };

    window.V = Core;

})();(function (V) {

    // Selector lib
    V.extend({

        /**
         * Select an single element
         * @param {String} selector
         * @param {Mixed} context
         * @return {Node}
         */
        $: function (selector, context) {
            context = (context instanceof Node) ? context : document;
            return context.querySelector(selector);
        },

        /**
         * Select multiples elements
         * @param {String} selector
         * @param {Mixed} context
         * @return {NodeList}
         */
        $$: function (selector, context) {
            context = (context instanceof Node) ? context : document;
            return context.querySelectorAll(selector);
        },

        /**
         * Parse selector and return array of items
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

    V.extend({

        /**
         * Add event to element
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
    * Promise instance
    * @param {Function} resolve
    * @param {Function} reject
    * @return {void}
    */
    var _promise = function (resolve, reject) {
        resolve(this);
    };

    /**
     * Global data
     * @param {Object}
     */
    var _global = {
        components: [],
        events: {},
        beforeRenderHooks: [],
        afterRenderHooks: [],
        beforeDestroyHooks: [],
        afterDestroyHooks: []
    };

    /**
     * Abstract component
     * @param {Object}
     */
    var _abstractComponent = {

        element: null,
        selector: null,
        namespace: null,

        constructor: _promise,
        destructor: _promise,
        shouldRender: _promise,
        beforeRender: _promise,
        onRender: _promise,
        afterRender: _promise,
        beforeDestroy: _promise,
        onDestroy: _promise,
        afterDestroy: _promise,

        /**
         * Set element data
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
        },

        /**
         * Attach event on component
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
                callback.apply(e.target, [e]);

            };

            if (!_global.events[event]) {
                _global.events[event] = {};
            }

            _global.events[event][selector] = V.on(document, event, selector, fn);

        },

        /**
         * Remove event on component
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

    };

    /**
     * Run before render hooks
     * @param {Object} instance
     * @return {Promise}
     */
    var beforeRender = async function (instance) {

        var promises = [];

        if (instance.beforeRender) {
            promises.push(
                V.promisify(instance, instance.beforeRender)
            );
        }

        var hooks = _global.beforeRenderHooks;
        for (let index = 0; index < hooks.length; index++) {
            promises.push(
                V.promisify(instance, hooks[index])
            );
        }

        await Promise.all(promises);

        return instance;
    };

    /**
     * Run after render hooks
     * @param {Object} instance
     * @return {Promise}
     */
    var afterRender = async function (instance) {

        var promises = [];

        if (instance.afterRender) {
            promises.push(
                V.promisify(instance, instance.afterRender)
            );
        }

        var hooks = _global.afterRenderHooks;
        for (let index = 0; index < hooks.length; index++) {
            promises.push(
                V.promisify(instance, hooks[index])
            );
        }

        // Mount child components
        promises.push(
            V.mount(instance.element)
        );

        await Promise.all(promises);

        return instance;
    };

    /**
     * Run before destroy hooks
     * @param {Object} instance
     * @return {Promise}
     */
    var beforeDestroy = async function (instance) {

        var promises = [];

        if (instance.beforeDestroy) {
            promises.push(
                V.promisify(instance, instance.beforeDestroy)
            );
        }

        var hooks = _global.beforeDestroyHooks;
        for (let index = 0; index < hooks.length; index++) {
            promises.push(
                V.promisify(instance, hooks[index])
            );
        }

        await Promise.all(promises);

        return instance;
    };

    /**
     * Run after destroy hooks
     * @param {Object} instance
     * @return {Promise}
     */
    var afterDestroy = async function (instance) {

        var promises = [];

        if (instance.afterDestroy) {
            promises.push(
                V.promisify(instance, instance.afterDestroy)
            );
        }

        var hooks = _global.afterDestroyHooks;
        for (let index = 0; index < hooks.length; index++) {
            promises.push(
                V.promisify(instance, hooks[index])
            );
        }

        // unMount child components
        promises.push(
            V.unMount(instance.element)
        );

        await Promise.all(promises);

        return instance;
    };

    /**
     * Mount component on matches selector for given target
     * @param {Object} component
     * @param {Node} target
     * @return {Promise}
     */
    var mountComponent = async function (component, target) {

        var promises = [];

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

                promises.push(
                    V.mountComponent(component)
                );

            });

        await Promise.all(promises);

        return component;
    };

    /**
     * unMount component on matches selector for given target
     * @param {Object} component
     * @param {Node} target
     * @return {Promise}
     */
    var unMountComponent = async function (component, target) {

        var promises = [];

        // Find items for the component on target
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

                promises.push(
                    V.unMountComponent(component)
                );

            });

        await Promise.all(promises);

        return component;
    };

    // PUBLIC

    V.extend({

        /**
         * Add global callback before component render
         * @param {Function} callback
         * @return {void}
         */
        beforeRender: function (callback) {
            _global.beforeRenderHooks.push(callback);
        },

        /**
         * Add global callback after component render
         * @param {Function} callback
         * @return {void}
         */
        afterRender: function (callback) {
            _global.afterRenderHooks.push(callback);
        },

        /**
         * Add global callback before component destroy
         * @param {Function} callback
         * @return {void}
         */
        beforeDestroy: function (callback) {
            _global.beforeDestroyHooks.push(callback);
        },

        /**
         * Add global callback after component destroy
         * @param {Function} callback
         * @return {void}
         */
        afterDestroy: function (callback) {
            _global.afterDestroyHooks.push(callback);
        },

        /**
         * Create new component
         * @param {String} selector
         * @param {Object} data
         * @return {Promise}
         */
        component: async function (selector, data) {

            var promises = [];
            var component = Object.assign(
                {},
                _abstractComponent,
                data
            );

            component.selector = selector;
            component.namespace = selector.replace(/[\W_]+/g, '_');

            if (typeof component.constructor == 'function') {
                promises.push(
                    V.promisify(component, component.constructor)
                );
            }

            try {

                await Promise.all(promises);
                _global.components.push(component);

            } catch (error) {
                console.warn('Component construct error:', error);
            }

            return component;
        },

        /**
         * Remove component
         * @param {String} selector
         * @return {Promise}
         */
        removeComponent: async function (selector) {

            var promises = [];
            var component = null;
            var index = null;

            _global.components.forEach(function (theComponent, theIndex) {
                if (theComponent.selector == selector) {
                    component = theComponent;
                    index = theIndex;
                }
            });

            if (!component) {
                return selector;
            }

            promises.push(
                unMountComponent(component, document.body)
            );

            if (typeof component.destructor == 'function') {
                promises.push(
                    V.promisify(component, component.destructor)
                );
            }

            try {

                await Promise.all(promises);
                delete _global.components[index];

            } catch (error) {
                console.warn('Component destruct error:', error);
            }

            return selector;
        },

        /**
         * Mount components on given target child elements
         * @param {Node} target
         * @return {Promise}
         */
        mount: async function (target) {

            var promises = [];

            _global.components.forEach(function (component) {
                promises.push(
                    mountComponent(component, target)
                );
            });

            await Promise.all(promises);

            return target;
        },

        /**
         * unMount components on given target child elements
         * @param {Node} target
         * @return {Promise}
         */
        unMount: async function (target) {

            var promises = [];

            _global.components.forEach(function (component) {
                promises.push(
                    unMountComponent(component, target)
                );
            });

            await Promise.all(promises);

            return target;
        },

        /**
         * Mount component to start render process
         * @param {Object} component
         * @return {Promise}
         */
        mountComponent: async function (component) {

            var self = this;

            var resolve = function (instance) {
                return self.render(instance);
            };

            var reject = function (instance) {
                return self.render(instance);
            };

            if (typeof component == 'function') {

                try {
                    let instance = await new Promise(component);
                    await resolve(instance);
                } catch (error) {
                    reject(instance);
                }

            } else if (typeof component == 'object') {
                return resolve(component);
            }

            throw 'Unknown component reference';

        },

        /**
         * UnMount component to start destroy process
         * @param {mixed} component
         * @return {Promise}
         */
        unMountComponent: async function (component) {

            var self = this;

            var resolve = function (instance) {
                return self.destroy(instance);
            };

            var reject = function (instance) {
                return self.destroy(instance);
            };

            if (typeof component == 'function') {
                try {
                    let instance = await new Promise(component);
                    await resolve(instance);
                } catch (error) {
                    reject(instance);
                }
            } else if (typeof component == 'object') {
                return resolve(component);
            }

            throw 'Unknown component reference';

        },

        /**
         * Render component
         * @param {Object} component
         * @return {Promise}
         */
        render: async function (component) {

            try {

                var promises = [
                    V.promisify(component, component.shouldRender),
                    beforeRender(component),
                    V.promisify(component, component.onRender),
                    afterRender(component)
                ];

                await Promise.all(promises);

            } catch (error) {
                console.warn('Component render error:', error);
            }

            return component;
        },

        /**
         * Process component destroy
         * @param {Object} component
         * @return {Promise}
         */
        destroy: async function (component) {

            try {

                var promises = [
                    beforeDestroy(component),
                    V.promisify(component, component.onDestroy),
                    afterDestroy(component)
                ];

                await Promise.all(promises);

            } catch (error) {
                console.warn('Component destroy error:', error);
            }

            return component;
        }

    });

})(window.V);(function (V) {

    // PRIVATE

    /**
     * Global data
     * @param {Object}
     */
    var _global = {
        interceptBeforeHooks: [],
        interceptAfterHooks: []
    };

    /**
     * Run intercept before hooks
     * @param {Object} request
     * @return {Promise}
     */
    var interceptBefore = async function (request) {

        var promises = [];

        var hooks = _global.interceptBeforeHooks;
        for (let index = 0; index < hooks.length; index++) {
            promises.push(
                V.promisify(request, hooks[index])
            );
        }

        await Promise.all(promises);

        return request;
    };

    /**
     * Run intercept after hooks
     * @param {Object} request
     * @return {Promise}
     */
    var interceptAfter = async function (request) {

        var promises = [];

        var hooks = _global.interceptAfterHooks;
        for (let index = 0; index < hooks.length; index++) {
            promises.push(
                V.promisify(request, hooks[index])
            );
        }

        await Promise.all(promises);

        return request;
    };

    /**
     * Decode data to the correct format
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
    V.extend({
        http: {

            /**
             * Add interceptor callback before each HTTP request
             * @param {Function} callback
             * @return {void}
             */
            interceptBefore: function (callback) {
                _global.interceptBeforeHooks.push(callback);
            },

            /**
             * Add interceptor callback after each HTTP request
             * @param {Function} callback
             * @return {void}
             */
            interceptAfter: function (callback) {
                _global.interceptAfterHooks.push(callback);
            },

            /**
             * Make HTTP requests
             * @param {String} method
             * @param {String} url
             * @param {Object} data
             * @param {Object} headers
             * @return {Object}
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

                request = await interceptBefore(request);

                if (request.headers) {
                    request.options.headers = request.headers;
                }
                if (request.method) {
                    request.options.method = request.method;
                }

                var _data = decodeData(request.data);

                if (request.options.method != 'GET') {

                    if( !_data instanceof FormData ){
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

                return new Promise(function (resolve, reject) {

                    fetch(request.url, request.options)
                        .then(function (response) {
                            request.response = response;
                            return interceptAfter(request);
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
                        })
                        .then(function (response) {
                            resolve(response);
                        })
                        .catch(function (error) {
                            reject(error);
                        });

                });
            },

            /**
             * Make GET HTTP requests
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

})(window.V);