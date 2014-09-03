/*jshint strict:false */
/*global angular:false */

angular.module('osmTransportEditor').directive('relationsTable', function(){
    return {
        restrict: 'AE',
        replace: true,
        templateUrl: 'partials/relationsTable.html',
        controller: 'RelationsTableController',
        scope: {
            relations: '=relations'
        }
    };
});
angular.module('osmTransportEditor').directive('openRelationExt', function(){
    return {
        restrict: 'A',
        replace: true,
        templateUrl: 'partials/openRelationExt.html',
        scope: {
            relationId: '='
        }
    };
});

angular.module('osmTransportEditor.controllers').controller('RelationsTableController',
    ['$scope', '$location', function($scope, $location){
        console.log('init RelationsTableController');

        $scope.setCurrentRelation = function(member){
            if (member.type === 'relation'){
                $location.path('/'+member.ref);
            }
        };
    }]
);
