var _exports = {
    Class: Type,
    Event: Descriptor.Event,

    extend: Type.extend,

    /**
     * @description
     * A factory for creating custom errors. Pass a name to get the error definition.
     * Pass a name and a message to get a new instance of the specified error.
     * @param {string} name
     * @param {string} [message]
     * @return {Function|Error}
     */
    error: error,

    /**
     * @description Gets the internal JavaScript [[Class]] of an object.
     * @param {*} object
     * @return {string}
     */
    of: typeOf,

    /**
     * @description Creates a new Task.
     * @param {function(function(), function())} [callback] An optional callback that takes
     * a resolve method and a reject method.
     * @return {Task}
     */
    Task: Task,

    /**
     * @description Creates a new Kernel.
     * @return {Kernel}
     */
    Kernel: Kernel,

    /**
     * @description Creates a new factory object.
     * @return {Factory}
     */
    Factory: Factory,

    /**
     * @description Creates a new lazy object.
     * @return {Lazy}
     */
    Lazy: Lazy,

    ns: ns,

    setImmediate: setImmediate,
    merge: merge
};

if ( typeof module !== "undefined" && module.exports )
{
    module.exports = _exports;
}
else if ( typeof define === "function" && define.amd )
{
    define( function() {
        return _exports;
    });
}
else
{
    window.type = _exports;
}
