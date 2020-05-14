V.component('[data-login]', {

    /**
     * Constructor
     * @param {Function} resolve
     * @return {void}
     */
    constructor: function(resolve){

        var self = this;

        // Public
        window.getSessionData = function(){
            return self.getSessionData();
        }
        window.setSessionData = function(data){
            return self.setSessionData(data);
        }
        window.tryLogin = function(){
            return self.tryLogin();
        }
        window.isLoggedIn = function(){
            return self.isLoggedIn();
        }

        // Route
        V.router.add({
            id: 'login',
            path: '/login',
            title: 'Login',
            component: this
        });

        resolve(this);

    },

    /**
     * Retrieve router HTML
     * @return {String}
     */
    getHTML: function(){
        return '<div data-login></div>';
    },

    /**
     * On render
     * @param {Function} resolve
     * @return {void}
     */
    onRender: function(resolve){

        var self = this;

        self.element.innerHTML = template('login').render();

        // Private
        self.on('submit', 'form', function(e){
            e.preventDefault();
            self.makeLogin();
        });

        // Init
        self.fillSessionData();

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
     * Fill login data on form
     * @return {void}
     */
    fillSessionData: function(){

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
     * Try login within the set session data on API
     * @return {Promise}
     */
    tryLogin: async function(){

        var self = this;
        var data = self.getSessionData();

        var email = data.email;
        var password = data.password;
        var locale = data.locale;

        var accessToken = 'LNDJgOit5yaRIWN';
        var deviceType = 'com.crunchyroll.windows.desktop';
        var deviceId = Api.createUuid();
        var sessionId = null;

        window.showLoading();

        return Api.request('GET', '/start_session', {
            access_token: accessToken,
            device_type: deviceType,
            device_id: deviceId,
            locale: locale
        })
        .then(function(response){

            if( response.error ){
                throw new Error('Session cannot be started.');
            }

            sessionId = response.data.session_id;

            return Api.request('POST', '/login', {
                session_id: sessionId,
                account: email,
                password: password,
                locale: locale
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
                locale: locale,
                email: email,
                password: password,
                userId: response.data.user.user_id,
                userName: response.data.user.username,
                auth: response.data.auth,
                expires: response.data.expires
            });

            window.hideLoading();

            return response;
        })
        .catch(function(error){
            window.hideLoading();
            throw error;
        });
    },

    /**
     * Try make login from input data
     * @return {Promise}
     */
    makeLogin: async function(){

        var self = this;
        var element = this.element;

        var message = V.$('#message', element);
            message.innerHTML = '';

        var email = V.$('input#email', element);
        var password = V.$('input#password', element);
        var locale = V.$('select#locale', element);

        var data = self.getSessionData();
            data.email = email.value;
            data.password = password.value;
            data.locale = locale.value;

        self.setSessionData(data);

        return self.tryLogin()
        .then(function(response){
            V.router.redirect('/home');
            return response;
        })
        .catch(function(error){
            password.value = '';
            message.innerHTML = error.message;
        });
    }

});