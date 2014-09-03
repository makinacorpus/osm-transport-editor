/*jshint strict:false */
/*global angular:false */
/*global osmtogeojson:false */

angular.module('osmTransportEditor').filter('slice', function() {
    return function(arr, start, end) {
        return (arr || []).slice(start, end);
    };
});
angular.module('osmTransportEditor').filter('reverse', function() {
    return function(items) {
        return items.slice().reverse();
    };
});
