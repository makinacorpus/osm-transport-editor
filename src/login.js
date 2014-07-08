/*jshint strict:false */
/*global angular:false */

angular.module('osm.controllers').controller('LoginController',
	['$scope', 'settingsService','osmService', //'flash',
	function($scope, settingsService, osmService){//, flash){
		console.log('init logcontroller');
        $scope.loggedin = osmService.getCredentials();
        $scope.mypassword = '';
        $scope.settings = settingsService.settings;
        $scope.login = function(){
            osmService.setCredentials(
                $scope.settings.username,
                $scope.mypassword
            );
            osmService.validateCredentials().then(function(loggedin){
                $scope.loggedin = loggedin;
                if (!loggedin){
                    //flash('error', 'login failed');
                }else{
                    //persist credentials
                    $scope.settings.credentials = osmService.getCredentials();
                    //flash('login success');
                }
            });
        };
        $scope.logout = function(){
            osmService.clearCredentials();
            $scope.loggedin = false;
        };
        if ($scope.settings.credentials && $scope.settings.username){
            //validate credentials
            osmService.validateCredentials().then(function(loggedin){
                $scope.loggedin = loggedin;
            });
        }

	}]
);
