var Component = new Class(
{
    /**
     * @constructor
     * @param {Recipe} recipe
     */
    ctor: function( recipe )
    {
        /**
         * @type {Component}
         */
        this.parent = null;

        /**
         * @type {number}
         */
        this.order = null;

        /**
         * @type {Array}
         */
        this.prep = [];

        /**
         * @type {Recipe}
         */
        this.recipe = recipe;

        /**
         * @type {Array.<Component>}
         */
        this.children = [];
    }
});
