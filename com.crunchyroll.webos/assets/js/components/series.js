V.route.add({
    id: 'series',
    path: '/series',
    title: 'Series',
    component: '<div data-series></div>',
    authenticated: true
});
V.route.add({
    id: 'series',
    path: '/series/:filter',
    title: 'Series',
    component: '<div data-series></div>',
    authenticated: true
});
V.route.add({
    id: 'series',
    path: '/series/:filter/:pageNumber',
    title: 'Series',
    component: '<div data-series></div>',
    authenticated: true
});

V.component('[data-series]', {

    /**
     * Return template data
     * @return {string}
     */
    template: function(){
        return V.$('#template-series').innerHTML;
    },

     /**
     * On mount
     * @return {void}
     */
    onMount: async function(){

        var self = this;
        var active = V.route.active();
        var pageNumber = Number( active.param('pageNumber') || 1 );
        var filter = String( active.param('filter') || 'popular' );
        var search = String( active.query('search') || '' );

        self.on('change', 'select' , function(){
            V.route.redirect('/series/' + this.value);
        });

        self.on('change', 'input' , function(){
            V.route.redirect('/series?search=' + encodeURI(this.value));
        });

        self.set({
            pageNumber: pageNumber,
            filter: filter,
            search: search
        });

        self.listSeries();

    },

    /**
     * List series
     * @return {Promise}
     */
    listSeries: async function(){

        var self = this;
        var pageNumber = Number( self.get('pageNumber') );
        var filter = String( self.get('filter') );
        var search = String( self.get('search') );
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

        try {

            var response = await Api.request('POST', '/list_series', {
                media_type: 'anime',
                filter: filter,
                fields: fields.join(','),
                limit: limit,
                offset: (pageNumber - 1) * limit
            });

            if( response.error
                && response.code == 'bad_session' ){
                return Api.tryLogin().then(self.listSeries);
            }

            var items = response.data.map(function(item){
                return Api.toSerie(item);
            });

            var options = await self.getFiltersOptions(filter);
            var base = '/series/' + filter + '/';
            var nextPage = base + (pageNumber + 1);
            var previousPage = ( pageNumber > 1 ) ? base + (pageNumber - 1) : '';

            await self.render({
                loaded: true,
                items: items,
                options: options,
                nextPage: nextPage,
                previousPage: previousPage
            });

            window.hideLoading();
            window.setActiveElement( V.$('#content .list-item') );

        } catch (error) {
            console.log(error);
        }

        window.hideLoading();

    },

    /**
     * Retrieve series filter options
     * @param {String} selected
     * @return {String}
     */
    getFiltersOptions: async function(selected){

        var options = [];
        var categories = Store.get('categories', []);

        // Retrieve options
        options.push({id: '', name: '--- FILTERS'});
        options.push({id: 'alpha', name: 'Alphabetical'});
        options.push({id: 'featured', name: 'Featured'});
        options.push({id: 'newest', name: 'Newest'});
        options.push({id: 'popular', name: 'Popular'});
        options.push({id: 'updated', name: 'Updated'});
        options.push({id: 'simulcast', name: 'Simulcasts'});

        // Retrieve categories
        if( !categories.length ){

            var response = await Api.request('POST', '/categories', {
                media_type: 'anime'
            });

            categories.push({id: '-', name: '--- GENRES'});
            response.data.genre.map(function(item){
                categories.push({id: item.tag, name: item.label});
            });

            // categories.push({id: '-', name: '--- SEASONS'});
            // response.data.season.map(function(item){
            //     categories.push({id: item.tag, name: item.label});
            // });

            await Store.set('categories', categories);

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
    }

});