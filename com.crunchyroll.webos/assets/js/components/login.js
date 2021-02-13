V.route.add({
    id: 'login',
    path: '/login',
    title: 'Login',
    component: '<div data-login></div>',
    unauthenticated: true
});

V.component('[data-login]', {

    /**
     * Return template data
     * @return {string}
     */
    template: function(){
        return V.$('#template-login').innerHTML;
    },

    /**
     * On mount
     * @return {void}
     */
    onMount: function(){

        var self = this;

        self.on('submit', 'form', function(e){
            e.preventDefault();
            self.makeLogin();
        });

    },

    /**
     * Try make login from input data
     * @return {Promise}
     */
    makeLogin: async function(){

        var self = this;
        var element = self.element;

        var email = V.$('input#email', element);
        var password = V.$('input#password', element);
        var locale = V.$('select#locale', element);

        await Store.set('email', email.value, true);
        await Store.set('password', password.value, true);
        await Store.set('locale', locale.value, true);

        window.showLoading();

        try {
            await Api.tryLogin();
            V.route.redirect('/home');
        } catch (error) {
            self.render({message: error.message});
        }

        window.hideLoading();

    }

});