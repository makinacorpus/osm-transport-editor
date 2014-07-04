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