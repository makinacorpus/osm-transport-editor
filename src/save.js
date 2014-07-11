/*jshint strict:false */
/*global angular:false */

/*jshint strict:false */
/*global angular:false */

angular.module('osm.controllers').controller('ChangesetController',
    ['$scope', '$routeParams', 'settingsService', 'osmService',
    function($scope, $routeParams, settingsService, osmService){
        console.log('init ChangesetController');
        $scope.settings = settingsService.settings;
        $scope.relationId = $routeParams.lineRelationId || $routeParams.masterRelationId || $routeParams.mainRelationId;
        $scope.comment = 'Working on relation ' + $scope.relationId;
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
            }, function(){
                $scope.closeChangeset();
            });
        };
        $scope.closeChangeset = function(){
            osmService.closeChangeset().then(function(){
                $scope.settings.changesetID = undefined;
            });
        };
        //initialize
        if ($scope.settings.changesetID !== '' && $scope.settings.credentials){
            $scope.getLastOpenedChangesetId();
        }
    }]
);

angular.module('osm.controllers').controller('SaveRelationController',
    ['$scope', '$routeParams', 'settingsService', 'osmService',
    function($scope, $routeParams, settingsService, osmService){
        $scope.relationID = $routeParams.lineRelationId ||
        $routeParams.masterRelationId ||
            $routeParams.mainRelationId;
        $scope.loading.saving = false;
        $scope.loading.savingsuccess = false;
        $scope.loading.savingerror = false;
        $scope.saveRelation = function(){
            $scope.loading.saving = true;
            $scope.loading.savingsuccess = false;
            $scope.loading.savingerror = false;
            $scope.relationXMLOutput = osmService.relationGeoJSONToXml($scope.relation);
            console.log($scope.relationXMLOutput);
            osmService.put('/0.6/relation/'+ $scope.relationID, $scope.relationXMLOutput)
                .then(function(data){
                    $scope.relation.properties.version = data;
                    $scope.loading.saving = false;
                    $scope.loading.savingsuccess = true;
                    $scope.loading.savingerror = false;
                }, function(){
                    $scope.loading.saving = false;
                    $scope.loading.savingsuccess = false;
                    $scope.loading.savingerror = true;
                }
            );

        };
    }]
);