/**
 * Created by fx on 03/06/2015.
 */

(function () {

    angular
        .module('AcoApp', [])
        .controller('appController', appController);

    appController.$inject = ['$http'];

    function appController($http) {


        Array.prototype.get = function (val, field) {
            for (var elem in this) {
                if (this[elem][field] === val) {
                    return this[elem];
                }
            }
            return undefined;
        };
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
            visitTime: 30,
            // Temps minimum entre chaque teleportation
            tpDelay: 5
        };

        me.start = start;

        ///////////////////////////////////////

        function start() {
            console.log("Starting with: ", me.configuration);

            var evaluate;
            switch (me.configuration.constraint) {
                case "cheaper":
                    evaluate = function (node) {
                        return Math.random();
                    };
                    break;

                case "shortest":
                    evaluate = function (node) {
                        return Math.random();
                    };
                    break;

                case "priceQuality":
                    evaluate = function (node) {
                        return Math.random();
                    };
                    break;
            }

            var currentNode = me.configuration.depart;
            var x = 0;
            // Tant qu'on a pas tout parcouru, on itere
            while (!ended()) {
                me.sigma.graph.nodes().get(currentNode, "id").visited = true;
                me.sigma.graph.nodes().get(currentNode, "id").x = x;
                x += 0.1;
                var max = {
                    val: -1,
                    node: undefined
                };
                me.sigma.graph.nodes().forEach(function (node) {
                    if (!node.visited) {
                        var maxTmp = evaluate(node);
                        if (maxTmp > max.val) {
                            max.val = maxTmp;
                            max.node = node;
                        }
                    }
                });
                if (max.node) {
                    var edge = me.sigma.graph.edges().get("E:" + currentNode + ":" + max.node.id, "id");
                    if (!edge) {
                        edge = me.sigma.graph.edges().get("E:" + max.node.id + ":" + currentNode, "id")
                    }
                    console.log("passage par ", edge);
                    edge.color = "#000";
                    me.sigma.refresh();

                    console.log("apres par ", edge);
                    currentNode = max.node.id;
                } else {
                    break;
                }

            }
            me.sigma.graph.nodes().get(currentNode, "id").y = 1.2;
            // final edge
            edge = me.sigma.graph.edges().get("E:" + currentNode + ":" + me.configuration.depart, "id");
            if (!edge) {
                edge = me.sigma.graph.edges().get("E:" + me.configuration.depart + ":" + currentNode, "id")
            }
            edge.color = "#000";
            me.sigma.graph.edges().forEach(function (edge) {
                if (edge.color !== "#fff") console.log(edge);
            });
            me.sigma.refresh();
            console.log("Ended");
        }

        function ended() {
            var ended = true;
            for (var i in me.sigma.graph.nodes()) {
                ended &= me.sigma.graph.nodes()[i].visited;
                if (!ended) return false;
            }
            return ended;
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

                    if (node1.id === node2.id) return;
                    if (sigmaGraph.edges.get("E:" + node2.id + ":" + node1.id, "id")) return;

                    sigmaGraph.edges.push({
                        id: "E:" + node1.id + ":" + node2.id,
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
