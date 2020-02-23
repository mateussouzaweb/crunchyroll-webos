V.component('[data-episode-item]', {

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

            window.episodeId = element.dataset.episodeId;
            window.episodeNumber = element.dataset.episodeNumber;
            window.episodeName = element.dataset.episodeName;
            window.serieId = element.dataset.serieId;
            window.serieName = element.dataset.serieName;
            window.serieInQueue = element.dataset.serieInQueue;

            window.loadVideo().then(function(){
                window.showVideo();
                window.playVideo();
            });

        });

        resolve(this);
    },

    /**
     * After render
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    afterRender: function(resolve, reject){

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