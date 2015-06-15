/**
 * Created by fx on 03/06/2015.
 */

(function () {

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
                me.sigmaGraph = toSigmaGraph(data);
                console.log(me.sigmaGraph);
                me.sigma = new sigma({
                    container: 'container',
                    graph: me.sigmaGraph
                });

            });


        me.start = start;

        ///////////////////////////////////////

        function start() {

        }

        function toSigmaGraph(data) {
            var sigmaGraph = {
                nodes: [],
                edges: []
            };

            data.forEach(function (node) {
                sigmaGraph.nodes.push({
                    id: node.name,
                    size: 1,
                    label: node.name,
                    color: '#666',
                    x: Math.random(),
                    y: Math.random()
                });
            });

            sigmaGraph.nodes.forEach(function (node1) {
                sigmaGraph.nodes.forEach(function (node2) {
                    sigmaGraph.edges.push({
                        id: "E" + node1.id + ":" + node2.id,
                        source: node1.id,
                        target: node2.id,
                        color: '#fff'
                    });
                });
            });
            return sigmaGraph;
        }
    }


})();
