/*jshint strict:false */
/*global angular:false */

angular.module('osm').config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/:mainRelationId/:masterRelationId/:lineRelationId', {
        templateUrl: 'partials/line.html',
        controller: 'LineRelationController'
    });
}]);

angular.module('osm.controllers').controller('MembersController',
    ['$scope', '$routeParams', '$location', 'settingsService', 'osmService', 'leafletService',
    function($scope, $routeParams, $location, settingsService, osmService, leafletService){
        console.log('init MembersController');
        var moveMember = function(member, from, to) {
            $scope.members.splice(to, 0, $scope.members.splice(from, 1)[0]);
            if (member.type === 'relation'){
                $scope.relation.relations.splice(to, 0, $scope.relation.relations.splice(from, 1)[0]);
            }else{
                $scope.relation.features.splice(to, 0, $scope.relation.features.splice(from, 1)[0]);
            }
        };
        var getIndex = function(member){
            var index = $scope.members.indexOf(member);
            if (index === -1){
                //it is not a member, may be a feature or a relation?
                if (member.type === 'relation'){
                    index = $scope.relation.relations.indexOf(member);
                }else if (member.type === 'Feature'){
                    index = $scope.relation.features.indexOf(member);
                }
            }
            return index;
        };
        $scope.moveMemberUp = function(member){
            var index = getIndex(member);
            moveMember(member, index, index-1);
        };
        $scope.moveMemberDown = function(member){
            var index = getIndex(member);
            moveMember(member, index, index+1);
        };
        $scope.removeMemberFromRelation = function(member){
            var index = getIndex(member);
            $scope.members.splice(index, 1);
            $scope.relation.features.splice(index, 1);
            leafletService.addGeoJSONLayer(
                'relation',
                $scope.relation,
                $scope.relation.options
            );
        };
        $scope.moveMemberFromIndexToIndex = function(oldIndex, newIndex){
            if (isNaN(oldIndex) || isNaN(newIndex)){
                return;
            }
            var member = $scope.members.splice(oldIndex, 1)[0];
            $scope.members.splice(newIndex, 0, member);
            var feature = $scope.relation.features.splice(oldIndex, 1)[0];
            $scope.relation.features.splice(newIndex, 0, feature);
        };
    }]
);