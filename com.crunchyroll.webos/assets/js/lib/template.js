/**
 * Return a template engine
 * @param {String} templateId
 * @return {Object}
 */
function template(templateId){

    var template = document.querySelector(
        'template#' + templateId
    ).innerHTML;

    return {
        replace: function(search, replace){
            template = template.split(search);
            template = template.join(replace);
            return this;
        },
        render: function(){
            return template;
        }
    }
}