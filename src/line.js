/*jshint strict:false */
/*global angular:false */

angular.module('osm').config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/:mainRelationId/:masterRelationId/:lineRelationId', {
        templateUrl: 'partials/line.html',
        controller: 'LineRelationController'
    });
}]);

angular.module('osm.controllers').controller('LineRelationController',
    ['$scope', '$routeParams', '$location', 'settingsService', 'osmService', 'leafletService',
    function($scope, $routeParams, $location, settingsService, osmService, leafletService){
        console.log('init RelationController');
        $scope.settings = settingsService.settings;
        $scope.relationID = $routeParams.lineRelationId;
        $scope.mainRelationId = $routeParams.mainRelationId;
        $scope.masterRelationId = $routeParams.masterRelationId;
        $scope.members = [];
        $scope.tags = [];
        $scope.markers = {};
        $scope.displayedMember = 0;
        $scope.currentNode = '';
        $scope.loading = {};
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
        $scope.initialize = function(){
            $scope.loggedin = $scope.settings.credentials;
            if ($scope.relationID === undefined){
                return;
            }
            /*only for debug purpose
            osmService.get('/0.6/relation/' + $scope.relationID).then(function(data){
                $scope.relationDOM = data;
                $scope.relationXML = osmService.serialiseXmlToString(data);
            }, function(error){
                console.error(error);
            });*/
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
