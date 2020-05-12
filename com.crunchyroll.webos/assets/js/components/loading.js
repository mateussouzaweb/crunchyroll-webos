V.component('[data-loading]', {

    /**
     * Constructor
     * @param {Function} resolve
     * @return {void}
     */
    constructor: function(resolve){

        var self = this;

        // Public
        window.showLoading = function(){
            return self.showLoading();
        };
        window.hideLoading = function(){
            return self.hideLoading();
        };

        resolve(this);

    },

    /**
     * On render
     * @param {Function} resolve
     * @return {void}
     */
    onRender: function(resolve){

        var self = this;

        // Private
        self.on('show', function(e){
            e.preventDefault();
            self.showLoading();
        });

        self.on('hide', function(e){
            e.preventDefault();
            self.hideLoading();
        });

        resolve(this);

    },

    /**
     * Show loading box
     * @return {void}
     */
    showLoading: function(){
        var element = this.element;
            element.classList.add('active');
    },

    /**
     * Hide loading box
     * @return {void}
     */
    hideLoading: function(){
        var element = this.element;
            element.classList.remove('active');
    }

});