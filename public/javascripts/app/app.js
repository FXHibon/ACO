/**
 * Created by fx on 03/06/2015.
 */

(function () {

    angular
        .module('AcoApp', ['ngMaterial'])
        .controller('appController', appController);

    appController.$inject = ['$http', '$scope'];

    function appController($http, $scope) {

        /**
         * Fonction utilitaire: cherche "val" dans chaque objet du tableau, sur le champs "field"
         * @param val Valeur à chercher
         * @param field Champ dans lequel chercher la valeur
         * @param isArray true pour renvoyer un tableau, sinon false
         * @returns {*}
         */
        Array.prototype.get = function (val, field, isArray) {
            isArray = isArray || false;
            var res = [];
            for (var elem in this) {
                if (this[elem][field] === val) {
                    res.push(this[elem]);
                }
            }
            if (isArray) return res;
            else return res[0] || undefined;
        };

        /**
         * Index of compatible avec les objets
         * @param val Valeur souhaitee
         * @param field Champ sur lequel faire la recherche
         * @returns {*} index de l'élément recherche, sinon -1
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
                me.sigma = new sigma({
                    container: 'container',
                    graph: toSigmaGraph(data)
                });
                me.configuration.depart = me.sigma.graph.nodes()[0].id;

            });

        /**
         * Object de config
         * @type {{constraint: string, visitTime: number, tpDelay: number}}
         */
        me.configuration = {
            constraint: "cheaper",
            visitTime: 30,
            // Temps minimum entre chaque teleportation
            tpDelay: 5,
            decrementationByIteration: 8,
            antNumber: 1
        };

        me.onClick = onClick;
        me.start = start;
        me.results = [];

        ///////////////////////////////////////

        function onClick() {
            var functions = [];
            var i = me.configuration.antNumber;

            // Colorie le point de départ
            me.sigma.graph.nodes().get(me.configuration.depart, "id").color = "#00ff00";
            me.sigma.refresh();
            while (i--) functions.push(start);

            // Lance les fourmies les unes après les autres
            async.series(functions,
                function () {
                    $scope.$digest();
                    console.log("fin de la série");

                    // Colorie le dernier chemin
                    me.edgesTraversed.forEach(function (edge) {
                        edge.color = "#ff0000";
                    });
                    me.sigma.refresh();
                });

        }

        /**
         * Iteration (une fourmi choisi le point suivant)
         * Récursivité: iteration est rappelée automatiquement par elle-même
         * @param currentNode Noeud courant
         * @param cb Callback final: appellé lorsqu'il n'y a plus à itérer
         * @returns {{currentNode: *, max: {val: number, node: undefined}, edge: *}}
         */
        function iterate(currentNode, cb) {

            // Noeuds suivant potentiels (qui partent de notre noeud, et qui ne sont pas déjà visités)
            var filteredEdges = me.sigma.graph.edges()
                .get(currentNode, "source", true)
                .filter(function (edge) {
                    return !edge.visited;
                });

            // on ne peut plus se deplacer
            if (filteredEdges.length === 0) {
                cb(currentNode);
                return;
            }

            // Somme des pheromones des noeuds potentiels
            var max = filteredEdges
                .reduce(function (prev, cur, index, array) {
                    return prev + cur.pheromones;
                }, 0);

            // Choix de l'heureux élu
            var random = Math.floor((Math.random() * max));

            var elected;
            for (var i in filteredEdges) {
                if (filteredEdges[i].pheromones >= random) {
                    elected = filteredEdges[i];
                    break;
                }
            }

            // On a un point ? alors on va dessus, et on créé une arête entre le point courant et la cible
            if (elected) {

                // Affiche l'arête
                elected.color = darker(elected.color);
                me.sigma.refresh();

                currentNode = elected.target;
                elected.visited = true;
                me.edgesTraversed.push(elected);
            }
            // récursion
            if (elected) {
                setTimeout(function () {
                    iterate(currentNode, cb)
                }, 100);

            } else {
                // fin, appel du callback final
                cb(currentNode);
                return;
            }
        }

        /**
         * Lance le parcours avec la configuration donnée
         * @param mainCb Callback de fin de fourmi
         */
        function start(mainCb) {
            console.log("début fourmi");
            // Fonction d'évaluation en fonction du critère choisi
            var evaluate;
            switch (me.configuration.constraint) {
                case "cheaper":
                    // PLUS COURT CHEMIN
                    // Somme des distances des arêtes parcourues
                    evaluate = function (edges) {
                        return 100000 / edges.reduce(function (prev, cur) {
                                return prev + cur.size;
                            }, 0);
                    };
                    break;

                case "shortest":
                    // TODO : PLUS RAPIDE
                    evaluate = function (edges) {
                        return Math.random();
                    };
                    break;

                case "priceQuality":
                    // TODO : RAPPORT QUALITE / PRIX
                    evaluate = function (edges) {
                        return Math.random();
                    };
                    break;
            }

            // Reset les compteurs d'arêtes visitées
            me.sigma.graph.edges().forEach(function (edge) {
                edge.visited = false;
            });

            var currentNode = me.configuration.depart;
            me.edgesTraversed = [];

            // Lance les itérations en asynchrones
            setTimeout(function () {
                iterate(currentNode,
                    function (currentNode) {

                        // final edge: retour au point de départ
                        var edge = me.sigma.graph.edges()
                            .get(currentNode, "source", true)
                            .get(me.configuration.depart, "target");

                        if (edge)
                            edge.color = darker(edge.color);
                        me.sigma.refresh();

                        // Evaporation des phéromones
                        decrementPheromones(me.sigma.graph.edges());

                        // Evaluation de la qualité de la solution
                        var val = evaluate(me.edgesTraversed);
                        me.results.push({
                            value: val,
                            edges: me.edgesTraversed
                        });
                        // Dépots de phéromones sur les arêtes traversées
                        deposePheromones(me.edgesTraversed, val);
                        console.log("fin fourmi");
                        mainCb(null);
                    });
            }, 0);

        }

        /**
         * Décrémente les phéromones de chaque arrête (à faire entre chaque itération)
         * @param edges
         */
        function decrementPheromones(edges) {
            edges.forEach(function (edge) {
                edge.pheromones -= me.configuration.decrementationByIteration;
                edge.pheromones = edge.pheromones < 0 ? 0 : edge.pheromones;
            })
        }

        /**
         * Dépose des phéromones sur toute les arrêtes traversées
         * @param edges
         * @param val
         */
        function deposePheromones(edges, val) {
            edges.forEach(function (edge) {
                edge.pheromones += val;
            });
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

            // Création des noeuds
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

            // Création des arêtes
            sigmaGraph.nodes.forEach(function (node1) {
                sigmaGraph.nodes.forEach(function (node2) {

                    if (node1.id === node2.id) return;
                    if (sigmaGraph.edges.get(node2.id + ":" + node1.id, "id")) return;

                    sigmaGraph.edges.push({
                        id: node1.id + ":" + node2.id,
                        source: node1.id,
                        target: node2.id,
                        color: '#ffffff',
                        pheromones: 0,
                        visited: false,
                        size: me.graph.get(node1.id, "name").distances[me.graph.indexOfObj(node2.id, "name")]
                    });
                });
            });
            return sigmaGraph;
        }

        //////////////////////////////////////////////////////////////////
        //                fonctions utilitaires
        //////////////////////////////////////////////////////////////////
        function componentToHex(c) {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }

        function rgbToHex(r, g, b) {
            return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
        }

        function hexToRgb(hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }

        function darker(c) {
            var rgb = hexToRgb(c.substring(1));
            var delta = 20;
            rgb.r -= delta;
            rgb.g -= delta;
            rgb.b -= delta;

            rgb.r = rgb.r < 0 ? 0 : rgb.r;
            rgb.g = rgb.g < 0 ? 0 : rgb.g;
            rgb.b = rgb.b < 0 ? 0 : rgb.b;

            return rgbToHex(rgb.r, rgb.g, rgb.b);
        }

        /**
         * Melange le tableau passe en parametre
         * @param o
         * @returns {*}
         */
        function shuffle(o) {
            for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
            return o;
        }
    }


})();
