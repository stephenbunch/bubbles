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
     * @type {Array.<Scope>}
     */
    mixins: [],

    /**
     * @type {Template}
     */
    template: null
});
