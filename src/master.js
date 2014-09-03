/*jshint strict:false */
/*global angular:false */

angular.module('osmTransportEditor').config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/:mainRelationId/:masterRelationId', {
        templateUrl: 'partials/master.html',
        controller: 'MasterRelationController'
    });
}]);


angular.module('osmTransportEditor.controllers').controller('MasterRelationController',
	['$scope', '$routeParams', 'settingsService', 'osmAPI',
	function($scope, $routeParams, settingsService, osmAPI){
        $scope.settings = settingsService.settings;
        $scope.mainRelationId = $routeParams.mainRelationId;
        $scope.masterRelationId = $routeParams.masterRelationId;
        $scope.relationID = $routeParams.masterRelationId;
        $scope.members = [];
        $scope.loading = {};
        
        //initialize
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
                $scope.tags = $scope.relation.tags;
            }, function(error){
                $scope.loading.relation = false;
                $scope.loading.relationsuccess = false;
                $scope.loading.relationerror = true;
                console.error(error);
            }
        );
	}]
);
