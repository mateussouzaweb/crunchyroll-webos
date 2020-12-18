V.component('[data-menu]', {

    /**
     * After render
     * @param {Function} resolve
     * @return {void}
     */
    afterRender: function(resolve){

        var self = this;
        var element = this.element;

        V.router.afterChange(function(resolve){

            if( V.$('.menu-link.active', element) ){
                V.$('.menu-link.active', element).classList.remove('active');
            }

            if( this.next.id ){
                var item = V.$('.menu-' + this.next.id, element);
                if( item ){
                    item.classList.add('active');
                }
            }

            resolve(this);
        });

        // Public
        window.updateMenu = function(){
            return self.updateMenu();
        };

        self.updateMenu();
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