var Scope = new Struct(
{
    /**
     * @type {Scope}
     */
    parent: null,

    /**
     * @type {Object}
     */
    self: null,

    /**
     * @type {Scope}
     */
    derived: null,

    /**
     * @type {Template}
     */
    template: null,

    /**
     * @type {Object}
     * @description The public interface.
     */
    pub: null
});
