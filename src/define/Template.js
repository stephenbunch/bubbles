var Template = new Struct(
{
    /**
     * @type {Dictionary.<string, Event|Method|Property>}
     */
    members: null,

    /**
     * @type {Template}
     */
    parent: null,

    /**
     * @type {Array.<Template>}
     */
    mixins: [],

    /**
     * @type {Function}
     */
    ctor: null
});
