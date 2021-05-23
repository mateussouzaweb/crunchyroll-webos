V.route.add({
    id: 'series',
    path: '/serie/:serieId',
    title: 'Serie',
    component: '<div data-serie></div>',
    authenticated: true
});
V.route.add({
    id: 'series',
    path: '/serie/:serieId/:sort',
    title: 'Serie',
    component: '<div data-serie></div>',
    authenticated: true
});
V.route.add({
    id: 'series',
    path: '/serie/:serieId/:sort/:pageNumber',
    title: 'Serie',
    component: '<div data-serie></div>',
    authenticated: true
});

V.component('[data-serie]', {

    /**
     * Return template data
     * @return {string}
     */
    template: function(){
        return V.$('#template-serie').innerHTML;
    },

    /**
     * On mount
     * @return {void}
     */
    onMount: function(){

        var self = this;

        self.on('change', 'select', function(){
            V.route.redirect('/serie/' + self.get('serieId') + '/' + this.value);
        });

        self.on('click', '.add-to-queue', function(e){
            e.preventDefault();
            self.addToQueue();
        });

        self.on('click', '.remove-from-queue', function(e){
            e.preventDefault();
            self.removeFromQueue();
        });

        self.watch('currentViewReload', function(){

            self.parseParams();
            self.listSerieInfo();
            self.listEpisodes();

        });

        self.parseParams();
        self.listSerieInfo();
        self.listEpisodes();

    },

    /**
     * Parse route params to the component
     * @return {void}
     */
    parseParams: function(){

        var self = this;
        var active = V.route.active();
        var serieId = active.param('serieId');
        var sort = active.param('sort') || 'desc';
        var pageNumber = active.param('pageNumber') || 1;

        self.set({
            serieId: serieId,
            sort: sort,
            pageNumber: pageNumber
        });

    },

    /**
     * Add serie to queue
     * @return {Promise}
     */
    addToQueue: function(){

        var self = this;
        var serieId = self.get('serieId');

        V.$('.add-to-queue').classList.add('hidden');
        V.$('.remove-from-queue').classList.remove('hidden');

        return Api.request('POST', '/add_to_queue', {
            series_id: serieId,
            group_id: serieId
        });
    },

    /**
     * Remove serie from queue
     * @return {Promise}
     */
    removeFromQueue: function(){

        var self = this;
        var serieId = self.get('serieId');

        V.$('.add-to-queue').classList.remove('hidden');
        V.$('.remove-from-queue').classList.add('hidden');

        return Api.request('POST', '/remove_from_queue', {
            series_id: serieId,
            group_id: serieId
        });
    },

    /**
     * List serie info
     * @return {Promise}
     */
    listSerieInfo: async function(){

        var self = this;
        var serieId = self.get('serieId');

        var fields = [
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

            var response = await Api.request('POST', '/info', {
                series_id: serieId,
                fields: fields.join(',')
            })

            if( response.error
                && response.code == 'bad_session' ){
                return Api.tryLogin().then(function(){
                    self.listSerieInfo();
                });
            }

            var serieName = response.data.name;
            var inQueue = response.data.in_queue;

            self.set({
                serieName: serieName,
                inQueue: inQueue
            });

        } catch (error) {
            console.log(error);
        }

        window.hideLoading();

    },

    /**
     * List episodes
     * @return {Promise}
     */
    listEpisodes: async function(){

        var self = this;
        var serieId = Number( self.get('serieId') );
        var pageNumber = Number( self.get('pageNumber') );
        var sort = String( self.get('sort') );
        var limit = 20;

        var fields = [
            'most_likely_media',
            'media',
            'media.name',
            'media.description',
            'media.episode_number',
            'media.duration',
            'media.playhead',
            'media.screenshot_image',
            'media.media_id',
            'media.series_id',
            'media.series_name',
            'media.collection_id',
            'media.url',
            'media.free_available'
        ];

        window.showLoading();

        try {

            var response = await Api.request('POST', '/list_media', {
                series_id: serieId,
                sort: sort,
                fields: fields.join(','),
                limit: limit,
                offset: (pageNumber - 1) * limit
            });

            if( response.error
                && response.code == 'bad_session' ){
                return Api.tryLogin().then(function(){
                    self.listEpisodes();
                });
            }

            var items = response.data.map(function(item){
                return Api.toSerieEpisode(item, 'serie');
            });

            var base = 'serie/' + serieId + '/' + sort + "/";
            var nextPage = base + (pageNumber + 1);
            var previousPage = ( pageNumber > 1 ) ? base + (pageNumber - 1) : '';

            await self.render({
                loaded: true,
                items: items,
                nextPage: nextPage,
                previousPage: previousPage
            });

            window.hideLoading();
            window.setActiveElement( V.$('#content .list-item') );

        } catch (error) {
            console.log(error);
        }

        window.hideLoading();

    }

});