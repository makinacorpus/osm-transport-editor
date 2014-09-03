/*jshint strict:false */
/*global angular:false */

angular.module('osmTransportEditor.controllers').controller('LoginController',
	['$scope', 'osmSettingsService','osmAPI', //'flash',
	function($scope, osmSettingsService, osmAPI){//, flash){
		console.log('init logcontroller');
        $scope.loggedin = osmAPI.getCredentials();
        $scope.mypassword = '';
        $scope.username = osmSettingsService.getUserName();
        $scope.loading = {
            login: {loading:false, ok:false, ko:false}
        };
        $scope.login = function(){
            $scope.loading.login.loading = true;
            $scope.loading.login.ok = false;
            $scope.loading.login.ko = false;
            osmAPI.setCredentials(
                $scope.username,
                $scope.mypassword
            );
            osmAPI.validateCredentials().then(function(loggedin){
                $scope.loggedin = loggedin;
                if (!loggedin){
                    $scope.loading.login.loading = false;
                    $scope.loading.login.ok = false;
                    $scope.loading.login.ko = true;
                }else{
                    $scope.loading.login.loading = false;
                    $scope.loading.login.ok = true;
                    $scope.loading.login.ko = false;
                    osmSettingsService.setCredentials(osmAPI.getCredentials());
                    //flash('login success');
                }
            });
        };
        $scope.logout = function(){
            osmAPI.clearCredentials();
            $scope.loggedin = false;
        };
        if (osmSettingsService.getCredentials() && osmSettingsService.getUserName()){
            //validate credentials
            osmAPI.validateCredentials().then(function(loggedin){
                $scope.loggedin = loggedin;
            });
        }
	}]
);
