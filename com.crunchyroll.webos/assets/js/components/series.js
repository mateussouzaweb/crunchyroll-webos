V.component('[data-series]', {

    /**
     * Constructor
     * @param {Function} resolve
     * @return {void}
     */
    constructor: function(resolve){

        // Route
        V.router.add({
            id: 'series',
            path: '/series',
            title: 'Series',
            component: this
        });

        V.router.add({
            id: 'series',
            path: '/series/:filter',
            title: 'Series',
            component: this
        });

        V.router.add({
            id: 'series',
            path: '/series/:filter/:pageNumber',
            title: 'Series',
            component: this
        });

        resolve(this);

    },

    /**
     * Retrieve router HTML
     * @return {String}
     */
    getHTML: function(){
        return '<div data-series></div>';
    },

    /**
     * On render
     * @param {Function} resolve
     * @return {void}
     */
    onRender: function(resolve){

        var self = this;

        // Private
        self.on('change', 'select' , function(){
            V.router.redirect('/series/' + this.value);
        });

        self.on('change', 'input' , function(){
            V.router.redirect('/series?search=' + encodeURI(this.value));
        });

        resolve(this);

    },

    /**
     * After render
     * @param {Function} resolve
     * @return {void}
     */
    afterRender: async function(resolve){
        await this.listSeries();
        resolve(this);
    },

    /**
     * List series
     * @return {Promise}
     */
    listSeries: async function(){

        var data = window.getSessionData();
        var self = this;
        var element = self.element;
        var active = V.router.$active;

        // Filter option
        var pageNumber = Number( active.getParam('pageNumber') || 1 );
        var filter = String( active.getParam('filter') || 'popular' );
        var search = String( active.getQuery('search') || '' );
        var limit = 20;

        if( search ){
            filter = 'prefix:' + search;
        }

        // Fields option
        var fields = [
            'series.series_id',
            'series.name',
            'series.in_queue',
            'series.description',
            'series.portrait_image',
            'series.landscape_image',
            'series.media_count',
            'series.publisher_name',
            'series.year',
            'series.rating',
            'series.url',
            'series.media_type',
            'series.genres',
            'series.etp_guid',
            'image.wide_url',
            'image.fwide_url',
            'image.widestar_url',
            'image.fwidestar_url',
            'image.full_url'
        ];

        window.showLoading();

        return Api.request('POST', '/list_series', {
            session_id: data.sessionId,
            locale: data.locale,
            media_type: 'anime',
            filter: filter,
            fields: fields.join(','),
            limit: limit,
            offset: (pageNumber - 1) * limit
        }).then(async function(response){

            if( response.error
                && response.code == 'bad_session' ){
                return window.tryLogin().then(self.listSeries);
            }

            var options = await self.getFiltersOptions(filter);
            var items = response.data.map(function(item){
                return self.toSerie(item);
            }).join('');

            var nextPage = '/series/' + filter + '/' + (pageNumber + 1);
            var previousPage = '';

            if( pageNumber > 1 ){
                previousPage = '/series/' + filter + '/' + (pageNumber - 1)
            }

            var html = template('series')
                .replace('{SERIES_FILTER_OPTIONS}', options)
                .replace('{SERIES_SEARCH}', search)
                .replace('{SERIES_ITEMS}', items)
                .replace('{SERIES_PREVIOUS_PAGE}', previousPage)
                .replace('{SERIES_NEXT_PAGE}', nextPage)
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
     * Retrieve series filter options
     * @param {String} selected
     * @return {String}
     */
    getFiltersOptions: async function(selected){

        var data = window.getSessionData();
        var options = [];
        var categories = [];

        // Retrieve options
        options.push({id: '', name: '--- FILTERS'});
        options.push({id: 'alpha', name: 'Alphabetical'});
        options.push({id: 'featured', name: 'Featured'});
        options.push({id: 'newest', name: 'Newest'});
        options.push({id: 'popular', name: 'Popular'});
        options.push({id: 'updated', name: 'Updated'});
        options.push({id: 'simulcast', name: 'Simulcasts'});

        // Retrieve categories
        window.categoriesData = window.categoriesData || {};

        if( window.categoriesData[ data.locale ] ){
            categories = window.categoriesData[ data.locale ];

        }else{

            await Api.request('POST', '/categories', {
                session_id: data.sessionId,
                locale: data.locale,
                media_type: 'anime'
            }).then(function(response){

                categories.push({id: '-', name: '--- GENRES'});
                response.data.genre.map(function(item){
                    categories.push({id: item.tag, name: item.label});
                });

                // categories.push({id: '-', name: '--- SEASONS'});
                // response.data.season.map(function(item){
                //     categories.push({id: item.tag, name: item.label});
                // });

                window.categoriesData[ data.locale ] = categories;

            });

        }

        categories.map(function(item){
            options.push({id: 'tag:' + item.id, name: item.name});
        });

        return options.map(function(option){
            return '<option {SELECTED} value="{VALUE}">{LABEL}</option>'
                .replace('{SELECTED}', (option.id == selected) ? 'selected="selected"' : '')
                .replace('{VALUE}', option.id)
                .replace('{LABEL}', option.name);
        }).join('');
    },

    /**
     * Transform data to serie item
     * @param {Object} data
     * @return {String}
     */
    toSerie: function(data){

        var html = template('series-item')
            .replace('{SERIE_URL}', './serie/' + data.series_id)
            .replace('{SERIE_ID}', data.series_id)
            .replace('{SERIE_NAME}', data.name)
            .replace('{SERIE_DESCRIPTION}', data.description)
            .replace('{SERIE_IMAGE}', data.portrait_image.full_url)
            .replace('data-src', 'src')
            .render();

        return html;
    }

});