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
