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

angular.module('osm.controllers').controller('RelationsTableController',
    ['$scope', '$routeParams', '$location', 'osmService',
    function($scope, $routeParams, $location, osmService){
        console.log('init RelationsTableController');
        $scope.setCurrentRelation = function(member){
            if (member.type === 'relation'){
                $location.path('/relation/'+member.ref);
            }
        };
    }]
);


angular.module('osm.controllers').controller('RelationController',
    ['$scope', '$routeParams', '$location', 'settingsService', 'osmService', 'leafletService',
    function($scope, $routeParams, $location, settingsService, osmService, leafletService){
        console.log('init RelationController');
        $scope.settings = settingsService.settings;
        $scope.relationID = $routeParams.relationid;
        $scope.members = [];
        $scope.tags = [];
        $scope.markers = {};
        $scope.displayedMember = 0;
        $scope.currentNode = '';
        $scope.loading = {};
        $scope.setCurrentRelation = function(member){
            if (member.type === 'relation'){
                $location.path('/relation/'+member.ref);
            }
        };
        var moveMember = function(from, to) {
            $scope.members.splice(to, 0, $scope.members.splice(from, 1)[0]);
            $scope.relationGeoJSON.features.splice(to, 0, $scope.relationGeoJSON.features.splice(from, 1)[0]);
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
            var index = $scope.members.indexOf(member);
            $scope.members.splice(index, 1);
            $scope.relationGeoJSON.features.splice(index, 1);
            leafletService.addGeoJSONLayer(
                'relation',
                $scope.relationGeoJSON,
                $scope.relationGeoJSON.options
            );
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
        $scope.loading.saving = false;
        $scope.loading.savingsuccess = false;
        $scope.loading.savingerror = false;
        $scope.saveRelation = function(){
            $scope.loading.saving = true;
            $scope.loading.savingsuccess = false;
            $scope.loading.savingerror = false;
            $scope.relationXMLOutput = osmService.relationGeoJSONToXml($scope.relationGeoJSON);
            osmService.put('/0.6/relation/'+ $scope.relationID, $scope.relationXMLOutput)
                .then(function(data){
                    $scope.relationGeoJSON.properties.version = data;
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
        $scope.sortRelationMembers = function(){
            osmService.sortRelationMembers($scope.relationGeoJSON);
            $scope.members = $scope.relationGeoJSON.members;
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
        $scope.moveMemberFromIndexToIndex = function(oldIndex, newIndex){
            if (isNaN(oldIndex) || isNaN(newIndex)){
                return;
            }
            var member = $scope.members.splice(oldIndex, 1)[0];
            $scope.members.splice(newIndex, 0, member);
        };
        $scope.addRelationToHistory = function(){
            var found = false;
            for (var i = 0; i < $scope.settings.history.length; i++) {
                if ($scope.settings.history[i].ref === $scope.relationID){
                    found = true;
                }
            }
            if (!found){
                $scope.settings.history.push({
                    ref:$scope.relationID,
                    name:$scope.relationName
                });
            }
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
            var current = $scope.relationGeoJSON.features[index];
            if (current.geometry.type === 'Point'){
                return true; //not supported
            }
            var previous,next;
            var fitWithPrevious, fitWithNext;
            if (index > 0){
                previous = $scope.relationGeoJSON.features[index - 1];
                if (previous.geometry.type !== 'LineString'){
                    return false;
                }
                fitWithPrevious = isFitWith(
                    current.geometry.coordinates,
                    previous.geometry.coordinates
                );
            }else{
                fitWithPrevious = true;
            }
            if (index < $scope.members.length - 1){
                next = $scope.relationGeoJSON.features[index + 1];
                if (next.geometry.type !== 'LineString'){
                    return false;
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
                    $scope.relationGeoJSON = osmService.relationXmlToGeoJSON($scope.relationID, data);
                    $scope.members = $scope.relationGeoJSON.members;
                    $scope.tags = $scope.relationGeoJSON.tags;
                    for (var i = 0; i < $scope.relationGeoJSON.tags.length; i++) {
                        if ($scope.relationGeoJSON.tags[i].k === 'name'){
                            $scope.relationName = $scope.relationGeoJSON.tags[i].v;
                            break;
                        }
                    }
                    $scope.addRelationToHistory();
                    $scope.relationGeoJSON.options.onEachFeature = onEachFeature;
                    leafletService.addGeoJSONLayer(
                        'relation',
                        $scope.relationGeoJSON,
                        $scope.relationGeoJSON.options
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
angular.module('osm.controllers').controller('RelationSearchController',
    ['$scope', '$q', 'osmService', 'leafletService',
    function($scope, $q, osmService, leafletService){
        console.log('init RelationSearchController');
        var deferred = $q.defer();
        $scope.pattern = '';
        $scope.relations = [];
        $scope.loading = {
            'relations': false,
            'relationssuccess': false,
            'relationserror': false
        };
        $scope.search = function(){
            $scope.loading.relations = true;
            $scope.loading.relationssuccess = false;
            $scope.loading.relationserror = false;
            $scope.relations = [];
            leafletService.getMap().then(function(map){
                var b = map.getBounds();
                //var bbox = '' + b.getWest() + ',' + b.getSouth() + ',' + b.getEast() + ',' + b.getNorth();
                // s="47.1166" n="47.310" w="-1.7523" e="-1.3718
                var bbox = 'w="' + b.getWest() + '" s="' + b.getSouth() + '" e="' + b.getEast() + '" n="' + b.getNorth() + '"';
                var query = '<osm-script><query type="relation">';
                query += '<bbox-query '+ bbox + '/>';
                query += '<has-kv k="name" regv="'+ $scope.pattern + '"/>';
                query += '<has-kv k="operator" v="SEMITAN"/>';
                query += '</query><print/></osm-script>';
                osmService.overpass(query).then(function(data){
                    var relations = data.getElementsByTagName('relation');
                    var tags = [];
                    var name;
                    var length = relations.length;
                    if(length > 20){
                        length = 20;
                    }
                    for (var i = 0; i < length; i++) {
                        tags = osmService.getTagsFromChildren(relations[i]);
                        for (var j = 0; j < tags.length; j++) {
                            if(tags[j].k === 'name'){
                                name = tags[j].v;
                                console.log('find '+name);
                                break;
                            }
                        }
                        $scope.relations.push({
                            ref: relations[i].getAttribute('id'),
                            type:'relation',
                            role:'',
                            name: name
                        });
                    }
                    $scope.loading.relations = false;
                    $scope.loading.relationssuccess = true;
                    $scope.loading.relationserror = false;
                    deferred.resolve($scope.relations);
                }, function(error){
                    $scope.loading.relations = false;
                    $scope.loading.relationssuccess = false;
                    $scope.loading.relationserror = true;
                    deferred.reject(error);
                });
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
    }]
);

angular.module('osm.controllers').controller('ParentsRelationsController',
    ['$scope', '$routeParams', 'osmService',
    function($scope, $routeParams, osmService){
        $scope.parents = [];
        if ($routeParams.relationid === undefined){
            return;
        }
        osmService.get('/0.6/relation/' + $routeParams.relationid + '/relations')
            .then(function(data){
                var relations = data.getElementsByTagName('relation');
                for (var i = 0; i < relations.length; i++) {
                    $scope.parents.push({
                        type: 'relation',
                        ref: relations[i].getAttribute('id'),
                        name: osmService.getNameFromTags(relations[i])
                    });
                }
            }, function(){});
    }]
);