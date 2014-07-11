/*jshint strict:false */
/*global angular:false */
/*global L:false */

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
