V.component('[data-login]', {

    /**
     * Constructor
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    constructor: function(resolve, reject){

        var self = this;

        // Public
        window.showLogin = function(){
            return self.showLogin();
        };
        window.hideLogin = function(){
            return self.hideLogin();
        }
        window.makeLogin = function(){
            return self.makeLogin();
        }
        window.makeLogout = function(){
            return self.makeLogout();
        }
        window.getSessionData = function(){
            return self.getSessionData();
        }
        window.isLoggedIn = function(){
            return self.isLoggedIn();
        }

        resolve(this);

    },

    /**
     * On render
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    onRender: function(resolve, reject){

        var self = this;
            self.firstLogin = false;

        // Private
        self.on('show', function(e){
            e.preventDefault();
            self.showLogin();
        });

        self.on('hide', function(e){
            e.preventDefault();
            self.hideLogin();
        });

        self.on('submit', 'form', function(e){
            e.preventDefault();
            self.makeLogin();
        });

        self.on('login', function(e){
            e.preventDefault();
            self.makeLogin();
        });

        self.on('logout', function(e){
            e.preventDefault();
            self.makeLogout();
        });

        // Init
        self.loadSessionData();

        if( !self.isLoggedIn() ){
            self.firstLogin = true;
            self.showLogin();
        }

        resolve(this);
    },

    /**
     * Retrieve login data
     * @return {Object}
     */
    getSessionData: function(){

        var data = localStorage.getItem('cr');
            data = ( data ) ? JSON.parse(data) : {};

        return data;
    },

    /**
     * Set login data
     * @param {Object} data
     * @return {void}
     */
    setSessionData: function(data){
        localStorage.setItem('cr', JSON.stringify(data));
        window.updateMenu();
    },

    /**
     * Load login data
     * @return {void}
     */
    loadSessionData: function(){

        var self = this;
        var element = self.element;
        var data = this.getSessionData();

        if( data.email ){
            V.$('input#email', element).value = data.email;
        }
        if( data.password ){
            V.$('input#password', element).value = data.password;
        }
        if( data.locale ){
            V.$('select#locale', element).value = data.locale;
        }

    },

    /**
     * Return if is logged in
     * @return {Boolean}
     */
    isLoggedIn: function(){

        var data = this.getSessionData();

        if( data.expires &&
            new Date() < new Date(data.expires) ){
            return true;
        }

        // Clear all session data
        this.setSessionData({});

        return false;
    },

    /**
     * Show login box
     * @return {void}
     */
    showLogin: function(){
        var element = this.element;
            element.classList.add('active');

        window.setActiveElement( V.$('#login label') );
    },

    /**
     * Hide login box
     * @return {void}
     */
    hideLogin: function(){
        var element = this.element;
            element.classList.remove('active');
    },

    /**
     * Try make login on Crunchyroll
     * @return {Promise}
     */
    makeLogin: function(){

        var self = this;
        var element = this.element;

        var message = V.$('#message', element);
            message.innerHTML = '';

        var email = V.$('input#email', element);
        var password = V.$('input#password', element);
        var locale = V.$('select#locale', element);

        var accessToken = 'LNDJgOit5yaRIWN';
        var deviceType = 'com.crunchyroll.windows.desktop';
        var deviceId = Api.createUuid();
        var sessionId = null;

        window.showLoading();

        return Api.request('GET', '/start_session', {
            access_token: accessToken,
            device_type: deviceType,
            device_id: deviceId,
            locale: locale.value
        })
        .then(function(response){

            if( response.error ){
                throw new Error('Session cannot be started.');
            }

            sessionId = response.data.session_id;

            return Api.request('POST', '/login', {
                session_id: sessionId,
                account: email.value,
                password: password.value,
                locale: locale.value
            });
        })
        .then(function(response){

            if( response.error ){
                throw new Error('Invalid login.');
            }

            self.setSessionData({
                accessToken: accessToken,
                deviceType: deviceType,
                deviceId: deviceId,
                sessionId: sessionId,
                locale: locale.value,
                email: email.value,
                password: password.value,
                userId: response.data.user.user_id,
                userName: response.data.user.username,
                auth: response.data.auth,
                expires: response.data.expires
            });

            self.hideLogin();
            window.hideLoading();

            if( self.firstLogin ){
                self.firstLogin = false;
                V.trigger('.menu-link.active', 'click');
            }

            return response;
        })
        .catch(function(error){

            password.value = '';
            message.innerHTML = error.message;

            self.showLogin();
            window.hideLoading();

        });
    },

    /**
     * Try make logout on Crunchyroll
     * @return {Promise}
     */
    makeLogout: function(){

        if( !this.isLoggedIn() ){
            this.showLogin();
            return Promise.resolve();
        }

        var self = this;
        var element = this.element;

        var password = V.$('input#password', element);
            password.value = '';

        var message = V.$('#message', element);
            message.innerHTML = '';

        var data = this.getSessionData();

        self.showLogin();
        window.showLoading();

        return Api.request('POST', '/logout', {
            session_id: data.sessionId,
            locale: data.locale
        }).then(function(response){

            // Clear all session data
            self.setSessionData({});
            self.firstLogin = true;

            window.hideLoading();

            return response;
        })
        .catch(function(error){
            message.innerHTML = error.message;
            window.hideLoading();
        });
    }

});