V.component('[data-queue]', {

    /**
     * After render
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    afterRender: async function(resolve, reject){
        await this.listQueue();
        resolve(this);
    },

    /**
     * List queue
     * @return {Promise}
     */
    listQueue: function(){

        var data = window.getSessionData();
        var self = this;
        var element = self.element;

        var fields = [
            'image.full_url',
            'image.fwide_url',
            'image.fwidestar_url',
            'image.height',
            'image.large_url',
            'image.medium_url',
            'image.small_url',
            'image.thumb_url',
            'image.wide_url',
            'image.widestar_url',
            'image.width',
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
            'last_watched_media',
            'last_watched_media_playhead',
            'most_likely_media',
            'most_likely_media_playhead',
            'ordering',
            'playhead',
            'queue_entry_id',
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

        window.pushHistory('queue');
        window.showLoading();

        return Api.request('POST', '/queue', {
            session_id: data.sessionId,
            locale: data.locale,
            media_types: 'anime',
            fields: fields.join(',')
        }).then(function(response){

            if( response.error
                && response.code == 'bad_session' ){
                return window.makeLogin().then(function(){
                    return self.listQueue();
                });
            }

            var items = response.data.map(function(item){
                return self.toQueue(item);
            }).join('');

            var html = template('queue')
                .replace('{QUEUE_ITEMS}', items)
                .render();

            element.innerHTML = html;
            V.mount(element);

            window.hideLoading();
            window.setActiveElement( V.$('#content .list-item') );

        })
        .catch(function(error){
            window.hideLoading();
        });
    },

    /**
     * Transform data to queue item
     * @param {Object} data
     * @return {String}
     */
    toQueue: function(data){

        var serie = data.series;
        var episode = data.most_likely_media;

        if( !episode ){
            return '';
        }

        var playhead = episode.playhead;
        var duration = episode.duration;

        var html = template('queue-item')
            .replace('{SERIE_ID}', serie.series_id)
            .replace('{SERIE_NAME}', serie.name)
            .replace('{SERIE_IN_QUEUE}', (serie.in_queue) ? 1 : 0)
            .replace('{EPISODE_ID}', episode.media_id)
            .replace('{EPISODE_NAME}', episode.name)
            .replace('{EPISODE_NUMBER}', episode.episode_number)
            .replace('{EPISODE_IMAGE}', episode.screenshot_image.full_url)
            .replace('{EPISODE_DURATION}', duration)
            .replace('{EPISODE_PLAYHEAD}', playhead)
            .replace('{EPISODE_PREMIUM}', (!episode.free_available) ? 1 : 0)
            .render();

        return html;
    }

});