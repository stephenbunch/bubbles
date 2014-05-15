var Template = new Struct({
    /**
     * @type {Dictionary.<string, Member>}
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
