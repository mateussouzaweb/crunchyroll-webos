var _store = {};
var _watches = {};
var _cache = {};

const Store = {

    /**
     * Create a async promise with callback
     * @param {Function} callback
     * @param {mixed} data
     * @return {mixed}
     */
    promisify: async function(callback, data) {
        try {
            return await callback.apply(this, [data]);
        }
        catch (error) {
            return Promise.reject(error);
        }
    },

    /**
     * Set store data
     * @param {String} key
     * @param {mixed} value
     * @param {boolean} local
     * @return {Promise}
     */
    set: function(key, value, local){
        return this.promisify(function(){

            if( typeof key == 'string' ){
                _store[key] = value;
            } else {
                _store = Object.assign(_store, key);
            }

            if( local ){
                V.local.set(key, value);
            }

        });
    },

    /**
     * Retrieve store data
     * @param {String} key
     * @param {mixed} _default
     * @return {mixed}
     */
    get: function(key, _default){

        if( key === undefined ){
            return _store;
        }

        var value = _store[key];
            value = (value === undefined) ? _default : value;

        return value;
    },

    /**
     * Completely remove data on store
     * @param {String|Array} key
     * @return {Promise}
     */
    remove: function(key){
        var keys = (typeof key == 'string') ? [key] : key;
        return this.promisify(function(){
            V.each(keys, function(key){
                delete _store[key];
                V.local.remove(key);
            });
        });
    },

    /**
     * Load data from local storage and set on store
     * @param {Array} keys
     * @return {Promise}
     */
    load: function(keys){

        var self = this;
        var promises = [];

        V.each(keys, function(key){
            var value = V.local.get(key);
            if( value !== undefined && value !== null ){
                promises.push( self.set(key, value, false) )
            }
        });

        return Promise.all(promises);
    },

    /**
     * Add watch to a store event
     * Better call events names as: "{key}{verb}"
     * @param {String} event
     * @param {String} callbackName
     * @param {Function} callback
     * @return {void}
     */
    on: function(event, callbackName, callback){

        if( _watches[event] === undefined ){
            _watches[event] = [];
        }

        _watches[event].push([callbackName, callback]);

    },

    /**
     * Unwatch a store event
     * @param {String} event
     * @param {String} callbackName
     * @return {void}
     */
    off: function(event, callbackName){

        if( !_watches[event] ){
            return;
        }

        if( callbackName === undefined ){
            _watches[event] = [];
            return;
        }

        _watches[event] = _watches[event].filter(function(watcher){
            return watcher[0] !== callbackName
        });

    },

    /**
     * Fire event data
     * @param {String} event
     * @param {mixed} data
     * @return {Promise}
     */
    fire: function(event, data){

        var self = this;
        var promises = [];

        V.each(_watches[event] || [], function(watcher){
            promises.push(self.promisify(watcher[1], data));
        });

        return Promise.all(promises);
    }

}
