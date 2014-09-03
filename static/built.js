/*jshint strict:false */
/*global angular:false */

'use strict';

// Declare app level module which depends on filters, and services
angular.module('osmTransportEditor', [
    'ngRoute',
    'base64',
//    'flash',
    'leaflet-directive',
    'osm',
    'osmTransportEditor.services',
    'osmTransportEditor.directives',
    'osmTransportEditor.controllers',
    'ui.bootstrap',
    'ui.keypress',
    'ngCookies',
    'ngStorage'
]);

angular.module('osmTransportEditor.controllers', []);
angular.module('osmTransportEditor.services', []);
angular.module('osmTransportEditor.directives', []);


/*jshint strict:false */
/*global angular:false */

angular.module('osmTransportEditor.controllers').controller('DebugController',
	['$scope', function($scope){
		$scope.displayDebugPanel = false;
		$scope.toggleDebugPanel = function(){
			$scope.displayDebugPanel = !$scope.displayDebugPanel;
		};
	}]
);
/*jshint strict:false */
/*global angular:false */

angular.module('osmTransportEditor.services').factory('headerService',
    [function(){
        return {
            title: 'OSM Transport Editor'
        };
    }]
);

angular.module('osmTransportEditor.controllers').controller('HeaderController',
    ['$scope', 'headerService', function($scope, headerService){
        $scope.title = headerService.title;
        $scope.$watch(function(){
            if (headerService.title !== $scope.title){
                $scope.title = headerService.title;
            }
        });
    }]
);


/*jshint strict:false */
/*global angular:false */
/*global L:false */
L.Icon.Default.imagePath = 'images/';

angular.module('osmTransportEditor.services').factory('leafletService',
    ['$q', 'leafletData', 'osmAPI',
    function($q, leafletData, osmAPI){
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
                var addGeoJSONLayer = function(uri){
                    osmAPI.yqlJSON(uri).then(function(geojson){
                        console.log('add layer'+uri);
                        self.addGeoJSONLayer(uri, geojson, {onEachFeature: onEachFeature});
                    });
                };
                for (var i = 0; i < uris.length; i++) {
                    addGeoJSONLayer(uris[i]);
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

angular.module('osmTransportEditor.controllers').controller('LeafletController',
    ['$scope', '$q', 'leafletService', 'osmAPI', 'settingsService', 'overpassAPI',
    function($scope, $q, leafletService, osmAPI, settingsService, overpassAPI){
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
            layer.on('click', function () {
                $scope.currentNode = feature;
                //load relation that node is member of
                if (feature.id !== undefined){
                    $scope.getParentRelations(
                        osmAPI.getElementTypeFromFeature(feature),
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
            overpassAPI.overpassToGeoJSON(query, filter).then(function(geojson){
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
                osmAPI.getMapGeoJSON(bbox).then(function(nodes){
                    $scope.nodes = nodes;
                    var feature, newFeatures = [];
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
                        pointToLayer: pointToLayer
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
            map.on('zoomend', function(){
                $scope.zoomLevel = map.getZoom();
            });
        });
        leafletService.loadExternalLayers($scope.settings.geojsonLayers);
    }]
);
/*jshint strict:false */
/*global angular:false */
/*global L:false */

angular.module('osmTransportEditor').config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/:mainRelationId', {
        templateUrl: 'partials/main.html',
        controller: 'LineRelationController'
    });
}]);

angular.module('osmTransportEditor.controllers').controller('LineRelationController',
    ['$scope', '$q', '$routeParams', '$location', 'settingsService', 'osmAPI', 'leafletService', 'headerService',
    function($scope, $q, $routeParams, $location, settingsService, osmAPI, leafletService, headerService){
        console.log('init RelationController');
        $scope.settings = settingsService.settings;
        $scope.relationID = $routeParams.mainRelationId;
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
            osmAPI.sortRelationMembers($scope.relation);
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
            osmAPI.get(url).then(function(data){
                var relations = data.getElementsByTagName('relation');
                for (var i = 0; i < relations.length; i++) {
                    parents.push({
                        type: 'relation',
                        ref: relations[i].getAttribute('id'),
                        name: osmAPI.getNameFromTags(relations[i])
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
            var url = '/0.6/relation/' + $scope.relationID + '/full';
            osmAPI.get(url).then(function(relationXML){
                $scope.loading.relation = false;
                $scope.loading.relationsuccess = true;
                $scope.loading.relationerror = false;
                $scope.relationXMLFull = osmAPI.serialiseXmlToString(relationXML);
                $scope.relation = osmAPI.relationXmlToGeoJSON($scope.relationID, relationXML);
                $scope.members = $scope.relation.members;
                $scope.howManyTags = Object.keys($scope.relation.properties).length;
                for (var property in $scope.relation.tags){
                    $scope.tags.push({
                        k: property,
                        v: $scope.relation.tags[property]
                    });
                }
                $scope.relation.options.onEachFeature = onEachFeature;
                $scope.relation.options.style = {};
                if ($scope.relation.tags.colour !== undefined){
                    $scope.relation.options.style.color = $scope.relation.tags.colour;
                }
                leafletService.addGeoJSONLayer(
                    'relation',
                    $scope.relation,
                    $scope.relation.options
                );
                $scope.getParentRelations('relation', $scope.relationID)
                    .then(function(parents){
                        $scope.parents = parents;
                    });
                headerService.title = $scope.relation.tags.name;
            }, function(error){
                $scope.loading.relation = false;
                $scope.loading.relationsuccess = false;
                $scope.loading.relationerror = true;
                console.error(error);
            });
        };
        $scope.initialize();
    }]
);

/*jshint strict:false */
/*global angular:false */

angular.module('osmTransportEditor.controllers').controller('LoginController',
	['$scope', 'osmSettingsService','osmAPI', //'flash',
	function($scope, osmSettingsService, osmAPI){//, flash){
		console.log('init logcontroller');
        $scope.loggedin = osmAPI.getCredentials();
        $scope.mypassword = '';
        $scope.username = osmSettingsService.getUserName();
        $scope.loading = {
            login: {loading:false, ok:false, ko:false}
        };
        $scope.login = function(){
            $scope.loading.login.loading = true;
            $scope.loading.login.ok = false;
            $scope.loading.login.ko = false;
            osmAPI.setCredentials(
                $scope.username,
                $scope.mypassword
            );
            osmAPI.validateCredentials().then(function(loggedin){
                $scope.loggedin = loggedin;
                if (!loggedin){
                    $scope.loading.login.loading = false;
                    $scope.loading.login.ok = false;
                    $scope.loading.login.ko = true;
                }else{
                    $scope.loading.login.loading = false;
                    $scope.loading.login.ok = true;
                    $scope.loading.login.ko = false;
                    osmSettingsService.setCredentials(osmAPI.getCredentials());
                    //flash('login success');
                }
            });
        };
        $scope.logout = function(){
            osmAPI.clearCredentials();
            $scope.loggedin = false;
        };
        if (osmSettingsService.getCredentials() && osmSettingsService.getUserName()){
            //validate credentials
            osmAPI.validateCredentials().then(function(loggedin){
                $scope.loggedin = loggedin;
            });
        }
	}]
);

/*jshint strict:false */
/*global angular:false */


angular.module('osmTransportEditor').config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/', {
        templateUrl: 'partials/main.html',
        controller: 'MainRelationController'
    });
    $routeProvider.otherwise({redirectTo: '/'});
}]);

angular.module('osmTransportEditor.controllers').controller('MainRelationController',
	['$scope', '$routeParams', 'settingsService', 'osmAPI',
	function($scope, $routeParams, settingsService, osmAPI){
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
            osmAPI.get('/0.6/relation/' + $scope.relationID + '/full').then(
                function(data){
                    $scope.loading.relation = false;
                    $scope.loading.relationsuccess = true;
                    $scope.loading.relationerror = false;
                    $scope.relation = osmAPI.relationXmlToGeoJSON($scope.relationID, data);
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

angular.module('osmTransportEditor').config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/:mainRelationId/:masterRelationId', {
        templateUrl: 'partials/master.html',
        controller: 'MasterRelationController'
    });
}]);


angular.module('osmTransportEditor.controllers').controller('MasterRelationController',
	['$scope', '$routeParams', 'settingsService', 'osmAPI',
	function($scope, $routeParams, settingsService, osmAPI){
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
        osmAPI.get('/0.6/relation/' + $scope.relationID + '/full').then(
            function(data){
                $scope.loading.relation = false;
                $scope.loading.relationsuccess = true;
                $scope.loading.relationerror = false;
                $scope.relation = osmAPI.relationXmlToGeoJSON($scope.relationID, data);
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

angular.module('osmTransportEditor').directive('moveMembers', function(){
    return {
        restrict: 'A',
        replace: true,
        templateUrl: 'partials/moveMembers.html'
    };
});

angular.module('osmTransportEditor.controllers').controller('MembersController',
    ['$scope', '$routeParams', '$location', 'settingsService', 'osmAPI', 'leafletService',
    function($scope, $routeParams, $location, settingsService, osmAPI, leafletService){
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
/*global osmtogeojson:false */

angular.module('osmTransportEditor').filter('slice', function() {
    return function(arr, start, end) {
        return (arr || []).slice(start, end);
    };
});
angular.module('osmTransportEditor').filter('reverse', function() {
    return function(items) {
        return items.slice().reverse();
    };
});

/*jshint strict:false */
/*global angular:false */

angular.module('osmTransportEditor').directive('relationsTable', function(){
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
angular.module('osmTransportEditor').directive('openRelationExt', function(){
    return {
        restrict: 'A',
        replace: true,
        templateUrl: 'partials/openRelationExt.html',
        scope: {
            relationId: '='
        }
    };
});

angular.module('osmTransportEditor.controllers').controller('RelationsTableController',
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

angular.module('osmTransportEditor.controllers').controller('ChangesetController',
    ['$scope', '$routeParams', 'osmSettingsService', 'osmAPI',
    function($scope, $routeParams, osmSettingsService, osmAPI){
        console.log('init ChangesetController');
        $scope.relationId = $routeParams.lineRelationId || $routeParams.masterRelationId || $routeParams.mainRelationId;
        $scope.comment = 'Working on relation ' + $scope.relationId;
        $scope.changesetID = osmSettingsService.getChangeset();
        $scope.createChangeset = function(){
            return osmAPI.createChangeset($scope.comment);
        };
        $scope.getLastOpenedChangesetId = function(){
            return osmAPI.getLastOpenedChangesetId();
        };
        $scope.closeChangeset = function(){
            osmAPI.closeChangeset();
        };
        //initialize
        if (osmSettingsService.getChangeset() !== '' && osmSettingsService.getCredentials()){
            $scope.getLastOpenedChangesetId();
        }
        $scope.$watch(function(){
            if ($scope.changesetID !== osmSettingsService.getChangeset()){
                $scope.changesetID = osmSettingsService.getChangeset();
                return $scope.changetsetID;
            }
        });
    }]
);

angular.module('osmTransportEditor.controllers').controller('SaveRelationController',
    ['$scope', '$routeParams', 'osmSettingsService', 'osmAPI',
    function($scope, $routeParams, osmSettingsService, osmAPI){
        $scope.relationID = $routeParams.lineRelationId ||
        $routeParams.masterRelationId ||
            $routeParams.mainRelationId;
        $scope.loading.saving = false;
        $scope.loading.savingsuccess = false;
        $scope.loading.savingerror = false;
        $scope.deleteConfirmation = false;
        $scope.saveRelation = function(){
            $scope.loading.saving = true;
            $scope.loading.savingsuccess = false;
            $scope.loading.savingerror = false;
            $scope.relationXMLOutput = $scope.getRelationXML();
            console.log($scope.relationXMLOutput);
            osmAPI.put('/0.6/relation/'+ $scope.relationID, $scope.relationXMLOutput)
                .then(function(data){
                    $scope.relation.properties.version = data;
                    $scope.loading.saving = false;
                    $scope.loading.savingsuccess = true;
                    $scope.loading.savingerror = false;
                }, function(error){
                    $scope.saveRelationError = error;
                    $scope.loading.saving = false;
                    $scope.loading.savingsuccess = false;
                    $scope.loading.savingerror = true;
                }
            );
        };
        $scope.getRelationXML = function(){
            return osmAPI.relationGeoJSONToXml($scope.relation);
        };
        $scope.debug = function(){
            $scope.relationXMLOutput = $scope.getRelationXML();
        };
        $scope.deleteRelation = function(){
            if (!$scope.deleteConfirmation){
                $scope.deleteConfirmation = true;
                return;
            }
            $scope.loading.delete = true;
            $scope.loading.deleteOK = false;
            $scope.loading.deleteKO = false;
            if ($scope.repeatRelationId !== $scope.relationID){
                $scope.repeatRelationId = undefined;
                $scope.loading.deleteKO = true;
                $scope.loading.delete = false;
                return;
            }
            $scope.loading.deleteOK = false;
            $scope.loading.deleteKO = false;
            $scope.relationXMLOutput = $scope.getRelationXML();
            var config = {data:$scope.relationXMLOutput};
            osmAPI.delete('/0.6/relation/'+ $scope.relationID, config)
                .then(function(data){
                    $scope.relation.properties.version = data;
                    $scope.loading.delete = false;
                    $scope.loading.deleteOK = true;
                    $scope.loading.deleteKO = false;
                }, function(error){
                    $scope.deleteError = error;
                    $scope.loading.delete = false;
                    $scope.loading.deleteOK = false;
                    $scope.loading.deleteKO = true;
                }
            );
        };
    }]
);

/*jshint strict:false */
/*global angular:false */

angular.module('osmTransportEditor').directive('searchRelations', function(){
    return {
        restrict: 'A',
        replace: true,
        templateUrl: 'partials/searchRelations.html',
        controller: 'RelationSearchController',
    };
});

angular.module('osmTransportEditor.controllers').controller('RelationSearchController',
    ['$scope', '$q', '$location', 'osmAPI', 'overpassAPI', 'leafletService', 'headerService',
    function($scope, $q, $location, osmAPI, overpassAPI, leafletService, headerService){
        console.log('init RelationSearchController');
        $scope.relations = [];
        $scope.loading = {
            'relations': false,
            'relationssuccess': false,
            'relationserror': false
        };
        $scope.orderBy = 'tags.ref';
        $scope.search = function(){
            headerService.title = 'Search: ';
            var deferred = $q.defer();
            $scope.loading.relations = true;
            $scope.loading.relationssuccess = false;
            $scope.loading.relationserror = false;
            $scope.relations = [];
            var query = '<osm-script output="json" timeout="10"><query type="relation">';
            if ($scope.operator){
                query += '<has-kv k="operator" regv="' + $scope.operator + '"/>';
                headerService.title += ' ' + $scope.operator;
            }
            if ($scope.network){
                query += '<has-kv k="network" regv="' + $scope.network + '"/>';
                headerService.title += ' ' + $scope.network;
            }
            if ($scope.ref){
                query += '<has-kv k="ref" v="' + $scope.ref + '"/>';
                headerService.title += ' ' + $scope.ref;
            }
            if ($scope.name){
                query += '<has-kv k="name" regv="' + $scope.name + '"/>';
                headerService.title += ' ' + $scope.name;
            }
            if ($scope.state){
                query += '<has-kv k="state" v="' + $scope.state + '"/>';
                headerService.title += ' ' + $scope.state;
            }
            if ($scope.bbox){
                var b = $scope.map.getBounds();
                //var bbox = '' + b.getWest() + ',' + b.getSouth() + ',' + b.getEast() + ',' + b.getNorth();
                // s="47.1166" n="47.310" w="-1.7523" e="-1.3718
                var bbox = 'w="' + b.getWest() + '" s="' + b.getSouth() + '" e="' + b.getEast() + '" n="' + b.getNorth() + '"';
                query += '<bbox-query '+ bbox + '/>';
            }
            query += '</query><print/></osm-script>';
            console.log('query to overpass: ' + query);
            overpassAPI.overpassToGeoJSON(query).then(function(data){
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
        $scope.setSearchParams = function(){
            $location.search('ref', $scope.ref);
            $location.search('name', $scope.name);
            $location.search('bbox', $scope.bbox);
            $location.search('state', $scope.state);
            $location.search('network', $scope.network);
            $location.search('operator', $scope.operator);
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

angular.module('osmTransportEditor.services').factory('settingsService',
    ['$localStorage', function($localStorage){
        return {
            settings: $localStorage.$default({
                relationSelected: '',
                changesetID: '',
                osmtags: {},
                geojsonLayers:[],
                history:[]
            })
        };
    }]
);

/*jshint strict:false */
/*global angular:false */

angular.module('osmTransportEditor').directive('tagsTable', function(){
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

angular.module('osmTransportEditor.controllers').controller('TagsTableController',
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
