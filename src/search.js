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
