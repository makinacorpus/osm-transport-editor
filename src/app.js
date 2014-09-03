/*jshint strict:false */
/*global angular:false */

'use strict';

// Declare app level module which depends on filters, and services
angular.module('osmTransportEditor', [
    'ngRoute',
    'base64',
//    'flash',
    'leaflet-directive',
    'osm',
    'osmTransportEditor.services',
    'osmTransportEditor.directives',
    'osmTransportEditor.controllers',
    'ui.bootstrap',
    'ui.keypress',
    'ngCookies',
    'ngStorage'
]);

angular.module('osmTransportEditor.controllers', []);
angular.module('osmTransportEditor.services', []);
angular.module('osmTransportEditor.directives', []);

