/*jshint strict:false */
/*global angular:false */


angular.module('osm').config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/', {
        templateUrl: 'partials/main.html',
        controller: 'MainRelationController'
    });
    $routeProvider.when('/:mainRelationId', {
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
