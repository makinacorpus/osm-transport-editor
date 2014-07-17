/*jshint strict:false */
/*global angular:false */

'use strict';

// Declare app level module which depends on filters, and services
angular.module('osm', [
    'ngRoute',
    'base64',
//    'flash',
    'leaflet-directive',
    'osm.services',
    'osm.directives',
    'osm.controllers',
    'ui.bootstrap',
    'ui.keypress',
    'ngCookies',
    'ngStorage'
]);

angular.module('osm.controllers', []);
angular.module('osm.services', []);
angular.module('osm.directives', []);


/*jshint strict:false */
/*global angular:false */

angular.module('osm.controllers').controller('DebugController',
	['$scope', function($scope){
		$scope.displayDebugPanel = false;
		$scope.toggleDebugPanel = function(){
			$scope.displayDebugPanel = !$scope.displayDebugPanel;
		}
	}]
);
/*jshint strict:false */
/*global angular:false */
/*global L:false */
L.Icon.Default.imagePath = 'images/';

angular.module('osm.services').factory('leafletService',
    ['$q', 'leafletData', 'osmService', function($q, leafletData, osmService){
        return {
            center: {lat: 47.2383, lng: -1.5603, zoom: 11},
            geojson: undefined,
            layers: {
                baselayers: {
                    osm: {
                        name: 'OpenStreetMap',
                        url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        type: 'xyz',
                        visible: true,
                        layerParams: {
                            maxZoom: 20
                        }
                    }
                },
                overlays:{}
            },
            geojsonLayers: {},
            markers: [],
            getMap: function(id){
                return leafletData.getMap(id);
            },
            addGeoJSONLayer: function(id, geojson, options){
                var self = this;
                var oldLayer = this.geojsonLayers[id];
                self.geojsonLayers[id] = L.geoJson(geojson, options);
                leafletData.getMap().then(function(map){
                    if (map.hasLayer(oldLayer)){
                        map.removeLayer(oldLayer);
                    }
                    self.geojsonLayers[id].addTo(map);
                });
            },
            hideLayer: function(id){
                var self = this;
                var oldLayer = this.geojsonLayers[id];
                leafletData.getMap().then(function(map){
                    if (map.hasLayer(oldLayer)){
                        map.removeLayer(oldLayer);
                    }
                });
            },
            displayLayer: function(id){
                console.log('display '+ id);
                var layer = this.geojsonLayers[id];
                leafletData.getMap().then(function(map){
                    debugger;
                    if (!map.hasLayer(layer)){
                        layer.addTo(map);
                    }
                });
            },
            loadExternalLayers: function(uris){
                var self = this;
                var onEachFeature = function(feature, layer) {
                    if (feature.properties) {
                        var html = '<ul>';
                        for (var propertyName in feature.properties) {
                            html += '<li>'+ propertyName + ' : ' + feature.properties[propertyName] + '</li>';
                        }
                        html += '</ul>';
                        layer.bindPopup(html);
                    }
                };
                var uri;
                for (var i = 0; i < uris.length; i++) {
                    uri = uris[i];
//                    osmService.yqlJSON(uri).then(getGeoJSONLoader(uri)()); 
                    osmService.yqlJSON(uri).then(function(geojson){
                        console.log('add layer'+uri);
                        self.addGeoJSONLayer(uri, geojson, {onEachFeature: onEachFeature});
                    });
                }
            },
            getBBox: function(){
                var self = this;
                var deferred = $q.defer();
                self.getMap().then(function(map){
                    var b = map.getBounds();
                    //var bbox = '' + b.getWest() + ',' + b.getSouth() + ',' + b.getEast() + ',' + b.getNorth();
                    // s="47.1166" n="47.310" w="-1.7523" e="-1.3718
                    var bbox = 'w="' + b.getWest() + '" s="' + b.getSouth() + '" e="' + b.getEast() + '" n="' + b.getNorth() + '"';
                    deferred.resolve(bbox);
                });
                return deferred.promise;
            }
        };
    }]
);

angular.module('osm.controllers').controller('LeafletController',
    ['$scope', '$q', 'leafletService', 'osmService', 'settingsService',
    function($scope, $q, leafletService, osmService, settingsService){
        $scope.settings = settingsService.settings;
        $scope.center = leafletService.center;
        $scope.zoomLevel = leafletService.center.zoom;
        $scope.layers = leafletService.layers;
        $scope.geojson = leafletService.geojson;
        $scope.loading = {};
        var idIcon = L.icon({
            iconUrl: 'images/id-icon.png',
            shadowUrl: 'images/marker-shadow.png',
            iconSize:     [15, 21], // size of the icon
            shadowSize:   [20, 30], // size of the shadow
            iconAnchor:   [15, 21], // point of the icon which will correspond to marker's location
            shadowAnchor: [4, 30],  // the same for the shadow
            popupAnchor:  [-3, -20] // point from which the popup should open relative to the iconAnchor
        });
        var pointToLayer = function (feature, latlng) {
            return L.marker(latlng, {icon: idIcon});
        };
        var onEachFeature = function(feature, layer) {
            //load clicked feature as '$scope.currentNode'
            layer.on('click', function (e) {
                $scope.currentNode = feature;
                //load relation that node is member of
                if (feature.id !== undefined){
                    $scope.getParentRelations(
                        osmService.getElementTypeFromFeature(feature),
                        feature.id
                    ).then(function(parents){
                        $scope.currentNodeParents = parents;
                    });
                }
            });
        };
        var osmGEOJSONOptions = {
            pointToLayer: pointToLayer,
            onEachFeature: onEachFeature
        };
        $scope.removeOverpassLayer = function(){
            leafletService.getMap().then(function(map){
                if ($scope.overpassLayer !== undefined){
                    map.removeLayer($scope.overpassLayer);
                }
                $scope.overpassLayer = undefined;
            });
        };
        $scope.overpassToLayer = function(query, filter){
            var deferred = $q.defer();
            var onError = function(error){
                deferred.reject(error);
            };
            osmService.overpassToGeoJSON(query, filter).then(function(geojson){
                leafletService.getMap().then(function(map){
                    if ($scope.overpassLayer !== undefined){
                        map.removeLayer($scope.overpassLayer);
                    }
                    $scope.overpassLayer = L.geoJson(geojson, osmGEOJSONOptions);
                    $scope.overpassLayer.addTo(map);
                    deferred.resolve($scope.overpassLayer);
                }, onError);
            });
            return deferred.promise;
        };
        $scope.loadOverpassBusStop = function(){
            $scope.loading.busstop = true;
            $scope.loading.busstopOK = false;
            $scope.loading.busstopKO = false;
            var onError = function(){
                $scope.loading.busstop = false;
                $scope.loading.busstopOK = false;
                $scope.loading.busstopKO = true;
            };
            var onSuccess = function(){
                $scope.loading.busstop = false;
                $scope.loading.busstopOK = true;
                $scope.loading.busstopKO = false;
            };
            leafletService.getBBox().then(function(bbox){
                var filter = function(feature){
                    return feature.geometry.type !== 'Point';
                };
                var query = '<?xml version="1.0" encoding="UTF-8"?>';
                query += '<osm-script output="json" timeout="10"><union>';
                query += '<query type="node">';
                query += '<has-kv k="highway" v="bus_stop"/>';
                query += '<bbox-query ' + bbox + '/>';
                query += '</query>';
                query += '<query type="node">';
                query += '<has-kv k="public_transport" v="stop_position"/>';
                query += '<bbox-query ' + bbox + '/>';
                query += '</query></union>';
                query += '<print mode="body"/>';
                query += '<recurse type="down"/>';
                query += '<print mode="skeleton" order="quadtile"/>';
                query += '</osm-script>';
                $scope.overpassToLayer(query, filter).then(onSuccess,onError);
            },onError);
        };
        $scope.loadOverpassWays = function(){
            $scope.loading.ways = true;
            $scope.loading.waysOK = false;
            $scope.loading.waysKO = false;
            var onError = function(){
                $scope.loading.ways = false;
                $scope.loading.waysOK = false;
                $scope.loading.waysKO = true;
            };
            var onSuccess = function(){
                $scope.loading.ways = false;
                $scope.loading.waysOK = true;
                $scope.loading.waysKO = false;
            };
            leafletService.getBBox().then(function(bbox){
                var query = '<?xml version="1.0" encoding="UTF-8"?>';
                query += '<osm-script output="json" timeout="25"><union>';
                query += '<query type="way">';
                query += '<has-kv k="highway"/>';
                query += '<bbox-query ' + bbox + '/>';
                query += '</query></union>';
                query += '<print mode="body"/>';
                query += '<recurse type="down"/>';
                query += '<print mode="skeleton" order="quadtile"/>';
                query += '</osm-script>';
                var filter = function(feature){
                    return feature.geometry.type !== 'LineString';
                };
                $scope.overpassToLayer(query, filter).then(onSuccess, onError);
            }, onError);
        };
        $scope.loadOSMWays = function(){
            $scope.loadOSMData(function(feature){
                return feature.geometry.type !== 'LineString';
            }, function(){
                $scope.loading.ways = false;
                $scope.loading.waysOK = false;
                $scope.loading.waysKO = true;
            });
        };
        $scope.loadBusStop = function(){
            $scope.loadOSMData(function(feature){
                var filterIsNotPoint = feature.geometry.type !== 'Point';
                var filterIsNotBusStop = feature.properties.highway !== 'bus_stop';
                var filterIsNotPublicTransport = feature.properties.public_transport !== 'stop_position';
                return (filterIsNotPoint && (filterIsNotBusStop || filterIsNotPublicTransport));
            });
        };
        $scope.loadOSMData = function(filter){
            leafletService.getMap().then(function(map){
                var b = map.getBounds();
                var bbox = '' + b.getWest() + ',' + b.getSouth() + ',' + b.getEast() + ',' + b.getNorth();
                // s="47.1166" n="47.310" w="-1.7523" e="-1.3718
                //var bbox = 'w="' + b.getWest() + '" s="' + b.getSouth() + '" e="' + b.getEast() + '" n="' + b.getNorth() + '"';
                osmService.getMapGeoJSON(bbox).then(function(nodes){
                    $scope.nodes = nodes;
                    var feature, result, newFeatures = [];
                    for (var i = 0; i < $scope.nodes.features.length; i++) {
                        feature = $scope.nodes.features[i];
                        if (!filter(feature)){
                            newFeatures.push(feature);
                        }
                    }
                    $scope.nodes.features = newFeatures;
                    //display them on the map
                    $scope.leafletGeojson = {
                        data: $scope.nodes,
                        pointToLayer: pointToLayer,
                        style: style
                    };
                });
            });
        };
        $scope.addNodeToRelation = function(node, newIndex){
            var features = $scope.relation.features;
            features.push($scope.currentNode);
            if ($scope.currentNode.geometry.type === 'LineString'){
                $scope.members.push({
                    type: 'way',
                    ref: $scope.currentNode.id,
                    role: '',
                    name: $scope.currentNode.properties.name
                });
            }else if ($scope.currentNode.geometry.type === 'Point'){
                $scope.members.push({
                    type: 'node',
                    ref: $scope.currentNode.id,
                    role: 'plateform',
                    name: $scope.currentNode.properties.name
                });
            }
            if (!isNaN(newIndex)){
                $scope.moveMemberFromIndexToIndex($scope.members.length-1, newIndex);
            }
            leafletService.addGeoJSONLayer(
                'relation',
                $scope.relation,
                $scope.relation.options
            );
        };
        $scope.addGeoJSON = function(uri){
            if ($scope.settings.geojsonLayers.indexOf(uri) === -1){
                $scope.settings.geojsonLayers.push(uri);
            }
            leafletService.loadExternalLayers($scope.settings.geojsonLayers);
        };
        $scope.removeGeoJSON = function(uri){
            var index = $scope.settings.geojsonLayers.indexOf(uri);
            if (index !== -1){
                $scope.settings.geojsonLayers.splice(index, 1);
            }
            leafletService.hideLayer(uri);
        };
        $scope.hideGeoJSON = function(uri){
            leafletService.hideLayer(uri);
        };
        $scope.displayGeoJSON = function(uri){
            console.log('display '+ uri);
            leafletService.displayLayer(uri);
        };

        //initialize
        leafletService.getMap().then(function(map){
            $scope.map = map;
            leafletService.loadExternalLayers($scope.settings.geojsonLayers);
            map.on('zoomend', function(e){
                $scope.zoomLevel = map.getZoom();
            });
        });        
        leafletService.loadExternalLayers($scope.settings.geojsonLayers);
    }]
);
/*jshint strict:false */
/*global angular:false */

angular.module('osm').config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/:mainRelationId', {
        templateUrl: 'partials/main.html',
        controller: 'LineRelationController'
    });
}]);

angular.module('osm.controllers').controller('LineRelationController',
    ['$scope', '$q', '$routeParams', '$location', 'settingsService', 'osmService', 'leafletService',
    function($scope, $q, $routeParams, $location, settingsService, osmService, leafletService){
        console.log('init RelationController');
        $scope.settings = settingsService.settings;
        $scope.relationID = $routeParams.mainRelationId;
        $scope.mainRelationId = $routeParams.mainRelationId;
        $scope.masterRelationId = $routeParams.masterRelationId;
        $scope.members = [];
        $scope.tags = [];
        $scope.markers = {};
        $scope.displayedMember = 0;
        $scope.currentNode = '';
        $scope.loading = {};
        $scope.showRelationRow = true;
        var cache = {};

        var getRelationFeatureById = function(id){
            if (cache.source !== $scope.relation){
                var tmp;
                for (var i = 0; i < $scope.relation.features.length; i++) {
                    tmp = $scope.relation.features[i];
                    cache[tmp.id] = tmp;
                }
            }
            if (typeof id === 'string'){
                return cache[parseInt(id, 10)];
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
            $scope.displayedMember = member.ref;
            $scope.currentMember = getRelationFeatureById(member.ref);
            var c = $scope.currentMember.geometry.coordinates;
            if ($scope.currentMember.geometry.type === 'LineString'){
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
                    map.fitBounds(L.latLngBounds(
                        L.latLng(c[0][1], c[0][0]),
                        L.latLng(c[c.length-1][1], c[c.length-1][0])
                    ));
                });
            }else if($scope.currentMember.geometry.type === 'Point'){
                $scope.markers = {
                    start: {
                        id: undefined,
                        icon: startIcon,
                        lng: c[0],
                        lat: c[1],
                        focus: true,
                        draggable: false
                    }
                };
                leafletService.getMap().then(function(map){
                    var zoom = map.getZoom();
                    if (zoom < 15){
                        zoom = 16;
                    }
                    map.setView(L.latLng(c[1], c[0]), zoom);
                });
            }
        };
        var onEachFeature = function(feature, layer) {
            layer.on('click', function () {
                $scope.currentMember = feature;
                $scope.displayedMember = feature.id;
            });
            if (feature.properties){
                var html = '<ul>';
                for (var propertyName in feature.properties) {
                    html += '<li>'+ propertyName + ' : ' + feature.properties[propertyName] + '</li>';
                }
                html += '</ul>';
                layer.bindPopup(html);
            }
        };
        $scope.sortRelationMembers = function(){
            osmService.sortRelationMembers($scope.relation);
            $scope.members = $scope.relation.members;
        };
        //pagination
        $scope.start = 0;
        var bsize = 10;
        $scope.end = $scope.start + bsize;
        $scope.batchMembers = true;
        $scope.toggleBatchMembers = function(){
            if (bsize === $scope.members.length){
                bsize = 10;
                $scope.end = $scope.start + bsize;
            }else{
                bsize = $scope.members.length;
                $scope.start = 0;
                $scope.end = bsize;
            }
        };
        $scope.displayPreviousMembers = function(){
            $scope.end = $scope.start;
            $scope.start = $scope.start - bsize;
        };
        $scope.displayNextMembers = function(){
            $scope.start = $scope.end;
            $scope.end += bsize;
        };
        $scope.hasNextMembers = function(){
            return $scope.end < $scope.members.length;
        };
        $scope.hasPreviousMembers = function(){
            return $scope.start !== 0;
        };
        var isFitWith = function(c1, c2){
            var cc,i,j;
            for (i = 0; i < c1.length; i++) {
                cc = c1[i];
                for (j = 0; j < c2.length; j++) {
                    if (cc[0] === c2[j][0] && cc[1] === c2[j][1]){
                        return true;
                    }
                }
            }
        };
        $scope.fitWithSibling = function(member){
            var index = $scope.members.indexOf(member);
            var current = $scope.relation.features[index];
            if (current === undefined){
                return true;
            }
            if (current.geometry.type === 'Point'){
                return true; //not supported
            }
            var previous,next;
            var fitWithPrevious, fitWithNext;
            if (index > 0){
                previous = $scope.relation.features[index - 1];
                if (previous.geometry.type !== 'LineString'){
                    return true;
                }
                fitWithPrevious = isFitWith(
                    current.geometry.coordinates,
                    previous.geometry.coordinates
                );
            }else{
                fitWithPrevious = true;
            }
            if (index < $scope.members.length - 1){
                next = $scope.relation.features[index + 1];
                if (next.geometry.type !== 'LineString'){
                    return true;
                }
                fitWithNext = isFitWith(
                    current.geometry.coordinates,
                    next.geometry.coordinates
                );
            }else{
                fitWithNext = true;
            }
            return fitWithNext && fitWithPrevious;
        };
        $scope.reverse = function(memberType){
            var isWay = function(element){
                if (element.geometry){
                    return element.geometry.type === 'LineString';
                }else{
                    return element.type === 'way';
                }
            };
            var isNode = function(element){
                if (element.geometry){
                    return element.geometry.type === 'Point';
                }else{
                    return element.type === 'node';
                }
            };
            var ways = $scope.members.filter(isWay);
            var fways = $scope.relation.features.filter(isWay);
            var nodes = $scope.members.filter(isNode);
            var fnodes = $scope.relation.features.filter(isNode);
            if (memberType === 'ways' || memberType === undefined){
                ways.reverse();
                fways.reverse();
            }
            if (memberType === 'node' || memberType === undefined){
                nodes.reverse();
                fnodes.reverse();
            }
            $scope.members = ways.concat(nodes);
            $scope.features = fways.concat(fnodes);
            //how could I sync geojson ?
        };
        $scope.getParentRelations = function(relationType, relationId){
            var deferred = $q.defer();
            var parents = [];
            var url = '/0.6/'+ relationType + '/' + relationId + '/relations';
            osmService.get(url).then(function(data){
                var relations = data.getElementsByTagName('relation');
                for (var i = 0; i < relations.length; i++) {
                    parents.push({
                        type: 'relation',
                        ref: relations[i].getAttribute('id'),
                        name: osmService.getNameFromTags(relations[i])
                    });
                }
                deferred.resolve(parents);
            }, function(error){
                console.error(error);
                deferred.reject(error);
            });
            return deferred.promise;
        };
        $scope.initialize = function(){
            $scope.loggedin = $scope.settings.credentials;
            if ($scope.relationID === undefined){
                $scope.showRelationRow = false;
                return;
            }
            $scope.loading.relation = true;
            $scope.loading.relationsuccess = false;
            $scope.loading.relationerror = false;
            osmService.get('/0.6/relation/' + $scope.relationID + '/full').then(
                function(data){
                    $scope.loading.relation = false;
                    $scope.loading.relationsuccess = true;
                    $scope.loading.relationerror = false;
                    $scope.relationXMLFull = osmService.serialiseXmlToString(data);
                    $scope.relation = osmService.relationXmlToGeoJSON($scope.relationID, data);
                    $scope.members = $scope.relation.members;
                    $scope.howManyTags = Object.keys($scope.relation.properties).length;
                    for (var property in $scope.relation.tags){
                        $scope.tags.push({
                            k: property,
                            v: $scope.relation.tags[property]
                        });
                    }
                    $scope.relation.options.onEachFeature = onEachFeature;
                    leafletService.addGeoJSONLayer(
                        'relation',
                        $scope.relation,
                        $scope.relation.options
                    );
                    $scope.getParentRelations('relation', $scope.relationID)
                        .then(function(parents){
                            $scope.parents = parents;
                        });
                }, function(error){
                    $scope.loading.relation = false;
                    $scope.loading.relationsuccess = false;
                    $scope.loading.relationerror = true;
                    console.error(error);
                }
            );
        };
        $scope.initialize();
    }]
);

/*jshint strict:false */
/*global angular:false */

angular.module('osm.controllers').controller('LoginController',
	['$scope', 'settingsService','osmService', //'flash',
	function($scope, settingsService, osmService){//, flash){
		console.log('init logcontroller');
        $scope.loggedin = osmService.getCredentials();
        $scope.mypassword = '';
        $scope.settings = settingsService.settings;
        $scope.login = function(){
            osmService.setCredentials(
                $scope.settings.username,
                $scope.mypassword
            );
            osmService.validateCredentials().then(function(loggedin){
                $scope.loggedin = loggedin;
                if (!loggedin){
                    //flash('error', 'login failed');
                }else{
                    //persist credentials
                    $scope.settings.credentials = osmService.getCredentials();
                    //flash('login success');
                }
            });
        };
        $scope.logout = function(){
            osmService.clearCredentials();
            $scope.loggedin = false;
        };
        if ($scope.settings.credentials && $scope.settings.username){
            //validate credentials
            osmService.validateCredentials().then(function(loggedin){
                $scope.loggedin = loggedin;
            });
        }

	}]
);

/*jshint strict:false */
/*global angular:false */


angular.module('osm').config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/', {
        templateUrl: 'partials/main.html',
        controller: 'MainRelationController'
    });
    $routeProvider.otherwise({redirectTo: '/'});
}]);

angular.module('osm.controllers').controller('MainRelationController',
	['$scope', '$routeParams', 'settingsService', 'osmService',
	function($scope, $routeParams, settingsService, osmService){
        $scope.settings = settingsService.settings;
        $scope.relationID = $routeParams.mainRelationId;
        $scope.members = [];
        $scope.loading = {};
        var initialize = function(){
            $scope.loggedin = $scope.settings.credentials;
            if ($scope.relationID === undefined){
                return;
            }
            $scope.loading.relation = true;
            $scope.loading.relationsuccess = false;
            $scope.loading.relationerror = false;
            osmService.get('/0.6/relation/' + $scope.relationID + '/full').then(
                function(data){
                    $scope.loading.relation = false;
                    $scope.loading.relationsuccess = true;
                    $scope.loading.relationerror = false;
                    $scope.relation = osmService.relationXmlToGeoJSON($scope.relationID, data);
                    $scope.members = $scope.relation.members;
                }, function(error){
                    $scope.loading.relation = false;
                    $scope.loading.relationsuccess = false;
                    $scope.loading.relationerror = true;
                    console.error(error);
                }
            );
        };
        initialize();
	}]
);

/*jshint strict:false */
/*global angular:false */

angular.module('osm').config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/:mainRelationId/:masterRelationId', {
        templateUrl: 'partials/master.html',
        controller: 'MasterRelationController'
    });
}]);


angular.module('osm.controllers').controller('MasterRelationController',
	['$scope', '$routeParams', 'settingsService', 'osmService',
	function($scope, $routeParams, settingsService, osmService){
        $scope.settings = settingsService.settings;
        $scope.mainRelationId = $routeParams.mainRelationId;
        $scope.masterRelationId = $routeParams.masterRelationId;
        $scope.relationID = $routeParams.masterRelationId;
        $scope.members = [];
        $scope.loading = {};
        
        //initialize
        $scope.loggedin = $scope.settings.credentials;
        if ($scope.relationID === undefined){
            return;
        }
        $scope.loading.relation = true;
        $scope.loading.relationsuccess = false;
        $scope.loading.relationerror = false;
        osmService.get('/0.6/relation/' + $scope.relationID + '/full').then(
            function(data){
                $scope.loading.relation = false;
                $scope.loading.relationsuccess = true;
                $scope.loading.relationerror = false;
                $scope.relation = osmService.relationXmlToGeoJSON($scope.relationID, data);
                $scope.members = $scope.relation.members;
                $scope.tags = $scope.relation.tags;
            }, function(error){
                $scope.loading.relation = false;
                $scope.loading.relationsuccess = false;
                $scope.loading.relationerror = true;
                console.error(error);
            }
        );
	}]
);

/*jshint strict:false */
/*global angular:false */

angular.module('osm').directive('moveMembers', function(){
    return {
        restrict: 'A',
        replace: true,
        templateUrl: 'partials/moveMembers.html'
    };
});

angular.module('osm.controllers').controller('MembersController',
    ['$scope', '$routeParams', '$location', 'settingsService', 'osmService', 'leafletService',
    function($scope, $routeParams, $location, settingsService, osmService, leafletService){
        console.log('init MembersController');
        var moveMember = function(member, from, to) {
            $scope.members.splice(to, 0, $scope.members.splice(from, 1)[0]);
            if (member.type === 'relation'){
                $scope.relation.relations.splice(to, 0, $scope.relation.relations.splice(from, 1)[0]);
            }else{
                $scope.relation.features.splice(to, 0, $scope.relation.features.splice(from, 1)[0]);
            }
        };
        var getIndex = function(member){
            var index = $scope.members.indexOf(member);
            if (index === -1){
                //it is not a member, may be a feature or a relation?
                if (member.type === 'relation'){
                    index = $scope.relation.relations.indexOf(member);
                }else if (member.type === 'Feature'){
                    index = $scope.relation.features.indexOf(member);
                }
            }
            return index;
        };
        $scope.moveMemberUp = function(member){
            var index = getIndex(member);
            moveMember(member, index, index-1);
        };
        $scope.moveMemberDown = function(member){
            var index = getIndex(member);
            moveMember(member, index, index+1);
        };
        $scope.removeMemberFromRelation = function(member){
            var index = getIndex(member);
            $scope.members.splice(index, 1);
            if (member.type !== 'relation'){
                $scope.relation.features.splice(index, 1);
                leafletService.addGeoJSONLayer(
                    'relation',
                    $scope.relation,
                    $scope.relation.options
                );
            }else{
                index = $scope.relation.relations.indexOf(member);
                $scope.relation.relations.splice(index, 1);
            }
        };
        $scope.moveMemberFromIndexToIndex = function(oldIndex, newIndex){
            if (isNaN(oldIndex) || isNaN(newIndex)){
                return;
            }
            var member = $scope.members.splice(oldIndex, 1)[0];
            $scope.members.splice(newIndex, 0, member);
            if (member.type !== 'relation'){
                var feature = $scope.relation.features.splice(oldIndex, 1)[0];
                $scope.relation.features.splice(newIndex, 0, feature);
            }else{
                var relation = $scope.relation.relations.splice(oldIndex, 1)[0];
                $scope.relation.relations.splice(newIndex, 0, relation);
            }
        };
    }]
);
/*jshint strict:false */
/*global angular:false */

angular.module('osm').filter('slice', function() {
    return function(arr, start, end) {
        return (arr || []).slice(start, end);
    };
});
angular.module('osm').filter('reverse', function() {
    return function(items) {
        return items.slice().reverse();
    };
});
angular.module('osm.services').factory('osmService',
    ['$base64', '$http', '$q', 'settingsService',
    function ($base64, $http, $q, settingsService) {
        var parseXml;
        var serializer = new XMLSerializer();
        var API = 'http://api.openstreetmap.org/api';

        if (typeof window.DOMParser !== 'undefined') {
            parseXml = function(xmlStr) {
                return ( new window.DOMParser() ).parseFromString(xmlStr, 'text/xml');
            };
        } else if (typeof window.ActiveXObject !== 'undefined' &&
               new window.ActiveXObject('Microsoft.XMLDOM')) {
            parseXml = function(xmlStr) {
                var xmlDoc = new window.ActiveXObject('Microsoft.XMLDOM');
                xmlDoc.async = 'false';
                xmlDoc.loadXML(xmlStr);
                return xmlDoc;
            };
        } else {
            throw new Error('No XML parser found');
        }

        var service = {
            validateCredentials: function(){
                var deferred = $q.defer();
                this.getUserDetails().then(function(data){
                    var users = data.getElementsByTagName('user');
                    if (users.length > 0){
                        settingsService.settings.userid = users[0].id;
                    }
                    deferred.resolve(users.length > 0);
                }, function(error){
                    deferred.reject(error);
                });
                return deferred.promise;
            },
            setCredentials: function(username, password){
                settingsService.settings.username = username;
                settingsService.settings.credentials = $base64.encode(username + ':' + password);
                console.log(settingsService.settings.credentials);
                return settingsService.settings.credentials;
            },
            getCredentials: function(){
                return settingsService.settings.credentials;
            },
            getAuthorization: function(){
                return 'Basic ' + settingsService.settings.credentials;
            },
            clearCredentials: function () {
                settingsService.settings.credentials = '';
            },
            parseXML: function(data){
                return parseXml(data);
            },
            getAuthenticated: function(method, config){
                if (config === undefined){
                    config = {};
                }
                config.headers = {Authorization: this.getAuthorization()};
                return this.get(method, config);
            },
            get: function(method, config){
                var deferred = $q.defer();
                var self = this;

                $http.get(API + method, config).then(function(data){
                    var contentType = data.headers()['content-type'];
                    var results;
                    if (contentType.indexOf('application/xml;') === 0){
                        results = self.parseXML(data.data);
                    }else if (contentType.indexOf('text/xml;') === 0){
                        results = self.parseXML(data.data);
                    }else{
                        results = data.data;
                    }
                    deferred.resolve(results);
                },function(data) {
                    deferred.reject(data);
                });
                return deferred.promise;
            },
            put: function(method, content, config){
                var deferred = $q.defer();
                var self = this;

                if (config === undefined){
                    config = {};
                }
                config.headers = {Authorization: this.getAuthorization()};
                $http.put(API + method, content, config).then(function(data){
                    var contentType = data.headers()['content-type'];
                    var results;
                    if (contentType.indexOf('application/xml;') === 0){
                        results = self.parseXML(data.data);
                    }else if (contentType.indexOf('text/xml;') === 0){
                        results = self.parseXML(data.data);
                    }else{
                        results = data.data;
                    }
                    deferred.resolve(results);
                },function(data) {
                    deferred.reject(data);
                });
                return deferred.promise;
            },
            overpass: function(query){
                var url = 'http://overpass-api.de/api/interpreter';
                var deferred = $q.defer();
                var self = this;
                var headers = {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'};
                $http.post(
                    url,
                    'data='+encodeURIComponent(query),
                    {headers: headers}
                ).then(function(data){
                    if (typeof data.data === 'object'){
                        deferred.resolve(data.data);
                    }else{
                        deferred.resolve(self.parseXML(data.data));
                    }
                },function(data) {
                    deferred.reject(data);
                });
                return deferred.promise;
            },
            overpassToGeoJSON: function(query, filter){
                var deferred = $q.defer();
                var features = [];
                var relations = [];
                var result = {
                    type: 'FeatureCollection',
                    features: features,
                    relations: relations
                };
                this.overpass(query).then(function(data){
                    //TODO check if data is XML or JSON, here it's JSON
                    var node, feature, properties,coordinates;
                    var cache = {loaded:false};
                    var getNodeById = function(id){
                        if (!cache.loaded){
                            var tmp;
                            for (var i = 0; i < data.elements.length; i++) {
                                tmp = data.elements[i];
                                cache[tmp.id] = tmp;
                            }
                        }
                        return cache[id];
                    };
                    for (var i = 0; i < data.elements.length; i++) {
                        node = data.elements[i];
                        if (node.type === 'node'){
                            feature = {
                                type: 'Feature',
                                properties:node.tags,
                                id: node.id,
                                geometry: {
                                    type:'Point',
                                    coordinates: [node.lon, node.lat]
                                }
                            };
                            if (!filter(feature)){
                                features.push(feature);
                            }
                        }else if (node.type === 'way'){
                            coordinates = [];
                            feature = {
                                type: 'Feature',
                                properties:node.tags,
                                id: node.id,
                                geometry: {
                                    type:'LineString',
                                    coordinates: coordinates
                                }
                            };
                            for (var j = 0; j < node.nodes.length; j++) {
                                coordinates.push([
                                    getNodeById(node.nodes[j]).lon,
                                    getNodeById(node.nodes[j]).lat
                                ]);
                            }
                            if (!filter(feature)){
                                features.push(feature);
                            }
                        }else if (node.type === 'relation'){
                            result.relations.push({
                                ref: node.id,
                                tags: node.tags,
                                type: 'relation',
                                members: node.members
                            });
                        }
                    }
                    deferred.resolve(result);
                }, function(error){
                    deferred.reject(error);
                });
                return deferred.promise;
            },
            getNodesInJSON: function(xmlNodes){
                settingsService.settings.nodes = xmlNodes;
                return osmtogeojson(xmlNodes, {flatProperties: true});
            },
            createChangeset: function(comment){
                var deferred = $q.defer();
                var changeset = '<osm><changeset><tag k="created_by" v="OSM-Relation-Editor"/><tag k="comment" v="';
                changeset += comment + '"/></changeset></osm>';
                this.put('/0.6/changeset/create', changeset).then(function(data){
                    settingsService.settings.changeset = data;
                    deferred.resolve(data);
                });
                return deferred.promise;
            },
            getLastOpenedChangesetId: function(){
                var deferred = $q.defer();
                this.get('/0.6/changesets', {params:{user: settingsService.settings.userid, open: true}}).then(function(data){
                    var changesets = data.getElementsByTagName('changeset');
                    if (changesets.length > 0){
                        settingsService.settings.changeset = changesets[0].id;
                        deferred.resolve(changesets[0].id);
                    }else{
                        deferred.resolve();
                    }
                });
                return deferred.promise;
            },
            closeChangeset: function(){
                var results = this.put('/0.6/changeset/'+ settingsService.settings.changeset +'/close');
                settingsService.settings.changeset = undefined;
                return results;
            },
            getUserDetails: function(){
                return this.getAuthenticated('/0.6/user/details');
            },
            getMap: function(bbox){
                return this.get('/0.6/map?bbox='+bbox);
            },
            updateNode: function(currentNode, updatedNode){
                //we need to do the diff and build the xml
                //first try to find the node by id
                var node = settingsService.settings.nodes.getElementById(currentNode.properties.id);
                var deferred = $q.defer(); //only for errors
                if (node === null){
                    deferred.reject({
                        msg: 'can t find node',
                        currentNode: currentNode,
                        updatedNode: updatedNode,
                        osmNode: node
                    });
                    return deferred.promise;
                }
                var tag;
                node.setAttribute('changeset', settingsService.settings.changeset);
                node.setAttribute('user', settingsService.settings.username);
                while (node.getElementsByTagName('tag')[0]){
                    node.removeChild(node.getElementsByTagName('tag')[0]);
                }
                var osm = document.createElement('osm');
                var value;
                osm.appendChild(node);
                for (var property in updatedNode.properties.tags) {
                    if (updatedNode.properties.tags.hasOwnProperty(property)) {
                        value = updatedNode.properties.tags[property];
                        if (value === undefined){
                            continue;
                        }
                        tag = document.createElement('tag');
                        tag.setAttribute('k', property);
                        tag.setAttribute('v', value);
                        node.appendChild(tag);
                    }
                }
                var nodeType;
                if (updatedNode.geometry.type === 'Polygon'){
                    nodeType = 'way';
                }else if (updatedNode.geometry.type === 'Point'){
                    nodeType = 'node';
                }else if (updatedNode.geometry.type === 'LineString'){
                    nodeType = 'way';
                }else{
                    deferred.reject({
                        msg: 'geojson type not supported',
                        currentNode: currentNode,
                        updatedNode: updatedNode,
                        osmNode: node
                    });
                    return deferred.promise;
                }
                //put request !!
                return this.put('/0.6/' + nodeType + '/' + currentNode.properties.id, osm.outerHTML);
            },
            addNode: function(feature){
                var newNode = '<osm><node changeset="CHANGESET" lat="LAT" lon="LNG">TAGS</node></osm>';
                var tagTPL = '<tag k="KEY" v="VALUE"/>';
                var tags = '';
                var value;
                newNode = newNode.replace('CHANGESET', settingsService.settings.changeset);
                for (var property in feature.osm) {
                    if (feature.osm.hasOwnProperty(property)) {
                        value = feature.osm[property];
                        if (value === undefined || value === null){
                            continue;
                        }else{
                            tags = tags + tagTPL.replace('KEY', property).replace('VALUE', feature.osm[property]);
                        }
                    }
                }
                newNode = newNode.replace('TAGS', tags);
                if (feature.geometry.type === 'Point'){
                    newNode = newNode.replace('LNG', feature.geometry.coordinates[0]);
                    newNode = newNode.replace('LAT', feature.geometry.coordinates[1]);
                }else{
                    throw new Error('Can t save sth else than Point');
                }
                console.log('create new node with ' + newNode);
                return this.put('/0.6/node/create', newNode);
            },
            getMapGeoJSON: function(bbox){
                var self = this;
                var deferred = $q.defer();
                self.getMap(bbox).then(function(xmlNodes){
                    var geojsonNodes = self.getNodesInJSON(xmlNodes);
                    //TODO: load row node (xml)
/*                    var node;
                    for (var i = 0; i < geojsonNodes.length; i++) {
                        node = geojsonNodes[i];
                        node.rawXMLNode = xmlNodes.getElementById(node.id.split('/')[1]);
                    }*/
                    deferred.resolve(geojsonNodes);
                }, function(error){
                    deferred.reject(error);
                });
                return deferred.promise;
            },
            serialiseXmlToString: function(xml){
                return serializer.serializeToString(xml);
            },
            getTagsFromChildren: function(element){
                var children, tags;
                tags = {};
                for (var i = 0; i < element.children.length; i++) {
                    children = element.children[i];
                    if (children.tagName !== 'tag'){
                        continue;
                    }
                    tags[children.getAttribute('k')] = children.getAttribute('v');
                }
                return tags;
            },
            getNameFromTags: function(element){
                var children;
                for (var i = 0; i < element.children.length; i++) {
                    children = element.children[i];
                    if (children.tagName !== 'tag'){
                        continue;
                    }
                    if (children.getAttribute('k') === 'name'){
                        return children.getAttribute('v');
                    }
                }
            },
            relationXmlToGeoJSON: function(relationID, relationXML){
                var self = this;
                var features = [];
                var relations = [];
                var result = {
                    type: 'FeatureCollection',
                    properties: {
                        id: relationID
                    },
                    options: {},
                    members:[],
                    features: features,
                    relations: relations
                };
                var relation = relationXML.getElementById(relationID);
                result.properties.visible = relation.getAttribute('visible');
                result.properties.version = relation.getAttribute('version');
                result.properties.changeset = relation.getAttribute('changeset');
                result.properties.timestamp = relation.getAttribute('timestamp');
                result.properties.user = relation.getAttribute('user');
                result.properties.uid = relation.getAttribute('uid');
                var m, i;
                var child, node, properties, coordinates, feature, member, memberElement, tags;
                for (i = 0; i < relation.children.length; i++) {
                    m = relation.children[i];
                    if (m.tagName === 'member'){
                        //<member type="way" ref="148934766" role=""/>
                        member = {
                            type: m.getAttribute('type'),
                            ref: m.getAttribute('ref'),
                            role: m.getAttribute('role'),
                        };
                        result.members.push(member);
                        //get relationXML for this member
                        memberElement = relationXML.getElementById(m.getAttribute('ref'));
                        /*
                        <way id="148934766" visible="true" version="5" changeset="13626362" timestamp="2012-10-25T11:48:27Z" user="Metacity" uid="160224">
                          <nd ref="1619955810"/>
                          ...
                          <tag k="access" v="yes"/>
                          ...
                        </way>
                         */
                        //get tags -> geojson properties
                        properties = self.getTagsFromChildren(memberElement);
                        member.name = properties.name;
                        if (memberElement.tagName === 'way'){
                            coordinates = [];
                            feature = {
                                type: 'Feature',
                                properties: properties,
                                id: m.getAttribute('ref'),
                                geometry:{
                                    type:'LineString',
                                    coordinates:coordinates
                                }
                            };
                            for (var j = 0; j < memberElement.children.length; j++) {
                                child = memberElement.children[j];
                                if (child.tagName === 'nd'){
                                    node = relationXML.getElementById(child.getAttribute('ref'));
                                    coordinates.push([
                                        parseFloat(node.getAttribute('lon')),
                                        parseFloat(node.getAttribute('lat'))
                                    ]);
                                }
                            }
                            features.push(feature);
                        }else if (memberElement.tagName === 'node'){
                            feature = {
                                type: 'Feature',
                                properties: properties,
                                id: m.getAttribute('ref'),
                                geometry:{
                                    type:'Point',
                                    coordinates:[
                                        parseFloat(memberElement.getAttribute('lon')),
                                        parseFloat(memberElement.getAttribute('lat'))
                                    ]
                                }
                            };
                            features.push(feature);
                        }else if (memberElement.tagName === 'relation'){
                            member.tags = properties;
                        }
                    }
                }
                result.tags = self.getTagsFromChildren(relation);
                if (result.properties.colour !== undefined){
                    result.options.color = result.properties.colour;
                }
                return result;
            },
            relationGeoJSONToXml: function(relationGeoJSON){
                var i;
                var pp = relationGeoJSON.properties;
                var members = relationGeoJSON.members;
                var settings = settingsService.settings;
                var output = '<?xml version="1.0" encoding="UTF-8"?>\n';
                output += '<osm version="0.6" generator="CGImap 0.3.3 (31468 thorn-01.openstreetmap.org)" copyright="OpenStreetMap and contributors" attribution="http://www.openstreetmap.org/copyright" license="http://opendatacommons.org/licenses/odbl/1-0/">\n';
                output += '  <relation id="'+ pp.id + '" visible="' + pp.visible + '" ';
                output += 'version="' + pp.version + '" ';
                output += 'changeset="'+settings.changeset +'" timestamp="' + new Date().toISOString() + '" ';
                output += 'user="' + settings.username + '" uid="' + pp.uid + '">\n';

                for (i = 0; i < members.length; i++) {
                    output += '    <member type="'+ members[i].type +'" ';
                    output += 'ref="'+members[i].ref;
                    //role depends on the type of member
                    if (members[i].type === 'relation'){
                        output += '" role="'+ members[i].role+'"/>\n';
                    }else{
                        output += '" role="'+ members[i].role+'"/>\n';
                    }
                }

                var tags = relationGeoJSON.tags;
                for (var k in tags) {
                    output += '    <tag k="'+ k +'" v="'+ tags[k] +'"/>\n';
                }
                output += '  </relation>\n';
                output += '</osm>';
                return output;
            },
            sortRelationMembers: function(relationGeoJSON){
                //sort members
                var members = relationGeoJSON.members;
                var features = relationGeoJSON.features;
                var sorted = [];
                var f,i,m,j,k;
                var currentFirst, currentLast, first, last;
                var insertBefore = function(item){
                    console.log('insert '+ item.ref + ' before');
                    sorted.splice(0, 0, item);
                };
                var insertAfter = function(item){
                    console.log('insert '+item.ref + ' after');
                    sorted.push(item);
                };
                var getCoordinates = function(i){
                    return features[i].geometry.coordinates;
                };
                var c, cfirst, clast, alreadySorted;
                var foundFirst, foundLast = false;
                for (i = 0; i < members.length; i++) {
                    console.log(i);
                    m = members[i];
                    if (m.type !== 'way'){
                        sorted.push(m);
                        continue;
                    }
                    //check if the member is already in
                    alreadySorted = false;
                    for (k = 0; k < sorted.length; k++) {
                        if (sorted[k].ref === m.ref){
                            alreadySorted = true;
                        }
                    }
                    if (alreadySorted){
                        continue;
                    }
                    if (sorted.length === 0){
                        sorted.push(m);
                        c = getCoordinates(i);
                        cfirst = c[0];
                        clast = c[c.length-1];
                    }
//                    console.log('cfirst ' +cfirst);
//                    console.log('clast '+ clast);
                    foundFirst = foundLast = false;
                    for (j = 0; j < features.length; j++) {
                        f = features[j];
                        if (f.geometry.type !== 'LineString'){
                            continue;
                        }
                        alreadySorted = false;
                        for (k = 0; k < sorted.length; k++) {
                            if (sorted[k].ref === f.id){
                                alreadySorted = true;
                            }
                        }
                        if (alreadySorted){
                            continue;
                        }

                        c = getCoordinates(j);
                        first = c[0];
                        last = c[c.length-1];
                        if (i===0){
                            console.log(m.ref + ' ' + first + ' / ' + last);
                        }
                        if (cfirst[0] === last[0] && cfirst[1] === last[1]){
                            insertBefore(members[j]);
                            cfirst = first;
                            foundFirst = true;
                            continue;
                        }
                        if (clast[0] === first[0] && clast[1] === first[1]){
                            insertAfter(members[j]);
                            clast = last;
                            foundLast = true;
                            continue;
                        }
                        //weird; order of linestring coordinates is not stable
                        if (cfirst[0] === first[0] && cfirst[1] === first[1]){
                            insertBefore(members[j]);
                            cfirst = last;
                            foundFirst = true;
                            continue;
                        }
                        if (clast[0] === last[0] && clast[1] === last[1]){
                            insertAfter(members[j]);
                            clast = first;
                            foundLast = true;
                            continue;
                        }
                    }
                    if (!foundFirst && !foundLast){
                        //cas du rond point ... ?
                        console.log('not found connected ways for '+m.ref);
                        console.log(cfirst);
                        console.log(clast);
                    }
                }
                if (members.length === sorted.length){
                    relationGeoJSON.members = sorted;
                    //Fix orders of features
                    var features = relationGeoJSON.features;
                    var cache = {loaded:false};
                    var getFeatureById = function(id){
                        if (!cache.loaded){
                            for (var i = 0; i < features.length; i++) {
                                cache[features[i].id] = features[i];
                            }
                        }
                        return cache[id];
                    };
                    relationGeoJSON.features = [];
                    for (var i = 0; i < sorted.length; i++) {
                        relationGeoJSON.features.push(getFeatureById(sorted[i].ref));
                    }
                    //feature order fixed
                }else{
                    console.error('can t sort this relation');
                }
            },
            yqlJSON: function(featuresURL){
                var deferred = $q.defer();
                var url, config;
                config = {
                    params: {
                        q: "select * from json where url='" + featuresURL + "';",
                        format: 'json'
                    }
                };
                url = 'http://query.yahooapis.com/v1/public/yql';
                $http.get(url, config).then(
                    function(data){
                        if (data.data.query.results === null){
                            deferred.resolve([]);
                        }else{
                            deferred.resolve(data.data.query.results.json);
                        }
                    }, function(error){
                        deferred.reject(error);
                    });
                return deferred.promise;
            },
            getElementTypeFromFeature: function(feature){
                var gtype = feature.geometry.type;
                if (gtype === 'LineString'){
                    return 'way';
                }else if (gtype === 'Point'){
                    return 'node';
                }else{
                    console.error('not supported type '+gtype);
                }
            }
        };
        return service;
    }
]);

/*jshint strict:false */
/*global angular:false */

angular.module('osm').directive('relationsTable', function(){
    return {
        restrict: 'AE',
        replace: true,
        templateUrl: 'partials/relationsTable.html',
        controller: 'RelationsTableController',
        scope: {
            relations: '=relations'
        }
    };
});
angular.module('osm').directive('openRelationExt', function(){
    return {
        restrict: 'A',
        replace: true,
        templateUrl: 'partials/openRelationExt.html',
        scope: {
            relationId: '='
        }
    };
});

angular.module('osm.controllers').controller('RelationsTableController',
    ['$scope', '$location', function($scope, $location){
        console.log('init RelationsTableController');

        $scope.setCurrentRelation = function(member){
            if (member.type === 'relation'){
                $location.path('/'+member.ref);
            }
        };
    }]
);

/*jshint strict:false */
/*global angular:false */

/*jshint strict:false */
/*global angular:false */

angular.module('osm.controllers').controller('ChangesetController',
    ['$scope', '$routeParams', 'settingsService', 'osmService',
    function($scope, $routeParams, settingsService, osmService){
        console.log('init ChangesetController');
        $scope.settings = settingsService.settings;
        $scope.relationId = $routeParams.lineRelationId || $routeParams.masterRelationId || $routeParams.mainRelationId;
        $scope.comment = 'Working on relation ' + $scope.relationId;
        $scope.createChangeset = function(){
            osmService.createChangeset($scope.comment).then(
                function(data){
                    $scope.settings.changesetID = data;
                }
            );
        };
        $scope.getLastOpenedChangesetId = function(){
            osmService.getLastOpenedChangesetId().then(function(data){
                $scope.settings.changesetID = data;
            }, function(){
                $scope.closeChangeset();
            });
        };
        $scope.closeChangeset = function(){
            osmService.closeChangeset().then(function(){
                $scope.settings.changesetID = undefined;
            });
        };
        //initialize
        if ($scope.settings.changesetID !== '' && $scope.settings.credentials){
            $scope.getLastOpenedChangesetId();
        }
    }]
);

angular.module('osm.controllers').controller('SaveRelationController',
    ['$scope', '$routeParams', 'settingsService', 'osmService',
    function($scope, $routeParams, settingsService, osmService){
        $scope.relationID = $routeParams.lineRelationId ||
        $routeParams.masterRelationId ||
            $routeParams.mainRelationId;
        $scope.loading.saving = false;
        $scope.loading.savingsuccess = false;
        $scope.loading.savingerror = false;
        $scope.saveRelation = function(){
            $scope.loading.saving = true;
            $scope.loading.savingsuccess = false;
            $scope.loading.savingerror = false;
            $scope.relationXMLOutput = $scope.getRelationXML();
            console.log($scope.relationXMLOutput);
            osmService.put('/0.6/relation/'+ $scope.relationID, $scope.relationXMLOutput)
                .then(function(data){
                    $scope.relation.properties.version = data;
                    $scope.loading.saving = false;
                    $scope.loading.savingsuccess = true;
                    $scope.loading.savingerror = false;
                }, function(){
                    $scope.loading.saving = false;
                    $scope.loading.savingsuccess = false;
                    $scope.loading.savingerror = true;
                }
            );
        };
        $scope.getRelationXML = function(){
            return osmService.relationGeoJSONToXml($scope.relation);
        };
        $scope.debug = function(){
            $scope.relationXMLOutput = $scope.getRelationXML();
        };
    }]
);
/*jshint strict:false */
/*global angular:false */

angular.module('osm').directive('searchRelations', function(){
    return {
        restrict: 'A',
        replace: true,
        templateUrl: 'partials/searchRelations.html',
        controller: 'RelationSearchController',
    };
});

angular.module('osm.controllers').controller('RelationSearchController',
    ['$scope', '$q', '$location', 'osmService', 'leafletService',
    function($scope, $q, $location, osmService, leafletService){
        console.log('init RelationSearchController');
        $scope.relations = [];
        $scope.loading = {
            'relations': false,
            'relationssuccess': false,
            'relationserror': false
        };
        $scope.orderBy = 'tags.ref';
        $scope.search = function(){
            var deferred = $q.defer();
            $scope.loading.relations = true;
            $scope.loading.relationssuccess = false;
            $scope.loading.relationserror = false;
            $scope.relations = [];
            var query = '<osm-script output="json" timeout="10"><query type="relation">';
            if ($scope.ref){
                query += '<has-kv k="ref" v="' + $scope.ref + '"/>';
            }
            if ($scope.name){
                query += '<has-kv k="name" regv="' + $scope.name + '"/>';
            }
            if ($scope.state){
                query += '<has-kv k="state" v="' + $scope.state + '"/>';
            }
            if ($scope.bbox){
                var b = $scope.map.getBounds();
                //var bbox = '' + b.getWest() + ',' + b.getSouth() + ',' + b.getEast() + ',' + b.getNorth();
                // s="47.1166" n="47.310" w="-1.7523" e="-1.3718
                var bbox = 'w="' + b.getWest() + '" s="' + b.getSouth() + '" e="' + b.getEast() + '" n="' + b.getNorth() + '"';
                query += '<bbox-query '+ bbox + '/>';
            }
            if ($scope.network){
                query += '<has-kv k="network" regv="' + $scope.network + '"/>';
            }
            if ($scope.operator){
                query += '<has-kv k="operator" regv="' + $scope.operator + '"/>';
            }
            query += '</query><print/></osm-script>';
            console.log('query to overpass: ' + query);
            osmService.overpassToGeoJSON(query).then(function(data){
                $scope.loading.relations = false;
                $scope.loading.relationssuccess = true;
                $scope.loading.relationserror = false;
                $scope.relations = data.relations;
                deferred.resolve($scope.relations);
            }, function(error){
                $scope.loading.relations = false;
                $scope.loading.relationssuccess = false;
                $scope.loading.relationserror = true;
                deferred.reject(error);
            });
            return deferred.promise;
        };
        $scope.addRelation = function(relation){
            $scope.members.splice(0,0, relation);
        };
        $scope.$watch('bbox', function(){
            leafletService.getMap().then(function(map){
                $scope.map = map;
            });
        });
        var search = $location.search();
        $scope.hasSearchParams = false;
        for(var prop in search) {
            if (search.hasOwnProperty(prop)) {
                $scope.hasSearchParams = true;
            }
        }
        if ($scope.hasSearchParams){
            $scope.ref = search.ref;
            $scope.name = search.name;
            $scope.bbox = search.bbox;
            $scope.state = search.state;
            $scope.network = search.network;
            $scope.operator = search.operator;
            $scope.search();
        }
    }]
);

/*jshint strict:false */
/*global angular:false */

angular.module('osm.services').factory('settingsService',
    ['$localStorage', function($localStorage){
        return {
            settings: $localStorage.$default({
                relationSelected: '',
                username: '',
                userid: '',
                credentials: '',
                nodes: [],
                changeset: '',
                changesetID: '',
                osmtags: {},
                osmfilter: [],
                geojsonLayers:[],
                history:[]
            })
        };
    }]
);

/*jshint strict:false */
/*global angular:false */

angular.module('osm').directive('tagsTable', function(){
    return {
        restrict: 'A',
        replace: true,
        templateUrl: 'partials/tagsTable.html',
        controller: 'TagsTableController',
        scope: {
            tags: '='
        }
    };
});

angular.module('osm.controllers').controller('TagsTableController',
    ['$scope', 'settingsService',
    function($scope, settingsService){
        console.log('init TagsTableController');
        $scope.loggedin = settingsService.settings.credentials;
        $scope.newTagKey = '';
        $scope.newTagValue = '';
        $scope.addTag = function(){
            if ($scope.newTagKey && $scope.newTagValue){
                $scope.tags[$scope.newTagKey] = $scope.newTagValue;
            }
        };
        $scope.removeTag = function(key){
            delete $scope.tags[key];
        };
    }]
);
