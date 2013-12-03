// When we want to pry an object open, we set this to the type of the object
// and call $scope to extract the private scope.
var value = null;

module.exports = {
    open: function( type ) {
        value = type;
    },
    close: function() {
        value = null;
    },
    value: function() {
        return value;
    }
};
