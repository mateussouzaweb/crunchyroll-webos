V.route.add({
    id: 'video',
    path: '/serie/:serieId/episode/:episodeId/video',
    title: 'Episode Video',
    component: '<div data-video></div>',
    authenticated: true
});

V.component('[data-video]', {

    /**
     * Return template data
     * @return {string}
     */
    template: function(){
        return V.$('#template-video').innerHTML;
    },

    /**
     * On mount
     * @return {void}
     */
    onMount: function(){

        var self = this;
        var element = this.element;
        var serieId = V.route.active().param('serieId');
        var controlsTimeout = null;

        // UI Events
        self.on('click', '.video-extra-play', function(e){
            e.preventDefault();
            self.toggleVideo();
        });

        self.on('click', '.video-extra-reload', function(e){
            e.preventDefault();
            self.render();
        });

        self.on('click', '.video-extra-watched', function(e){
            e.preventDefault();
            self.setWatched();
        });

        self.on('click', '.video-extra-episodes', function(e){
            e.preventDefault();
            self.pauseVideo();
            self.hideVideo();
            V.route.redirect('/serie/' + serieId);
        });

        self.on('click', '.video-extra-close', function(e){
            e.preventDefault();
            self.pauseVideo();
            self.hideVideo();
            V.route.redirect('/home');
        });

        self.on('click', '.video-extra-fullscreen', function(e){
            e.preventDefault();
            self.toggleFullScreen();
        });

        // Mouse Events
        V.on(element, 'mouseenter mousemove', function(){

            element.classList.add('show-controls');

            if( controlsTimeout ){
                window.clearTimeout(controlsTimeout);
            }

            controlsTimeout = window.setTimeout(function(){
                element.classList.remove('show-controls');
            }, 2000); // 2s

        });

        V.on(element, 'mouseleave', function(){
            element.classList.remove('show-controls');
        });

        V.on(element, 'mousemove touchmove', 'input[type="range"]', function(e){
            self.updateSeekTooltip(e);
        });

        self.on('click input', 'input[type="range"]', function(e){
            self.skipAhead(e.target.dataset.seek);
        });

        // Public
        window.playVideo = function(){
            return self.playVideo();
        };
        window.pauseVideo = function(){
            return self.pauseVideo();
        };
        window.stopVideo = function(){
            return self.stopVideo();
        };
        window.toggleVideo = function(){
            return self.toggleVideo();
        }
        window.forwardVideo = function(){
            return self.forwardVideo();
        }
        window.backwardVideo = function(){
            return self.backwardVideo();
        }

    },

    /**
     * After render
     * @return {void}
     */
    afterRender: async function(){

        var self = this;
        var element = self.element;

        element.classList.remove('video-error');
        element.classList.remove('video-active');
        element.classList.remove('video-loading');
        element.classList.remove('video-loaded');
        element.classList.remove('video-playing');
        element.classList.remove('video-paused');

        window.setTimeout(async function(){

            var video = V.$('video', self.element);
                video.controls = false;

            self.video = video;
            self.playing = false;

            // Video Events
            V.on(video, 'click', function(e){
                e.preventDefault();
                self.toggleVideo();
            });

            V.on(video, 'timeupdate', function(){
                self.updateDuration();
                self.updateTimeElapsed();
                self.updateProgress();
            });

            await self.loadVideo();

            self.showVideo();
            self.playVideo();

        });

    },

    /**
     * Format time
     * @param {Number} time
     * @return {Object}
     */
    formatTime: function(time){

        var result = new Date(time * 1000).toISOString().substr(11, 8);
        var minutes = result.substr(3, 2);
        var seconds = result.substr(6, 2);

        return {
            m: minutes,
            s: seconds
        }
    },

    /**
     * Show video
     * @return {void}
     */
    showVideo: function(){

        var self = this;
        var element = self.element;
        var playButton = V.$('.video-extra-play', element);

        element.classList.add('video-active');
        window.setActiveElement(playButton);

    },

    /**
     * Hide video
     * @return {void}
     */
    hideVideo: function(){

        var self = this;
        var element = self.element;

        element.classList.remove('video-active');

        if( document.fullscreenElement ){
            document.exitFullscreen();
        }

    },

    /**
     * Load video
     * @return {Promise}
     */
    loadVideo: async function(){

        var self = this;
        var element = self.element;
        var video = self.video;
        var title = V.$('.video-title-bar', element);
        var episodeId = V.route.active().param('episodeId');

        var fields = [
            'media.episode_number',
            'media.name',
            'media.stream_data',
            'media.media_id',
            'media.playhead',
            'media.duration',
            'media.series_id',
            'media.series_name'
        ];

        window.showLoading();
        element.classList.add('video-loading');

        try {

            var response = await Api.request('POST', '/info', {
                media_id: episodeId,
                fields: fields.join(',')
            });

            if( response.error
                && response.code == 'bad_session' ){
                return Api.tryLogin().then(function(){
                    self.loadVideo();
                });
            }

            var episodeNumber = response.data.episode_number;
            var episodeName = response.data.name;
            var serieName = response.data.series_name;

            title.innerHTML = serieName + ' / EP ' + episodeNumber + ' - ' + episodeName;

            var streams = response.data.stream_data.streams;
            var stream = streams[ streams.length - 1 ].url;

            var startTime = response.data.playhead || 0;
            var duration = response.data.duration || 0;

            if( startTime / duration > 0.85 || startTime < 30 ){
                startTime = 0;
            }

            var proxy = document.body.dataset.proxy;

            if( proxy ){
                stream = proxy + encodeURI(stream);
            }

            if( video.canPlayType('application/vnd.apple.mpegurl') ){

                element.classList.remove('video-loading');
                element.classList.add('video-loaded');

                video.src = stream;
                video.currentTime = startTime;

            }else{

                await new Promise(function (resolve){

                    if( !Hls.isSupported() ) {
                        throw Error('Video format not supported.');
                    }

                    var hls = new Hls({
                        minAutoBitrate: 300000,
                        maxBufferLength: 15,
                        maxBufferSize: 30 * 1000 * 1000
                    });

                    hls.on(Hls.Events.MEDIA_ATTACHED, function () {
                        hls.loadSource(stream);
                    });

                    hls.on(Hls.Events.MANIFEST_PARSED, function(){
                        element.classList.remove('video-loading');
                        element.classList.add('video-loaded');
                        video.currentTime = startTime;
                        resolve(response);
                    });

                    hls.on(Hls.Events.ERROR, function(_event, data){

                        if( !data.fatal ){
                            return;
                        }

                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                hls.startLoad();
                            break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                hls.recoverMediaError();
                            break;
                            default:
                                // cannot recover
                                hls.destroy();
                                element.classList.add('video-error');
                                title.innerHTML = 'VIDEO PLAY ERROR';
                            break;
                        }

                    });

                    hls.attachMedia(video);

                });

            }

        } catch (error) {
            console.log(error);
        }

        window.hideLoading();

    },

    /**
     * Play video
     * @return {void}
     */
    playVideo: async function(){

        var self = this;
        var element = self.element;
        var video = self.video;

        try{
            await video.play();
        } catch(err) {
        }

        element.classList.remove('video-paused');
        element.classList.add('video-playing');

        self.playing = true;
        self.trackProgress();

    },

    /**
     * Pause video
     * @return {void}
     */
    pauseVideo: function(){

        var self = this;
        var element = self.element;
        var video = self.video;

        video.pause();
        element.classList.remove('video-playing');
        element.classList.add('video-paused');

        self.playing = false;
        self.stopTrackProgress();

    },

    /**
     * Stop video
     * @return {void}
     */
    stopVideo: function(){

        var self = this;

        self.pauseVideo();
        self.skipAhead(0);

    },

    /**
     * Toggle video
     * @return {void}
     */
    toggleVideo: function(){

        var self = this;

        if( self.playing ){
            self.pauseVideo();
        } else {
            self.playVideo();
        }

    },

    /**
     * Forward video
     * @return {void}
     */
    forwardVideo: function(){

        var self = this;
        var video = self.video;

        self.skipAhead(video.currentTime + 10);

    },

    /**
     * Backward video
     * @return {void}
     */
    backwardVideo: function(){

        var self = this;
        var video = self.video;

        self.skipAhead(video.currentTime - 10);

    },

    /**
     * Skip ahead video
     * @param {Number} skipTo
     * @return {void}
     */
    skipAhead: function(skipTo){

        if( !skipTo ){
            return;
        }

        var self = this;
        var element = self.element;
        var video = self.video;
        var seek = V.$('input[type="range"]', element);
        var progress = V.$('progress', element);

        video.currentTime = skipTo;
        seek.value = skipTo;
        progress.value = skipTo;

    },

    /**
     * Toggle full screen mode
     * @return {void}
     */
    toggleFullScreen: function(){

        var self = this;
        var element = self.element;

        if( document.fullscreenElement ){
            document.exitFullscreen();
        } else {
            element.requestFullscreen().catch(function(){});
        }

    },

    /**
     * Update seek tooltip text and position
     * @param {Event} event
     * @return {void}
     */
    updateSeekTooltip: function(event){

        var self = this;
        var element = self.element;
        var tooltip = V.$('.tooltip', element);
        var seek = V.$('input[type="range"]', element);
        var bcr = event.target.getBoundingClientRect();
        var offsetX = event.offsetX;
        var pageX = event.pageX;

        if( window.TouchEvent && event instanceof TouchEvent ){
            offsetX = event.targetTouches[0].clientX - bcr.x;
            pageX = event.targetTouches[0].pageX;
        }

        var skipTo = Math.round(
            (offsetX / event.target.clientWidth)
            * parseInt(event.target.getAttribute('max'), 10)
        );

        var format = self.formatTime(skipTo);

        seek.dataset.seek = skipTo;
        tooltip.textContent = format.m + ':' + format.s;
        tooltip.style.left = pageX + 'px';

    },

    /**
     * Update video duration
     * @return {void}
     */
    updateDuration: function(){

        var self = this;
        var element = self.element;
        var video = self.video;
        var duration = V.$('.duration', element);
        var seek = V.$('input[type="range"]', element);
        var progress = V.$('progress', element);

        var time = Math.round(video.duration);
        var format = self.formatTime(time);

        duration.innerText = format.m + ':' + format.s;
        duration.setAttribute('datetime', format.m + 'm ' + format.s + 's');

        seek.setAttribute('max', time);
        progress.setAttribute('max', time);

    },

    /**
     * Update video time elapsed
     * @return {void}
     */
    updateTimeElapsed: function(){

        var self = this;
        var element = self.element;
        var video = self.video;
        var elapsed = V.$('.elapsed', element);

        var time = Math.round(video.currentTime);
        var format = self.formatTime(time);

        elapsed.innerText = format.m + ':' + format.s;
        elapsed.setAttribute('datetime', format.m + 'm ' + format.s + 's');

    },

    /**
     * Update video progress
     * @return {void}
     */
    updateProgress: function(){

        var self = this;
        var element = self.element;
        var video = self.video;
        var seek = V.$('input[type="range"]', element);
        var progress = V.$('progress', element);

        seek.value = Math.floor(video.currentTime);
        progress.value = Math.floor(video.currentTime);

    },

    /**
     * Start progress tracking
     * @return {void}
     */
    trackProgress: function(){

        var self = this;

        if( self.trackTimeout ){
            self.stopTrackProgress();
        }

        self.trackTimeout = window.setTimeout(function(){
            self.updatePlaybackStatus();
        }, 30000); // 30s

    },

    /**
     * Stop progress tracking
     * @return {void}
     */
    stopTrackProgress: function(){

        var self = this;

        if( self.trackTimeout ){
            window.clearTimeout(self.trackTimeout);
        }

    },

    /**
     * Update playback status at Crunchyroll
     * @return {Promise}
     */
    updatePlaybackStatus: async function(){

        var self = this;
        var video = self.video;
        var episodeId = V.route.active().param('episodeId');

        var elapsed = 30;
        var elapsedDelta = 30;
        var playhead = video.currentTime;

        await Api.request('POST', '/log', {
            event: 'playback_status',
            media_id: episodeId,
            playhead: playhead,
            elapsed: elapsed,
            elapsedDelta: elapsedDelta
        });

        self.trackProgress();

    },

    /**
     * Set video as watched at Crunchyroll
     * @return {Promise}
     */
    setWatched: async function(){

        var self = this;
        var video = self.video;
        var episodeId = V.route.active().param('episodeId');

        var duration = Math.floor(video.duration);
        var playhead = Math.floor(video.currentTime);
        var elapsed = duration - playhead;
        var elapsedDelta = duration - playhead;

        await Api.request('POST', '/log', {
            event: 'playback_status',
            media_id: episodeId,
            playhead: duration,
            elapsed: elapsed,
            elapsedDelta: elapsedDelta
        });

        self.stopTrackProgress();

    }

});