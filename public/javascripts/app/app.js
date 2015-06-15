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

        // Donnees d'origine
        me.graph = {};

        $http.get('api/data')
            .success(function (data) {
                me.graph = data;
                me.sigmaGraph = toSigmaGraph(data);
                me.sigma = new sigma({
                    container: 'container',
                    graph: me.sigmaGraph
                });

            });

        me.configuration = {
            constraint: "cheaper",
            visitTime: 10
        };

        me.start = start;

        ///////////////////////////////////////

        function start() {
            console.log("Starting with: ", me.configuration);

            var evaluate;
            switch (me.configuration.constraint) {
                case "cheaper":
                    evaluate = function () {
                    };
                    break;

                case "shortest":
                    evaluate = function () {
                    };
                    break;

                case "priceQuality":
                    evaluate = function () {
                    };
                    break;
            }


            // Tant qu'on a pas tout parcouru, on itere
            while (!ended()) {

            }
        }

        function ended() {
            var ended = true;
            for (var i in me.sigmaGraph.nodes) {
                ended &= me.sigmaGraph.nodes[i].visited;
            }
            return true;
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
                    y: Math.random(),
                    visited: false
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
