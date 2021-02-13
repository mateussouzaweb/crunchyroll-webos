V.on(window, 'load', async function(){

    // Storage
    await Store.load([
        'accessToken',
        'auth',
        'deviceId',
        'deviceType',
        'email',
        'expires',
        'locale',
        'password',
        'sessionId',
        'userId',
        'userName',
    ]);

    // Template helpers
    V.helper('store', function(key, _default){
        return Store.get(key, _default);
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