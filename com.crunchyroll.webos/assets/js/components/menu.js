V.component('[data-menu]', {

    /**
     * Return template
     * @return {string}
     */
    template: function(){
        return V.$('#template-menu').innerHTML;
    },

    /**
     * On mount
     * @return {void}
     */
    onMount: function(){

        var self = this;

        V.route.afterChange(function(){
            self.setActive();
        });

        Store.on('authChanged', 'menu', async function(){
            await self.render();
            await self.setActive();
        });

    },

    /**
     * On destroy
     * @return {void}
     */
    onDestroy: function(){
        Store.off('authChanged', 'menu');
    },

    /**
     * Set active menu item
     * @return {void}
     */
    setActive: function(){

        var self = this;
        var path = V.route.active().id;
        var next = V.$('a[href="/' + path + '"]', self.element);
        var current = V.$('a.active', self.element);

        if( current ){
            current.classList.remove('active');
        }
        if ( next ){
            next.classList.add('active');
        }

    }

});