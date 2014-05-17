var Recipe = new Struct(
{
    create: function() {},

    /**
     * @type {Array.<string|Lazy|Factory>}
     */
    ingredients: [],

    /**
     * @type {string}
     */
    name: null,

    factory: false,
    lazy: false
});
