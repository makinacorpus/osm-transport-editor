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
        if (search !== undefined){
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
