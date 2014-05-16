var _exports = {
    define: Type,

    simple: Class,
    struct: Struct,

    /**
     * @description
     * A factory for creating custom errors. Pass a name to get the error definition.
     * Pass a name and a message to get a new instance of the specified error.
     * @param {string} name
     * @param {string} [message]
     * @return {function()|Error}
     */
    error: error,

    /**
     * @description Gets the internal JavaScript [[Class]] of an object.
     * @param {*} object
     * @return {string}
     */
    of: typeOf,

    defer: Task,
    kernel: Kernel,
    factory: Factory,
    lazy: Lazy,

    delegate: function() {
        return Delegate.apply( undefined, arguments );
    }
};

if ( typeof module !== "undefined" && module.exports )
    module.exports = _exports;
else
    window.type = _exports;
