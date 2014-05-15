/**
 * @interface
 */
var Member = function() {};

/**
 * @description Creates the member on the specified scope.
 * @param {Scope} scope
 */
Member.prototype.build = function( scope ) {};

/**
 * @description Gets or sets the member name.
 * @type {string}
 */
Member.prototype.name = null;

/**
 * @description Gets or sets the member's access level.
 * @type {string}
 */
Member.prototype.access = null;
