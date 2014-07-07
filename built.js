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
/*global L:false */
L.Icon.Default.imagePath = 'images/';

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
        $scope.removeOverpassLayer = function(){
            leafletService.getMap().then(function(map){
                if ($scope.overpassLayer !== undefined){
                    map.removeLayer($scope.overpassLayer);
                }
                $scope.overpassLayer = undefined;
            });
        };
        $scope.overpassToLayer = function(query, filter){
            osmService.overpassToGeoJSON(query, filter).then(function(geojson){
                leafletService.getMap().then(function(map){
                    if ($scope.overpassLayer !== undefined){
                        map.removeLayer($scope.overpassLayer);
                    }
                    $scope.overpassLayer = L.geoJson(geojson, osmGEOJSONOptions);
                    $scope.overpassLayer.addTo(map);
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
        $scope.addNodeToRelation = function(){
            
            var features = $scope.relationGeoJSON.features;
            features.push($scope.currentNode);
            $scope.members.push({
                type: $scope.currentNode.geometry.type === 'LineString' ? 'way' : 'node',
                ref: $scope.currentNode.id,
                role: ''
            });
            leafletService.addGeoJSONLayer(
                'relation',
                $scope.relationGeoJSON,
                $scope.relationGeoJSON.options
            );

        };
        //bind events
        $scope.$on("leafletDirectiveMap.geojsonClick", function(ev, featureSelected) {
            $scope.currentNode = featureSelected;
        });
        leafletService.getMap().then(function(map){
            map.on('zoomend', function(e){
                $scope.zoomLevel = map.getZoom();
            });
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
                $http.put(settingsService.settings.API + method, content, config).then(function(data){
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
                    properties: {
                        id: relationID
                    },
                    options: {},
                    features: features
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
                    output += 'ref="'+members[i].ref +'" role="'+ members[i].role+'"/>\n';
                }

                var tags = relationGeoJSON.tags;
                for (i = 0; i < tags.length; i++) {
                    output += '    <tag k="'+ tags[i].k +'" v="'+tags[i].v +'"/>\n';
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
                        console.log('not found connected ways for '+m.ref);
                        console.log(cfirst);
                        console.log(clast);
                    }
                }
                if (members.length === sorted.length){
                    relationGeoJSON.members = sorted;
                }else{
                    console.error('can t sort this relation');
                }
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
        $scope.relationDOM; //XML DOM data receive from OSM;
        $scope.members = [];
        $scope.tags = [];
        $scope.markers = {};
        $scope.displayedMember = 0;
        $scope.currentNode = '';
        $scope.setCurrentRelation = function(member){
            if (member.type === 'relation'){
                $location.path('/relation/'+member.ref);
            }
        };
        var moveMember = function(from, to) {
            $scope.members.splice(to, 0, $scope.members.splice(from, 1)[0]);
        };
        $scope.moveMemberUp = function(member){
            var index = $scope.members.indexOf(member);
            moveMember(index, index-1);
        };
        $scope.moveMemberDown = function(member){
            var index = $scope.members.indexOf(member);
            moveMember(index, index+1);
        };
        $scope.removeMemberFromRelation = function(member){
            var index = $scope.relationGeoJSON.features.indexOf(member);
            $scope.relationGeoJSON.features.splice(index, 1);
            $scope.members.splice(index, 1);
            //FIX: redraw the map ?
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
            $scope.displayedMember = member.ref;
            $scope.currentMember = getRelationFeatureById(member.ref);
            var center = [];
            var c = $scope.currentMember.geometry.coordinates;
            if ($scope.currentMember.geometry.type === 'LineString'){
                center = [c[0][1], c[0][0]];
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
            }else if($scope.currentMember.geometry.type === 'Point'){
                center = [c[1], c[0]];
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
            }
            leafletService.getMap().then(function(map){
                var zoom = map.getZoom();
                if (zoom < 17){
                    zoom = 17;
                }
                map.setView(L.latLng(center[0], center[1]), zoom);
            });
        };
        var onEachFeature = function(feature, layer) {
            layer.on('click', function (e) {
                $scope.currentMember = feature;
                $scope.displayedMember = feature.id;
            });
        };
        $scope.saveRelation = function(){
            $scope.relationXMLOutput = osmService.relationGeoJSONToXml($scope.relationGeoJSON);
            osmService.put('/0.6/relation/'+ $scope.relationID, $scope.relationXMLOutput)
                .then(function(data){
                    debugger;
                }
            );
        };
        $scope.sortRelationMembers = function(){
            osmService.sortRelationMembers($scope.relationGeoJSON);
            $scope.members = $scope.relationGeoJSON.members;
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
                        'relation',
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
	['$scope', '$routeParams', 'settingsService', 'osmService',
	function($scope, $routeParams, settingsService, osmService){
		console.log('init SettingsController');
        $scope.settings = settingsService.settings;
        $scope.comment = 'Working on relation '+$routeParams.relationid;
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
            });
        };
        $scope.closeChangeset = function(){
            osmService.closeChangeset().then(
                function(){
                    $scope.settings.changesetID = undefined;
                }
            );

        };
        if ($scope.settings.credentials && $scope.settings.username){
            //validate credentials
            osmService._credentials = $scope.settings.credentials;
            osmService._login = $scope.settings.username;
            osmService.validateCredentials().then(function(loggedin){
                $scope.loggedin = loggedin;
                if ($scope.settings.changesetID !== ''){
                    $scope.getLastOpenedChangesetId();
                }
            });
        }

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