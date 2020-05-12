V.component('[data-episode-item]', {

    /**
     * After render
     * @param {Function} resolve
     * @return {void}
     */
    afterRender: function(resolve){

        var self = this;
        var element = self.element;

        var duration = element.dataset.episodeDuration;
        var playhead = element.dataset.episodePlayhead;
        var premium = element.dataset.episodePremium;
        var progress = (100 / Number(duration)) * Number(playhead);

        if( progress ){
            var progressElement = V.$('.list-item-progress', element);
                progressElement.style.width = progress + '%';
                progressElement.classList.remove('hidden');
        }

        if( premium == 1 ){
            var premiumElement = V.$('.list-item-premium', element);
                premiumElement.classList.remove('hidden');
        }

        resolve(this);
    }

});