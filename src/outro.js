type.deferred = Deferred;
type.of = typeOf;

if ( typeof module !== "undefined" )
    module.exports = type;
else
    window.type = type;

} ( this ) );
