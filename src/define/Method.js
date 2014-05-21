var Method = new Class(
{
    /**
     * @constructor
     */
    ctor: function()
    {
        this.callsuper = false;
        this.params = [];
        this.access = null;
        this.virtual = false;
        this.name = null;
        this.method = null;
    },

    /**
     * @description Creates the method on the specified scope.
     * @param {Scope} scope
     */
    build: function( scope )
    {
        var self = this;
        if ( this.name === CTOR )
            this._buildConstructor( scope );
        else
        {
            if ( scope.parent !== null && scope.parent.self[ this.name ] )
            {
                var _super = scope.parent.self[ this.name ];
                scope.self[ this.name ] = function()
                {
                    var temp = scope.self._super;
                    scope.self._super = _super;
                    var result = self.method.apply( scope.self, arguments );
                    if ( temp === undefined )
                        delete scope.self._super;
                    else
                        scope.self._super = temp;
                    return result;
                };
            }
            else
            {
                scope.self[ this.name ] = function() {
                    return self.method.apply( scope.self, arguments );
                };
            }
        }
        scope.self[ this.name ] = scope.self[ this.name ];
    },

    /**
     * @param {Scope} scope
     */
    _buildConstructor: function( scope )
    {
        var self = this;
        scope.self.ctor = function()
        {
            var _super = scope.self._super;
            var _superOverridden = false;

            // Hide the constructor because it should never be called again.
            delete scope.self.ctor;

            // Call the parent constructor if it is parameterless. Otherwise, assign it to this._super.
            if ( scope.template.parent !== null && scope.template.parent.members.contains( CTOR ) )
            {
                if ( scope.template.parent.members.get( CTOR ).params.length > 0 )
                {
                    scope.self._super = scope.parent.self.ctor;
                    _superOverridden = true;
                }
                else
                    scope.parent.self.ctor();
            }

            var _include = scope.self._include;

            /**
             * @description Transcludes the members of another object.
             * @param {Object} obj
             * @param {string|Array.<string>|Object} [member] The member {string} or members {Array.<string>} to
             * transclude. Or a key/value pair of members and the names to use.
             * @param {string} [name] The name to transclude the member as.
             */
            scope.self._include = function( obj, member, name )
            {
                var i = 0, prop, len;
                if ( !member )
                {
                    for ( prop in obj )
                        self._transclude( scope, obj, prop, prop );
                }
                else if ( isString( member ) )
                    self._transclude( scope, obj, member, name || member );
                else if ( isArray( member ) )
                {
                    len = member.length;
                    for ( ; i < len; i++ )
                        self._transclude( scope, obj, member[ i ], member[ i ] );
                }
                else
                {
                    var props = keys( member );
                    len = props.length;
                    for ( ; i < len; i++ )
                        self._transclude( scope, obj, props[ i ], member[ props[ i ] ] );
                }
            };

            self.method.apply( scope.self, arguments );

            if ( _superOverridden )
            {
                if ( _super === undefined )
                    delete scope.self._super;
                else
                    scope.self._super = _super;
            }

            if ( _include === undefined )
                delete scope.self._include;
            else
                scope.self._include = _include;
        };
    },

    /**
     * @param {Scope} scope
     * @param {Object} obj
     * @param {string} member
     * @param {string} name
     */
    _transclude: function( scope, obj, member, name )
    {
        if ( scope.template.members.get( name ) !== null )
            return;

        var descriptor = Object.getOwnPropertyDescriptor( obj, member );
        var usesValue = false;

        // Prototype members won't have a property descriptor.
        if ( descriptor === undefined || "value" in descriptor )
        {
            if ( isFunc( obj[ member ] ) )
            {
                scope.self[ name ] = proxy( obj[ member ], obj );
                scope.pub[ name ] = scope.self[ name ];
                return;
            }
            usesValue = true;
        }

        var get;
        var set;

        if ( usesValue || descriptor.get !== undefined )
        {
            get = function() {
                return obj[ member ];
            };
        }

        if ( usesValue || descriptor.set !== undefined )
        {
            set = function( value ) {
                obj[ member ] = value;
            };
        }

        defineProperty( scope.self, name, { get: get, set: set });
        defineProperty( scope.pub, name, { get: get, set: set });
    }
});
