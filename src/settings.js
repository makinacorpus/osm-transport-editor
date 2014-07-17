/*jshint strict:false */
/*global angular:false */

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
                changesetID: '',
                osmtags: {},
                osmfilter: [],
                geojsonLayers:[],
                history:[]
            })
        };
    }]
);
