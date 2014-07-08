/*jshint strict:false */
/*global angular:false */

angular.module('osm.controllers').controller('ChangesetController',
	['$scope', '$routeParams', 'settingsService', 'osmService',
	function($scope, $routeParams, settingsService, osmService){
		console.log('init ChangesetController');
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
        var initialize = function(){
            if ($scope.settings.changesetID !== '' && $scope.settings.credentials){
                $scope.getLastOpenedChangesetId();
            }
        };
        initialize();
	}]
);