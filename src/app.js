/*jshint strict:false */
/*global angular:false */

'use strict';
L.Icon.Default.imagePath = '/images/';


// Declare app level module which depends on filters, and services
angular.module('osm', [
    'ngRoute',
    'base64',
//    'flash',
    'leaflet-directive',
    'osm.services',
    'osm.directives',
    'osm.controllers',
    'ui.bootstrap',
    'ui.keypress',
    'ngCookies',
    'ngStorage'
]);

angular.module('osm.controllers', []);
angular.module('osm.services', []);
angular.module('osm.directives', []);

