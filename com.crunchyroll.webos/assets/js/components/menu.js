V.component('[data-menu]', {

    /**
     * Constructor
     * @param {Function} resolve
     * @param {Function} reject
     * @return {void}
     */
    constructor: function(resolve, reject){

        var self = this;

        // Public
        window.updateMenu = function(){
            return self.updateMenu();
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
        var element = this.element;
        var content = V.$('#content');

        self.on('click', '.menu-link', function(e){

            e.preventDefault();

            V.$('.menu-link.active', element).classList.remove('active');
            this.classList.add('active');

            var html = '<div class="inside" ';
                html += 'data-' + this.dataset.content + '>';
                html += '</div>';

            content.innerHTML = html;
            V.mount(content);

            window.setActiveElement(this);

        });

        self.on('click', '.account-logout', function(e){
            window.makeLogout().then(function(){
                window.resetHistory();
            });
        });

        self.updateMenu();

        if( window.isLoggedIn() ){
            V.trigger('.menu-link.active', 'click');
        }

        resolve(this);
    },

    /**
     * Update menu
     * @return {void}
     */
    updateMenu: function(){

        var element = this.element;

        if( !element ){
            return;
        }

        var data = window.getSessionData();
        var name = V.$('.account-name', element);

        if( data.userName ){
            name.innerHTML = data.userName
            element.classList.add('logged');
        }else{
            name.innerHTML = '';
            element.classList.remove('logged');
        }

    }

});