V.component('[data-navigation-history]', {

    /**
     * Constructor
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    constructor: function(resolve, reject){

        var self = this;

        // Public
        window.pushHistory = function(route){
            return self.pushHistory(route);
        };
        window.resetHistory = function(){
            return self.resetHistory();
        };

        resolve(this);

    },

    /**
     * Push history on navigation
     * @param {String} route
     * @return {void}
     */
    pushHistory: function(route){

        // PUSH
        history.pushState(
            {},
            document.title,
            'index.html#' + route
        );

    },

    /**
     * Reset browsing history
     * @return {void}
     */
    resetHistory: function(){
        history.go(0);
    }

});