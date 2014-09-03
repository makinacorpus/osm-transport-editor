/*jshint strict:false */
/*global angular:false */

angular.module('osmTransportEditor.services').factory('headerService',
    [function(){
        return {
            title: 'OSM Transport Editor'
        };
    }]
);

angular.module('osmTransportEditor.controllers').controller('HeaderController',
    ['$scope', 'headerService', function($scope, headerService){
        $scope.title = headerService.title;
        $scope.$watch(function(){
            if (headerService.title !== $scope.title){
                $scope.title = headerService.title;
            }
        });
    }]
);

