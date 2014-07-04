/*jshint strict:false */
/*global angular:false */
/*global L:false */

angular.module('osm').config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/relation', {
        templateUrl: 'partials/relation.html',
        controller: 'RelationController'
    });
    $routeProvider.when('/relation/:relationid', {
        templateUrl: 'partials/relation.html',
        controller: 'RelationController'
    });
    $routeProvider.otherwise({redirectTo: '/relation'});
}]);


angular.module('osm.controllers').controller('RelationController',
    ['$scope', '$routeParams', '$location', 'settingsService', 'osmService', 'leafletService',
    function($scope, $routeParams, $location, settingsService, osmService, leafletService){
        console.log('init RelationController');
        $scope.relationID = $routeParams.relationid;
        $scope.relationDOM; //XML DOM data receive from OSM;
        $scope.members = [];
        $scope.tags = [];
        $scope.markers = {};
        $scope.setCurrentRelation = function(member){
            if (member.type === 'relation'){
                $location.path('/relation/'+member.ref);
            }
        };
        $scope.addNodeToRelation = function(node){
            //1. find the way that is attached to this one.
            //2. create the dom element and attach it to $scope.relationDOM;
            //3. put -> OSM
            debugger;
        };
        $scope.removeMemberFromRelation = function(member){

        };
        var cache = {};
        var getRelationFeatureById = function(id){
            if (cache.source !== $scope.relationGeoJSON){
                var tmp;
                for (var i = 0; i < $scope.relationGeoJSON.features.length; i++) {
                    tmp = $scope.relationGeoJSON.features[i];
                    cache[tmp.id] = tmp;
                }
            }
            if (typeof id === 'string'){
                return cache[parseInt(id)];
            }
            return cache[id];
        };
        var startIcon = {
            iconUrl: 'images/marker-start.png',
            shadowUrl: 'images/marker-shadow.png',
            iconSize:     [15, 21], // size of the icon
            shadowSize:   [20, 30], // size of the shadow
            iconAnchor:   [15, 21], // point of the icon which will correspond to marker's location
            shadowAnchor: [4, 30],  // the same for the shadow
            popupAnchor:  [-3, -20] // point from which the popup should open relative to the iconAnchor
        };
        var endIcon = {
            iconUrl: 'images/marker-start.png',
            shadowUrl: 'images/marker-shadow.png',
            iconSize:     [15, 21], // size of the icon
            shadowSize:   [20, 30], // size of the shadow
            iconAnchor:   [15, 21], // point of the icon which will correspond to marker's location
            shadowAnchor: [4, 30],  // the same for the shadow
            popupAnchor:  [-3, -20] // point from which the popup should open relative to the iconAnchor
        };
        $scope.displayMember = function(member){
            var c = getRelationFeatureById(member.ref).geometry.coordinates;
            $scope.markers = {
                start: {
                    id: undefined,
                    icon: startIcon,
                    lng: c[0][0],
                    lat: c[0][1],
                    focus: true,
                    draggable: false
                },
                end: {
                    id: undefined,
                    icon: endIcon,
                    lng: c[c.length-1][0],
                    lat: c[c.length-1][1],
                    focus: false,
                    draggable: false
                }
            };
            leafletService.getMap().then(function(map){
                var zoom = map.getZoom();
                if (zoom < 17){
                    zoom = 17;
                }
                map.setView(L.latLng(c[0][1], c[0][0]), zoom);
            });
        };
        var onEachFeature = function(feature, layer) {
            layer.on('click', function (e) {
                $scope.currentMember = feature;
            });
        };
        var initialize = function(){
            osmService.get('/0.6/relation/' + $scope.relationID).then(function(data){
                $scope.relationDOM = data;
                $scope.relationXML = osmService.serialiseXmlToString(data);
            }, function(error){
                console.error(error);
            });
            osmService.get('/0.6/relation/' + $scope.relationID + '/full').then(
                function(data){
                    $scope.relationXMLFull = osmService.serialiseXmlToString(data);
                    $scope.relationGeoJSON = osmService.relationXmlToGeoJSON($scope.relationID, data);
                    $scope.members = $scope.relationGeoJSON.members;
                    $scope.tags = $scope.relationGeoJSON.tags;
                    for (var i = 0; i < $scope.relationGeoJSON.tags.length; i++) {
                        if ($scope.relationGeoJSON.tags[i].k === 'name'){
                            $scope.relationName = $scope.relationGeoJSON.tags[i].v;
                            break;
                        }
                    }
                    $scope.relationGeoJSON.options.onEachFeature = onEachFeature;
                    leafletService.addGeoJSONLayer(
                        $scope.relationGeoJSON,
                        $scope.relationGeoJSON.options
                    );
                }, function(error){
                    console.error(error);
                }
            );
        };
        initialize();
    }]
);