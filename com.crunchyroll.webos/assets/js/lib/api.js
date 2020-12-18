var Api = {

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

        var proxy = document.body.dataset.proxy;

        if( proxy ){
            url = proxy + encodeURI(url);
        }

        data.version = '0';
        data.connectivity_type = 'ethernet';

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
    }

}