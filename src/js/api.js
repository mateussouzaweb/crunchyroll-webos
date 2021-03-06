const Api = {

    /**
     * Make request on Crunchyroll API
     * @param {String} method
     * @param {String} endpoint
     * @param {Object} data
     * @return {Promise}
     */
    request: function(method, endpoint, data){

        var url = 'https://api.crunchyroll.com';
            url += endpoint + '.0.json';

        // var proxy = document.body.dataset.proxy;

        // if( proxy ){
        //     url = proxy + encodeURI(url);
        // }

        data.version = '0';
        data.connectivity_type = 'ethernet';

        var sessionId = V.store.local.get('sessionId');
        var locale = V.store.local.get('locale');

        if( sessionId && !data.session_id ){
            data.session_id = sessionId;
        }
        if( locale && !data.locale ){
            data.locale = locale;
        }

        if( method == 'POST' ){

            var formData = new FormData();
            for ( var key in data ) {
                formData.append(key, data[key]);
            }

            return V.http.request(method, url, formData);
        }

        return V.http.request(method, url, data);
    },

    /**
     * Create UUID V4
     * @return {String}
     */
    createUuid: function(){
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.
        replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * Try login within the set session data on API
     * @return {Promise}
     */
    tryLogin: async function(){

        var email = V.store.local.get('email');
        var password = V.store.local.get('password');
        var locale = V.store.local.get('locale');

        var accessToken = 'LNDJgOit5yaRIWN';
        var deviceType = 'com.crunchyroll.windows.desktop';
        var deviceId = this.createUuid();
        var sessionId = null;

        var response = await this.request('GET', '/start_session', {
            access_token: accessToken,
            device_type: deviceType,
            device_id: deviceId,
            locale: locale
        });

        if( response.error ){
            throw new Error('Session cannot be started.');
        }

        sessionId = response.data.session_id;
        response = await this.request('POST', '/login', {
            session_id: sessionId,
            account: email,
            password: password,
            locale: locale
        });

        if( response.error ){
            throw new Error('Invalid login.');
        }

        await V.store.local.set('accessToken', accessToken, true);
        await V.store.local.set('deviceType', deviceType, true);
        await V.store.local.set('deviceId', deviceId, true);
        await V.store.local.set('sessionId', sessionId, true);
        await V.store.local.set('locale', locale, true);
        await V.store.local.set('email', email, true);
        await V.store.local.set('password', password, true);
        await V.store.local.set('userId', response.data.user.user_id, true);
        await V.store.local.set('userName', response.data.user.username, true);
        await V.store.local.set('auth', response.data.auth, true);
        await V.store.local.set('expires', response.data.expires, true);

        await V.fire('authChanged');

        return true;
    },

    /**
     * Transform data into serie item
     * @param {Object} data
     * @return {Object}
     */
    toSerie: function(data){
        return {
            id: data.series_id,
            name: data.name,
            description: data.description,
            image: data.portrait_image.full_url
        };
    },

    /**
     * Transform data to serie episode item
     * @param {Object} data
     * @param {string} source
     * @return {Object}
     */
    toSerieEpisode: function(data, source){

        var serie = data.series || {};
        var episode = data;

        if( source == 'history' ){
            episode = data.media;
        }
        if( source == 'queue' ){
            episode = data.most_likely_media;
        }

        if( !episode ){
            return;
        }

        return {
            serie_id: serie.series_id || episode.series_id,
            serie_name: serie.name || '',
            id: episode.media_id,
            name: episode.name,
            number: episode.episode_number,
            image: episode.screenshot_image.full_url,
            duration: episode.duration,
            playhead: episode.playhead,
            premium: (!episode.free_available) ? 1 : 0
        };
    }

}