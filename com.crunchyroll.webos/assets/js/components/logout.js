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

        var sessionId = Store.get('sessionId');
        var locale = Store.get('locale');

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

        await Store.remove('accessToken');
        await Store.remove('deviceType');
        await Store.remove('deviceId');
        await Store.remove('sessionId');
        await Store.remove('locale');
        await Store.remove('email');
        await Store.remove('password');
        await Store.remove('userId');
        await Store.remove('userName');
        await Store.remove('auth');
        await Store.remove('expires');

        await Store.fire('authChanged');

        setTimeout(function(){
            window.hideLoading();
            V.route.redirect('/login');
        }, 1000);

    }

});