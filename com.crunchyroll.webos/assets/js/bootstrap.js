V.on(window, 'load', function(){

    // Template helpers
    V.helper('store', function(key, _default){
        return V.store.local.get(key, _default);
    });

    V.helper('selected', function(condition){
        return (condition) ? 'selected="selected"' : ''
    });

    // Route definitions
    var base = window.location.pathname.replace('index.html', '');

    V.route.options.mode = 'hash';
    V.route.options.base = base;
    V.route.attachEvents();

    // Component mounts
    V.mount(document.body);

});