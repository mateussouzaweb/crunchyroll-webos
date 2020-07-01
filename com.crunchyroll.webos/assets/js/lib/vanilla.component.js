(function (V) {

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

            V._components.forEach(function (_component) {

                V.items(_component.selector, target)
                .forEach(function (element) {

                    if (element._components === undefined) {
                        element._components = {};
                    }

                    var key = _component.namespace;

                    // Already mounted
                    if (element._components[key] !== undefined) {
                        return;
                    }

                    if( !element.dataset.vid ){
                        element.dataset.vid = Math.random().toString(16).substr(2, 8);
                    }

                    // Clone component to this element
                    var component = Object.assign({}, _component);
                        component.element = element;

                    element._components[key] = component;

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
                [component.shouldRender],
                _global.beforeRenderHooks,
                [component.beforeRender],
                [component.onRender],
                [component.afterRender],
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
         * Destroy components on given target child elements
         * @public
         * @name V.destroy
         * @kind function
         * @param {Node} target
         * @return {Promise}
         */
        destroy: async function (target) {

            var promises = [];

            V._components.forEach(function (_component) {
                V.items(_component.selector, target)
                .forEach(function (element) {

                    if (element._components === undefined) {
                        return;
                    }

                    var key = _component.namespace;

                    if (element._components[key] === undefined) {
                        return;
                    }

                    var component = element._components[key];
                    delete element._components[key];

                    var callbacks = [].concat(
                        _global.beforeDestroyHooks,
                        [component.beforeDestroy],
                        [component.onDestroy],
                        [component.afterDestroy],
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
            var element = self.element;

            if (callback === undefined) {
                callback = selector;
                selector = self.selector;
            } else {
                selector = self.selector + ' ' + selector;
            }

            var eventId = event + '-' + selector;
            var vid = element.dataset.vid;
                vid = '[data-vid="' + vid + '"]';

            var fn = function (e) {

                var element = e.target.closest(vid);

                if (!element) {
                    return;
                }

                callback.apply(e.target.closest(selector), [e]);

            };

            if (element._events === undefined) {
                element._events = {};
            }

            element._events[eventId] = V.on(
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

            var self = this;
            var element = self.element;

            if (selector) {
                selector = self.selector + ' ' + selector;
            } else {
                selector = self.selector;
            }

            var eventId = event + '-' + selector;

            if (element._events === undefined) {
                element._events = {};
            }

            var fn = element._events[eventId];

            if (!fn) {
                return;
            }

            delete element._events[eventId];
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

            var element = this.element;

            if (element._storage === undefined) {
                element._storage = {};
            }

            element._storage[key] = value;

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

            var element = this.element;

            if (element._storage === undefined) {
                element._storage = {};
            }

            var value = element._storage[key];

            if (value === undefined) {
                return defaultValue;
            }

            return value;
        }

    });

})(window.V);