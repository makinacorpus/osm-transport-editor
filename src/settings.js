/*jshint strict:false */
/*global angular:false */
/*global L:false */
angular.module('osm.services').factory('settingsService',
    ['$localStorage', function($localStorage){
        return {
            settings: $localStorage.$default({
                relationSelected: '',
                username: '',
                userid: '',
                credentials: '',
                nodes: [],
                changeset: '',
                API: 'http://api.openstreetmap.org/api',
                changesetID: '',
                osmtags: {},
                osmfilter: [],
                preferAdding: false
            })
        };
    }]
);
angular.module('osm.controllers').controller('SettingsController',
	['$scope', 'settingsService',
	function($scope, settingsService){
		console.log('init SettingsController');
        $scope.settings = settingsService.settings;
	}]
);

angular.module('osm.controllers').controller('LoginController',
	['$scope', 'osmService', //'flash',
	function($scope, osmService){//, flash){
		console.log('init logcontroller');
        $scope.loggedin = osmService.getCredentials();
        $scope.mypassword = '';
        $scope.login = function(){
            osmService.setCredentials($scope.settings.username, $scope.mypassword);
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

	}]
);
