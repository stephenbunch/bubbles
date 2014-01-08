var deferred = require( "./di/deferred" );
var define = require( "./core/define" );
var environment = require( "./core/environment" );
var errors = require( "./core/errors" );
var injector = require( "./di/injector" );
var util = require( "./core/util" );

var type = define;
type.of = util.typeOf;

type.DefinitionError = errors.DefinitionError;
type.InitializationError = errors.InitializationError;
type.AccessViolationError = errors.AccessViolationError;
type.InvalidOperationError = errors.InvalidOperationError;
type.ArgumentError = errors.ArgumentError;

type.injector = injector;
type.providerOf = injector.providerOf;
type.lazyProviderOf = injector.lazyProviderOf;

type.defer = deferred;

module.exports = type;
if ( environment.isBrowser )
    window.type = type;
