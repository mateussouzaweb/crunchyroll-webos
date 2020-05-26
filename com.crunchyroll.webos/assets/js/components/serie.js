V.component('[data-serie]', {

    /**
     * Constructor
     * @param {Function} resolve
     * @return {void}
     */
    constructor: function(resolve){

        // Route
        V.router.add({
            id: 'serie',
            path: '/serie/:serieId',
            title: 'Serie',
            component: this
        });

        V.router.add({
            id: 'serie',
            path: '/serie/:serieId/:sort',
            title: 'Serie',
            component: this
        });

        V.router.add({
            id: 'serie',
            path: '/serie/:serieId/:sort/:pageNumber',
            title: 'Serie',
            component: this
        });

        resolve(this);

    },

    /**
     * Retrieve router HTML
     * @return {String}
     */
    getHTML: function(){
        return '<div data-serie></div>';
    },

    /**
     * On render
     * @param {Function} resolve
     * @return {void}
     */
    onRender: function(resolve){

        var self = this;
        var active = V.router.$active;
        var serieId = active.getParam('serieId');

        self.set('serieId', serieId);

        // Private
        self.on('change', 'select', function(){
            V.router.redirect('/serie/' + serieId + '/' + this.value);
        });

        self.on('click', '.add-to-queue', function(e){
            e.preventDefault();
            self.addToQueue();
        });
        self.on('click', '.remove-from-queue', function(e){
            e.preventDefault();
            self.removeFromQueue();
        });

        resolve(this);

    },

    /**
     * After render
     * @param {Function} resolve
     * @return {void}
     */
    afterRender: async function(resolve){
        await this.listSerieInfo();
        await this.listEpisodes();
        resolve(this);
    },

    /**
     * Add serie to queue
     * @return {Promise}
     */
    addToQueue: function(){

        var data = window.getSessionData();
        var serieId = this.get('serieId');

        V.$('.add-to-queue').classList.add('hidden');
        V.$('.remove-from-queue').classList.remove('hidden');

        return Api.request('POST', '/add_to_queue', {
            session_id: data.sessionId,
            locale: data.locale,
            series_id: serieId,
            group_id: serieId
        });
    },

    /**
     * Remove serie from queue
     * @return {Promise}
     */
    removeFromQueue: function(){

        var data = window.getSessionData();
        var serieId = this.get('serieId');

        V.$('.add-to-queue').classList.remove('hidden');
        V.$('.remove-from-queue').classList.add('hidden');

        return Api.request('POST', '/remove_from_queue', {
            session_id: data.sessionId,
            locale: data.locale,
            series_id: serieId,
            group_id: serieId
        });
    },

    /**
     * List serie info
     * @return {Promise}
     */
    listSerieInfo: async function(){

        var data = window.getSessionData();
        var self = this;
        var element = self.element;
        var active = V.router.$active;

        var serieId = Number( active.getParam('serieId') );
        var sort = String( active.getParam('sort') || 'desc' );

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

        return Api.request('POST', '/info', {
            session_id: data.sessionId,
            locale: data.locale,
            series_id: serieId,
            fields: fields.join(',')
        }).then(async function(response){

            if( response.error
                && response.code == 'bad_session' ){
                return window.tryLogin().then(self.listSerieInfo);
            }

            var serieName = response.data.name;
            var sortOptions = await self.getSortOptions(sort);
            var inQueue = response.data.in_queue;

            var html = template('serie')
                .replace('{SERIE_NAME}', serieName)
                .replace('{SORT_OPTIONS}', sortOptions)
                .replace('{ADD_QUEUE_CLASS}', inQueue ? 'hidden' : '')
                .replace('{REMOVE_QUEUE_CLASS}', inQueue ? '' : 'hidden')
                .render();

            element.innerHTML = html;
            V.mount(element);

            window.hideLoading();

        })
        .catch(function(){
            window.hideLoading();
        });
    },

    /**
     * List episodes
     * @return {Promise}
     */
    listEpisodes: async function(){

        var data = window.getSessionData();
        var self = this;
        var element = self.element;
        var active = V.router.$active;

        var serieId = Number( active.getParam('serieId') );
        var pageNumber = Number( active.getParam('pageNumber') || 1 );
        var sort = String( active.getParam('sort') || 'desc' );
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

        return Api.request('POST', '/list_media', {
            session_id: data.sessionId,
            locale: data.locale,
            series_id: serieId,
            sort: sort,
            fields: fields.join(','),
            limit: limit,
            offset: (pageNumber - 1) * limit
        }).then(async function(response){

            if( response.error
                && response.code == 'bad_session' ){
                return window.tryLogin().then(self.listEpisodes);
            }

            var html = response.data.map(function(item){
                return self.toSerieEpisode(item);
            }).join('');

            V.$('.list-items', element).innerHTML = html;
            V.mount(element);

            window.hideLoading();
            window.setActiveElement( V.$('#content .list-item') );

        })
        .catch(function(){
            window.hideLoading();
        });
    },

    /**
     * Retrieve episodes sort
     * @param {String} sort
     * @return {String}
     */
    getSortOptions: async function(sort){

        var options = [];

        // Retrieve options
        options.push({id: 'asc', name: 'Ascending'});
        options.push({id: 'desc', name: 'Descending'});

        return options.map(function(option){
            return '<option {SELECTED} value="{VALUE}">{LABEL}</option>'
                .replace('{SELECTED}', (option.id == sort) ? 'selected="selected"' : '')
                .replace('{VALUE}', option.id)
                .replace('{LABEL}', option.name);
        }).join('');
    },

    /**
     * Transform data to episode item
     * @param {Object} data
     * @return {String}
     */
    toSerieEpisode: function(data){

        var episode = data;
        var playhead = episode.playhead;
        var duration = episode.duration;
        var url = './serie/' + episode.series_id + '/episode/' + episode.media_id + '/video';

        var html = template('serie-episode-item')
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