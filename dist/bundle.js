(function () {
'use strict';

var a = typeof document !== 'undefined' && document.createElement( 'a' );
var QUERYPAIR_REGEX = /^([\w\-]+)(?:=([^&]*))?$/;
var HANDLERS = [ 'beforeenter', 'enter', 'leave', 'update' ];

var isInitial = true;

function RouteData (ref) {
	var route = ref.route;
	var pathname = ref.pathname;
	var params = ref.params;
	var query = ref.query;
	var hash = ref.hash;
	var scrollX = ref.scrollX;
	var scrollY = ref.scrollY;

	this.pathname = pathname;
	this.params = params;
	this.query = query;
	this.hash = hash;
	this.isInitial = isInitial;
	this.scrollX = scrollX;
	this.scrollY = scrollY;

	this._route = route;

	isInitial = false;
}

RouteData.prototype = {
	matches: function matches ( href ) {
		return this._route.matches( href );
	}
};

function Route ( path, options ) {
	var this$1 = this;

	// strip leading slash
	if ( path[0] === '/' ) {
		path = path.slice( 1 );
	}

	this.path = path;
	this.segments = path.split( '/' );

	if ( typeof options === 'function' ) {
		options = {
			enter: options
		};
	}

	this.updateable = typeof options.update === 'function';

	HANDLERS.forEach( function (handler) {
		this$1[ handler ] = function ( route, other ) {
			var value;

			if ( options[ handler ] ) {
				value = options[ handler ]( route, other );
			}

			return roadtrip.Promise.resolve( value );
		};
	});
}

Route.prototype = {
	matches: function matches$1 ( href ) {
		a.href = href;

		var pathname = a.pathname.slice( 1 );
		var segments = pathname.split( '/' );

		return segmentsMatch( segments, this.segments );
	},

	exec: function exec ( target ) {
		var this$1 = this;

		a.href = target.href;

		var pathname = a.pathname.slice( 1 );
		var search = a.search.slice( 1 );

		var segments = pathname.split( '/' );

		if ( segments.length !== this.segments.length ) {
			return false;
		}

		var params = {};

		for ( var i = 0; i < segments.length; i += 1 ) {
			var segment = segments[i];
			var toMatch = this$1.segments[i];

			if ( toMatch[0] === ':' ) {
				params[ toMatch.slice( 1 ) ] = segment;
			}

			else if ( segment !== toMatch ) {
				return false;
			}
		}

		var query = {};
		var queryPairs = search.split( '&' );

		for ( var i$1 = 0; i$1 < queryPairs.length; i$1 += 1 ) {
			var match = QUERYPAIR_REGEX.exec( queryPairs[i$1] );

			if ( match ) {
				var key = match[1];
				var value = decodeURIComponent( match[2] );

				if ( query.hasOwnProperty( key ) ) {
					if ( typeof query[ key ] !== 'object' ) {
						query[ key ] = [ query[ key ] ];
					}

					query[ key ].push( value );
				}

				else {
					query[ key ] = value;
				}
			}
		}

		return new RouteData({
			route: this,
			pathname: pathname,
			params: params,
			query: query,
			hash: a.hash.slice( 1 ),
			scrollX: target.scrollX,
			scrollY: target.scrollY
		});
	}
};

function segmentsMatch ( a, b ) {
	if ( a.length !== b.length ) { return; }

	var i = a.length;
	while ( i-- ) {
		if ( ( a[i] !== b[i] ) && ( b[i][0] !== ':' ) ) {
			return false;
		}
	}

	return true;
}

var window$1 = ( typeof window !== 'undefined' ? window : null );

var routes = [];

// Adapted from https://github.com/visionmedia/page.js
// MIT license https://github.com/visionmedia/page.js#license

function watchLinks ( callback ) {
	window$1.addEventListener( 'click', handler, false );
	window$1.addEventListener( 'touchstart', handler, false );

	function handler ( event ) {
		if ( which( event ) !== 1 ) { return; }
		if ( event.metaKey || event.ctrlKey || event.shiftKey ) { return; }
		if ( event.defaultPrevented ) { return; }

		// ensure target is a link
		var el = event.target;
		while ( el && el.nodeName !== 'A' ) {
			el = el.parentNode;
		}

		if ( !el || el.nodeName !== 'A' ) { return; }

		// Ignore if tag has
		// 1. 'download' attribute
		// 2. rel='external' attribute
		if ( el.hasAttribute( 'download' ) || el.getAttribute( 'rel' ) === 'external' ) { return; }

		// ensure non-hash for the same path

		// Check for mailto: in the href
		if ( ~el.href.indexOf( 'mailto:' ) ) { return; }

		// check target
		if ( el.target ) { return; }

		// x-origin
		if ( !sameOrigin( el.href ) ) { return; }

		// rebuild path
		var path = el.pathname + el.search + ( el.hash || '' );

		// strip leading '/[drive letter]:' on NW.js on Windows
		if ( typeof process !== 'undefined' && path.match( /^\/[a-zA-Z]:\// ) ) {
			path = path.replace( /^\/[a-zA-Z]:\//, '/' );
		}

		// same page
		var orig = path;

		if ( path.indexOf( roadtrip.base ) === 0 ) {
			path = path.substr( roadtrip.base.length );
		}

		if ( roadtrip.base && orig === path ) { return; }

		// no match? allow navigation
		if ( !routes.some( function (route) { return route.matches( orig ); } ) ) { return; }

		event.preventDefault();
		callback( orig );
	}
}

function which ( event ) {
	event = event || window$1.event;
	return event.which === null ? event.button : event.which;
}

function sameOrigin ( href ) {
	var origin = location.protocol + '//' + location.hostname;
	if ( location.port ) { origin += ':' + location.port; }

	return ( href && ( href.indexOf( origin ) === 0 ) );
}

function isSameRoute ( routeA, routeB, dataA, dataB ) {
	if ( routeA !== routeB ) {
		return false;
	}

	return (
		dataA.hash === dataB.hash &&
		deepEqual( dataA.params, dataB.params ) &&
		deepEqual( dataA.query, dataB.query )
	);
}

function deepEqual ( a, b ) {
	if ( a === null && b === null ) {
		return true;
	}

	if ( isArray( a ) && isArray( b ) ) {
		var i = a.length;

		if ( b.length !== i ) { return false; }

		while ( i-- ) {
			if ( !deepEqual( a[i], b[i] ) ) {
				return false;
			}
		}

		return true;
	}

	else if ( typeof a === 'object' && typeof b === 'object' ) {
		var aKeys = Object.keys( a );
		var bKeys = Object.keys( b );

		var i$1 = aKeys.length;

		if ( bKeys.length !== i$1 ) { return false; }

		while ( i$1-- ) {
			var key = aKeys[i$1];

			if ( !b.hasOwnProperty( key ) || !deepEqual( b[ key ], a[ key ] ) ) {
				return false;
			}
		}

		return true;
	}

	return a === b;
}

var toString = Object.prototype.toString;

function isArray ( thing ) {
	return toString.call( thing ) === '[object Array]';
}

// Enables HTML5-History-API polyfill: https://github.com/devote/HTML5-History-API
var location$1 = window$1 && ( window$1.history.location || window$1.location );

function noop$1 () {}

var currentData = {};
var currentRoute = {
	enter: function () { return roadtrip.Promise.resolve(); },
	leave: function () { return roadtrip.Promise.resolve(); }
};

var _target;
var isTransitioning = false;

var scrollHistory = {};
var uniqueID = 1;
var currentID = uniqueID;

var roadtrip = {
	base: '',
	Promise: Promise,

	add: function add ( path, options ) {
		routes.push( new Route( path, options ) );
		return roadtrip;
	},

	start: function start ( options ) {
		if ( options === void 0 ) { options = {}; }

		var href = routes.some( function (route) { return route.matches( location$1.href ); } ) ?
			location$1.href :
			options.fallback;

		return roadtrip.goto( href, {
			replaceState: true,
			scrollX: window$1.scrollX,
			scrollY: window$1.scrollY
		});
	},

	goto: function goto ( href, options ) {
		if ( options === void 0 ) { options = {}; }

		scrollHistory[ currentID ] = {
			x: window$1.scrollX,
			y: window$1.scrollY
		};

		var target;
		var promise = new roadtrip.Promise( function ( fulfil, reject ) {
			target = _target = {
				href: href,
				scrollX: options.scrollX || 0,
				scrollY: options.scrollY || 0,
				options: options,
				fulfil: fulfil,
				reject: reject
			};
		});

		_target.promise = promise;

		if ( isTransitioning ) {
			return promise;
		}

		_goto( target );
		return promise;
	}
};

if ( window$1 ) {
	watchLinks( function (href) { return roadtrip.goto( href ); } );

	// watch history
	window$1.addEventListener( 'popstate', function (event) {
		if ( !event.state ) { return; } // hashchange, or otherwise outside roadtrip's control
		var scroll = scrollHistory[ event.state.uid ];

		_target = {
			href: location$1.href,
			scrollX: scroll.x,
			scrollY: scroll.y,
			popstate: true, // so we know not to manipulate the history
			fulfil: noop$1,
			reject: noop$1
		};

		_goto( _target );
		currentID = event.state.uid;
	}, false );
}

function _goto ( target ) {
	var newRoute;
	var newData;

	for ( var i = 0; i < routes.length; i += 1 ) {
		var route = routes[i];
		newData = route.exec( target );

		if ( newData ) {
			newRoute = route;
			break;
		}
	}

	if ( !newRoute || isSameRoute( newRoute, currentRoute, newData, currentData ) ) {
		target.fulfil();
		return;
	}

	scrollHistory[ currentID ] = {
		x: ( currentData.scrollX = window$1.scrollX ),
		y: ( currentData.scrollY = window$1.scrollY )
	};

	isTransitioning = true;

	var promise;

	if ( ( newRoute === currentRoute ) && newRoute.updateable ) {
		promise = newRoute.update( newData );
	} else {
		promise = roadtrip.Promise.all([
			currentRoute.leave( currentData, newData ),
			newRoute.beforeenter( newData, currentData )
		]).then( function () { return newRoute.enter( newData, currentData ); } );
	}

	promise
		.then( function () {
			currentRoute = newRoute;
			currentData = newData;

			isTransitioning = false;

			// if the user navigated while the transition was taking
			// place, we need to do it all again
			if ( _target !== target ) {
				_goto( _target );
				_target.promise.then( target.fulfil, target.reject );
			} else {
				target.fulfil();
			}
		})
		.catch( target.reject );

	if ( target.popstate ) { return; }

	var ref = target.options;
	var replaceState = ref.replaceState;
	var invisible = ref.invisible;
	if ( invisible ) { return; }

	var uid = replaceState ? currentID : ++uniqueID;
	history[ replaceState ? 'replaceState' : 'pushState' ]( { uid: uid }, '', target.href );

	currentID = uid;
	scrollHistory[ currentID ] = {
		x: target.scrollX,
		y: target.scrollY
	};
}

var posts;
var postsContent = {};

function getPosts() {
  return posts.slice();
}

function getPostInfo(key) {
  if (!posts) {
    return null;
  }

  return posts.filter(function (post) { return post.key === key; })[0];
}

function fetchPosts(force) {
  if (posts && !force) {
    return Promise.resolve();
  }

  return fetch('/public/posts/manifest.json')
    .then(function (resp) { return resp.json(); })
    .then(function (json) { posts = json; return null; })
}

function fetchPost(key) {
  if (postsContent[key]) {
    return postsContent[key];
  }

  return fetch(("/public/posts/" + key + ".md"))
    .then(function (resp) { return resp.text(); })
    .then(function (text) {
      if (!text || text.startsWith('<!DOCTYPE html>')) {
        throw new Error('Specific post not exists');
      }

      postsContent[key] = text;
      return text;
    })
}

function noop$2() {}

function assign(target) {
	var arguments$1 = arguments;

	var k,
		source,
		i = 1,
		len = arguments.length;
	for (; i < len; i++) {
		source = arguments$1[i];
		for (k in source) { target[k] = source[k]; }
	}

	return target;
}

function appendNode(node, target) {
	target.appendChild(node);
}

function insertNode(node, target, anchor) {
	target.insertBefore(node, anchor);
}

function detachNode(node) {
	node.parentNode.removeChild(node);
}

function reinsertChildren(parent, target) {
	while (parent.firstChild) { target.appendChild(parent.firstChild); }
}

function destroyEach(iterations) {
	for (var i = 0; i < iterations.length; i += 1) {
		if (iterations[i]) { iterations[i].d(); }
	}
}

function createFragment() {
	return document.createDocumentFragment();
}

function createElement(name) {
	return document.createElement(name);
}

function createText(data) {
	return document.createTextNode(data);
}

function createComment() {
	return document.createComment('');
}

function addListener(node, event, handler) {
	node.addEventListener(event, handler, false);
}

function removeListener(node, event, handler) {
	node.removeEventListener(event, handler, false);
}

function setAttribute(node, attribute, value) {
	node.setAttribute(attribute, value);
}

function blankObject() {
	return Object.create(null);
}

function destroy(detach) {
	this.destroy = noop$2;
	this.fire('destroy');
	this.set = this.get = noop$2;

	if (detach !== false) { this._fragment.u(); }
	this._fragment.d();
	this._fragment = this._state = null;
}

function differs(a, b) {
	return a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}

function dispatchObservers(component, group, changed, newState, oldState) {
	for (var key in group) {
		if (!changed[key]) { continue; }

		var newValue = newState[key];
		var oldValue = oldState[key];

		var callbacks = group[key];
		if (!callbacks) { continue; }

		for (var i = 0; i < callbacks.length; i += 1) {
			var callback = callbacks[i];
			if (callback.__calling) { continue; }

			callback.__calling = true;
			callback.call(component, newValue, oldValue);
			callback.__calling = false;
		}
	}
}

function fire(eventName, data) {
	var this$1 = this;

	var handlers =
		eventName in this._handlers && this._handlers[eventName].slice();
	if (!handlers) { return; }

	for (var i = 0; i < handlers.length; i += 1) {
		handlers[i].call(this$1, data);
	}
}

function get(key) {
	return key ? this._state[key] : this._state;
}

function init(component, options) {
	component.options = options;

	component._observers = { pre: blankObject(), post: blankObject() };
	component._handlers = blankObject();
	component._root = options._root || component;
	component._yield = options._yield;
	component._bind = options._bind;
}

function observe(key, callback, options) {
	var group = options && options.defer
		? this._observers.post
		: this._observers.pre;

	(group[key] || (group[key] = [])).push(callback);

	if (!options || options.init !== false) {
		callback.__calling = true;
		callback.call(this, this._state[key]);
		callback.__calling = false;
	}

	return {
		cancel: function() {
			var index = group[key].indexOf(callback);
			if (~index) { group[key].splice(index, 1); }
		}
	};
}

function on(eventName, handler) {
	if (eventName === 'teardown') { return this.on('destroy', handler); }

	var handlers = this._handlers[eventName] || (this._handlers[eventName] = []);
	handlers.push(handler);

	return {
		cancel: function() {
			var index = handlers.indexOf(handler);
			if (~index) { handlers.splice(index, 1); }
		}
	};
}

function set(newState) {
	this._set(assign({}, newState));
	if (this._root._lock) { return; }
	this._root._lock = true;
	callAll(this._root._beforecreate);
	callAll(this._root._oncreate);
	callAll(this._root._aftercreate);
	this._root._lock = false;
}

function _set(newState) {
	var oldState = this._state,
		changed = {},
		dirty = false;

	for (var key in newState) {
		if (differs(newState[key], oldState[key])) { changed[key] = dirty = true; }
	}
	if (!dirty) { return; }

	this._state = assign({}, oldState, newState);
	this._recompute(changed, this._state);
	if (this._bind) { this._bind(changed, this._state); }
	dispatchObservers(this, this._observers.pre, changed, this._state, oldState);
	this._fragment.p(changed, this._state);
	dispatchObservers(this, this._observers.post, changed, this._state, oldState);
}

function callAll(fns) {
	while (fns && fns.length) { fns.pop()(); }
}

function _mount(target, anchor) {
	this._fragment.m(target, anchor);
}

function _unmount() {
	this._fragment.u();
}

var proto = {
	destroy: destroy,
	get: get,
	fire: fire,
	observe: observe,
	on: on,
	set: set,
	teardown: destroy,
	_recompute: noop$2,
	_set: _set,
	_mount: _mount,
	_unmount: _unmount
};

/* src/components/App.html generated by Svelte v1.40.2 */
function encapsulateStyles(node) {
	setAttribute(node, "svelte-27201051", "");
}

function add_css() {
	var style = createElement("style");
	style.id = 'svelte-27201051-style';
	style.textContent = "nav[svelte-27201051] h1,[svelte-27201051] nav h1{display:inline;font-size:1em}nav[svelte-27201051] ul,[svelte-27201051] nav ul{display:inline-block;margin:0 0 0 4em;padding:0;list-style:none}@media(max-width: 425px){nav[svelte-27201051] ul,[svelte-27201051] nav ul{margin:0 0 0 1em}}nav[svelte-27201051] ul li,[svelte-27201051] nav ul li{display:inline;margin:0 0.5em}[svelte-27201051].nav-separator,[svelte-27201051] .nav-separator{margin:2em 0;border:none;border-top:1px solid #999}[svelte-27201051].main,[svelte-27201051] .main{padding-top:2em}[svelte-27201051].main h1::before,[svelte-27201051] .main h1::before,[svelte-27201051].main h2::before,[svelte-27201051] .main h2::before,[svelte-27201051].main h3::before,[svelte-27201051] .main h3::before,[svelte-27201051].main h4::before,[svelte-27201051] .main h4::before,[svelte-27201051].main h5::before,[svelte-27201051] .main h5::before{content:'#';margin-right:1em;opacity:0.4}[svelte-27201051].main h2::before,[svelte-27201051] .main h2::before{content:'##'}[svelte-27201051].main h3::before,[svelte-27201051] .main h3::before{content:'###'}[svelte-27201051].main h1,[svelte-27201051] .main h1{font-size:1.7em}[svelte-27201051].main h2,[svelte-27201051] .main h2{font-size:1.3em;margin-top:2.2em}[svelte-27201051].main h3,[svelte-27201051] .main h3{font-size:1.1em;margin-top:2.0em}[svelte-27201051].main h4,[svelte-27201051] .main h4,[svelte-27201051].main h5,[svelte-27201051] .main h5{font-size:1em;margin-top:1.0em}[svelte-27201051].main p,[svelte-27201051] .main p,[svelte-27201051].main li,[svelte-27201051] .main li{color:#545454;font-size:0.89em;font-weight:lighter;line-height:1.6em;letter-spacing:0.02em}[svelte-27201051].main strong,[svelte-27201051] .main strong{font-weight:bold;color:#333}[svelte-27201051].main code,[svelte-27201051] .main code{background-color:#fdfdfd;border-bottom:1px solid #f0f0f0;color:#000}[svelte-27201051].main pre,[svelte-27201051] .main pre{padding:1em 3em;background-color:#fdfdfd;border:1px solid #f0f0f0;border-radius:3px;overflow:auto}[svelte-27201051].main pre code,[svelte-27201051] .main pre code{border:none}[svelte-27201051].main blockquote,[svelte-27201051] .main blockquote{margin:0;padding:1em 3em;background-color:#fdfdfd;border-left:0.5em solid #f0f0f0}[svelte-27201051].loading-hint,[svelte-27201051] .loading-hint{position:absolute;padding:0.3em 0.7em;top:0;right:0;background-color:#000;color:#fff}footer[svelte-27201051],[svelte-27201051] footer{margin-top:3em;font-size:0.5em;opacity:0.5}footer[svelte-27201051] hr,[svelte-27201051] footer hr{border:none;border-top:1px solid #ddd;margin-bottom:2em}";
	appendNode(style, document.head);
}

function create_main_fragment$1(state, component) {
	var div, nav, text_5, hr, text_6, div_1, slot_content_default = component._slotted.default, text_8, footer, text_11, if_block_anchor;

	var if_block = (state.loading) && create_if_block(state, component);

	return {
		c: function create() {
			div = createElement("div");
			nav = createElement("nav");
			nav.innerHTML = "<h1>Cyandev</h1>\n    <ul><li><a href=\"/\">About</a></li>\n      <li><a href=\"/posts\">Posts</a></li>\n    </ul>";
			text_5 = createText("\n  ");
			hr = createElement("hr");
			text_6 = createText("\n  ");
			div_1 = createElement("div");
			text_8 = createText("\n  ");
			footer = createElement("footer");
			footer.innerHTML = "<hr>\n    Copyright © 2017 Cyandev. All rights reserved.";
			text_11 = createText("\n\n");
			if (if_block) { if_block.c(); }
			if_block_anchor = createComment();
			this.h();
		},

		h: function hydrate() {
			encapsulateStyles(div);
			div.className = "container";
			hr.className = "nav-separator";
			div_1.className = "main";
		},

		m: function mount(target, anchor) {
			insertNode(div, target, anchor);
			appendNode(nav, div);
			appendNode(text_5, div);
			appendNode(hr, div);
			appendNode(text_6, div);
			appendNode(div_1, div);

			if (slot_content_default) {
				appendNode(slot_content_default, div_1);
			}

			appendNode(text_8, div);
			appendNode(footer, div);
			insertNode(text_11, target, anchor);
			if (if_block) { if_block.m(target, anchor); }
			insertNode(if_block_anchor, target, anchor);
		},

		p: function update(changed, state) {
			if (state.loading) {
				if (!if_block) {
					if_block = create_if_block(state, component);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.u();
				if_block.d();
				if_block = null;
			}
		},

		u: function unmount() {
			detachNode(div);

			if (slot_content_default) {
				reinsertChildren(div_1, slot_content_default);
			}

			detachNode(text_11);
			if (if_block) { if_block.u(); }
			detachNode(if_block_anchor);
		},

		d: function destroy$$1() {
			if (if_block) { if_block.d(); }
		}
	};
}

// (19:0) {{#if loading}}
function create_if_block(state, component) {
	var div;

	return {
		c: function create() {
			div = createElement("div");
			div.textContent = "Loading...";
			this.h();
		},

		h: function hydrate() {
			encapsulateStyles(div);
			div.className = "loading-hint";
		},

		m: function mount(target, anchor) {
			insertNode(div, target, anchor);
		},

		u: function unmount() {
			detachNode(div);
		},

		d: noop$2
	};
}

function App(options) {
	init(this, options);
	this._state = options.data || {};

	this._slotted = options.slots || {};

	if (!document.getElementById("svelte-27201051-style")) { add_css(); }

	this.slots = {};

	this._fragment = create_main_fragment$1(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);
	}
}

assign(App.prototype, proto);

/* src/components/About.html generated by Svelte v1.40.2 */
function create_main_fragment(state, component) {
	var h1, text_1, p, text_3, h2, text_5, ul, text_12, h2_1, text_14, ul_1, text_23, p_1;

	var app = new App({
		_root: component._root,
		slots: { default: createFragment() },
		data: { loading: state.loading }
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "About";
			text_1 = createText("\n  ");
			p = createElement("p");
			p.textContent = "Hi, I'm Hongyu Yang (aka. Cyandev), I'm a student of software engineering from China.\n    I develop native mobile apps and web apps, and am also interested in other aspects of\n    programming. As a developer, I always love building stuffs with user-friendly experience\n    and have a feeling of joy to be active in open-source contribution.";
			text_3 = createText("\n  ");
			h2 = createElement("h2");
			h2.textContent = "Links";
			text_5 = createText("\n  ");
			ul = createElement("ul");
			ul.innerHTML = "<li><a href=\"/posts\">/posts</a>: What I wrote</li>\n    <li><a href=\"/activity\">/activity</a>: What I'm doing</li>\n    <li><a href=\"/resume\">/resume</a>: Learn more about me</li>\n  ";
			text_12 = createText("\n  ");
			h2_1 = createElement("h2");
			h2_1.textContent = "Contacts";
			text_14 = createText("\n  ");
			ul_1 = createElement("ul");
			ul_1.innerHTML = "<li>GitHub: <a href=\"https://github.com/unixzii\">unixzii</a></li>\n    <li>Weibo: <a href=\"http://weibo.com/2834711045/profile\">@Cyandev</a></li>\n    <li>Zhihu: <a href=\"https://www.zhihu.com/people/cyandev/activities\">Cyandev</a></li>\n    <li>E-mail: <a href=\"mailto:unixzii@gmail.com\">unixzii@gmail.com</a></li>\n  ";
			text_23 = createText("\n  ");
			p_1 = createElement("p");
			p_1.innerHTML = "If you really want to instantly chat with me, try finding me on WeChat: <code>linux64</code>.";
			app._fragment.c();
		},

		m: function mount(target, anchor) {
			appendNode(h1, app._slotted.default);
			appendNode(text_1, app._slotted.default);
			appendNode(p, app._slotted.default);
			appendNode(text_3, app._slotted.default);
			appendNode(h2, app._slotted.default);
			appendNode(text_5, app._slotted.default);
			appendNode(ul, app._slotted.default);
			appendNode(text_12, app._slotted.default);
			appendNode(h2_1, app._slotted.default);
			appendNode(text_14, app._slotted.default);
			appendNode(ul_1, app._slotted.default);
			appendNode(text_23, app._slotted.default);
			appendNode(p_1, app._slotted.default);
			app._mount(target, anchor);
		},

		p: function update(changed, state) {
			var app_changes = {};
			if (changed.loading) { app_changes.loading = state.loading; }
			app._set( app_changes );
		},

		u: function unmount() {
			app._unmount();
		},

		d: function destroy$$1() {
			app.destroy(false);
		}
	};
}

function About(options) {
	init(this, options);
	this._state = options.data || {};

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(About.prototype, proto);

/* src/components/Posts.html generated by Svelte v1.40.2 */
function data() {
  return {
    posts: getPosts()
  };
}

function filterPosts(posts) {
  return posts.filter(function (post) { return !post.hidden; });
}

function create_main_fragment$2(state, component) {
	var h1, text_1, ul;

	var each_value = filterPosts(state.posts);

	var each_blocks = [];

	for (var i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(state, each_value, each_value[i], i, component);
	}

	var app = new App({
		_root: component._root,
		slots: { default: createFragment() },
		data: { loading: state.loading }
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "Posts";
			text_1 = createText("\n  ");
			ul = createElement("ul");

			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			app._fragment.c();
		},

		m: function mount(target, anchor) {
			appendNode(h1, app._slotted.default);
			appendNode(text_1, app._slotted.default);
			appendNode(ul, app._slotted.default);

			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(ul, null);
			}

			app._mount(target, anchor);
		},

		p: function update(changed, state) {
			var each_value = filterPosts(state.posts);

			if (changed.posts) {
				for (var i = 0; i < each_value.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].p(changed, state, each_value, each_value[i], i);
					} else {
						each_blocks[i] = create_each_block(state, each_value, each_value[i], i, component);
						each_blocks[i].c();
						each_blocks[i].m(ul, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].u();
					each_blocks[i].d();
				}
				each_blocks.length = each_value.length;
			}

			var app_changes = {};
			if (changed.loading) { app_changes.loading = state.loading; }
			app._set( app_changes );
		},

		u: function unmount() {
			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].u();
			}

			app._unmount();
		},

		d: function destroy$$1() {
			destroyEach(each_blocks);

			app.destroy(false);
		}
	};
}

// (4:4) {{#each filterPosts(posts) as post}}
function create_each_block(state, each_value, post, post_index, component) {
	var li, a, a_href_value, text_value = post.title, text;

	return {
		c: function create() {
			li = createElement("li");
			a = createElement("a");
			text = createText(text_value);
			this.h();
		},

		h: function hydrate() {
			a.href = a_href_value = "/post/" + post.key;
		},

		m: function mount(target, anchor) {
			insertNode(li, target, anchor);
			appendNode(a, li);
			appendNode(text, a);
		},

		p: function update(changed, state, each_value, post, post_index) {
			if ((changed.posts) && a_href_value !== (a_href_value = "/post/" + post.key)) {
				a.href = a_href_value;
			}

			if ((changed.posts) && text_value !== (text_value = post.title)) {
				text.data = text_value;
			}
		},

		u: function unmount() {
			detachNode(li);
		},

		d: noop$2
	};
}

function Posts(options) {
	init(this, options);
	this._state = assign(data(), options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$2(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(Posts.prototype, proto);

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};





function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var marked = createCommonjsModule(function (module, exports) {
/**
 * marked - a markdown parser
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 */

(function() {

/**
 * Block-Level Grammar
 */

var block = {
  newline: /^\n+/,
  code: /^( {4}[^\n]+\n*)+/,
  fences: noop,
  hr: /^( *[-*_]){3,} *(?:\n+|$)/,
  heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
  nptable: noop,
  lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
  blockquote: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
  list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
  html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
  table: noop,
  paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
  text: /^[^\n]+/
};

block.bullet = /(?:[*+-]|\d+\.)/;
block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
block.item = replace(block.item, 'gm')
  (/bull/g, block.bullet)
  ();

block.list = replace(block.list)
  (/bull/g, block.bullet)
  ('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')
  ('def', '\\n+(?=' + block.def.source + ')')
  ();

block.blockquote = replace(block.blockquote)
  ('def', block.def)
  ();

block._tag = '(?!(?:'
  + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
  + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
  + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';

block.html = replace(block.html)
  ('comment', /<!--[\s\S]*?-->/)
  ('closed', /<(tag)[\s\S]+?<\/\1>/)
  ('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
  (/tag/g, block._tag)
  ();

block.paragraph = replace(block.paragraph)
  ('hr', block.hr)
  ('heading', block.heading)
  ('lheading', block.lheading)
  ('blockquote', block.blockquote)
  ('tag', '<' + block._tag)
  ('def', block.def)
  ();

/**
 * Normal Block Grammar
 */

block.normal = merge({}, block);

/**
 * GFM Block Grammar
 */

block.gfm = merge({}, block.normal, {
  fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/,
  paragraph: /^/,
  heading: /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/
});

block.gfm.paragraph = replace(block.paragraph)
  ('(?!', '(?!'
    + block.gfm.fences.source.replace('\\1', '\\2') + '|'
    + block.list.source.replace('\\1', '\\3') + '|')
  ();

/**
 * GFM + Tables Block Grammar
 */

block.tables = merge({}, block.gfm, {
  nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
  table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
});

/**
 * Block Lexer
 */

function Lexer(options) {
  this.tokens = [];
  this.tokens.links = {};
  this.options = options || marked.defaults;
  this.rules = block.normal;

  if (this.options.gfm) {
    if (this.options.tables) {
      this.rules = block.tables;
    } else {
      this.rules = block.gfm;
    }
  }
}

/**
 * Expose Block Rules
 */

Lexer.rules = block;

/**
 * Static Lex Method
 */

Lexer.lex = function(src, options) {
  var lexer = new Lexer(options);
  return lexer.lex(src);
};

/**
 * Preprocessing
 */

Lexer.prototype.lex = function(src) {
  src = src
    .replace(/\r\n|\r/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2424/g, '\n');

  return this.token(src, true);
};

/**
 * Lexing
 */

Lexer.prototype.token = function(src, top, bq) {
  var this$1 = this;

  var src = src.replace(/^ +$/gm, '')
    , next
    , loose
    , cap
    , bull
    , b
    , item
    , space
    , i
    , l;

  while (src) {
    // newline
    if (cap = this$1.rules.newline.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[0].length > 1) {
        this$1.tokens.push({
          type: 'space'
        });
      }
    }

    // code
    if (cap = this$1.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      cap = cap[0].replace(/^ {4}/gm, '');
      this$1.tokens.push({
        type: 'code',
        text: !this$1.options.pedantic
          ? cap.replace(/\n+$/, '')
          : cap
      });
      continue;
    }

    // fences (gfm)
    if (cap = this$1.rules.fences.exec(src)) {
      src = src.substring(cap[0].length);
      this$1.tokens.push({
        type: 'code',
        lang: cap[2],
        text: cap[3] || ''
      });
      continue;
    }

    // heading
    if (cap = this$1.rules.heading.exec(src)) {
      src = src.substring(cap[0].length);
      this$1.tokens.push({
        type: 'heading',
        depth: cap[1].length,
        text: cap[2]
      });
      continue;
    }

    // table no leading pipe (gfm)
    if (top && (cap = this$1.rules.nptable.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i].split(/ *\| */);
      }

      this$1.tokens.push(item);

      continue;
    }

    // lheading
    if (cap = this$1.rules.lheading.exec(src)) {
      src = src.substring(cap[0].length);
      this$1.tokens.push({
        type: 'heading',
        depth: cap[2] === '=' ? 1 : 2,
        text: cap[1]
      });
      continue;
    }

    // hr
    if (cap = this$1.rules.hr.exec(src)) {
      src = src.substring(cap[0].length);
      this$1.tokens.push({
        type: 'hr'
      });
      continue;
    }

    // blockquote
    if (cap = this$1.rules.blockquote.exec(src)) {
      src = src.substring(cap[0].length);

      this$1.tokens.push({
        type: 'blockquote_start'
      });

      cap = cap[0].replace(/^ *> ?/gm, '');

      // Pass `top` to keep the current
      // "toplevel" state. This is exactly
      // how markdown.pl works.
      this$1.token(cap, top, true);

      this$1.tokens.push({
        type: 'blockquote_end'
      });

      continue;
    }

    // list
    if (cap = this$1.rules.list.exec(src)) {
      src = src.substring(cap[0].length);
      bull = cap[2];

      this$1.tokens.push({
        type: 'list_start',
        ordered: bull.length > 1
      });

      // Get each top-level item.
      cap = cap[0].match(this$1.rules.item);

      next = false;
      l = cap.length;
      i = 0;

      for (; i < l; i++) {
        item = cap[i];

        // Remove the list item's bullet
        // so it is seen as the next token.
        space = item.length;
        item = item.replace(/^ *([*+-]|\d+\.) +/, '');

        // Outdent whatever the
        // list item contains. Hacky.
        if (~item.indexOf('\n ')) {
          space -= item.length;
          item = !this$1.options.pedantic
            ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
            : item.replace(/^ {1,4}/gm, '');
        }

        // Determine whether the next list item belongs here.
        // Backpedal if it does not belong in this list.
        if (this$1.options.smartLists && i !== l - 1) {
          b = block.bullet.exec(cap[i + 1])[0];
          if (bull !== b && !(bull.length > 1 && b.length > 1)) {
            src = cap.slice(i + 1).join('\n') + src;
            i = l - 1;
          }
        }

        // Determine whether item is loose or not.
        // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
        // for discount behavior.
        loose = next || /\n\n(?!\s*$)/.test(item);
        if (i !== l - 1) {
          next = item.charAt(item.length - 1) === '\n';
          if (!loose) { loose = next; }
        }

        this$1.tokens.push({
          type: loose
            ? 'loose_item_start'
            : 'list_item_start'
        });

        // Recurse.
        this$1.token(item, false, bq);

        this$1.tokens.push({
          type: 'list_item_end'
        });
      }

      this$1.tokens.push({
        type: 'list_end'
      });

      continue;
    }

    // html
    if (cap = this$1.rules.html.exec(src)) {
      src = src.substring(cap[0].length);
      this$1.tokens.push({
        type: this$1.options.sanitize
          ? 'paragraph'
          : 'html',
        pre: !this$1.options.sanitizer
          && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
        text: cap[0]
      });
      continue;
    }

    // def
    if ((!bq && top) && (cap = this$1.rules.def.exec(src))) {
      src = src.substring(cap[0].length);
      this$1.tokens.links[cap[1].toLowerCase()] = {
        href: cap[2],
        title: cap[3]
      };
      continue;
    }

    // table (gfm)
    if (top && (cap = this$1.rules.table.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i]
          .replace(/^ *\| *| *\| *$/g, '')
          .split(/ *\| */);
      }

      this$1.tokens.push(item);

      continue;
    }

    // top-level paragraph
    if (top && (cap = this$1.rules.paragraph.exec(src))) {
      src = src.substring(cap[0].length);
      this$1.tokens.push({
        type: 'paragraph',
        text: cap[1].charAt(cap[1].length - 1) === '\n'
          ? cap[1].slice(0, -1)
          : cap[1]
      });
      continue;
    }

    // text
    if (cap = this$1.rules.text.exec(src)) {
      // Top-level should never reach here.
      src = src.substring(cap[0].length);
      this$1.tokens.push({
        type: 'text',
        text: cap[0]
      });
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return this.tokens;
};

/**
 * Inline-Level Grammar
 */

var inline = {
  escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
  autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
  url: noop,
  tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
  link: /^!?\[(inside)\]\(href\)/,
  reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
  nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
  strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
  em: /^\b_((?:[^_]|__)+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
  code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
  br: /^ {2,}\n(?!\s*$)/,
  del: noop,
  text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
};

inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;

inline.link = replace(inline.link)
  ('inside', inline._inside)
  ('href', inline._href)
  ();

inline.reflink = replace(inline.reflink)
  ('inside', inline._inside)
  ();

/**
 * Normal Inline Grammar
 */

inline.normal = merge({}, inline);

/**
 * Pedantic Inline Grammar
 */

inline.pedantic = merge({}, inline.normal, {
  strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
  em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
});

/**
 * GFM Inline Grammar
 */

inline.gfm = merge({}, inline.normal, {
  escape: replace(inline.escape)('])', '~|])')(),
  url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
  del: /^~~(?=\S)([\s\S]*?\S)~~/,
  text: replace(inline.text)
    (']|', '~]|')
    ('|', '|https?://|')
    ()
});

/**
 * GFM + Line Breaks Inline Grammar
 */

inline.breaks = merge({}, inline.gfm, {
  br: replace(inline.br)('{2,}', '*')(),
  text: replace(inline.gfm.text)('{2,}', '*')()
});

/**
 * Inline Lexer & Compiler
 */

function InlineLexer(links, options) {
  this.options = options || marked.defaults;
  this.links = links;
  this.rules = inline.normal;
  this.renderer = this.options.renderer || new Renderer;
  this.renderer.options = this.options;

  if (!this.links) {
    throw new
      Error('Tokens array requires a `links` property.');
  }

  if (this.options.gfm) {
    if (this.options.breaks) {
      this.rules = inline.breaks;
    } else {
      this.rules = inline.gfm;
    }
  } else if (this.options.pedantic) {
    this.rules = inline.pedantic;
  }
}

/**
 * Expose Inline Rules
 */

InlineLexer.rules = inline;

/**
 * Static Lexing/Compiling Method
 */

InlineLexer.output = function(src, links, options) {
  var inline = new InlineLexer(links, options);
  return inline.output(src);
};

/**
 * Lexing/Compiling
 */

InlineLexer.prototype.output = function(src) {
  var this$1 = this;

  var out = ''
    , link
    , text
    , href
    , cap;

  while (src) {
    // escape
    if (cap = this$1.rules.escape.exec(src)) {
      src = src.substring(cap[0].length);
      out += cap[1];
      continue;
    }

    // autolink
    if (cap = this$1.rules.autolink.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[2] === '@') {
        text = cap[1].charAt(6) === ':'
          ? this$1.mangle(cap[1].substring(7))
          : this$1.mangle(cap[1]);
        href = this$1.mangle('mailto:') + text;
      } else {
        text = escape(cap[1]);
        href = text;
      }
      out += this$1.renderer.link(href, null, text);
      continue;
    }

    // url (gfm)
    if (!this$1.inLink && (cap = this$1.rules.url.exec(src))) {
      src = src.substring(cap[0].length);
      text = escape(cap[1]);
      href = text;
      out += this$1.renderer.link(href, null, text);
      continue;
    }

    // tag
    if (cap = this$1.rules.tag.exec(src)) {
      if (!this$1.inLink && /^<a /i.test(cap[0])) {
        this$1.inLink = true;
      } else if (this$1.inLink && /^<\/a>/i.test(cap[0])) {
        this$1.inLink = false;
      }
      src = src.substring(cap[0].length);
      out += this$1.options.sanitize
        ? this$1.options.sanitizer
          ? this$1.options.sanitizer(cap[0])
          : escape(cap[0])
        : cap[0];
      continue;
    }

    // link
    if (cap = this$1.rules.link.exec(src)) {
      src = src.substring(cap[0].length);
      this$1.inLink = true;
      out += this$1.outputLink(cap, {
        href: cap[2],
        title: cap[3]
      });
      this$1.inLink = false;
      continue;
    }

    // reflink, nolink
    if ((cap = this$1.rules.reflink.exec(src))
        || (cap = this$1.rules.nolink.exec(src))) {
      src = src.substring(cap[0].length);
      link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
      link = this$1.links[link.toLowerCase()];
      if (!link || !link.href) {
        out += cap[0].charAt(0);
        src = cap[0].substring(1) + src;
        continue;
      }
      this$1.inLink = true;
      out += this$1.outputLink(cap, link);
      this$1.inLink = false;
      continue;
    }

    // strong
    if (cap = this$1.rules.strong.exec(src)) {
      src = src.substring(cap[0].length);
      out += this$1.renderer.strong(this$1.output(cap[2] || cap[1]));
      continue;
    }

    // em
    if (cap = this$1.rules.em.exec(src)) {
      src = src.substring(cap[0].length);
      out += this$1.renderer.em(this$1.output(cap[2] || cap[1]));
      continue;
    }

    // code
    if (cap = this$1.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      out += this$1.renderer.codespan(escape(cap[2], true));
      continue;
    }

    // br
    if (cap = this$1.rules.br.exec(src)) {
      src = src.substring(cap[0].length);
      out += this$1.renderer.br();
      continue;
    }

    // del (gfm)
    if (cap = this$1.rules.del.exec(src)) {
      src = src.substring(cap[0].length);
      out += this$1.renderer.del(this$1.output(cap[1]));
      continue;
    }

    // text
    if (cap = this$1.rules.text.exec(src)) {
      src = src.substring(cap[0].length);
      out += this$1.renderer.text(escape(this$1.smartypants(cap[0])));
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return out;
};

/**
 * Compile Link
 */

InlineLexer.prototype.outputLink = function(cap, link) {
  var href = escape(link.href)
    , title = link.title ? escape(link.title) : null;

  return cap[0].charAt(0) !== '!'
    ? this.renderer.link(href, title, this.output(cap[1]))
    : this.renderer.image(href, title, escape(cap[1]));
};

/**
 * Smartypants Transformations
 */

InlineLexer.prototype.smartypants = function(text) {
  if (!this.options.smartypants) { return text; }
  return text
    // em-dashes
    .replace(/---/g, '\u2014')
    // en-dashes
    .replace(/--/g, '\u2013')
    // opening singles
    .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
    // closing singles & apostrophes
    .replace(/'/g, '\u2019')
    // opening doubles
    .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
    // closing doubles
    .replace(/"/g, '\u201d')
    // ellipses
    .replace(/\.{3}/g, '\u2026');
};

/**
 * Mangle Links
 */

InlineLexer.prototype.mangle = function(text) {
  if (!this.options.mangle) { return text; }
  var out = ''
    , l = text.length
    , i = 0
    , ch;

  for (; i < l; i++) {
    ch = text.charCodeAt(i);
    if (Math.random() > 0.5) {
      ch = 'x' + ch.toString(16);
    }
    out += '&#' + ch + ';';
  }

  return out;
};

/**
 * Renderer
 */

function Renderer(options) {
  this.options = options || {};
}

Renderer.prototype.code = function(code, lang, escaped) {
  if (this.options.highlight) {
    var out = this.options.highlight(code, lang);
    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }

  if (!lang) {
    return '<pre><code>'
      + (escaped ? code : escape(code, true))
      + '\n</code></pre>';
  }

  return '<pre><code class="'
    + this.options.langPrefix
    + escape(lang, true)
    + '">'
    + (escaped ? code : escape(code, true))
    + '\n</code></pre>\n';
};

Renderer.prototype.blockquote = function(quote) {
  return '<blockquote>\n' + quote + '</blockquote>\n';
};

Renderer.prototype.html = function(html) {
  return html;
};

Renderer.prototype.heading = function(text, level, raw) {
  return '<h'
    + level
    + ' id="'
    + this.options.headerPrefix
    + raw.toLowerCase().replace(/[^\w]+/g, '-')
    + '">'
    + text
    + '</h'
    + level
    + '>\n';
};

Renderer.prototype.hr = function() {
  return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
};

Renderer.prototype.list = function(body, ordered) {
  var type = ordered ? 'ol' : 'ul';
  return '<' + type + '>\n' + body + '</' + type + '>\n';
};

Renderer.prototype.listitem = function(text) {
  return '<li>' + text + '</li>\n';
};

Renderer.prototype.paragraph = function(text) {
  return '<p>' + text + '</p>\n';
};

Renderer.prototype.table = function(header, body) {
  return '<table>\n'
    + '<thead>\n'
    + header
    + '</thead>\n'
    + '<tbody>\n'
    + body
    + '</tbody>\n'
    + '</table>\n';
};

Renderer.prototype.tablerow = function(content) {
  return '<tr>\n' + content + '</tr>\n';
};

Renderer.prototype.tablecell = function(content, flags) {
  var type = flags.header ? 'th' : 'td';
  var tag = flags.align
    ? '<' + type + ' style="text-align:' + flags.align + '">'
    : '<' + type + '>';
  return tag + content + '</' + type + '>\n';
};

// span level renderer
Renderer.prototype.strong = function(text) {
  return '<strong>' + text + '</strong>';
};

Renderer.prototype.em = function(text) {
  return '<em>' + text + '</em>';
};

Renderer.prototype.codespan = function(text) {
  return '<code>' + text + '</code>';
};

Renderer.prototype.br = function() {
  return this.options.xhtml ? '<br/>' : '<br>';
};

Renderer.prototype.del = function(text) {
  return '<del>' + text + '</del>';
};

Renderer.prototype.link = function(href, title, text) {
  if (this.options.sanitize) {
    try {
      var prot = decodeURIComponent(unescape(href))
        .replace(/[^\w:]/g, '')
        .toLowerCase();
    } catch (e) {
      return '';
    }
    if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0) {
      return '';
    }
  }
  var out = '<a href="' + href + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += '>' + text + '</a>';
  return out;
};

Renderer.prototype.image = function(href, title, text) {
  var out = '<img src="' + href + '" alt="' + text + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += this.options.xhtml ? '/>' : '>';
  return out;
};

Renderer.prototype.text = function(text) {
  return text;
};

/**
 * Parsing & Compiling
 */

function Parser(options) {
  this.tokens = [];
  this.token = null;
  this.options = options || marked.defaults;
  this.options.renderer = this.options.renderer || new Renderer;
  this.renderer = this.options.renderer;
  this.renderer.options = this.options;
}

/**
 * Static Parse Method
 */

Parser.parse = function(src, options, renderer) {
  var parser = new Parser(options, renderer);
  return parser.parse(src);
};

/**
 * Parse Loop
 */

Parser.prototype.parse = function(src) {
  var this$1 = this;

  this.inline = new InlineLexer(src.links, this.options, this.renderer);
  this.tokens = src.reverse();

  var out = '';
  while (this.next()) {
    out += this$1.tok();
  }

  return out;
};

/**
 * Next Token
 */

Parser.prototype.next = function() {
  return this.token = this.tokens.pop();
};

/**
 * Preview Next Token
 */

Parser.prototype.peek = function() {
  return this.tokens[this.tokens.length - 1] || 0;
};

/**
 * Parse Text Tokens
 */

Parser.prototype.parseText = function() {
  var this$1 = this;

  var body = this.token.text;

  while (this.peek().type === 'text') {
    body += '\n' + this$1.next().text;
  }

  return this.inline.output(body);
};

/**
 * Parse Current Token
 */

Parser.prototype.tok = function() {
  var this$1 = this;

  switch (this.token.type) {
    case 'space': {
      return '';
    }
    case 'hr': {
      return this.renderer.hr();
    }
    case 'heading': {
      return this.renderer.heading(
        this.inline.output(this.token.text),
        this.token.depth,
        this.token.text);
    }
    case 'code': {
      return this.renderer.code(this.token.text,
        this.token.lang,
        this.token.escaped);
    }
    case 'table': {
      var header = ''
        , body = ''
        , i
        , row
        , cell
        , flags
        , j;

      // header
      cell = '';
      for (i = 0; i < this.token.header.length; i++) {
        cell += this$1.renderer.tablecell(
          this$1.inline.output(this$1.token.header[i]),
          { header: true, align: this$1.token.align[i] }
        );
      }
      header += this.renderer.tablerow(cell);

      for (i = 0; i < this.token.cells.length; i++) {
        row = this$1.token.cells[i];

        cell = '';
        for (j = 0; j < row.length; j++) {
          cell += this$1.renderer.tablecell(
            this$1.inline.output(row[j]),
            { header: false, align: this$1.token.align[j] }
          );
        }

        body += this$1.renderer.tablerow(cell);
      }
      return this.renderer.table(header, body);
    }
    case 'blockquote_start': {
      var body = '';

      while (this.next().type !== 'blockquote_end') {
        body += this$1.tok();
      }

      return this.renderer.blockquote(body);
    }
    case 'list_start': {
      var body = ''
        , ordered = this.token.ordered;

      while (this.next().type !== 'list_end') {
        body += this$1.tok();
      }

      return this.renderer.list(body, ordered);
    }
    case 'list_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this$1.token.type === 'text'
          ? this$1.parseText()
          : this$1.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'loose_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this$1.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'html': {
      var html = !this.token.pre && !this.options.pedantic
        ? this.inline.output(this.token.text)
        : this.token.text;
      return this.renderer.html(html);
    }
    case 'paragraph': {
      return this.renderer.paragraph(this.inline.output(this.token.text));
    }
    case 'text': {
      return this.renderer.paragraph(this.parseText());
    }
  }
};

/**
 * Helpers
 */

function escape(html, encode) {
  return html
    .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function unescape(html) {
	// explicitly match decimal, hex, and named HTML entities 
  return html.replace(/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/g, function(_, n) {
    n = n.toLowerCase();
    if (n === 'colon') { return ':'; }
    if (n.charAt(0) === '#') {
      return n.charAt(1) === 'x'
        ? String.fromCharCode(parseInt(n.substring(2), 16))
        : String.fromCharCode(+n.substring(1));
    }
    return '';
  });
}

function replace(regex, opt) {
  regex = regex.source;
  opt = opt || '';
  return function self(name, val) {
    if (!name) { return new RegExp(regex, opt); }
    val = val.source || val;
    val = val.replace(/(^|[^\[])\^/g, '$1');
    regex = regex.replace(name, val);
    return self;
  };
}

function noop() {}
noop.exec = noop;

function merge(obj) {
  var arguments$1 = arguments;

  var i = 1
    , target
    , key;

  for (; i < arguments.length; i++) {
    target = arguments$1[i];
    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        obj[key] = target[key];
      }
    }
  }

  return obj;
}


/**
 * Marked
 */

function marked(src, opt, callback) {
  if (callback || typeof opt === 'function') {
    if (!callback) {
      callback = opt;
      opt = null;
    }

    opt = merge({}, marked.defaults, opt || {});

    var highlight = opt.highlight
      , tokens
      , pending
      , i = 0;

    try {
      tokens = Lexer.lex(src, opt);
    } catch (e) {
      return callback(e);
    }

    pending = tokens.length;

    var done = function(err) {
      if (err) {
        opt.highlight = highlight;
        return callback(err);
      }

      var out;

      try {
        out = Parser.parse(tokens, opt);
      } catch (e) {
        err = e;
      }

      opt.highlight = highlight;

      return err
        ? callback(err)
        : callback(null, out);
    };

    if (!highlight || highlight.length < 3) {
      return done();
    }

    delete opt.highlight;

    if (!pending) { return done(); }

    for (; i < tokens.length; i++) {
      (function(token) {
        if (token.type !== 'code') {
          return --pending || done();
        }
        return highlight(token.text, token.lang, function(err, code) {
          if (err) { return done(err); }
          if (code == null || code === token.text) {
            return --pending || done();
          }
          token.text = code;
          token.escaped = true;
          --pending || done();
        });
      })(tokens[i]);
    }

    return;
  }
  try {
    if (opt) { opt = merge({}, marked.defaults, opt); }
    return Parser.parse(Lexer.lex(src, opt), opt);
  } catch (e) {
    e.message += '\nPlease report this to https://github.com/chjj/marked.';
    if ((opt || marked.defaults).silent) {
      return '<p>An error occured:</p><pre>'
        + escape(e.message + '', true)
        + '</pre>';
    }
    throw e;
  }
}

/**
 * Options
 */

marked.options =
marked.setOptions = function(opt) {
  merge(marked.defaults, opt);
  return marked;
};

marked.defaults = {
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  sanitizer: null,
  mangle: true,
  smartLists: false,
  silent: false,
  highlight: null,
  langPrefix: 'lang-',
  smartypants: false,
  headerPrefix: '',
  renderer: new Renderer,
  xhtml: false
};

/**
 * Expose
 */

marked.Parser = Parser;
marked.parser = Parser.parse;

marked.Renderer = Renderer;

marked.Lexer = Lexer;
marked.lexer = Lexer.lex;

marked.InlineLexer = InlineLexer;
marked.inlineLexer = InlineLexer.output;

marked.parse = marked;

{
  module.exports = marked;
}

}).call(function() {
  return this || (typeof window !== 'undefined' ? window : commonjsGlobal);
}());
});

/* src/components/Post.html generated by Svelte v1.40.2 */
function data$1() {
  return {
    href: window.location.href
  };
}

var methods = {
  retry: function retry() {
    // Bypass the roadtrip router to fully reload the page.
    window.location.reload(true);
  }
};

function encapsulateStyles$1(node) {
	setAttribute(node, "svelte-1004862443", "");
}

function add_css$1() {
	var style = createElement("style");
	style.id = 'svelte-1004862443-style';
	style.textContent = "[svelte-1004862443].error-info,[svelte-1004862443] .error-info{background-color:#fff0f0!important;border:1px solid #fed7d7!important}[svelte-1004862443].error-info code,[svelte-1004862443] .error-info code{background-color:unset!important;color:red!important}";
	appendNode(style, document.head);
}

function create_main_fragment$3(state, component) {
	var if_block_anchor;

	var current_block_type = select_block_type(state);
	var if_block = current_block_type(state, component);

	var app = new App({
		_root: component._root,
		slots: { default: createFragment() },
		data: { loading: state.loading }
	});

	return {
		c: function create() {
			if_block.c();
			if_block_anchor = createComment();
			app._fragment.c();
		},

		m: function mount(target, anchor) {
			if_block.m(app._slotted.default, null);
			appendNode(if_block_anchor, app._slotted.default);
			app._mount(target, anchor);
		},

		p: function update(changed, state) {
			if (current_block_type === (current_block_type = select_block_type(state)) && if_block) {
				if_block.p(changed, state);
			} else {
				if_block.u();
				if_block.d();
				if_block = current_block_type(state, component);
				if_block.c();
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}

			var app_changes = {};
			if (changed.loading) { app_changes.loading = state.loading; }
			app._set( app_changes );
		},

		u: function unmount() {
			if_block.u();
			app._unmount();
		},

		d: function destroy$$1() {
			if_block.d();
			app.destroy(false);
		}
	};
}

// (2:2) {{#if err}}
function create_if_block$1(state, component) {
	var h1, text_1, pre, code, text_2, text_3, br, text_4, a;

	function click_handler(event) {
		component.retry();
	}

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "Error!";
			text_1 = createText("\n    ");
			pre = createElement("pre");
			code = createElement("code");
			text_2 = createText(state.err);
			text_3 = createText("\n    ");
			br = createElement("br");
			text_4 = createText("\n    ");
			a = createElement("a");
			a.textContent = "Retry";
			this.h();
		},

		h: function hydrate() {
			encapsulateStyles$1(h1);
			encapsulateStyles$1(pre);
			pre.className = "error-info";
			encapsulateStyles$1(br);
			encapsulateStyles$1(a);
			a.href = state.href;
			addListener(a, "click", click_handler);
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			insertNode(pre, target, anchor);
			appendNode(code, pre);
			appendNode(text_2, code);
			insertNode(text_3, target, anchor);
			insertNode(br, target, anchor);
			insertNode(text_4, target, anchor);
			insertNode(a, target, anchor);
		},

		p: function update(changed, state) {
			if (changed.err) {
				text_2.data = state.err;
			}

			if (changed.href) {
				a.href = state.href;
			}
		},

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			detachNode(pre);
			detachNode(text_3);
			detachNode(br);
			detachNode(text_4);
			detachNode(a);
		},

		d: function destroy$$1() {
			removeListener(a, "click", click_handler);
		}
	};
}

// (7:2) {{else}}
function create_if_block_1(state, component) {
	var h1, text_value = state.post.title, text, text_1, div, raw_value = marked(state.content), text_2, br, text_3, p, text_5, p_1, strong_1, text_6, text_7_value = state.post.publishedAt, text_7;

	return {
		c: function create() {
			h1 = createElement("h1");
			text = createText(text_value);
			text_1 = createText("\n    ");
			div = createElement("div");
			text_2 = createText("\n    ");
			br = createElement("br");
			text_3 = createText("\n    ");
			p = createElement("p");
			p.innerHTML = "<strong>- EOF -</strong>";
			text_5 = createText("\n    ");
			p_1 = createElement("p");
			strong_1 = createElement("strong");
			text_6 = createText("Last modified: ");
			text_7 = createText(text_7_value);
			this.h();
		},

		h: function hydrate() {
			encapsulateStyles$1(h1);
			encapsulateStyles$1(div);
			encapsulateStyles$1(br);
			encapsulateStyles$1(p);
			encapsulateStyles$1(p_1);
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			appendNode(text, h1);
			insertNode(text_1, target, anchor);
			insertNode(div, target, anchor);
			div.innerHTML = raw_value;
			insertNode(text_2, target, anchor);
			insertNode(br, target, anchor);
			insertNode(text_3, target, anchor);
			insertNode(p, target, anchor);
			insertNode(text_5, target, anchor);
			insertNode(p_1, target, anchor);
			appendNode(strong_1, p_1);
			appendNode(text_6, strong_1);
			appendNode(text_7, strong_1);
		},

		p: function update(changed, state) {
			if ((changed.post) && text_value !== (text_value = state.post.title)) {
				text.data = text_value;
			}

			if ((changed.content) && raw_value !== (raw_value = marked(state.content))) {
				div.innerHTML = raw_value;
			}

			if ((changed.post) && text_7_value !== (text_7_value = state.post.publishedAt)) {
				text_7.data = text_7_value;
			}
		},

		u: function unmount() {
			div.innerHTML = '';

			detachNode(h1);
			detachNode(text_1);
			detachNode(div);
			detachNode(text_2);
			detachNode(br);
			detachNode(text_3);
			detachNode(p);
			detachNode(text_5);
			detachNode(p_1);
		},

		d: noop$2
	};
}

function select_block_type(state) {
	if (state.err) { return create_if_block$1; }
	return create_if_block_1;
}

function Post(options) {
	init(this, options);
	this._state = assign(data$1(), options.data);

	if (!document.getElementById("svelte-1004862443-style")) { add_css$1(); }

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$3(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(Post.prototype, methods, proto);

var redirectFrom = sessionStorage.getItem('redirect');
if (redirectFrom) {
  history.replaceState({}, '', redirectFrom.replace(/\.html$/, ''));
  sessionStorage.removeItem('redirect');
}

roadtrip
  .add('/', createRoute(About))
  .add('/activity', createRedirect('/post/activity'))
  .add('/posts', Object.assign(createRoute(Posts), {
    beforeenter: function beforeenter(route, prevRoute) {
      showLoadingHint(prevRoute);
      return Promise.all([fetchPosts(false), wait(100)]);
    }
  }))
  .add('/post/:slug', {
    beforeenter: function beforeenter(route, prevRoute) {
      showLoadingHint(prevRoute);
      var key = route.params.slug;
      var loadP = Promise.all([fetchPost(key), fetchPosts(false)])
        .then(function (res) {
          route.data = { content: res[0], post: getPostInfo(key) };
        })
        .catch(function (err) {
          route.data = { err: err };
        });
      return Promise.all([loadP, wait(200)]);
    },

    enter: function enter(route, prevRoute) {
      if (prevRoute && prevRoute.view) {
        prevRoute.view.destroy();
      }
      route.view = createView(Post, route.data);
      if ((route.data.post || {}).title) {
        window.document.title = route.data.post.title + ' - Cyandev';
      }
    }
  })
  .start({
    fallback: '/'
  });

function showLoadingHint(onRoute) {
  ((onRoute.view || {}).set || noop).call(onRoute.view, { loading: true });
}

function createRedirect(to) {
  return {
    enter: function enter(route, prevRoute) {
      if (prevRoute && prevRoute.view) {
        route.view = prevRoute.view;
      }
      roadtrip.goto(to);
    }
  };
}

function createRoute(Component, data) {
  return {
    enter: function enter(route, prevRoute) {
      if (prevRoute && prevRoute.view) {
        prevRoute.view.destroy();
      }
      route.view = createView(Component, data);
      window.document.title = 'Cyandev';
    },

    leave: function leave(route, nextRoute) {
      // Defer destroying to next route's enter period.
    }
  };
}

function createView(Component, data) {
  return new Component({
    target: document.getElementById('root'),
    data: data
  });
}

function noop() { }

function wait(ms) {
  return new Promise(function (fulfill) {
    setTimeout(fulfill, ms);
  });
}

}());
//# sourceMappingURL=bundle.js.map
