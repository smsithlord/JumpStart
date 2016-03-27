/*	
	CURRENT DEV STATUS:
		Runs with very limited functionality in both Altspace & Chrome.
*/

// Global objects
window.g_deltaTime = null;

function JumpStart()
{
	this.version = "0.2.0";

	// Only allow ONE instance
	if( window.hasOwnProperty("jumpStart") )
		return;

	// Display some info into the console for devs
	var helpText = "";
	helpText += "***************************\n";
	helpText += "**** JumpStart  v" + this.version + " ****\n";
	helpText += "***************************";

	if( !(window.hasOwnProperty("altspace") && window.altspace.inClient) )
	{
		helpText += "\n**** Web Controls:     ****\n";
		helpText += "****  WASD - Movement  ****\n";
		helpText += "****  RMB  - Set Look  ****\n";
		helpText += "***************************";
	}

	console.log(helpText);

	// Variable values will be filled in ASAP, but declare them all here for sanity.
	// Fire onPrecache when there's enough of JumpStart loaded for the app to specify what IT needs preloaded.
	// Fire onReady when everything is preloaded & the system is ready but NOT ticking.
	// Fire onTick every tick after the app has started the simulation.

	// List all PUBLIC member variables
	var publicVariables = [
		"util",	// Helper class.
		"requestedRoomId",	// Given in the URI query as "room". null if none.
		"isAltspace",	// Altspace or web mode
		"isGear",
		"isInitialized",
		"isEnclosure",	// Enclosure or personal browser
		"camera",
		"renderer",
		"clock",
		"raycaster",
		"cursorRay",
		"enclosure",
		"localUser",
		"scene",
		"deltaTime",
		"crosshair",
		"gamepads",
		"activeGamepad",
		"worldOffset"
	];

	// Declare them all as null
	var i;
	for( i in publicVariables )
		this[publicVariables[i]] = null;

	// List all PRIVATE member variables
	var privateVariables = [
		"state",	// 0: ready for setOptions	1: ready for precacheFile and doneCaching	2: ready for run	3: running
		"options",
		"futureCursorRay",
		"clickedObject",
		"hoveredObject",
		"webLook",
		"webLookPrev",
		"webMouse",
		"gamepadsEnabled",
		"activeGamepad",
		"boundFadeObjects",
		"models",
		"objects",
		"cursorPlanes",
		"listeners",
		"raycastArray",	// gets used locally every tick
		"freshObjects", // a list of objects that were spawned in the current tick
		"debug"	// Helper class
		//"octree"	// Octree disabled for now
	];

	// Declare them all as null
	for( i in privateVariables )
		this[privateVariables[i]] = null;

	// Set as many synchronous non-null PUBLIC member variables as possible
	this.util = new JumpStartUtil(this);

	this.requestedRoomId = this.util.getQueryVariable("room");
	this.isAltspace = (window.hasOwnProperty("altspace") && window.altspace.inClient);
	this.isGear = navigator.userAgent.match(/mobile/i);
	this.isInitialized = false;
	this.gamepads = (this.isAltspace) ? altspace.getGamepads() : navigator.getGamepads();
	this.hoveredObject = null;
	this.clickedObject = null;

	// Set as many synchronous non-null PRIVATE member veriables as possible 
	this.options =
	{
		"appId": "example",
		"multiuserOnly": false,
		"enclosureOnly": true,
		"worldScale": 1.0,	// relative scale
		"scaleWithEnclosure": true,	// false means consistent size, regardless of enclosure size
		"timeScale": 1.0,
		"webControls": true,
		"debug":
		{
			"enabled": true,
			"showCursorPlanes": false
		},
		"camera":
		{
			"position": {x: 200, y: 240, z: 800}
		}
	};
	this.models = [];
	this.objects = {};
	this.raycastArray = [];
	this.freshObjects = [];
	this.cursorPlanes = {};
	this.listeners = {
		"precache": {},
		"ready": {},
		"tick": {},
		"cursordown": {},
		"cursorup": {},
		"cursormove": {}
	};

	// Attach default window-level event listeners
	if( !this.isAltspace )
		window.addEventListener( 'resize', function() { jumpStart.onWindowResize(); }, false );

	// FIX ME: Add & debug GearVR gesture events!
	//altspace.addEventListener("touchpadgesture", onTouchpadGesture);




	// ********************************************************************************* //
	// All systems go.  Begin async tomfoolery.  Organized into sub-routines for sanity. //
	// ********************************************************************************* //

	// ASYNC 1: Load all CSS / JavaScript files sequentially
	loadHeadFiles.call(this).then(function()
	{
		// Startup the debug stuff, if needed
		if( this.options.debug.enabled )
			this.debugUtil = new JumpStartDebug();

		// ASYNC 2: Wait for the BODY element (so the app has time to setOptions)
		this.util.DOMReady.call(this).then(function()
		{
			// Make sure the options.camera.position has been turned into vector (only happens IF setOptions gets called)
			if( !(this.options.camera.position instanceof THREE.Vector3) )
				this.options.camera.position = new THREE.Vector3(this.options.camera.position.x, this.options.camera.position.y, this.options.camera.position.z);

			// ASYNC 3: Resolve environment variables (enclosures, offsets, & scales)
			resolveEnvironment.call(this).then(function()
			{
				// Note that a unique (but not exact) pixelsPerMeter value is used to identify the personal browser.
				this.isEnclosure = (this.isAltspace && Math.abs(this.enclosure.pixelsPerMeter - 521) > 1) ? true : false;

				// Attach body-level event listeners for web mode
				if( !this.isAltspace && this.options.webControls )
				{
					// FIX ME: Make sure that these useCapture and preventDefaults are properly setup for web mode in these listeners
					window.addEventListener( 'mousemove', function(e) { jumpStart.onMouseMove(e); }, false);
					window.addEventListener( 'mousedown', function(e) { jumpStart.onMouseDown(e); e.preventDefault(); return false; }, false);
					window.addEventListener( 'mouseup', function(e) { jumpStart.onMouseUp(e); e.preventDefault(); return false; }, false);

					document.body.addEventListener("contextmenu", function(e) { e.preventDefault(); return false; }, true);
					document.body.addEventListener("keydown", function(keydownEvent)
					{
						switch(keydownEvent.keyCode )
						{
							case 83:
								g_camera.translateZ(20);
								break;

							case 87:
								g_camera.translateZ(-20);
								break;

							case 65:
								g_camera.translateX(-20);
								break;

							case 68:
								g_camera.translateX(20);
								break;
						}
					}, true);
				}

				// FIX ME: A global onLoadedInPersonalBrowser callback might be useful
				if( this.isAltspace && this.options.enclosureOnly && !this.isEnclosure )
				{
					// We are going to abort, but if we are an online app and don't have a room yet, we need to grab one NOW.

					if( this.options.multiuserOnly )
					{
						// 1. connect to firebase
						// 2. create a new room
						// 3. set it as the room ID in the URL
						// 4. continue to abort. This way when the user beams it, it is the correct URL.

						// Display the "Beam Me" panel and abort.
						this.util.displayInfoPanel("beamMe");

						// Must call render once for Altspace to know we want a 3D enclosure
						this.renderer = altspace.getThreeJSRenderer();
						this.renderer.render(null, null);

						/*
							// FIX ME: This destroys the entire URI query.
							var pathName = document.location.pathname;
							pathName = pathName.substring(pathName.lastIndexOf("/") + 1);
							history.replaceState(null, document.title, pathName + "?room=420");
						*/
					}
					else
					{
						// Display the "Beam Me" panel and abort.
						this.util.displayInfoPanel("beamMe");

						// Must call render once for Altspace to know we want a 3D enclosure
						this.renderer = altspace.getThreeJSRenderer();
						this.renderer.render(null, null);
					}
				}
				else if( this.options.multiuserOnly )
				{
					// If this is a multiuser app and no room ID was given in the URI, then...
					// 1. connect to firebase
					// 2. create a new room
					// 3. set it as the room ID in the URL
					// 4. connect to the room and continue to startup (without reloading on the current client or ANY client if possible).

					// FIX ME: do it.
				}
				else
				{
					// Non-synced app is ready to rock 'n roll
					onReadyToPrecache.call(this);
				}
			}.bind(this));
		}.bind(this));
	}.bind(this));

	function onReadyToPrecache()
	{
		// Get stuff ready that we might use during precache
		this.objectLoader = new THREE.OBJMTLLoader();

		if( !this.isAltspace )
			onGetSkeleton.call(this, null);
		else
		{
			// Async
			altspace.getThreeJSTrackingSkeleton().then(function(skeleton)
			{
				onGetSkeleton.call(this, skeleton);
			}.bind(this));
		}

		function onGetSkeleton(skeleton)
		{
			this.localUser.skeleton = skeleton;

			// We are now initialized
			this.isInitialized = true;

			// Check for precache listeners
			var asyncRequested = false;
			var listenerName, result;
			for( listenerName in this.listeners.precache )
			{
				result = this.listeners.precache[listenerName]() || false;
				if( !result )
					asyncRequested = true;
			}

			// We are only done caching if async was NOT requested
			if( !asyncRequested )
				this.doneCaching();
			else
				console.log("WARNING: Asynchronous precaching initiated by a listener.");
		}
	}

	function loadHeadFiles()
	{
		// Async
		return {
				"then": function(loadHeadFilesCallback)
				{
					// Define the list of CSS files
					var baseStyles = ["engine/misc/JumpStartStyle.css"];

					// Load extra stuff if we are in debug mode
					if( this.options.debug.enabled )
						baseStyles.push("engine/misc/JumpStartStyleDebug.css");

					// Load all the CSS files
					this.util.loadStylesheets(baseStyles).then(function()
					{
						console.log("Loaded " + baseStyles.length + " stylesheet(s).");

						// Define the list of JavaScript files
						var baseScripts = [
							"https://cdn.firebase.com/js/client/2.3.2/firebase.js",
							"http://sdk.altvr.com/libs/three.js/r73/build/three.min.js",
							"http://sdk.altvr.com/libs/three.js/r73/examples/js/loaders/OBJMTLLoader.js",
							"http://sdk.altvr.com/libs/three.js/r73/examples/js/loaders/MTLLoader.js",
							"http://sdk.altvr.com/libs/altspace.js/0.5.3/altspace.min.js"
							//"engine/misc/threeoctree.js"	// Octree disabled for now
						];

						// Load extra stuff if we are in debug mode
						if( this.options.debug.enabled )
							baseScripts.push("engine/misc/JumpStartDebug.js");

						// Load all the JavaScript files
						this.util.loadJavaScripts(baseScripts).then(function(result)
							{
								console.log("Loaded " + baseScripts.length + " JavaScript(s).");
								loadHeadFilesCallback();
							}.bind(this));
					}.bind(this));
				}.bind(this)
			};
	}

	function resolveEnvironment()
	{
		// Async
		return {
				"then": function(resolveEnvironmentCallback)
				{
					// Either get the enclosure or spoof it then call onGetEnclosure
					if( !this.isAltspace )
					{
						// Spoof the enclosure for web mode
						var commonVal = Math.round(1024 / 2.5);	// FIX ME: Why this magic number?
						var pixelsPerMeter = 100;	// FIX ME: Why this magic number?

						if( !this.options["scaleWithEnclosure"] )
							this.options.worldScale *= pixelsPerMeter / 100;	// FIX ME: Why this magic number?

						var enclosure = {
							"innerWidth": commonVal,
							"innerHeight": commonVal,
							"innerDepth": commonVal,
							"scaledWidth": Math.round(commonVal * (1 / this.options.worldScale)),
							"scaledHeight": Math.round(commonVal * (1 / this.options.worldScale)),
							"scaledDepth": Math.round(commonVal * (1 / this.options.worldScale)),
							"pixelsPerMeter": pixelsPerMeter
						};

						// FIX ME: Web mouse should be put into its own calss.
						this.webMouse = {"x": commonVal / 2.0, "y": commonVal / 2.0};

						onGetEnclosure.call(this, enclosure);
					}
					else
					{
						// Async
						altspace.getEnclosure().then(function(enclosure)
						{
							if( !this.options["scaleWithEnclosure"] )
								this.options.worldScale *= enclosure.pixelsPerMeter / 100.0;	// FIX ME: Why this magic number?

							// FIX ME: These are only needed in specific cases.
							enclosure.adjustedWidth = Math.round(enclosure.innerWidth * this.options.worldScale);
							enclosure.adjustedHeight = Math.round(enclosure.innerHeight * this.options.worldScale);
							enclosure.adjustedDepth = Math.round(enclosure.innerDepth * this.options.worldScale);

							enclosure.scaledWidth = enclosure.innerWidth * (1 / this.options.worldScale);
							enclosure.scaledHeight = enclosure.innerHeight * (1 / this.options.worldScale);
							enclosure.scaledDepth = enclosure.innerDepth * (1 / this.options.worldScale);

							onGetEnclosure.call(this, enclosure);
						}.bind(this));
					}

					function onGetEnclosure(enclosure)
					{
						this.enclosure = enclosure;

						// Either get the user or spoof it then call onGetUser
						if( !this.isAltspace )
						{
							// Spoof the user for web mode
							var user = {
								"userId": "WebUser" + Date.now(),
								"isLocal": true,
								"displayName": "WebUser"
							};

							onGetUser.call(this, user);
						}
						else
						{
							// Async
							altspace.getUser().then(function(user)
							{
								onGetUser.call(this, user);
							}.bind(this));
						}

						function onGetUser(user)
						{
							user.cursorRayOrigin = new THREE.Vector3();
							user.cursorRayDirection = new THREE.Vector3();
							user.cursorHit = null;

							this.localUser = user;
							resolveEnvironmentCallback();
						}
					}
				}.bind(this)
		}
	}
}

JumpStart.prototype.spawnCursorPlane = function(options)
{
	var defaultOptions = {
		"width": this.enclosure.scaledWidth,
		"height": this.enclosure.scaledHeight,
		"parent": this.scene
	};

	// Merg options with defaultOptions
	if( !!options )
	{
		var x;
		for( x in defaultOptions )
			options[x] = (!!options[x]) ? options[x] : defaultOptions[x];
	}
	else
		options = defaultOptions;

	// Now create the hit plane
	// color generator from:
	// http://stackoverflow.com/questions/1484506/random-color-generator-in-javascript
	function getRandomColor() {
		var letters = '0123456789abcdef'.split('');
		var color = '#';
		for (var i = 0; i < 6; i++ ) {
			color += letters[Math.floor(Math.random() * 16)];
		}

		return color;
	}

	var depth = 0;
	var cursorPlane;

	cursorPlane = new THREE.Mesh(
		new THREE.BoxGeometry(options.width, options.height, depth),
		new THREE.MeshBasicMaterial( { color: getRandomColor(), transparent: true, opacity: 0.5, visible: this.options.debug["showCursorPlanes"] })
	);

	this.spawnInstance(null, {"object": cursorPlane, "parent": options.parent});
	return cursorPlane;
};

JumpStart.prototype.onCursorMove = function(e)
{
	if( e.hasOwnProperty("ray") )
		this.futureCursorRay = e.ray;
	else
		this.futureCursorRay = e.cursorRay;	// Only needed until 0.1 is completely depreciated
};

JumpStart.prototype.doneCaching = function()
{
	// Now it's time to initiate the THREE.js scene...
	this.worldOffset = new THREE.Vector3(0.0, -this.enclosure.scaledHeight / 2.0, 0.0);

	this.scene = new THREE.Scene();
	this.scene.scale.multiplyScalar(this.options.worldScale);
	this.scene.addEventListener( "cursormove", function(e) { jumpStart.onCursorMove(e); });
	this.scene.addEventListener("cursordown", function(e) { jumpStart.onCursorDown(e); });
	this.scene.addEventListener("cursorup", function(e) { jumpStart.onCursorUp(e); });

	this.clock = new THREE.Clock();
	this.raycaster = new THREE.Raycaster();

	// FIXME: Why is this a spoofed ray?  We should have THREE.js loaded by now to make a real one.
	this.cursorRay = {"origin": new THREE.Vector3(), "direction": new THREE.Vector3()};
	this.futureCursorRay = {"origin": new THREE.Vector3(), "direction": new THREE.Vector3()};

	// Create the octree (disabled for now)
	//this.octree = new THREE.Octree({"undeferred": false, "depthMax": Infinity, "objectsThreshold": 8, "overlapPct": 0.15});

	if ( !this.isAltspace )
	{
		this.renderer = new THREE.WebGLRenderer({ alpha: true });
		this.renderer.setClearColor( 0x00ff00, 0.3 );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		document.body.appendChild( this.renderer.domElement );

		var aspect = window.innerWidth / window.innerHeight;
		this.camera = new THREE.PerspectiveCamera(45, aspect, 1, 2000 * this.options.worldScale );

		var pos = this.options.camera.position.clone().multiplyScalar(this.options.worldScale).add(this.worldOffset);
		this.camera.position.copy(pos);

		var lookAtSpot = this.worldOffset.clone().multiplyScalar(this.options.worldScale);
		lookAtSpot.y += 50;

		this.camera.lookAt(lookAtSpot);

		this.localUser.cursorRayOrigin.copy(this.camera.position);

		// OBJMTLLoader always uses PhongMaterial, so we need light in scene.
		var ambient = new THREE.AmbientLight( 0xffffff );
		this.scene.add( ambient );
	}
	else
		this.renderer = altspace.getThreeJSRenderer();

	// Copy JumpStart's values to the globals for easy access.
	window.g_camera = this.camera;
	
	this.isReady = true;

	// Check for ready listeners
	var asyncRequested = false;
	var listenerName, result;
	for( listenerName in this.listeners.ready )
	{
		result = this.listeners.ready[listenerName]() || false;
		if( !result )
			asyncRequested = true;
	}

	// We are only done caching if async was NOT requested
	if( !asyncRequested )
		this.run();
	else
		console.log("WARNING: Asynchronous ready-idle initiated by a listener.");
};

JumpStart.prototype.run = function()
{
	console.log("Simulation started.");
	this.isRunning = true;

	this.onTick();
};

JumpStart.prototype.onTick = function()
{
	if( !this.isInitialized || !this.isRunning)
		return;

	var count = 0;
	var x, object, y;
	for( x in this.objects )
	{
		object = this.objects[x];
		if( object.parent !== this.scene )
		{
			// FIX ME: Delete this property from the object.
			console.log("It's gone!!");
		}
		else
		{
			// Apply any object.visible settings since last tick
			if( object.spoofVisible !== object.visible )
			{
				object.spoofVisible = object.visible;

				if( object.visible )
					this.makeMaterialsVisible(object);
				else
					this.makeMaterialsInvisible(object);
			}

			// Determine if this will be raycasted against this tick
			if( object.blocksLOS )
			{
				this.raycastArray[count] = object;
				count++;
			}

			// Check for tick listeners on the object
			for( y in object.listeners.tick )
				object.listeners.tick[y].call(object);
		}
	}

	this.raycastArray.length = count;

	// Check for spawn listeners on fresh objects
	var i, freshObject, listenerName;
	for( i in this.freshObjects )
	{
		freshObject = this.freshObjects[i];

		for( listenerName in freshObject.listeners.spawn )
			freshObject.listeners.spawn[listenerName].call(freshObject);
	}
	this.freshObjects.length = 0;

	// Check for tick listeners
	var listenerName;
	for( listenerName in this.listeners.tick )
		this.listeners.tick[listenerName]();

	requestAnimationFrame( function(){ jumpStart.onTick(); } );
	this.renderer.render( this.scene, this.camera );

	this.deltaTime = this.clock.getDelta();
	this.deltaTime *= this.options.timeScale;

	// FIX ME: Need better management of globals
	window.g_deltaTime = this.deltaTime;

	this.processCursorMove();
};

JumpStart.prototype.makeMaterialsInvisible = function(object)
{
	object.traverse(function(child)
	{
		if( child.material && child.material instanceof THREE.MeshPhongMaterial )
		{
			child.material.visible = false;
		}
	}.bind(this));
};

JumpStart.prototype.makeMaterialsVisible = function(object)
{
	object.traverse(function(child)
	{
		if( child.material && child.material instanceof THREE.MeshPhongMaterial )
		{
			child.material.visible = true;
		}
	}.bind(this));
};

JumpStart.prototype.onMouseMove = function(e)
{
	if( this.isAltspace || !this.isRunning )
		return;

	// Fill with 2D position for now
	var mouse3D = new THREE.Vector3(0, 0, 0);
	mouse3D.x = (e.clientX / window.innerWidth) * 2 - 1;
	mouse3D.y = -(e.clientY / window.innerHeight) * 2 + 1;
	mouse3D.z = 0.5;

	this.webMouse.x = mouse3D.x;
	this.webMouse.y = mouse3D.y;

	// Convert the 2D position to a 3D point
	mouse3D.unproject(this.camera);

	// Get a look vector from the camera to mouse3D
	var direction = new THREE.Vector3();
	direction = mouse3D.sub(this.camera.position).normalize();

	this.futureCursorRay.origin = this.camera.position;
	this.futureCursorRay.direction = direction;
};

JumpStart.prototype.onMouseDown = function(e)
{
	if( !this.isRunning )
		return;

	switch( e.button )
	{
		case 0:
			this.onCursorDown();
			break;

		case 2:
			var pos = this.localUser.cursorRayOrigin.clone().add(this.localUser.cursorRayDirection);
			this.camera.lookAt(pos);
			break;
	}
};

JumpStart.prototype.onMouseUp = function(e)
{
	if( !this.isRunning )
		return;

	switch( e.button )
	{
		case 0:
			this.onCursorUp();
			break;

		case 2:
			break;
	}
};

JumpStart.prototype.processCursorMove = function()
{
	if( !this.isRunning )
		return;

	this.cursorRay = this.futureCursorRay;

	// Update the local user's look info
	this.localUser.cursorRayOrigin.copy(this.cursorRay.origin);
	this.localUser.cursorRayOrigin.multiplyScalar(1.0 / this.options.worldScale);
	this.localUser.cursorRayDirection.copy(this.cursorRay.direction);

	// Set the raycaster
	this.raycaster.set(this.cursorRay.origin, this.cursorRay.direction);

	// Octree disabled for now
	/* http://threejs.org/examples/#webgl_octree_raycasting
	var octreeObjects = this.octree.search( this.cursorRay.origin, 200000, true, this.cursorRay.direction );
	var intersections = this.raycaster.intersectOctreeObjects( octreeObjects );
	if( intersections.length )
	{
		console.log("yar");
	}
	*/

	// FIX ME: Might want to raycast against collision boxes of all objects, then another raycast against the faces of intersected objects.
	var intersects = this.raycaster.intersectObjects(this.raycastArray, true);	// FIX ME: Wish there was a way to quit after 1st "hit".

	// Hover events
	var hasIntersection = false;
	var x, object;
	for( x in intersects )
	{
		intersection = intersects[x];

		object = intersection.object;
		while( !object.hasOwnProperty("blocksLOS") )
			object = object.parent;

		// If there already is a hovered object, unhover it.
		if( this.hoveredObject && this.hoveredObject !== object )
			unhover.call(this, this.hoveredObject);

		if( !this.hoveredObject )
		{
			this.hoveredObject = object;

			// Check for cursorenter listeners
			// FIX ME: Add support for event bubbling
			var listenerName;
			for( listenerName in object.listeners.cursorenter )
				object.listeners.cursorenter[listenerName].call(object);
		}

		this.localUser.cursorHit = intersection;
		this.localUser.cursorHit.scaledPoint = intersection.point.clone().multiplyScalar(1 / this.options.worldScale);
		/*
		this.localUser.cursorHit.scaledPoint = {
			"x": intersection.point.x / this.options.worldScale,
			"y": intersection.point.y / this.options.worldScale,
			"z": intersection.point.z / this.options.worldScale
		};
		*/
		hasIntersection = true;
		break;
	}

	if( !hasIntersection )
		this.localUser.cursorHit = null;

	// If nothing is hovered, then unhover us
	if( this.hoveredObject && !hasIntersection )
		unhover.call(this, this.hoveredObject);

	function unhover(object)
	{
		var oldObject = this.hoveredObject;
		this.hoveredObject = null;

		// Check for cursorexit listeners
		// FIX ME: Add support for event bubbling
		var listenerName;
		for( listenerName in oldObject.listeners.cursorexit )
			oldObject.listeners.cursorexit[listenerName].call(oldObject);
	}
};

JumpStart.prototype.onCursorDown = function(e)
{
	if( this.hoveredObject )
	{
		// Check for cursordown listeners
		var listenerName;
		for( listenerName in this.hoveredObject.listeners.cursordown )
			this.hoveredObject.listeners.cursordown[listenerName].call(this.hoveredObject);

		this.clickedObject = this.hoveredObject;
	}
};

JumpStart.prototype.onCursorUp = function(e)
{
	if( this.clickedObject )
	{
		// Check for cursorup listeners
		var listenerName;
		for( listenerName in this.clickedObject.listeners.cursorup )
			this.clickedObject.listeners.cursorup[listenerName].call(this.clickedObject);

		this.clickedObject = null;
	}
};

JumpStart.prototype.onWindowResize = function()
{
	if( jumpStart.isAltspace )
		return;

	jumpStart.camera.aspect = window.innerWidth / window.innerHeight;
	jumpStart.camera.updateProjectionMatrix();
	jumpStart.renderer.setSize(window.innerWidth, window.innerHeight);
};

JumpStart.prototype.loadModels = function(fileNames)
{
	// fileNames are relative to the "assets/[appId]/" path.
	// Convert all fileNames to valid paths.

	var i;
	for( i in fileNames )
	{
		fileNames[i] = "assets/" + this.options.appId + "/" + fileNames[i];
	}

	// Return a promise-like structure
	// FIX ME: Logic only executes if the caller requests the "then" function. Same with all async "then"-syntax returns in JumpStart.
	return {
			"then": function(callback)
			{
				promiseCallback = callback;

				var found = fileNames[0].lastIndexOf("/");
				//var urlTrunk = (found > 0) ? fileNames[0].substring(0, found) : "";
				var urlFile = (found > 0 ) ? fileNames[0].substring(found+1) : fileNames[0];

				found = location.pathname.lastIndexOf("/");
				var urlPath = (found > 0) ? location.pathname.substring(1, found) : "";

				var multiloader = altspace.utilities.multiloader;
				multiloader.init({
					crossOrigin: "anonymous",
					baseUrl: ""
				});

				var loadRequest = new multiloader.LoadRequest();
				var i, fileName;
				for( i = 0; i < fileNames.length; i++ )
				{
					fileName = fileNames[i];
					loadRequest.objUrls.push(urlPath + "/" + fileName + ".obj");
					loadRequest.mtlUrls.push(urlPath + "/" + fileName + ".mtl");
				}

				multiloader.load(loadRequest, function()
				{
					var i, object, fileName;
					for( i = 0; i < loadRequest.objects.length; i++ )
					{
						object = loadRequest.objects[i];

						fileName = loadRequest.objUrls[i];
						if( urlPath !== "" )
							fileName = fileName.substring(urlPath.length + 1);

						fileName = fileName.substring(0, fileName.length - 4);

						this.models.push({
							"modelFile": fileName,
							"object": object
						});
					}

					console.log("Loaded " + loadRequest.objectsLoaded + " model(s).");
					promiseCallback(fileNames.length);
				}.bind(this));
			}.bind(this)
		};
};

// PURPOSE:
//	- Private method for checking if a model is already cached.
JumpStart.prototype.findModel = function(modelFile)
{
	modelFile = "assets/" + this.options.appId + "/" + modelFile;
	
	var i, model;
	for( i = 0; i < this.models.length; i++ )
	{
		model = this.models[i];
		if( model.modelFile === modelFile )
			return model;
	}
};

JumpStart.prototype.removeInstance = function(instance)
{
	var x, object;
	for( x in this.objects )
	{
		object = this.objects[x];

		if( object === instance )
		{
			// Unhover this object, but ignore listeners
			if( this.hoveredObject === object )
				this.hoveredObject = null;

			// Unclick this object, but ignore listeners
			if( this.clickedObject === object )
				this.clickedObject = null;

			// Now remove this object
			for( listenerName in object.listeners.remove )
				object.listeners.remove[listenerName].call(object);

			object.parent.remove(object);

			delete this.objects[x];
			break;
		}
	}
};

JumpStart.prototype.spawnInstance = function(modelFile, options)
{
	if( !modelFile )
		modelFile = "";

	var defaultOptions = {
		"object": null,
		"parent": this.scene
	};

	// Merg options with defaultOptions
	if( !!options )
	{
		var x;
		for( x in defaultOptions )
			options[x] = (!!options[x]) ? options[x] : defaultOptions.height;
	}
	else
		options = defaultOptions;

	var instance;
	if( options.object )
		instance = options.object;
	else if( modelFile !== "" )
	{
		var existingModel = this.findModel(modelFile);

		if( !existingModel )
		{
			console.log("ERROR: The model " + modelFile + " is not yet cached.");
			return;
		}
		else
			instance = existingModel.object.clone();
	}
	else
		instance = new THREE.Object3D();

	instance.position.set(0, this.worldOffset.y, 0);

	/* OCTREE DISABLED FOR NOW
	// FIXME: Objects should only be added to the octree when they are blocksLOS = true
	var i, mesh;
	for( i in instance.children )
	{
		mesh = instance.children[i];

		if( mesh.geometry.faces.length > 0 )
			this.octree.add( mesh, { "useFaces": true } );
	}
	*/
	
	this.scene.add(instance);

	// We will need to check for spawn listeners on this object before the next tick
	this.freshObjects.push(instance);

	// Compute a collision radius based on a bounding sphere for a child mesh that contains geometry
	var computedRadius = 0.0;
	var i, mesh;
	for( i in instance.children )
	{
		mesh = instance.children[i];

		if( mesh.geometry.faces.length > 0 )
		{
			mesh.geometry.computeBoundingSphere();
			computedRadius = mesh.geometry.boundingSphere;
			break;
		}
	}

	// List all the object-level listeners
	var validEvents = ["tick", "cursorenter", "cursorexit", "cursordown", "cursorup", "spawn", "remove"];
	var computedListeners = {};
	for( i in validEvents )
		computedListeners[validEvents[i]] = {};

	// Just extend this object instead of adding a namespace
	var originalAddEventListener = window.addEventListener;
	var originalRemoveEventListener = window.removeEventListener;

	var jumpStartData = {
		"blocksLOS": false,
		"radius": computedRadius,
		"listeners": computedListeners,
		"spoofVisible": true,	// because Altspace does not respect object.visible values directly
		"addEventListener": function(eventType, listener)
		{
			// Make sure this is a valid event type
			if( validEvents.indexOf(eventType) < 0 )
			{
				console.log("WARNING: Invalid event type \"" + eventType + "\" specified. Applying as non-JumpStart listener.");
				originalAddEventListener.apply(window, arguments);
				return;
			}

			// Create the container if this is the first listener being added for this event type
			if( !this.listeners.hasOwnProperty(eventType) )
				this.listeners[eventType] = {};

			// Determine if this is a global named function that can be used as a synced listener
			var isLocalListener, listenerName;
			if( listener.name === "" )
				isLocalListener = true;
			else
				isLocalListener = (typeof window[listener.name] !== "function");

			if( isLocalListener )
			{
				if( jumpStart.options.multiuserOnly )
					console.log("WARNING: Only global functions can be synced as event listeners.");

				// Generate a name for this non-synced listener.
				var highestLocal = 0;
				var x, high;
				for( x in this.listeners[eventType] )
				{
					if( x.indexOf("_local") === 0 )
					{
						high = parseInt(x.substring(6));

						if( high > highestLocal )
							highestLocal = high;
					}
				}

				listenerName = "_local" + (highestLocal + 1);
			}
			else
				listenerName = listener.name;

			// Assign the listener
			this.listeners[eventType][listenerName] = listener;

			// BaseClass::addEventListener
			originalAddEventListener.apply(window, arguments);
		}.bind(instance),
		"removeEventListener": function(eventType, listener)
		{
			// Make sure this is a valid event type
			if( validEvents.indexOf(eventType) < 0 )
			{
				console.log("WARNING: Invalid event type \"" + eventType + "\" specified. Removing as non-JumpStart listener.");
				originalRemoveEventListener.apply(window, arguments);
				return;
			}

			if( jumpStart.listeners.hasOwnProperty(eventType) )
			{
				var x;
				for( x in jumpStart.listeners[eventType] )
				{
					if( jumpStart.listeners[eventType][x] === listener )
					{
						delete jumpStart.listeners[eventType][x];
						return;
					}
				}
			}

			// BaseClass::addEventListener
			originalRemoveEventListener.apply(window, arguments);
		}.bind(instance)
	};
	
	var x;
	for( x in jumpStartData )
	{
		// Warn if we are overwriting anything (other than *EventListener methods, because we call BaseClass on those).
		if( typeof instance[x] !== "undefined" && x !== "addEventListener" && x !== "removeEventListener" )
			console.log("WARNING: Object already has property " + x + ".");
		
		instance[x] = jumpStartData[x];
	}

	// JumpStart object bookkeeping.
	this.objects[instance.uuid] = instance;

	console.log("Spawned 1 object.");
	return instance;
};

JumpStart.prototype.addEventListener = function(eventType, listener)
{
	var validEvents = Object.keys(this.listeners);

	// Make sure this is a valid event type
	if( validEvents.indexOf(eventType) < 0 )
	{
		console.log("WARNING: Invalid event type \"" + eventType + "\" specified.");
		return;
	}

	// Create the container if this is the first listener being added for this event type
	if( !this.listeners.hasOwnProperty(eventType) )
		this.listeners[eventType] = {};

	// Determine if this is a global named function that can be used as a synced listener
	/* FIX ME: Synced window.JumpStart-level events might be how some people prefer to code.
		Look at the object.JumpStart-level events for reference on how to add it later.
	*/

	var isLocalListener, listenerName;
	if( listener.name === "" )
		isLocalListener = true;
	else
		isLocalListener = (typeof window[listener.name] !== "function");

	if( isLocalListener )
	{
		// Generate a name for this non-synced listener.
		var highestLocal = 0;
		var x, high;
		for( x in this.listeners[eventType] )
		{
			if( x.indexOf("_local") === 0 )
			{
				high = parseInt(x.substring(6));

				if( high > highestLocal )
					highestLocal = high;
			}
		}

		listenerName = "_local" + (highestLocal + 1);
	}
	else
		listenerName = listener.name;

	// Assign the listener
	this.listeners[eventType][listenerName] = listener;
};

JumpStart.prototype.removeEventListener = function(eventType, listener)
{
	var validEvents = Object.keys(this.listeners);

	// Make sure this is a valid event type
	if( validEvents.indexOf(eventType) < 0 )
	{
		console.log("WARNING: Invalid event type \"" + eventType + "\" specified.");
		return;
	}

	if( this.listeners.hasOwnProperty(eventType) )
	{
		var x;
		for( x in this.listeners[eventType] )
		{
			if( this.listeners[eventType][x] === listener )
			{
				delete this.listeners[eventType][x];
				return;
			}
		}
	}

	console.log("WARNING: The specificed " + eventType + " listener was not found in removeEventListener.");
};


// Class: util
// Purpose: do some useful stuff
function JumpStartUtil()
{
}

JumpStartUtil.prototype.displayInfoPanel = function(panelName, data)
{
	switch(panelName)
	{
		case "beamMe":
			var container = document.createElement("div");
			container.style.cssText = "position: fixed; top: 0px; left: 0; width: 100%; height: 100%;";

			var imageContainer = document.createElement("div");
			imageContainer.style.cssText = "position: absolute; top; 0; left: 0; width: 59px;";
			container.appendChild(imageContainer);

			var imageElem = document.createElement("img");
			imageElem.style.minHeight = "50px";
			imageElem.style.maxHeight = "65px";
			this.throbHeightDOM(imageElem, 500);	// Make this image throb
			imageElem.src = "engine/misc/beamarrow.png";
			imageContainer.appendChild(imageElem);
			container.appendChild(imageContainer);

			var textElem = document.createElement("div");
			textElem.style.cssText = "position: absolute; top: 80px; width: 200px; padding: 10px; font-family: Arial; font-weight: 900; background-color: rgba(60, 144, 196, 0.5); border: 2px solid rgba(100, 255, 255, 0.8);";
			textElem.innerHTML = "Beam this app to an enclosure to begin!";
			container.appendChild(textElem);

			var readyElem = document.createElement("div");
			readyElem.style.cssText = "color: rgba(255, 255, 255, 1.0); position: fixed; top: 0; left: 0; bottom: 0; right: 0; width: 50%; height: 50%; margin: auto; font-size: 100px; font-weight: bold; letter-spacing: 0.1em; font-style: italic; font-family: Arial; text-shadow: 4px 4px rgba(60, 144, 196, 0.8);";
			readyElem.innerHTML = "READY";
			this.throbScaleDOM(readyElem, 2000, 1.1);
			container.appendChild(readyElem);

			document.body.appendChild(container);
			break;
	}
};

JumpStartUtil.prototype.throbScaleDOM = function(elem, interval, scale)
{
	// Immediately set it's transform
	elem.style.webkitTransform = "scale(" + (1.0 - (scale - 1.0)) + ")";

	// Start rocking right away
	// FIX ME: If this is an image (elem.tagName === "IMG") then we whould use an onLoad promise for it before continuing.
	this.DOMLoaded().then(function()
	{
		setTimeout(function()
		{
			elem.style.transition = (interval / 1000.0) + "s ease-in-out";
			elem.style.webkitTransform = "scale(" + scale + ")";

			// Rock on an interval also
			elem.throbDirection = 1;
			elem.throbHandle = setInterval(function()
			{
				if( elem.throbDirection === 1 )
				{
					elem.style.webkitTransform = "scale(" + (1.0 - (scale - 1.0)) + ")";
					elem.throbDirection = -1;					
				}
				else
				{
					elem.style.webkitTransform = "scale(" + scale + ")";
					elem.throbDirection = 1;
				}
			}, interval);
		}.bind(this), 0);
	}.bind(elem));
};

JumpStartUtil.prototype.rockDOM = function(elem, interval, degrees)
{
	// Immediately set it's transform
	elem.style.webkitTransform = "rotate(" + degrees + "deg)";

	// Start rocking right away
	// FIX ME: If this is an image (elem.tagName === "IMG") then we whould use an onLoad promise for it before continuing.
	this.DOMLoaded().then(function()
	{
		setTimeout(function()
		{
			elem.style.transition = (interval / 1000.0) + "s ease-in-out";
			elem.style.webkitTransform = "rotate(" + (-degrees) + "deg)";

			// Rock on an interval also
			elem.rockDirection = 1;
			elem.rockHandle = setInterval(function()
			{
				if( elem.rockDirection === 1 )
				{
					elem.style.webkitTransform = "rotate(" + degrees + "deg)";
					elem.rockDirection = -1;					
				}
				else
				{
					elem.style.webkitTransform = "rotate(" + (-degrees) + "deg)";
					elem.rockDirection = 1;
				}
			}, interval);
		}.bind(this), 0);
	}.bind(elem));
};

JumpStartUtil.prototype.throbHeightDOM = function(elem, interval)
{
	// Immediately set it's size to min-height
	elem.style.height = elem.style.minHeight;

	// Start throbbing right away
	// FIX ME: If this is an image (elem.tagName === "IMG") then we whould use an onLoad promise for it before continuing.
	this.DOMLoaded().then(function()
	{
		setTimeout(function()
		{
			elem.style.height = this.style.maxHeight;
			elem.style.transition = "height " + (interval / 1000.0) + "s ease-in-out";

			// Throb on an interval too
			elem.throbDirection = 1;
			elem.throbHandle = setInterval(function()
			{
				if( elem.throbDirection === 1 )
				{
					elem.style.height = elem.style.minHeight;
					elem.throbDirection = -1;					
				}
				else
				{
					elem.style.height = elem.style.maxHeight;
					elem.throbDirection = 1;
				}
			}, interval);
		}.bind(this), 0);
	}.bind(elem));
};

JumpStartUtil.prototype.loadStylesheets = function(fileNames)
{
	// Decalre some important variables
	var util = this;
	var filesLoaded = 0;

	// Async
	return {
			"then": function(loadStylesheetsCallback)
			{
				loadAStylesheet(fileNames[filesLoaded], loadStylesheetsCallback);
			}
		};

	// Helper functions (that use the important variables)
	function loadAStylesheet(fileName, loadStylesheetsCallback)
	{
		var elem = document.createElement("link");
		elem.rel = "stylesheet";
		elem.type = "text/css";
		elem.href = fileName;

		elem.addEventListener("load", function()
			{
				filesLoaded++;

				if( filesLoaded === fileNames.length )
					loadStylesheetsCallback();
				else
					loadAStylesheet(fileNames[filesLoaded], loadStylesheetsCallback);
			});

		// We are added to the head so loading will begin immediately & asynchronously
		document.getElementsByTagName("head")[0].appendChild(elem);
	}
};

JumpStartUtil.prototype.loadJavaScripts = function(fileNames)
{
	// Decalre some important variables
	var util = this;
	var filesLoaded = 0;

	// Async
	return {
			"then": function(loadJavaScriptsCallback)
			{
				//loadJavaScriptsCallback(fileNames[filesLoaded], loadJavaScriptsCallback);
				loadAJavaScript(fileNames[filesLoaded], loadJavaScriptsCallback);
			}
		};

	// Helper functions (that use the important variables)
	function loadAJavaScript(fileName, loadJavaScriptsCallback)
	{
		var elem = document.createElement("script");
		elem.type = "text/javascript";
		elem.src = fileName;

		elem.addEventListener("load", function()
		{
			filesLoaded++;

			if( filesLoaded === fileNames.length )
				loadJavaScriptsCallback();
			else
				loadAJavaScript(fileNames[filesLoaded], loadJavaScriptsCallback);
		});

		// We are added to the head so loading will begin immediately & asynchronously
		document.getElementsByTagName("head")[0].appendChild(elem);
	}
};

JumpStartUtil.prototype.loadImages = function(fileNames)
{
	// Decalre some important variables
	var util = this;
	var filesLoaded = 0;

	// Async
	return {
			"then": function(loadImagesCallback)
			{
				loadAnImage(fileNames[filesLoaded], loadImagesCallback);
			}
		};

	// Helper functions (that use the important variables)
	function loadAnImage(fileName, loadImagesCallback)
	{
		var elem = new Image();

		elem.addEventListener("load", function(e)
		{
			onLoadOrFail(e, loadImagesCallback);
		}, true);

		elem.addEventListener("error", function(e)
		{
			onLoadOrFail(e, loadImagesCallback);
		}, true);

		elem.src = fileName;

		function onLoadOrFail(e, loadImagesCallback)
		{
			filesLoaded++;

			if( filesLoaded === fileNames.length )
				loadImagesCallback();
			else
				loadAnImage(fileNames[filesLoaded], loadImagesCallback);
		}
	}
};

// Figure out if we are passed a roomId in our URL
// Based on the function at: https://css-tricks.com/snippets/javascript/get-url-variables/
JumpStartUtil.prototype.getQueryVariable = function(name)
{
	var query = window.location.search.substring(1);
	var vars = query.split("&");
	var i;
	for( i in vars )
	{
		var pair = vars[i].split("=");
		if( pair[0] === name )
			return pair[1];
	}

	return null;
};

JumpStartUtil.prototype.DOMReady = function()
{
	// Async
	return {
			"then": function(DOMReadyCallback)
			{
				if( document.readyState === "interactive" || document.readyState === "complete" )
					DOMReadyCallback();
				else
				{
					function readyWatch(DOMEvent)
					{
						DOMReadyCallback();
					}

					document.addEventListener("DOMContentLoaded", readyWatch.bind(this), true);
				}
			}.bind(this)
		};
}

JumpStartUtil.prototype.DOMLoaded = function()
{
	// Async
	return {
			"then": function(DOMLoadedCallback)
			{
				if( document.readyState === "complete" )
					DOMLoadedCallback();
				else
				{
					function readyWatch(DOMEvent)
					{
						DOMLoadedCallback();
					}

					document.addEventListener("DOMLoadedCallback", readyWatch.bind(this), true);
				}
			}.bind(this)
		};
}

// create the global JumpStart object
window.jumpStart = new JumpStart();