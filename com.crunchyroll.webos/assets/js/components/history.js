V.component('[data-history]', {

    /**
     * Constructor
     * @param {Function} resolve
     * @return {void}
     */
    constructor: function(resolve){

        // Route
        V.router.add({
            id: 'history',
            path: '/history',
            title: 'History',
            component: this
        });

        V.router.add({
            id: 'history',
            path: '/history/:pageNumber',
            title: 'History',
            component: this
        });

        resolve(this);

    },

    /**
     * Retrieve router HTML
     * @return {String}
     */
    getHTML: function(){
        return '<div data-history></div>';
    },

    /**
     * After render
     * @param {Function} resolve
     * @return {void}
     */
    afterRender: async function(resolve){
        await this.listHistory();
        resolve(this);
    },

    /**
     * List history
     * @return {Promise}
     */
    listHistory: async function(){

        var data = window.getSessionData();
        var self = this;
        var element = self.element;
        var active = V.router.$active;

        var pageNumber = Number( active.getParam('pageNumber') || 1 );
        var limit = 8;

        var fields = [
            'media',
            'media.availability_notes',
            'media.available',
            'media.available_time',
            'media.bif_url',
            'media.class',
            'media.clip',
            'media.collection_id',
            'media.collection_name',
            'media.created',
            'media.description',
            'media.duration',
            'media.episode_number',
            'media.free_available',
            'media.free_available_time',
            'media.free_unavailable_time',
            'media.media_id',
            'media.media_type',
            'media.name',
            'media.playhead',
            'media.premium_available',
            'media.premium_available_time',
            'media.premium_only',
            'media.premium_unavailable_time',
            'media.screenshot_image',
            'media.series_id',
            'media.series_name',
            'media.stream_data',
            'media.unavailable_time',
            'media.url',
            'playhead',
            'timestamp',
            'series',
            'series.class',
            'series.collection_count',
            'series.description',
            'series.genres',
            'series.in_queue',
            'series.landscape_image',
            'series.media_count',
            'series.media_type',
            'series.name',
            'series.portrait_image',
            'series.publisher_name',
            'series.rating',
            'series.series_id',
            'series.url',
            'series.year'
        ];

        window.showLoading();

        return Api.request('POST', '/recently_watched', {
            session_id: data.sessionId,
            locale: data.locale,
            fields: fields.join(','),
            limit: limit,
            offset: (pageNumber - 1) * limit
        }).then(function(response){

            if( response.error
                && response.code == 'bad_session' ){
                return window.tryLogin().then(self.listHistory);
            }

            var items = response.data.map(function(item){
                return self.toHistory(item);
            }).join('');

            var html = template('history')
                .replace('{HISTORY_ITEMS}', items)
                .render();

            element.innerHTML = html;
            V.mount(element);

            window.hideLoading();
            window.setActiveElement( V.$('#content .list-item') );

        })
        .catch(function(){
            window.hideLoading();
        });
    },

    /**
     * Transform data to history item
     * @param {Object} data
     * @return {String}
     */
    toHistory: function(data){

        var serie = data.series;
        var episode = data.media;
        var playhead = episode.playhead;
        var duration = episode.duration;
        var url = '/serie/' + serie.series_id + '/episode/' + episode.media_id + '/video';

        var html = template('history-item')
            .replace('{SERIE_ID}', serie.series_id)
            .replace('{SERIE_NAME}', serie.name)
            .replace('{EPISODE_ID}', episode.media_id)
            .replace('{EPISODE_NAME}', episode.name)
            .replace('{EPISODE_NUMBER}', episode.episode_number)
            .replace('{EPISODE_IMAGE}', episode.screenshot_image.full_url)
            .replace('{EPISODE_DURATION}', duration)
            .replace('{EPISODE_PLAYHEAD}', playhead)
            .replace('{EPISODE_PREMIUM}', (!episode.free_available) ? 1 : 0)
            .replace('{EPISODE_URL}', url)
            .render();

        return html;
    }

});