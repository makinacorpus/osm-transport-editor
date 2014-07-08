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
                geojsonLayers:[],
                preferAdding: false
            })
        };
    }]
);
