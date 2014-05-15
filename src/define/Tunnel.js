var Tunnel = new Class({
    ctor: function() {
        this._value = null;
    },

    open: function( type ) {
        this._value = type;
    },

    close: function() {
        this._value = null;
    },

    value: function() {
        return this._value;
    }
});
