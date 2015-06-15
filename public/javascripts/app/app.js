/**
 * Created by fx on 03/06/2015.
 */

(function() {

angular
    .module('AcoApp', [])
    .controller('appController', appController);

    appController.$inject = ['$http'];

    function appController($http) {

        var me = this;

        me.graph = {};

        $http.get('api/data')
            .success(function (data) {
                me.graph = data;
            });


        ///////////////////////////////////////

    }


})();
