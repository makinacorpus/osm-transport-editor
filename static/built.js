/*jshint strict:false */
/*global angular:false */

'use strict';
L.Icon.Default.imagePath = '/images/';


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
/*global L:false */

angular.module('osm.services').factory('leafletService',
    ['leafletData', function(leafletData){
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
                }
            },
            geojsonLayers: [],
            markers: [],
            getMap: function(id){
                return leafletData.getMap(id);
            },
            addGeoJSONLayer: function(geojson, options){
                var layer = L.geoJson(geojson, options);
                this.geojsonLayers.push(geojson);
                leafletData.getMap().then(function(map){
                    if (!map.hasLayer(layer)){
                        layer.addTo(map);
                    }
                });
            }
        };
    }]
);

angular.module('osm.controllers').controller('LeafletController',
    ['$scope', '$q', 'leafletService', 'osmService', 'settingsService',
    function($scope, $q, leafletService, osmService, settingsService){
        $scope.center = leafletService.center;
        $scope.layers = leafletService.layers;
        $scope.geojson = leafletService.geojson;
        var style = function(feature) {
            if (feature.properties === undefined){
                return;
            }
            var tags = feature.properties.tags;
            if (tags === undefined){
                return;
            }
            if (tags.building !== undefined){
                return {
                    fillColor: 'red',
                    weight: 2,
                    opacity: 1,
                    color: 'red',
                    fillOpacity: 0.4
                };
            }
            if (tags.amenity !== undefined){
                if (tags.amenity === 'parking'){
                    return {
                        fillColor: 'blue',
                        weight: 2,
                        opacity: 1,
                        color: 'blue',
                        fillOpacity: 0.4
                    };
                }
            }
        };
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
            layer.on('click', function (e) {
                $scope.currentNode = feature;
            });
        };
        var osmGEOJSONOptions = {
            style : style,
            pointToLayer: pointToLayer,
            onEachFeature: onEachFeature
        };
        var getBBox = function(){
            var deferred = $q.defer();
            leafletService.getMap().then(function(map){
                var b = map.getBounds();
                //var bbox = '' + b.getWest() + ',' + b.getSouth() + ',' + b.getEast() + ',' + b.getNorth();
                // s="47.1166" n="47.310" w="-1.7523" e="-1.3718
                var bbox = 'w="' + b.getWest() + '" s="' + b.getSouth() + '" e="' + b.getEast() + '" n="' + b.getNorth() + '"';
                deferred.resolve(bbox);
            });
            return deferred.promise;
        };
        $scope.overpassToLayer = function(query, filter){
            osmService.overpassToGeoJSON(query, filter).then(function(geojson){
                leafletService.getMap().then(function(map){
                    L.geoJson(geojson).addTo(map);
                });
            });
        };
        $scope.loadOverpassBusStop = function(){
            getBBox().then(function(bbox){
                var filter = function(feature){
                    return feature.geometry.type !== 'Point';
                };
                var query = '<?xml version="1.0" encoding="UTF-8"?>';
                query += '<osm-script output="json" timeout="25"><union>';
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
                $scope.overpassToLayer(query, filter);
            });
        };
        $scope.loadOverpassWays = function(){
            getBBox().then(function(bbox){
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
                $scope.overpassToLayer(query, filter);
            });
        };
        $scope.loadOSMNodes = function(){
            $scope.loadOSMData(function(feature){
                return feature.geometry.type !== 'Point';
            });
        };
        $scope.loadOSMWays = function(){
            $scope.loadOSMData(function(feature){
                return feature.geometry.type !== 'LineString';
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
        $scope.$on("leafletDirectiveMap.geojsonClick", function(ev, featureSelected) {
            $scope.currentNode = featureSelected;
        });
    }]
);
/*jshint strict:false */
/*global angular:false */


angular.module('osm.services').factory('osmService',
    ['$base64', '$http', '$q', 'settingsService',
    function ($base64, $http, $q, settingsService) {
        var parseXml;
        var serializer = new XMLSerializer();

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
                });
                return deferred.promise;
            },
            setCredentials: function(username, password){
                settingsService.settings.username = username;
                settingsService.settings.credentials = $base64.encode(username + ':' + password);
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

                $http.get(settingsService.settings.API + method, config).then(function(data){
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
                $http.put(self.API + method, content, config).then(function(data){
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
                var result = {
                    type: 'FeatureCollection',
                    features:features
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
            createChangeset: function(sourceURI){
                var deferred = $q.defer();
                var changeset = '<osm><changeset><tag k="created_by" v="OSMFusion"/><tag k="comment" v="';
                changeset += 'Import data from ' + sourceURI + '"/></changeset></osm>';
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
                tags = [];
                for (var i = 0; i < element.children.length; i++) {
                    children = element.children[i];
                    if (children.tagName !== 'tag'){
                        continue;
                    }
                    tags.push({
                        k: children.getAttribute('k'),
                        v: children.getAttribute('v')
                    });
                }
                return tags;
            },
            relationXmlToGeoJSON: function(relationID, relationXML){
                var self = this;
                var features = [];
                var result = {
                    type: 'FeatureCollection',
                    tags: [],
                    members:[],
                    options: {},
                    features: features
                };
                var relation = relationXML.getElementById(relationID);
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
                        tags = self.getTagsFromChildren(memberElement);
                        properties = {};
                        for (var k = 0; k < tags.length; k++) {
                            if (tags[k].k === 'name'){
                                member.name = tags[k].v;
                            }
                            properties[tags[k].k] = tags[k].v;
                        }
                        if (memberElement.tagName === 'way'){
                            coordinates = [];
                            feature = {
                                type: 'Feature',
                                properties: properties,
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
                                geometry:{
                                    type:'Point',
                                    coordinates:[
                                        parseFloat(memberElement.getAttribute('lon')),
                                        parseFloat(memberElement.getAttribute('lat'))
                                    ]
                                }
                            };
                            features.push(feature);
                        }
                    }
                }
                result.tags = self.getTagsFromChildren(relation);
                for (var i = 0; i < result.tags.length; i++) {;
                    result.tags[i];
                    if (result.tags[i].k === 'colour'){
                        result.options.color = result.tags[i].v;
                    }else if (result.tags[i].k === 'color'){
                        result.options.color = result.tags[i].v;
                    }
                }
                return result;
            }
        };
        return service;
    }
]);

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
        $scope.members = [];
        $scope.tags = [];
        $scope.setCurrentMember = function(member){
            if (member.type === 'relation'){
                $location.path('/relation/'+member.ref);
            }
        };
        var initialize = function(){
            osmService.get('/0.6/relation/' + $scope.relationID).then(function(data){
                $scope.relationXML = osmService.serialiseXmlToString(data);
            }, function(error){
                console.error(error);
            });
            osmService.get('/0.6/relation/' + $scope.relationID + '/full').then(
                function(data){
                    $scope.relationXMLFull = osmService.serialiseXmlToString(data);
                    var relation = osmService.relationXmlToGeoJSON($scope.relationID, data);
                    $scope.members = relation.members;
                    $scope.tags = relation.tags;
                    leafletService.addGeoJSONLayer(relation, relation.options);
                }, function(error){
                    console.error(error);
                }
            );
        };
        initialize();
    }]
);
/*jshint strict:false */
/*global angular:false */
/*global L:false */
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
                API: 'http://api.openstreetmap.org/api',
                changesetID: '',
                osmtags: {},
                osmfilter: [],
                preferAdding: false
            })
        };
    }]
);
angular.module('osm.controllers').controller('SettingsController',
	['$scope', 'settingsService',
	function($scope, settingsService){
		console.log('init SettingsController');
        $scope.settings = settingsService.settings;
	}]
);

angular.module('osm.controllers').controller('LoginController',
	['$scope', 'osmService', //'flash',
	function($scope, osmService){//, flash){
		console.log('init logcontroller');
        $scope.loggedin = osmService.getCredentials();
        $scope.mypassword = '';
        $scope.login = function(){
            osmService.setCredentials($scope.settings.username, $scope.mypassword);
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

	}]
);
