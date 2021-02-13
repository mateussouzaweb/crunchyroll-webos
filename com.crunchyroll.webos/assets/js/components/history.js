V.route.add({
    id: 'history',
    path: '/history',
    title: 'History',
    component: '<div data-history></div>',
    authenticated: true
});
V.route.add({
    id: 'history',
    path: '/history/:pageNumber',
    title: 'History',
    component: '<div data-history></div>',
    authenticated: true
});

V.component('[data-history]', {

    /**
     * Return template data
     * @return {string}
     */
    template: function(){
        return V.$('#template-history').innerHTML;
    },

    /**
     * On mount
     * @return {void}
     */
    onMount: async function(){

        var self = this;
        var pageNumber = V.route.active().param('pageNumber') || 1;

        self.set({
            pageNumber: pageNumber
        });

        self.listHistory();

    },

    /**
     * List history
     * @return {Promise}
     */
    listHistory: async function(){

        var self = this;
        var pageNumber = Number( self.get('pageNumber') );
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

        try {

            var response = await Api.request('POST', '/recently_watched', {
                fields: fields.join(','),
                limit: limit,
                offset: (pageNumber - 1) * limit
            });

            if( response.error
                && response.code == 'bad_session' ){
                return Api.tryLogin().then(self.listHistory);
            }

            var items = response.data.map(function(item){
                return Api.toSerieEpisode(item, 'history');
            });

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