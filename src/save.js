/*jshint strict:false */
/*global angular:false */

/*jshint strict:false */
/*global angular:false */

angular.module('osmTransportEditor.controllers').controller('ChangesetController',
    ['$scope', '$routeParams', 'osmSettingsService', 'osmAPI',
    function($scope, $routeParams, osmSettingsService, osmAPI){
        console.log('init ChangesetController');
        $scope.relationId = $routeParams.lineRelationId || $routeParams.masterRelationId || $routeParams.mainRelationId;
        $scope.comment = 'Working on relation ' + $scope.relationId;
        //$scope.changesetID = osmSettingsService.getChangeset();
        $scope.createChangeset = function(){
            return osmAPI.createChangeset($scope.comment);
        };
        $scope.getLastOpenedChangesetId = function(){
            return osmAPI.getLastOpenedChangesetId();
        };
        $scope.closeChangeset = function(){
            osmAPI.closeChangeset();
        };
        //initialize
        if (osmSettingsService.getChangeset() !== '' && osmSettingsService.getCredentials()){
            $scope.getLastOpenedChangesetId().then(function(data){
                $scope.changesetID = data;
            });
        }
        $scope.$watch(function(){
            if ($scope.changesetID !== osmSettingsService.getChangeset()){
                $scope.changesetID = osmSettingsService.getChangeset();
                return $scope.changetsetID;
            }
        });
    }]
);

angular.module('osmTransportEditor.controllers').controller('SaveRelationController',
    ['$scope', '$routeParams', 'osmSettingsService', 'osmAPI',
    function($scope, $routeParams, osmSettingsService, osmAPI){
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
            osmAPI.put('/0.6/relation/'+ $scope.relationID, $scope.relationXMLOutput)
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
            return osmAPI.relationGeoJSONToXml($scope.relation);
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
            osmAPI.delete('/0.6/relation/'+ $scope.relationID, config)
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
