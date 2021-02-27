V.route.add({
    id: 'logout',
    path: '/logout',
    title: 'Logout',
    component: '<div data-logout></div>',
    authenticated: true
});

V.component('[data-logout]', {

    /**
     * On mount
     * @return {void}
     */
    onMount: async function(){

        window.showLoading();

        var sessionId = V.store.local.get('sessionId');
        var locale = V.store.local.get('locale');

        if( sessionId ){
            try {
                await Api.request('POST', '/logout', {
                    session_id: sessionId,
                    locale: locale
                });
            } catch (error) {
                console.log(error.message);
            }
        }

        await V.store.local.remove('accessToken');
        await V.store.local.remove('deviceType');
        await V.store.local.remove('deviceId');
        await V.store.local.remove('sessionId');
        await V.store.local.remove('locale');
        await V.store.local.remove('email');
        await V.store.local.remove('password');
        await V.store.local.remove('userId');
        await V.store.local.remove('userName');
        await V.store.local.remove('auth');
        await V.store.local.remove('expires');

        await V.fire('authChanged');

        setTimeout(function(){
            window.hideLoading();
            V.route.redirect('/login');
        }, 1000);

    }

});