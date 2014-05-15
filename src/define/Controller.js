var Controller = new Class(
{
    ctor: function()
    {
        this.tunnel = null;
        this.builder = null;

        this._checkTypeOurs = false;
        this._typeCheckResult = false;
        this._returnScope = false;
        this._returnBase = false;
        this._returnTemplate = false;
    },

    /**
     * @param {Function} ctor
     * @return {boolean}
     */
    isTypeOurs: function( ctor )
    {
        this._checkTypeOurs = true;
        ctor();
        var result = this._typeCheckResult;
        this._typeCheckResult = false;
        this._checkTypeOurs = false;
        return result;
    },

    /**
     * @param {Template} ctor
     * @return {Scope}
     */
    createScope: function( template )
    {
        this._returnScope = true;
        var scope = template.ctor();
        this._returnScope = false;
        return scope;
    },

    /**
     * @param {Template} template
     * @return {Object}
     */
    createEmpty: function( template )
    {
        this._returnBase = true;
        var instance = new template.ctor();
        this._returnBase = false;
        return instance;
    },

    /**
     * @param {Function} ctor
     * @return {Template}
     */
    getTemplate: function( ctor )
    {
        this._returnTemplate = true;
        var template = ctor();
        this._returnTemplate = false;
        return template;
    },

    /**
     * @return {Template}
     */
    createTemplate: function()
    {
        var me = this;
        var Self = null;
        var template = new Template();
        var run = true;

        var Type = function()
        {
            if ( me._returnBase )
                return;

            if ( me._checkTypeOurs )
            {
                me._typeCheckResult = true;
                return;
            }

            if ( me._returnScope )
            {
                if ( Self === null )
                    Self = me._createSelf( template );

                var scope = new Scope();
                scope.template = template;

                if ( IE8 )
                {
                    scope.self = me._createElement();
                    me._applyPrototype( Self, scope.self );
                }
                else
                    scope.self = new Self();

                return scope;
            }

            if ( me._returnTemplate )
                return template;

            if ( run )
            {
                var pub;
                run = false;

                if ( IE8 )
                {
                    pub = me._createElement();
                    me._applyPrototype( template.ctor, pub );
                }
                else
                    pub = new Type();

                me.builder.init( template, pub, arguments, true );
                run = true;
                return pub;
            }
        };

        template.ctor = Type;
        template.members = new Dictionary();
        return template;
    },

    /**
     * @private
     * @param {Function} ctor
     * @param {Object} obj
     */
    _applyPrototype: function( ctor, obj )
    {
        var proto = ctor.prototype;
        if ( proto.constructor.prototype !== proto )
            this._applyPrototype( proto.constructor, obj );
        for ( var prop in proto )
        {
            if ( hasOwn( proto, prop ) )
                obj[ prop ] = proto[ prop ];
        }
    },

    /**
     * @private
     * @return {HTMLElement}
     */
    _createElement: function()
    {
        var obj = document.createElement(), prop;
        for ( prop in obj )
        {
            if ( hasOwn( obj, prop ) )
                this._resetProperty( obj, prop );
        }
        return obj;
    },

    /**
     * @private
     * @param {Object|Function|Array} obj
     * @param {string} propertyName
     */
    _resetProperty: function( obj, propertyName )
    {
        var _value;
        Object.defineProperty( obj, propertyName,
        {
            configurable: true,
            get: function() {
                return _value;
            },
            set: function( value ) {
                _value = value;
            }
        });
    },

    /**
     * @private
     * @description Creates a new private scope type.
     * @param {Template} template
     * @return {Function}
     */
    _createSelf: function( template )
    {
        var self = this;
        var Self = function() {};
        Self.prototype = this.createEmpty( template );

        /**
         * Gets the private scope of the type instance.
         * @return {?}
         */
        Self.prototype._pry = function( pub )
        {
            self.tunnel.open( template.ctor );
            var scope = !!pub && !!pub.__scope__ ? pub.__scope__ : null;
            self.tunnel.close();
            return scope || pub;
        };

        return Self;
    }
});
