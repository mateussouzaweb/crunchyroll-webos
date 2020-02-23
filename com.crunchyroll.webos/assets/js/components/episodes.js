V.component('[data-episodes]', {

    /**
     * Constructor
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    constructor: function(resolve, reject){

        var self = this;

        // Public
        window.mountEpisodes = function(serieId, serieName, serieInQueue){
            return self.mountEpisodes(serieId, serieName, serieInQueue);
        };

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

        // Private
        self.on('change', 'select', function(e){
            self.listEpisodes();
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
     * @param {Function} reject
     * @return {void}
     */
    afterRender: async function(resolve, reject){
        await this.listEpisodes();
        resolve(this);
    },

    /**
     * Mount episodes component
     * @param {String} serieId
     * @param {String} serieName
     * @param {Number} serieInQueue
     * @return {void}
     */
    mountEpisodes: function(serieId, serieName, serieInQueue){

        var content = V.$('#content');
        var html = template('episodes-mount')
            .replace('{SERIE_ID}', serieId)
            .replace('{SERIE_NAME}', serieName)
            .replace('{SERIE_IN_QUEUE}', serieInQueue)
            .render();

        content.innerHTML = html;
        V.mount(content);

    },

    /**
     * Add serie to queue
     * @return {Promise}
     */
    addToQueue: function(){

        var data = window.getSessionData();
        var self = this;
        var element = self.element;
        var serieId = element.dataset.serieId;

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
        var self = this;
        var element = self.element;
        var serieId = element.dataset.serieId;

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
     * List episodes
     * @return {Promise}
     */
    listEpisodes: function(){

        var data = window.getSessionData();
        var self = this;
        var element = self.element;

        var serieId = element.dataset.serieId;
        var serieName = element.dataset.serieName;
        var serieInQueue = element.dataset.serieInQueue;

        var sort = 'desc';
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

        if( V.$('select#sort', element) ){
            sort = V.$('select#sort', element).value;
        }

        window.pushHistory('episodes/' + serieId + '/' + sort);
        window.showLoading();

        return Api.request('POST', '/list_media', {
            session_id: data.sessionId,
            locale: data.locale,
            series_id: serieId,
            sort: sort,
            fields: fields.join(','),
            limit: 30,
            offset: 0
        }).then(async function(response){

            if( response.error
                && response.code == 'bad_session' ){
                return window.makeLogin().then(function(){
                    return self.listEpisodes();
                });
            }

            var options = await self.getSortOptions(sort);
            var items = response.data.map(function(item){
                return self.toEpisode(item);
            }).join('');

            var html = template('episodes')
                .replace('{SERIE_NAME}', serieName)
                .replace('{EPISODES_SORT_OPTIONS}', options)
                .replace('{ADD_QUEUE_CLASS}', Number(serieInQueue) ? 'hidden' : '')
                .replace('{REMOVE_QUEUE_CLASS}', Number(serieInQueue) ? '' : 'hidden')
                .replace('{EPISODES_ITEMS}', items)
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
    toEpisode: function(data){

        var self = this;
        var element = self.element;
        var serieId = element.dataset.serieId;
        var serieName = element.dataset.serieName;
        var serieInQueue = element.dataset.serieInQueue;

        var html = template('episode-item')
            .replace('{SERIE_ID}', serieId)
            .replace('{SERIE_NAME}', serieName)
            .replace('{SERIE_IN_QUEUE}', serieInQueue)
            .replace('{EPISODE_ID}', data.media_id)
            .replace('{EPISODE_NAME}', data.name)
            .replace('{EPISODE_NUMBER}', data.episode_number)
            .replace('{EPISODE_IMAGE}', data.screenshot_image.full_url)
            .replace('{EPISODE_DURATION}', data.duration)
            .replace('{EPISODE_PLAYHEAD}', data.playhead)
            .replace('{EPISODE_PREMIUM}', (!data.free_available) ? 1 : 0)
            .render();

        return html;
    }

});