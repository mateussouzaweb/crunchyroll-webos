V.route.add({
    id: 'queue',
    path: '/queue',
    title: 'Queue',
    component: '<div data-queue></div>',
    authenticated: true
});
V.route.add({
    id: 'queue',
    path: '/home',
    title: 'Queue',
    component: '<div data-queue></div>',
    authenticated: true
});
V.route.add({
    id: 'queue',
    path: '/',
    title: 'Queue',
    component: '<div data-queue></div>',
    authenticated: true
});

V.component('[data-queue]', {

    /**
     * Return template data
     * @return {string}
     */
    template: function(){
        return V.$('#template-queue').innerHTML;
    },

    /**
     * On mount
     * @return {void}
     */
    onMount: function(){
        this.listQueue();
    },

    /**
     * List queue
     * @return {Promise}
     */
    listQueue: async function(){

        var self = this;
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

        window.showLoading();

        try {

            var response = await Api.request('POST', '/queue', {
                media_types: 'anime',
                fields: fields.join(',')
            })

            if( response.error
                && response.code == 'bad_session' ){
                return Api.tryLogin().then(function(){
                    self.listQueue();
                });
            }

            var items = response.data.map(function(item){
                return Api.toSerieEpisode(item, 'queue');
            }).filter(Boolean);

            await self.render({
                loaded: true,
                items: items
            });

            window.hideLoading();
            window.setActiveElement( V.$('#content .list-item') );

        } catch (error) {
            console.log(error);
        }

        window.hideLoading();

    }

});