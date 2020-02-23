V.component('[data-serie-item]', {

    /**
     * On render
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    onRender: function(resolve, reject){

        var self = this;
        var element = this.element;

        self.on('click', function(e){
            e.preventDefault();

            window.mountEpisodes(
                element.dataset.serieId,
                element.dataset.serieName,
                element.dataset.serieInQueue
            );
        });

        resolve(this);
    }

});
