V.component('[data-logout]', {

    /**
     * Constructor
     * @param {Function} resolve
     * @return {void}
     */
    constructor: function(resolve){

        // Route
        V.router.add({
            id: 'logout',
            path: '/logout',
            title: 'Logout',
            component: this
        });

        resolve(this);

    },

    /**
     * Retrieve router HTML
     * @return {String}
     */
    getHTML: function(){
        return '<div data-logout></div>';
    },

    /**
     * On render
     * @param {Function} resolve
     * @return {void}
     */
    onRender: async function(resolve){

        resolve(this);

        await this.makeLogout();
        V.router.redirect('/login');

    },

    /**
     * Make logout on system
     * @return {Promise}
     */
    makeLogout: async function(){

        var data = window.getSessionData();

        window.setSessionData({});

        if( !data.sessionId ){
            return Promise.resolve();
        }

        window.showLoading();

        return Api.request('POST', '/logout', {
            session_id: data.sessionId,
            locale: data.locale
        }).then(function(response){
            window.hideLoading();
            return response;
        })
        .catch(function(error){
            console.log(error.message);
            window.hideLoading();
        });
    }

});