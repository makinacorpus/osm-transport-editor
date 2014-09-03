/*jshint strict:false */
/*global angular:false */

angular.module('osmTransportEditor.services').factory('settingsService',
    ['$localStorage', function($localStorage){
        return {
            settings: $localStorage.$default({
                relationSelected: '',
                changesetID: '',
                osmtags: {},
                geojsonLayers:[],
                history:[]
            })
        };
    }]
);
