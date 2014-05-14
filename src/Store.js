var Store = new Class({
    ctor: function()
    {
        this._pending = {};
        this._cache = {};
        this._browser = !!( typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document );
        this._last = null;

        onTypeDefined = proxy( this._onTypeDefined, this );
    },

    fetch: function( options )
    {
        var task = new Task();
        if ( this._browser )
        {
            var url = options.url;
            if ( ( /^\/\// ).test( url ) )
                url = window.location.protocol + url;
            else if ( ( /^\// ).test( url ) )
                url = window.location.protocol + "//" + window.location.host + url;
            else
                url = window.location.protocol + "//" + window.location.host + window.location.pathname + url;

            if ( this._cache[ url ] )
                task.resolve( this._cache[ url ] );
            else if ( this._pending[ url ] )
                this._pending[ url ].bind( task );
            else
            {
                var script = document.createElement( "script" );
                script.src = url;
                script.addEventListener( "error", function()
                {
                    task.reject();
                }, false );
                document.body.appendChild( script );
                this._pending[ url ] = task;
            }
        }
        else
        {
            this._last = task;
            require( options.url );
        }
        return task.promise;
    },

    _onTypeDefined: function( type )
    {
        if ( this._browser )
        {
            var scripts = document.getElementsByTagName( "script" );
            var url = scripts[ scripts.length - 1 ].src;
            if ( this._pending[ url ] )
            {
                this._cache[ url ] = type;
                var task = this._pending[ url ];
                delete this._pending[ url ];
                setTimeout( function() {
                    task.resolve( type );
                });
            }
        }
        else if ( this._last !== null )
        {
            var task = this._last;
            this._last = null;
            task.resolve( type );
        }
    }
});
