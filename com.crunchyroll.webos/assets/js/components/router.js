V.component('[data-router]', {

    /**
     * After render
     * Attach router component changes
     * @param {Function} resolve
     * @return {Promise}
     */
    afterRender: function(resolve){

        var self = this;
        var element = self.element;

        V.router.beforeChange(function(resolve){

            // Kind of 404
            if( !this.next ){
                this.next = V.router.getMatch('/queue');
            }

            // Check login
            if( !window.isLoggedIn() ){
                this.next = V.router.getMatch('/login');
            }

            resolve(this);
        });

        V.router.afterChange(async function(resolve){

            var previous = this.previous;
            var next = this.next;
            var body = V.$('body');

            if (previous) {

                var _element = V.$(
                    self.selector + ' ' + previous.component.selector
                );

                if( _element ){
                    await V.destroy(_element);
                }

                if( previous.id ){
                    body.classList.remove('page-' + previous.id)
                }

            }

            if (next) {

                element.innerHTML = next.component.getHTML();

                if( next.id ){
                    body.classList.add('page-' + next.id);
                }

                await V.mount(element);

            }

            resolve(this);
        });

        resolve(this);

    }

});