var V = (function (exports) {
    'use strict';

    var _hooks = [];
    function hook(event, callback) {
        if (callback === undefined) {
            return (_hooks[event]) ? _hooks[event] : [];
        }
        _hooks[event] = _hooks[event] || [];
        _hooks[event].push(callback);
    }
    function each(items, callback) {
        if (Array.isArray(items)) {
            return items.forEach(callback);
        }
        const keys = Object.keys(items);
        for (const key of keys) {
            callback(items[key], key, items);
        }
    }
    function namespaceEvent(theEvent, callback) {
        var split = theEvent.split('.');
        var event = split.shift();
        var namespace = split.join('.');
        return {
            event: event,
            namespace: namespace,
            callback: callback
        };
    }

    function getContext(context) {
        context = (typeof context === 'string') ? $(context) : context;
        context = (context instanceof Node) ? context : document;
        return context;
    }
    function $(selector, context) {
        return getContext(context).querySelector(selector);
    }
    function $$(selector, context) {
        return getContext(context).querySelectorAll(selector);
    }
    function $$$(element, context) {
        var items = [];
        if (typeof element === 'string') {
            element = $$(element, context);
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

    var _events = [];
    function _event(action, element, event, selector, callback) {
        var events = event.split(' ');
        if (events.length > 1) {
            for (var i = 0; i < events.length; i++) {
                _event(action, element, events[i], selector, callback);
            }
            return;
        }
        var items = $$$(element);
        var handler;
        if (callback === undefined) {
            handler = selector;
            selector = null;
        }
        else {
            handler = function (_event) {
                var target = _event.target.closest(selector);
                if (target) {
                    callback.apply(target, [_event]);
                }
            };
        }
        var theEvent = namespaceEvent(event, handler);
        if (action === 'add') {
            _events.push(theEvent);
            items.forEach(function (item) {
                item.addEventListener(theEvent.event, theEvent.callback.bind(item), false);
            });
        }
        else {
            _events = _events.filter(function (watcher) {
                var pass = Boolean((theEvent.event ? theEvent.event !== watcher.event : true)
                    && (theEvent.namespace ? theEvent.namespace !== watcher.namespace : true)
                    && (typeof handler === 'function' ? handler !== watcher.callback : true));
                if (!pass) {
                    items.forEach(function (item) {
                        item.removeEventListener(watcher.event, watcher.callback.bind(item), false);
                    });
                }
                return pass;
            });
        }
        return handler;
    }
    function on(element, event, selector, callback) {
        return _event('add', element, event, selector, callback);
    }
    function off(element, event, selector, callback) {
        return _event('remove', element, event, selector, callback);
    }
    function trigger(element, event, selector) {
        var items = (selector) ? $$$(selector, element) : $$$(element);
        var theEvent = document.createEvent('HTMLEvents');
        theEvent.initEvent(event, true, true);
        items.forEach(function (item) {
            item.dispatchEvent(theEvent);
        });
    }

    async function fakePromise() { }
    async function promisify(scope, callback, data) {
        try {
            return await callback.apply(scope, data);
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    async function promises(scope, callbacks) {
        var promises = [];
        for (let index = 0; index < callbacks.length; index++) {
            if (typeof callbacks[index] === 'function') {
                promises.push(promisify(scope, callbacks[index]));
            }
        }
        await Promise.all(promises);
        return scope;
    }

    var _watches = [];
    function watch(theEvent, callback) {
        _watches.push(namespaceEvent(theEvent, callback));
    }
    function unwatch(theEvent, callback) {
        var event = namespaceEvent(theEvent, callback);
        _watches = _watches.filter(function (watcher) {
            return Boolean((event.event ? event.event !== watcher.event : true)
                && (event.namespace ? event.namespace !== watcher.namespace : true)
                && (event.callback !== undefined ? event.callback !== watcher.callback : true));
        });
    }
    function fire(theEvent, data) {
        var event = namespaceEvent(theEvent);
        var promises = [];
        _watches.forEach(function (watcher) {
            if ((event.event ? event.event === watcher.event : true)
                && (event.namespace ? event.namespace === watcher.namespace : true)) {
                promises.push(promisify({}, watcher.callback, [data]));
            }
        });
        return Promise.all(promises);
    }

    var _helpers = {};
    function helper(key, callback) {
        _helpers[key] = callback;
    }
    function clean(line) {
        return line
            .replace(/\s+/g, ' ')
            .replace(/^{{\s?/, '')
            .replace(/\s?}}$/, '');
    }
    function conditions(line) {
        return line
            .replace(/^if\s?(.*)$/, 'if( $1 ){')
            .replace(/^else$/, '} else {')
            .replace(/^end$/, '}');
    }
    function loops(line) {
        return line
            .replace(/^for\s?(.*)\sin\s(.*)$/, 'for( var $1 in $2 ){')
            .replace(/^each\s?(.*)\s?=>\s?(.*)\sin\s(.*)$/, 'for( var $1 in $3 ){ var $2 = $3[$1];')
            .replace(/^each\s?(.*)\sin\s(.*)$/, 'for( var _$1 in $2 ){ var $1 = $2[_$1];');
    }
    function variables(line) {
        var vars = [];
        var add = function (regex) {
            var match = line.match(regex);
            if (match) {
                vars.push(match[1]);
            }
        };
        add(/^(?!}|for\(|if\()([A-Za-z0-9_]+)/);
        add(/^if\(\s?!?([A-Za-z0-9_]+)/);
        add(/&&\s?!?([A-Za-z0-9_]+)/);
        add(/\|\|\s?!?([A-Za-z0-9_]+)/);
        add(/in\s([A-Za-z0-9_]+)\s\)/);
        return vars;
    }
    function template(template, data) {
        var tagRegex = /{{([^}}]+)?}}/g;
        var parser = [];
        var cursor = 0;
        var line = '';
        var before = '';
        var after = '';
        var match;
        data = Object.assign({}, _helpers, data || {});
        each(data, function (_value, index) {
            parser.push('var ' + index + ' = this["' + index + '"];');
        });
        parser.push('var r = [];');
        while ((match = tagRegex.exec(template))) {
            line = clean(match[0]);
            line = conditions(line);
            line = loops(line);
            before = template.slice(cursor, match.index);
            cursor = match.index + match[0].length;
            parser.push('r.push(`' + before.replace(/"/g, '\\"') + '`);');
            variables(line).filter(function (value) {
                if (data[value] === undefined) {
                    parser.push('var ' + value + ';');
                }
            });
            parser.push(line.match(/^(}|{|for\(|if\()/) ? line : 'r.push(' + line + ');');
        }
        after = template.substr(cursor, template.length - cursor);
        parser.push('r.push(`' + after.replace(/"/g, '\\"') + '`);');
        parser.push('return r.join("");');
        var code = parser.join("\n");
        try {
            var result = new Function(code.replace(/[\r\t\n]/g, '')).apply(data || {});
        }
        catch (error) {
            console.warn('[V] template parser error:', template, error);
        }
        return result;
    }

    var _components = [];
    var _abstractComponent = {
        element: null,
        selector: null,
        namespace: null,
        constructor: fakePromise,
        destructor: fakePromise,
    };
    function extendComponent(definition) {
        Object.assign(_abstractComponent, definition);
    }
    function eachComponent(target, callback) {
        _components.forEach(function (declaration) {
            var items = $$$(declaration.selector, target);
            items.forEach(function (element) {
                if (element._components === undefined) {
                    element._components = {};
                }
                if (element._state === undefined) {
                    element._state = {};
                }
                callback.apply(element, [element, declaration]);
            });
        });
    }
    async function component(selector, data) {
        var component = Object.assign({}, _abstractComponent, data);
        component.selector = selector;
        if (!component.namespace) {
            component.namespace = selector.replace(/[\W_]+/g, '_');
        }
        try {
            var callbacks = [].concat([component.constructor]);
            await promises(component, callbacks);
            _components.push(component);
        }
        catch (error) {
            console.warn('[V] Component construct error:', error);
        }
        return component;
    }
    async function removeComponent(selector) {
        var component = null;
        var index = null;
        _components.forEach(function (theComponent, theIndex) {
            if (theComponent.selector === selector) {
                component = theComponent;
                index = theIndex;
            }
        });
        if (!component) {
            return;
        }
        try {
            var callbacks = [].concat([component.destructor]);
            await promises(component, callbacks);
            delete _components[index];
        }
        catch (error) {
            console.warn('[V] Component destruct error:', error);
        }
    }

    extendComponent({
        beforeDestroy: fakePromise,
        onDestroy: fakePromise,
        afterDestroy: fakePromise,
    });
    function beforeDestroy(callback) {
        hook('componentBeforeDestroy', callback);
    }
    function afterDestroy(callback) {
        hook('componentAfterDestroy', callback);
    }
    async function destroy(target) {
        var callbacks = [];
        eachComponent(target, function (element, declaration) {
            var key = declaration.namespace;
            if (element._components[key] === undefined) {
                return;
            }
            var component = element._components[key];
            delete element._components[key];
            var componentCallbacks = [].concat(hook('componentBeforeDestroy'), [component.beforeDestroy], [component.onDestroy], [component.afterDestroy], hook('componentAfterDestroy'));
            callbacks.push(promises(component, componentCallbacks));
        });
        await Promise.all(callbacks);
        return target;
    }

    extendComponent({
        on: function (event, selector, callback) {
            if (callback === undefined) {
                callback = selector;
                selector = '';
            }
            var element = this.element;
            var eventID = [event, this.namespace, element.dataset.vid].join('.');
            return on(element, eventID, selector, callback);
        },
        off: function (event, selector) {
            var element = this.element;
            var eventID = [event, this.namespace, element.dataset.vid].join('.');
            return off(element, eventID, selector);
        },
        trigger: function (event, selector) {
            var element = this.element;
            var eventID = [event, this.namespace, element.dataset.vid].join('.');
            return trigger(element, eventID, selector);
        }
    });
    beforeDestroy(async function () {
        return this.off();
    });

    extendComponent({
        watch: function (event, callback) {
            var eventID = [event, this.namespace, this.element.dataset.vid].join('.');
            return watch(eventID, callback);
        },
        unwatch: function (event, callback) {
            var eventID = [event, this.namespace, this.element.dataset.vid].join('.');
            return unwatch(eventID, callback);
        },
        fire: function (event, data) {
            var eventID = [event, this.namespace, this.element.dataset.vid].join('.');
            return fire(eventID, data);
        }
    });
    beforeDestroy(async function () {
        return this.unwatch();
    });

    extendComponent({
        beforeMount: fakePromise,
        onMount: fakePromise,
        afterMount: fakePromise,
    });
    function beforeMount(callback) {
        hook('componentBeforeMount', callback);
    }
    function afterMount(callback) {
        hook('componentAfterMount', callback);
    }
    async function mount(target) {
        var callbacks = [];
        eachComponent(target, function (element, declaration) {
            var key = declaration.namespace;
            if (element._components[key] !== undefined) {
                return;
            }
            if (!element.dataset.vid) {
                element.dataset.vid = Math.random().toString(16).substr(2, 8);
            }
            var component = Object.assign({}, declaration);
            component.element = element;
            element._components[key] = component;
            var componentCallbacks = [].concat(hook('componentBeforeMount'), [component.beforeMount], [component.onMount], [component.afterMount], hook('componentAfterMount'));
            callbacks.push(promises(component, componentCallbacks));
        });
        await Promise.all(callbacks);
        return target;
    }

    extendComponent({
        template: fakePromise,
        renderTemplate: async function () {
            var current = this.element.innerHTML;
            var theTemplate = await this.template();
            if (theTemplate === undefined || theTemplate === null || theTemplate === false) {
                return;
            }
            var variables = this.get();
            var result = template(String(theTemplate), variables);
            if (result != current) {
                await destroy(this.element);
                this.element.innerHTML = result;
            }
        },
        shouldRender: async function () {
            return true;
        },
        beforeRender: fakePromise,
        onRender: fakePromise,
        afterRender: fakePromise,
        render: async function (state) {
            if (state !== undefined) {
                this.set(state);
            }
            var component = this;
            var pass = await component.shouldRender();
            if (!pass) {
                return;
            }
            try {
                var callbacks = [].concat(hook('componentBeforeRender'), [component.beforeRender], [component.renderTemplate], [component.onRender], [component.afterRender], hook('componentAfterRender'));
                await promises(component, callbacks);
                await mount(component.element);
            }
            catch (error) {
                console.warn('[V] Component render error:', error);
            }
        }
    });
    function beforeRender(callback) {
        hook('componentBeforeRender', callback);
    }
    function afterRender(callback) {
        hook('componentAfterRender', callback);
    }
    afterMount(async function () {
        return this.render();
    });

    extendComponent({
        set: function (key, value) {
            var element = this.element;
            if (typeof key === 'string') {
                element._state[key] = value;
            }
            else {
                element._state = Object.assign(element._state, key);
            }
        },
        get: function (key, _default) {
            var element = this.element;
            if (key === undefined) {
                return element._state;
            }
            var value = element._state[key];
            value = (value === undefined) ? _default : value;
            return value;
        }
    });

    function interceptBefore(callback) {
        hook('httpInterceptBefore', callback);
    }
    function interceptAfter(callback) {
        hook('httpInterceptAfter', callback);
    }
    async function request(method, url, data, headers) {
        var request = {
            method: method,
            url: url,
            data: data,
            headers: headers
        };
        await promises(request, hook('httpInterceptBefore'));
        var options = Object.assign({}, request);
        delete options.url;
        delete options.data;
        if (options.method != 'GET') {
            if (options.body === undefined || options.body === null) {
                options.body = request.data;
                if (options.body instanceof FormData === false) {
                    options.body = JSON.stringify(options.body);
                    options.headers['Content-Type'] = 'application/json; charset=utf8';
                }
            }
        }
        else {
            var query = '';
            if (typeof request.data === 'string') {
                query = request.data;
            }
            else if (request.data) {
                query = Object.keys(request.data).map(function (k) {
                    var _k = encodeURIComponent(k);
                    var _v = encodeURIComponent(request.data[k]);
                    return _k + "=" + _v;
                }).join('&');
            }
            if (query) {
                request.url += '?' + query;
            }
        }
        var response = await fetch(request.url, options);
        var body = await response.text();
        try {
            var json = JSON.parse(body);
            body = json;
        }
        catch (error) {
        }
        var details = {
            request: request,
            response: response,
            body: body
        };
        await promises(details, hook('httpInterceptAfter'));
        if (!response.ok) {
            throw details;
        }
        return body;
    }
    function options(url, data, headers) {
        return request('OPTIONS', url, data, headers);
    }
    function head(url, data, headers) {
        return request('HEAD', url, data, headers);
    }
    function get(url, data, headers) {
        return request('GET', url, data, headers);
    }
    function post(url, data, headers) {
        return request('POST', url, data, headers);
    }
    function put(url, data, headers) {
        return request('PUT', url, data, headers);
    }
    function patch(url, data, headers) {
        return request('PATCH', url, data, headers);
    }
    function _delete(url, data, headers) {
        return request('DELETE', url, data, headers);
    }

    var http = /*#__PURE__*/Object.freeze({
        __proto__: null,
        interceptBefore: interceptBefore,
        interceptAfter: interceptAfter,
        request: request,
        options: options,
        head: head,
        get: get,
        post: post,
        put: put,
        patch: patch,
        _delete: _delete
    });

    var _abstractRoute = {
        path: null,
        regex: null,
        _query: {},
        _params: {},
        param(name) {
            if (name === undefined) {
                return this._params;
            }
            if (this._params[name] !== undefined) {
                return this._params[name];
            }
            return undefined;
        },
        query(name) {
            if (name === undefined) {
                return this._query;
            }
            if (this._query[name] !== undefined) {
                return this._query[name];
            }
            return undefined;
        },
        location() {
            var params = this._params;
            var location = this.path;
            for (const key in params) {
                if (params.hasOwnProperty(key)) {
                    location = location.replace(':' + key, params[key]);
                }
            }
            return location;
        }
    };
    var _routes = [];
    var _active = _abstractRoute;
    var options$1 = {
        mode: window.history.pushState ? 'history' : 'hash',
        base: '',
        prevent: false
    };
    function normalizePath(path, removeQuery) {
        path = path.replace(window.location.origin, '');
        path = path.replace(options$1.base, '');
        path = path.replace(new RegExp('[/]*$'), '');
        path = path.replace(new RegExp('^[/]*'), '');
        path = ('/' + path).replace('//', '/').replace('/?', '?');
        if (removeQuery) {
            path = path.split('?')[0];
        }
        return path;
    }
    function paramsFor(path, match) {
        var params = {};
        var parts = normalizePath(match.path, true)
            .split('/')
            .filter(Boolean);
        var url = normalizePath(path, true)
            .split('/')
            .filter(Boolean);
        url.forEach(function (value, index) {
            if (parts[index] !== undefined && ':'.charCodeAt(0) === parts[index].charCodeAt(0)) {
                const key = parts[index].substr(1);
                params[key] = decodeURIComponent(value);
            }
        });
        return params;
    }
    function queryFor(location) {
        var query = {};
        var search = (location.indexOf('?') !== -1) ? location.split('?')[1] : '';
        search = String(search).trim().replace(/^(\?|#|&)/, '');
        if (search === '') {
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
    }
    function beforeChange(callback) {
        hook('routeBeforeChange', callback);
    }
    function afterChange(callback) {
        hook('routeAfterChange', callback);
    }
    function add(definition) {
        if (Array.isArray(definition)) {
            return definition.forEach(function (item) {
                add(item);
            });
        }
        var route = Object.assign({}, _abstractRoute, definition);
        route.path = normalizePath(route.path, true);
        var regex = route.path;
        var pattern = ['(:[a-zA-Z]+)'];
        var replace = ['([^\/]+)'];
        pattern.forEach(function (value, index) {
            regex = regex.replace(new RegExp(value, 'g'), replace[index]);
        });
        route.regex = new RegExp('^' + regex + '$', 'i');
        _routes.push(route);
    }
    async function change(location, replace) {
        var routeChange = function () {
            if (this.replace) {
                options$1.prevent = true;
                if (options$1.mode === 'history') {
                    history.pushState({}, null, this.location);
                }
                else {
                    window.location.hash = this.location;
                }
                options$1.prevent = false;
            }
            var next = this.next;
            if (!next) {
                return _active = null;
            }
            var query = queryFor(this.location);
            var params = paramsFor(this.location, next);
            next._query = query;
            next._params = params;
            _active = next;
        };
        try {
            location = normalizePath(location);
            var change = {
                previous: _active,
                next: match(location),
                location: location,
                replace: replace
            };
            await promises(change, [].concat(hook('routeBeforeChange'), [routeChange], hook('routeAfterChange')));
        }
        catch (error) {
            console.warn('[V] Route error:', error);
        }
    }
    function match(path) {
        var url = normalizePath(path, true);
        var match = null;
        for (let index = 0; index < _routes.length; index++) {
            const item = _routes[index];
            if (url.match(item.regex)) {
                match = item;
                break;
            }
        }
        return match;
    }
    function active() {
        return _active;
    }
    function redirect(toLocation) {
        return change(toLocation, true);
    }
    function go(delta) {
        window.history.go(delta);
    }
    function forward(delta) {
        go(delta === undefined ? 1 : delta);
    }
    function back(delta) {
        go(delta === undefined ? -1 : delta);
    }
    function popstate() {
        if (options$1.prevent) {
            return;
        }
        var path = (options$1.mode === 'hash')
            ? window.location.hash.replace('#', '')
            : window.location.href;
        change(path);
    }
    function linkClick(event) {
        var link = event.target.closest('a');
        var location = window.location;
        var stripHash = function (location) {
            return location.href.replace(/#.*/, '');
        };
        if (event.metaKey
            || event.ctrlKey
            || event.shiftKey
            || event.altKey) {
            return;
        }
        if (link.protocol && location.protocol !== link.protocol
            || link.hostname && location.hostname !== link.hostname) {
            return;
        }
        if (options$1.mode !== 'hash'
            && link.href
            && link.href.indexOf('#') > -1
            && stripHash(link) === stripHash(location)) {
            return;
        }
        if (link.target
            && link.target !== '') {
            return;
        }
        if (event.defaultPrevented) {
            return;
        }
        redirect(link.href);
        event.preventDefault();
    }
    function attachEvents() {
        on(window, 'popstate', popstate);
        on(document, 'click', 'a', linkClick);
    }

    var route = /*#__PURE__*/Object.freeze({
        __proto__: null,
        options: options$1,
        beforeChange: beforeChange,
        afterChange: afterChange,
        add: add,
        change: change,
        match: match,
        active: active,
        redirect: redirect,
        go: go,
        forward: forward,
        back: back,
        attachEvents: attachEvents
    });

    var _store = {};
    function _compress(value) {
        if (value instanceof Object) {
            value = JSON.stringify(value);
        }
        return value;
    }
    function _decompress(value) {
        try {
            var json = JSON.parse(value);
            value = json;
        }
        catch (error) {
        }
        return value;
    }
    function set(name, value) {
        _store[name] = value;
    }
    function get$1(name, _default) {
        var value = _store[name];
        value = (value === undefined || value === null) ? local.get(name) : value;
        value = (value === undefined || value === null) ? _default : value;
        return value;
    }
    function remove(name) {
        delete _store[name];
    }
    function items() {
        return _store;
    }
    const local = {
        set: function (name, value) {
            localStorage.setItem(name, _compress(value));
        },
        get: function (name, _default) {
            var value = localStorage.getItem(name);
            value = _decompress(value);
            value = (value === undefined || value === null) ? _default : value;
            return value;
        },
        remove: function (name) {
            localStorage.removeItem(name);
        },
        items: function () {
            return localStorage;
        }
    };
    const session = {
        set: function (name, value) {
            sessionStorage.setItem(name, _compress(value));
        },
        get: function (name, _default) {
            var value = sessionStorage.getItem(name);
            value = _decompress(value);
            value = (value === undefined || value === null) ? _default : value;
            return value;
        },
        remove: function (name) {
            sessionStorage.removeItem(name);
        },
        items: function () {
            return sessionStorage;
        }
    };

    var store = /*#__PURE__*/Object.freeze({
        __proto__: null,
        set: set,
        get: get$1,
        remove: remove,
        items: items,
        local: local,
        session: session
    });

    const __version = '1.0.7';

    exports.$ = $;
    exports.$$ = $$;
    exports.$$$ = $$$;
    exports.__version = __version;
    exports.afterDestroy = afterDestroy;
    exports.afterMount = afterMount;
    exports.afterRender = afterRender;
    exports.beforeDestroy = beforeDestroy;
    exports.beforeMount = beforeMount;
    exports.beforeRender = beforeRender;
    exports.component = component;
    exports.destroy = destroy;
    exports.each = each;
    exports.eachComponent = eachComponent;
    exports.extendComponent = extendComponent;
    exports.fakePromise = fakePromise;
    exports.fire = fire;
    exports.helper = helper;
    exports.hook = hook;
    exports.http = http;
    exports.mount = mount;
    exports.namespaceEvent = namespaceEvent;
    exports.off = off;
    exports.on = on;
    exports.promises = promises;
    exports.promisify = promisify;
    exports.removeComponent = removeComponent;
    exports.route = route;
    exports.store = store;
    exports.template = template;
    exports.trigger = trigger;
    exports.unwatch = unwatch;
    exports.watch = watch;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

}({}));