/**
 * Created by fx on 03/06/2015.
 */

(function () {

    angular
        .module('AcoApp', [])
        .controller('appController', appController);

    appController.$inject = ['$http'];

    function appController($http) {

        /**
         * Fonction utilitaire: cherche "val" dans chaque objet du tableau, sur le champs "field"
         * @param val Valeur à chercher
         * @param field Champ dans lequel chercher la valeur
         * @returns {*}
         */
        Array.prototype.get = function (val, field) {
            for (var elem in this) {
                if (this[elem][field] === val) {
                    return this[elem];
                }
            }
            return undefined;
        };

        /**
         * Index of compatible avec les objets
         * @param val Valeur souhaitee
         * @param field Champ sur lequel faire la recherche
         * @returns {*}
         */
        Array.prototype.indexOfObj = function (val, field) {
            for (var elem in this) {
                if (this[elem][field] === val) {
                    return elem;
                }
            }
            return -1;
        };

        var me = this;

        // Donnees d'origine
        me.graph = {};

        /**
         * Récupére les données du serveur
         */
        $http.get('api/data')
            .success(function (data) {
                me.graph = data;
                me.sigmaGraph = toSigmaGraph(data);
                me.sigma = new sigma({
                    container: 'container',
                    graph: me.sigmaGraph
                });

            });

        /**
         * Object de config
         * @type {{constraint: string, visitTime: number, tpDelay: number}}
         */
        me.configuration = {
            constraint: "cheaper",
            visitTime: 30,
            // Temps minimum entre chaque teleportation
            tpDelay: 5
        };

        me.start = start;

        ///////////////////////////////////////

        /**
         * Iteration (une fourmi choisi le point suivant)
         * @param currentNode Noeud courant
         * @param x Decalage en x (pour l'affichage)
         * @param evaluate Fonction d'evaluation
         * @param cb Callback final: appellé lorsqu'il n'y a plus à itérer
         * @returns {{currentNode: *, x: number, max: {val: number, node: undefined}, edge: *}}
         */
        function iterate(currentNode, x, evaluate, cb) {
            console.log("iteration");
            me.sigma.graph.nodes().get(currentNode, "id").visited = true;
            me.sigma.graph.nodes().get(currentNode, "id").x = x;
            x += 0.1;

            var max = {
                val: -1,
                node: undefined
            };
            // On trouve le meilleur point non visité sur lequel aller
            me.sigma.graph.nodes().forEach(function (node) {
                if (!node.visited) {
                    var maxTmp = evaluate(currentNode, node.id);
                    if (maxTmp > max.val) {
                        max.val = maxTmp;
                        max.node = node;
                    }
                }
            });

            // On a un point ? alors on va dessus, et on creé une arrête entre le point courant et la cible
            if (max.node) {
                var edge = me.sigma.graph.edges().get(currentNode + ":" + max.node.id, "id");
                if (!edge) {
                    edge = me.sigma.graph.edges().get(max.node.id + ":" + currentNode, "id")
                }

                // Affiche l'arête
                edge.color = "#000";
                me.sigma.refresh();

                currentNode = max.node.id;

            }
            if (max.node) {
                setTimeout(function () {
                        iterate(currentNode, x, evaluate, cb);
                    },
                    100);
            } else {
                cb(currentNode, x, evaluate);
            }
            return {currentNode: currentNode, x: x, max: max, edge: edge};
        }

        /**
         * Lance le parcours avec la configuration donnée
         */
        function start() {
            console.log("Starting with: ", me.configuration);
            // Fonction d'évaluation en fonction du critère choisi
            var evaluate;
            switch (me.configuration.constraint) {
                case "cheaper":
                    // PLUS COURT CHEMIN
                    evaluate = function (current, target) {
                        var edges = me.graph.get(current, "name").distances;
                        var index = me.graph.indexOfObj(target, "name");
                        console.log("FROM ", current, " TO ", target, " = ", edges[index]);
                        // Plus la distance est faible, plus la valeur est forte
                        return 1 / edges[index];
                    };
                    break;

                case "shortest":
                    // PLUS RAPIDE
                    evaluate = function (current, target) {
                        return Math.random();
                    };
                    break;

                case "priceQuality":
                    // RAPPORT QUALITE / PRIX
                    evaluate = function (current, target) {
                        return Math.random();
                    };
                    break;
            }

            var currentNode = me.configuration.depart;
            var x = 0;

            setTimeout(function () {
                    iterate(currentNode, x, evaluate, function (currentNode, x, evaluate) {
                        // Décale le dernier node pour un souci de visibilité
                        me.sigma.graph.nodes().get(currentNode, "id").y = 1.2;

                        // final edge: retour au point de départ
                        var edge = me.sigma.graph.edges().get(currentNode + ":" + me.configuration.depart, "id");
                        if (!edge) {
                            edge = me.sigma.graph.edges().get(me.configuration.depart + ":" + currentNode, "id")
                        }
                        edge.color = "#000";

                        me.sigma.refresh();
                    });
                },
                0);


            console.log("Ended");
        }

        /**
         * Savoir si on a tout parcouru ou pas
         * @returns {boolean} true si tout les nodes sont visités, sinon faux
         */
        function ended() {
            var ended = true;
            for (var i in me.sigma.graph.nodes()) {
                ended &= me.sigma.graph.nodes()[i].visited;
                if (!ended) return false;
            }
            return ended;
        }

        /**
         * Parse les données de bases pour les mettre dans le format de sigma.js
         * @param data Données venant du serveur
         * @returns {{nodes: Array, edges: Array}} tableaux de nodes et tableaux d'edges
         */
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
                    if (sigmaGraph.edges.get(node2.id + ":" + node1.id, "id")) return;

                    sigmaGraph.edges.push({
                        id: node1.id + ":" + node2.id,
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
