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
        $scope.deleteConfirmation = false;
        $scope.saveRelation = function(){
            $scope.loading.saving = true;
            $scope.loading.savingsuccess = false;
            $scope.loading.savingerror = false;
            $scope.relationXMLOutput = $scope.getRelationXML();
            console.log($scope.relationXMLOutput);
            osmService.put('/0.6/relation/'+ $scope.relationID, $scope.relationXMLOutput)
                .then(function(data){
                    $scope.relation.properties.version = data;
                    $scope.loading.saving = false;
                    $scope.loading.savingsuccess = true;
                    $scope.loading.savingerror = false;
                }, function(error){
                    $scope.saveRelationError = error;
                    $scope.loading.saving = false;
                    $scope.loading.savingsuccess = false;
                    $scope.loading.savingerror = true;
                }
            );
        };
        $scope.getRelationXML = function(){
            return osmService.relationGeoJSONToXml($scope.relation);
        };
        $scope.debug = function(){
            $scope.relationXMLOutput = $scope.getRelationXML();
        };
        $scope.deleteRelation = function(){
            if (!$scope.deleteConfirmation){
                $scope.deleteConfirmation = true;
                return;
            }
            $scope.loading.delete = true;
            $scope.loading.deleteOK = false;
            $scope.loading.deleteKO = false;
            if ($scope.repeatRelationId !== $scope.relationID){
                $scope.repeatRelationId = undefined;
                $scope.loading.deleteKO = true;
                $scope.loading.delete = false;
                return;
            }
            $scope.loading.deleteOK = false;
            $scope.loading.deleteKO = false;
            $scope.relationXMLOutput = $scope.getRelationXML();
            var config = {data:$scope.relationXMLOutput};
            osmService.delete('/0.6/relation/'+ $scope.relationID, config)
                .then(function(data){
                    $scope.relation.properties.version = data;
                    $scope.loading.delete = false;
                    $scope.loading.deleteOK = true;
                    $scope.loading.deleteKO = false;
                }, function(error){
                    $scope.deleteError = error;
                    $scope.loading.delete = false;
                    $scope.loading.deleteOK = false;
                    $scope.loading.deleteKO = true;
                }
            );
        };
    }]
);
