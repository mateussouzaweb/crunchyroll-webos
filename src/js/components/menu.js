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

        self.watch('authChanged', async function(){
            await self.render();
            await self.setActive();
        });

    },

    /**
     * After render
     * @return {void}
     */
    afterRender: function(){
        this.setActive();
    },

    /**
     * Set active menu item
     * @return {void}
     */
    setActive: function(){

        var self = this;
        var path = V.route.active().id;
        var next = V.$('a[href="' + path + '"]', self.element);
        var current = V.$('a.active', self.element);

        if( current ){
            current.classList.remove('active');
        }
        if ( next ){
            next.classList.add('active');
        }

    }

});