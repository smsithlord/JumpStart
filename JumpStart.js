// TODO:
// - Reduce firebase footprint when mouse events are disabled in options.

// Declare some globals
var g_localUser, g_worldOffset, g_worldScale, g_objectLoader, g_camera, g_renderer, g_scene, g_clock, g_rayCaster, g_enclosure, g_deltaTime, g_crosshair, g_lookHit, g_numSyncedInstances, g_networkReady, g_floorPlane;

// Extend the window object.
window.JumpStart = new jumpStart();

// Listen for ready events
if( !JumpStart.webMode )
{
	window.addEventListener("AltContentLoaded", function()
	{
		altspace.getEnclosure().then(function(enclosure)
		{
			JumpStart.enclosure = enclosure;

			altspace.getUser().then(function(user)
			{
				JumpStart.localUser = user;
				JumpStart.connectToFirebase();
			});
		});
	});
}
else
{
	window.addEventListener( 'DOMContentLoaded', function()
	{
//		setTimeout(function() {
			JumpStart.connectToFirebase();
//		}, 1000);
	});

	window.addEventListener( 'resize', function() { JumpStart.onWindowResize(); }, false );
	window.addEventListener( 'mousemove', function(e) { JumpStart.onMouseMove(e); }, false);
	window.addEventListener( 'mousedown', function(e) { JumpStart.onMouseDown(e); }, false);
	window.addEventListener( 'mouseup', function(e) { JumpStart.onMouseUp(e); }, false);
	document.body.style.backgroundColor = "rgba(0, 0, 0, 1.0)";
}

function jumpStart()
{
	// Certain values are read-only after JumpStart has been initialized
	this.initialized = false;
	this.altContentAlreadyLoaded = false;
	this.modelLoader = new jumpStartModelLoader();
	this.objectLoader = null;
	this.camera = null
	this.renderer = null;
	this.clock = null;
	this.rayCaster = null;
	this.cursorRay = null;
	this.futureCursorRay = null;
	this.enclosure = null;
	this.localUser = null;
	this.scene = null;
	this.clickedObject = null;
	this.hoveredObject = null;
	this.deltaTime = 0.0;
	this.crosshair = null;
	this.firebaseSync = null;
	this.syncedInstances = {};
	this.networkReady = false;	// Know if we are networked & ready to go.
	this.localDataListeners = {};	// Need to simulate network activity locally
	this.pendingObjects = {};
	this.numSyncedInstances = 0;
	this.initialSync = true;
	this.debugui = new jumpStartDebugUI();
	this.pendingDataListeners = [];
	this.floorPlane = {};

	// FIXME: placeholders for real input event handlers.  will be something basic, like unity itself uses.
	this.pendingClick = false;
	this.pendingClickUp = false;
	this.pendingEventA = null;

	this.models = [];

	this.options =
	{
		"debugMode": false,
		"legacyLoader": false,
		"worldScale": 1.0,
		"scaleWithEnclosure": false,
		"enabledCursorEvents":
		{
			"cursorDown": true,
			"cursorUp": true,
			"cursorEnter": true,
			"cursorLeave": true,
			"cursorMove": true
		},
		"camera":
		{
			"lookAtOrigin": true,
			"position": new THREE.Vector3(-5.0, 10.0, 30.0),
			"translation": new THREE.Vector3(40.0, 30.0, 180.0)
		},
		"firebase":
		{
			"rootUrl": "",
			"appId": "",
			"params": { "AUTOSYNC": true, "TRACE": false }
		}
	};

	this.worldScale;
	this.worldOffset = new THREE.Vector3();
	this.webMode = !window.hasOwnProperty("altspace");
}

jumpStart.prototype.connectToFirebase = function()
{
	if( this.options.firebase.rootURL === "" || this.options.firebase.appId === "" )
	{
		this.initiate();
	}
	else
	{
		this.firebaseSync = new FirebaseSync(this.options.firebase.rootUrl, this.options.firebase.appId, this.options.firebase.params);
		this.firebaseSync.connect(JumpStart.onFirebaseConnect(), function(key, syncData) { JumpStart.onFirebaseAddObject(key, syncData); }, function(key, syncData) { JumpStart.onFirebaseRemoveObject(key, syncData); });
	}
};

jumpStart.prototype.onFirebaseConnect = function()
{
	console.log("Connected to firebase.");

	// TODO make sure that here (after the connect call) isn't too late to set this flag!!
	this.networkReady = true;
	g_networkReady = this.networkReady;

	// Finish initiating the game world...
	// Might want to wait to make sure all items get sycned
//	setTimeout(function(){
		JumpStart.initiate();
//	}, 1000);
};

jumpStart.prototype.onFirebaseAddObject = function(key, syncData)
{
	if( this.syncedInstances.hasOwnProperty(key) )
		return;	// We already exist. (THIS SHOULD NEVER HAPPEN?? Probably not needed.)

	// Make sure we are ready to spawn stuff.
	if( !this.initialSync )
		this.networkSpawn(key, syncData, false);
	else if( !this.pendingObjects.hasOwnProperty(key) )
		this.pendingObjects[key] = syncData;
};

jumpStart.prototype.onFirebaseRemoveObject = function(key, syncData)
{
	console.log("removal detected.");
	var object = this.syncedInstances[key];
// g_Scene.remove(object);
	this.removeSyncedObject(object, false);

//	delete g_SyncedInstances[key];
//	g_NumSyncedInstances--;

//	var object = g_SyncedInstances[key];
//	g_Scene.remove(object);

//	delete g_SyncedInstances[key];
//	g_NumSyncedInstances--;
};

jumpStart.prototype.syncObject = function(sceneObject)
{
	if( this.networkReady )
		this.firebaseSync.saveObject(sceneObject);
//	else // DO THIS ALWAYS BECAUSE DATA LISTNERES ARE NOT CALLED ON THE LOCAL PC!!
//	{
		// Otherwise, simulate shit for the data listeners...
		if( this.localDataListeners.hasOwnProperty(sceneObject.uuid) )
		{
			var lastState = this.localDataListeners[sceneObject.uuid];

			// Compare everything
			var x, oldValue;
			for( x in lastState )
			{
				if( lastState[x].oldValue !== sceneObject.JumpStart[x] )
				{
					// something changed!!
					oldValue = lastState[x].oldValue;
					lastState[x].oldValue = sceneObject.JumpStart[x];
					lastState[x].callback.call(sceneObject, oldValue, sceneObject.JumpStart[x], true);
				}
			}
		}
//	}
};

jumpStart.prototype.addDataListener = function(sceneObject, property, callback)
{
	var firebaseProperty = "syncData/" + property;

	// Build this ugly tree asap
	// FIXME: Only VALUE listeners are supported in offline mode.
//	if( !this.networkReady )
//	{
		var treePath = this.localDataListeners;
		if( !treePath.hasOwnProperty(sceneObject.uuid) )
			treePath[sceneObject.uuid] = {};

		treePath = treePath[sceneObject.uuid];

		treePath[property] = {"oldValue": sceneObject.JumpStart[property], "callback": callback};
//	}
//	else
		this.pendingDataListeners.push({"sceneObject": sceneObject, "property": firebaseProperty, "callback": callback});
};

jumpStart.prototype.processPendingDataListeners = function()
{
	var args;
	while( this.pendingDataListeners.length > 0 )
	{
		args = this.pendingDataListeners.pop();

		if( this.options.firebase.appId === "" || this.options.firebase.rootUrl === "" )
			continue;

		var isSynced = false;
		var x;
		for( x in this.syncedInstances )
		{
			if( this.syncedInstances[x] === args.sceneObject )
			{
				isSynced = true;
				break;
			}
		}

		//this.firebaseSync.addDataListener(args.sceneObject, args.property, args.callback);
		this.firebaseSync.addDataListener(args.sceneObject, args.property, "value", function(snapshot, eventType) { JumpStart.onDataChangeHandler(snapshot, args.sceneObject, args.callback); });
	}
};

jumpStart.prototype.onDataChangeHandler = function(firebaseSnapshot, sceneObject, callback)
{
	var property = firebaseSnapshot.key();
	if( sceneObject.JumpStart[property] != firebaseSnapshot.val() )
		callback.call(sceneObject, sceneObject.JumpStart[property], firebaseSnapshot.val(), false);
}

// FIXME: The initiate function should be using this method to spawn the spoofed enclosure walls!!
jumpStart.prototype.spawnCursorPlane = function(userParams)
{
	// Default params
	var params = {
		"position": new THREE.Vector3(),
		"offset": new THREE.Vector3(),
		"rotation": new THREE.Vector3(),
		"rotate": new THREE.Vector3(),
		"rotateFirst": true,
		"width": this.enclosure.innerWidth,
		"height": this.enclosure.innerHeight
	};

	// Merg user params
	if( arguments.length > 0 )
	{
		var y, x;
		for( x in userParams )
		{
			if( !params.hasOwnProperty(x) )
			{
				console.log("Unknown property in params: " + x);
				continue;
			}

			params[x] = userParams[x];
		}
	}

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

	var depth = 1.0;
	var cursorPlane = new THREE.Mesh(
		new THREE.BoxGeometry(params.width, params.height, depth),
		new THREE.MeshBasicMaterial( { color: getRandomColor(), transparent: true, opacity: 0.5 })
	);
	cursorPlane.geometry.computeBoundingSphere();

	cursorPlane.isCursorPlane = true;
	cursorPlane.position.copy(params.position);
	cursorPlane.rotation.copy(params.rotation);

	if( params.rotateFirst )
	{
		cursorPlane.rotateX(params.rotate.x);
		cursorPlane.rotateY(params.rotate.y);
		cursorPlane.rotateZ(params.rotate.z);
	}

	cursorPlane.translateX(params.offset.x);
	cursorPlane.translateY(params.offset.y);
	cursorPlane.translateZ(params.offset.z - depth / 2.0);

	if( !params.rotateFirst )
	{
		cursorPlane.rotateX(params.rotate.x);
		cursorPlane.rotateY(params.rotate.y);
		cursorPlane.rotateZ(params.rotate.z);
	}

	this.scene.add(cursorPlane);

	return cursorPlane;
};

jumpStart.prototype.onMouseDown = function()
{
	this.onCursorDown();
};

jumpStart.prototype.onCursorDown = function()
{
	if( this.clickedObject )
		this.onCursorUp();

	// FIXME: Add options for how non-JumpStart objects interact with raycasting and mouse events.
	var intersects = this.rayCaster.intersectObjects(this.scene.children, true);

	var sceneObject;
	var x, y;
	for( x in intersects )
	{
		sceneObject = intersects[x].object.parent;
		if( !sceneObject.hasOwnProperty("JumpStart") )
			continue;

		if( (Object.keys(sceneObject.JumpStart.onCursorDown).length !== 0) )
		{
			// Remember what object is clicked.
			this.clickedObject = sceneObject;

			for( y in sceneObject.JumpStart.onCursorDown )
				sceneObject.JumpStart.onCursorDown[y].call(sceneObject);

			// Only ONE object can be clicked at a time.
			break;
		}

		if( sceneObject.blocksLOS )
			break;
	}

	// FIXME: Add a way for user objects to preventDefault on cursor events.
	if( typeof window.onCursorDown === 'function' )
		window.onCursorDown();
};

jumpStart.prototype.onMouseUp = function()
{
	this.onCursorUp();
};

jumpStart.prototype.onCursorUp = function()
{
	var sceneObject = this.clickedObject;

	if( !sceneObject )
		return;

	var x;
	for( x in sceneObject.JumpStart.onCursorUp )
	{
		sceneObject.JumpStart.onCursorUp[x].call(sceneObject);
	}

	this.clickedObject = null;

	// FIXME: Add a way for user objects to preventDefault on cursor events.
	if( typeof window.onCursorUp === 'function' )
		window.onCursorUp();
};

jumpStart.prototype.onMouseMove = function(e)
{
	if( !this.webMode )
		return;

	// Fill with 2D position for now
	var mouse3D = new THREE.Vector3(0, 0, 0);
	mouse3D.x = (e.clientX / window.innerWidth) * 2 - 1;
	mouse3D.y = -(e.clientY / window.innerHeight) * 2 + 1;
	mouse3D.z = 0.5;

	// Convert the 2D position to a 3D point
	mouse3D.unproject(this.camera);

	// Get a look vector from the camera to mouse3D
	var direction = new THREE.Vector3();
	direction = mouse3D.sub(this.camera.position).normalize();

	this.futureCursorRay = { "origin": this.camera.position, "direction": direction };
}

jumpStart.prototype.onCursorMove = function(e)
{
	this.futureCursorRay = e.cursorRay;
};

jumpStart.prototype.processCursorMove = function()
{
	if( !this.options.enabledCursorEvents.cursorMove )
		return;

	// Check if cursor has moved (OBSOLETE: WE MUST ALWAYS RAYCAST BECAUSE OBJECTS MOVE TOO!!)
	/*
	if( !this.futureCursorRay || (this.futureCursorRay.origin === this.cursorRay.origin &&
			this.futureCursorRay.direction === this.cursorRay.direction) )
		return;
	*/

	this.cursorRay = this.futureCursorRay;

	// Update the local user's look info
	this.localUser.lookOrigin.copy(this.cursorRay.origin);
	this.localUser.lookDirection.copy(this.cursorRay.direction);

	// Set the raycaster
	this.rayCaster.set( this.cursorRay.origin, this.cursorRay.direction );

	// FIXME: TWO OPTIONS
	// A. Build a list of every eligible scene object THEN raycast.
	// B. Raycast, then filter for eligible objects.
	// Currently using option B cuz its like 3am right now...

	var intersects = this.rayCaster.intersectObjects(this.scene.children, true);

	function unhoverObject(sceneObject)
	{
		var y;
		for( y in sceneObject.JumpStart.onCursorLeave )
			sceneObject.JumpStart.onCursorLeave[y].call(sceneObject);
	}

	this.localUser.lookHit = null;
	var oldHoveredObject = this.hoveredObject;
	var x, sceneObject, futureHoverObject, y;
	for( x in intersects )
	{
		if( intersects[x].object.hasOwnProperty("isCursorPlane") )
		{
			var goodPoint = true;

			// Make sure it's a INWARD surface
			var face = intersects[x].face;
			if( !(face.a === 5 &&
				face.b === 7 &&
				face.c === 0) &&
				!(face.a === 7 &&
				face.b === 2 &&
				face.c === 0) )
			{
				goodPoint = false;
			}


			if( goodPoint )
			{
				if( this.hoveredObject )
				{
					unhoverObject(this.hoveredObject);
					this.hoveredObject = null;
				}

				this.localUser.lookHit = intersects[x];

				// FIXME: Figure out what's up with Altspace scene scaling.
				var scaledPoint = new THREE.Vector3().copy(this.localUser.lookHit.point).multiplyScalar(1/this.worldScale);
				this.localUser.lookHit.scaledPoint = scaledPoint;
				break;
			}
		}
		else
		{
			sceneObject = intersects[x].object.parent;

			if( sceneObject.hasOwnProperty("JumpStart") && sceneObject.JumpStart.blocksLOS )
			{
				if( (this.options.enabledCursorEvents.cursorEnter &&
					Object.keys(sceneObject.JumpStart.onCursorEnter).length !== 0) ||
					(this.options.enabledCursorEvents.cursorLeave) &&
					Object.keys(sceneObject.JumpStart.onCursorLeave).length !== 0)
				{
					if( this.hoveredObject && this.hoveredObject !== sceneObject )
					{
						unhoverObject(this.hoveredObject);
						this.hoveredObject = null;
					}

					// Now set this new object as hovered
					for( y in sceneObject.JumpStart.onCursorEnter )
						sceneObject.JumpStart.onCursorEnter[y].call(sceneObject);

					this.hoveredObject = sceneObject;
					this.localUser.lookHit = intersects[x];

					// FIXME: Figure out what's up with Altspace scene scaling.
					var scaledPoint = new THREE.Vector3().copy(this.localUser.lookHit.point).multiplyScalar(1/this.worldScale);
					this.localUser.lookHit.scaledPoint = scaledPoint;
					break;
				}
				else
				{
					this.localUser.lookHit = intersects[x];

					// FIXME: Figure out what's up with Altspace scene scaling.
					var scaledPoint = new THREE.Vector3().copy(this.localUser.lookHit.point).multiplyScalar(1/this.worldScale);
					this.localUser.lookHit.scaledPoint = scaledPoint;
					break;
				}
			}
		}
	}

	if( !this.localUser.lookHit && this.hoveredObject )
	{
		unhoverObject(this.hoveredObject);
		this.hoveredObject = null;
	}
	else if( this.crosshair && this.localUser.lookHit )
	{
		this.crosshair.position.copy(this.localUser.lookHit.point);

		var normalMatrix = new THREE.Matrix3().getNormalMatrix( this.localUser.lookHit.object.matrixWorld );
		var worldNormal = this.localUser.lookHit.face.normal.clone().applyMatrix3( normalMatrix ).normalize();
		worldNormal.add(this.localUser.lookHit.point);

		this.crosshair.lookAt(worldNormal);
		this.crosshair.position.multiplyScalar(this.enclosure.innerHeight / this.enclosure.adjustedHeight);	// FIXME Probably can replace this with / this.worldScale
	}

	g_lookHit = this.localUser.lookHit;
};

jumpStart.prototype.initiate = function()
{
	if( this.altContentAlreadyLoaded )
		return;

	this.altContentAlreadyLoaded = true;

	this.worldScale = this.options["worldScale"];

	if( this.webMode )
	{
		//this.enclosure = { "innerWidth": window.innerWidth / 3.0, "innerHeight": window.innerHeight / 3.0, "innerDepth": window.innerWidth / 3.0 };
		this.enclosure = {
			"innerWidth": Math.round(1024 / 2.5),
			"innerHeight": Math.round(1024 / 2.5),
			"innerDepth": Math.round(1024 / 2.5),
			"adjustedWidth": Math.round(1024 / 2.5),
			"adjustedHeight": Math.round(1024 / 2.5),
			"adjustedDepth": Math.round(1024 / 2.5)
		};
		this.localUser = { "userId": "WebUser" + Date.now(), "displayName": "WebUser" };

		if( this.options.debugMode )
			this.localUser.displayName = "Flynn";
		else
		{
			while( this.localUser.displayName === "WebUser" || this.localUser.displayName === "" )
				this.localUser.displayName = prompt("Enter a player name:", "");

			if( !this.localUser.displayName || this.localUser.displayName === "WebUser" || this.localUser.displayName === "" )
			{
				window.history.back();
				return;
			}
		}
	}
	else
	{
		// Altspace has a different style of scaling
		this.worldScale *= 3.0;

		this.enclosure.adjustedWidth = Math.round(this.enclosure.innerWidth * JumpStart.worldScale);
		this.enclosure.adjustedHeight = Math.round(this.enclosure.innerWidth * JumpStart.worldScale);
		this.enclosure.adjustedDepth = Math.round(this.enclosure.innerDepth * JumpStart.worldScale);
	}

//	this.enclosure.bounds = {};
//	this.enclosure.bounds.bottomCenter = new THREE.Vector3(0, (-this.enclosure.innerHeight / 2.0) * scaledRatio, 0);

	if( this.options.legacyLoader )
		this.objectLoader = new THREE.AltOBJMTLLoader();
	else
		this.objectLoader = new THREE.OBJMTLLoader();

	this.scene = new THREE.Scene();
	this.scene.scale.multiplyScalar(this.worldScale);

	this.clock = new THREE.Clock();
	this.rayCaster = new THREE.Raycaster();

	// FIXME: Why is this a spoofed ray?  Is it needed for web mode?
	this.cursorRay = {"origin": new THREE.Vector3(), "direction": new THREE.Vector3()};
	this.futureCursorRay = {"origin": new THREE.Vector3(), "direction": new THREE.Vector3()};

	this.localUser.lookOrigin = new THREE.Vector3();
	this.localUser.lookDirection = new THREE.Vector3();
	this.localUser.firstUser = true;

	var scaledRatio = this.enclosure.innerHeight / this.enclosure.adjustedHeight;
	this.worldOffset = new THREE.Vector3(0.0, (-this.enclosure.innerHeight / 2.0) * scaledRatio, 0.0);

	if ( this.webMode )
	{
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setClearColor("#AAAAAA");
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		document.body.appendChild( this.renderer.domElement );

		var aspect = window.innerWidth / window.innerHeight;
		this.camera = new THREE.PerspectiveCamera(45, aspect, 1, 2000 );

		this.camera.position.copy(this.options.camera.position);
		this.camera.position.add(this.worldOffset);

		if( this.options.camera.lookAtOrigin )
		{
			var origin = new THREE.Vector3();
			origin.copy(this.scene.position);
			origin.add(this.worldOffset);

			this.camera.lookAt( origin );
		}

		this.camera.translateX(this.options.camera.translation.x);
		this.camera.translateY(this.options.camera.translation.y);
		this.camera.translateZ(this.options.camera.translation.z);

		// OBJMTLLoader always uses PhongMaterial, so we need light in scene.
		var ambient = new THREE.AmbientLight( 0xffffff );
		this.scene.add( ambient );
	}
	else
	{
		this.scene.addEventListener( "cursormove", function(e) { JumpStart.onCursorMove(e); });

		if( this.options.legacyLoader )
			this.renderer = altspace.getThreeJSRenderer();
		else
			this.renderer = altspace.getThreeJSRenderer({version:'0.2.0'});
	}

	// Create some invisible planes for raycasting.
	var bottomPlane = JumpStart.spawnCursorPlane({
		"position": this.worldOffset,
		"rotate": new THREE.Vector3(-Math.PI / 2.0, 0, 0),
		"width": this.enclosure.innerWidth,
		"height": this.enclosure.innerDepth
	});

	// Save this for users to use
	this.floorPlane = bottomPlane;
//	g_floorPlane = bottomPlane;

	var topPlane = JumpStart.spawnCursorPlane({
		"position": new THREE.Vector3(this.worldOffset.x, -this.worldOffset.y, this.worldOffset.z),
		"rotate": new THREE.Vector3(Math.PI / 2.0, 0, 0),
		"width": this.enclosure.innerWidth,
		"height": this.enclosure.innerDepth
	});

	var northPlane = JumpStart.spawnCursorPlane({
		"position": new THREE.Vector3(0, 0, this.worldOffset.y),
		"rotate": new THREE.Vector3(0, 0, 0),
		"width": this.enclosure.innerWidth,
		"height": this.enclosure.innerDepth
	});

	var southPlane = JumpStart.spawnCursorPlane({
		"position": new THREE.Vector3(0, 0, -this.worldOffset.y),
		"rotate": new THREE.Vector3(0, Math.PI, 0),
		"width": this.enclosure.innerWidth,
		"height": this.enclosure.innerDepth
	});

	var westPlane = JumpStart.spawnCursorPlane({
		"position": new THREE.Vector3(this.worldOffset.y, 0, 0),
		"rotate": new THREE.Vector3(0, Math.PI / 2.0, 0),
		"width": this.enclosure.innerWidth,
		"height": this.enclosure.innerDepth
	});

	var eastPlane = JumpStart.spawnCursorPlane({
		"position": new THREE.Vector3(-this.worldOffset.y, 0, 0),
		"rotate": new THREE.Vector3(0, -Math.PI / 2.0, 0),
		"width": this.enclosure.innerWidth,
		"height": this.enclosure.innerDepth
	});

	g_localUser = this.localUser;
	g_worldOffset = this.worldOffset;
	g_worldScale = this.worldScale;
	g_objectLoader = this.objectLoader;
	g_camera = this.camera;
	g_renderer = this.renderer;
	g_scene = this.scene;
	g_clock = this.clock;
	g_rayCaster = this.rayCaster;
	g_enclosure = this.enclosure;
	g_deltaTime = this.deltaTime;
	g_numSyncedInstances = this.numSyncedInstances;
	g_initialSync = this.initialSync;
	g_floorPlane = this.floorPlane;

	// We are ready to rock-n-roll!!
	this.initialized = true;

	// Load our crosshair
	this.loadModels("models/JumpStart/crosshair.obj").then(function()
	{
		// Spawn it in
		var crosshair = JumpStart.spawnInstance("models/JumpStart/crosshair.obj");
		crosshair.JumpStart.blocksLOS = false;
		//crosshair.scale.multiplyScalar(1.0);

		crosshair.JumpStart.onTick = function()
		{
			if( !this.hasOwnProperty('spinAmount') || this.spinAmount >= Math.PI * 2.0 )
				this.spinAmount = 0.0;

			this.spinAmount += 1.0 * g_deltaTime;
			this.rotateZ(this.spinAmount);
		};

		JumpStart.crosshair = crosshair;
		g_crosshair = JumpStart.crosshair;

		if( !JumpStart.webMode )
		{
			crosshair.addEventListener("cursordown", function(e) { JumpStart.pendingClick = true; });
			crosshair.addEventListener("cursorup", function(e) { JumpStart.pendingClickUp = true; });
		}

		function prepPrecache()
		{
			// WE ALSO HAVE SOME STUFF TO "CACHE" IF IN DEBUG MODE...
			// Inject the css if in debug mode
			if( JumpStart.options.debugMode )
			{
				JumpStart.debugui = new jumpStartDebugUI();

				var templateElem = document.getElementById("JumpStartDebugElements");
				if( templateElem )
				{
					var container = document.createElement("div");
					container.innerHTML = templateElem.innerHTML;
					document.body.appendChild(container);
				}
			}

			// User global, if it exists.
			if( window.hasOwnProperty("onPrecache") )
				onPrecache();
			else
				JumpStart.doneCaching();
		}

		// Wait for us to get our room key
		if( JumpStart.options.firebase.rootUrl !== "" && JumpStart.options.firebase.appId !== "" )
		{
			var myHandle = setInterval(function()
			{
				if( JumpStart.firebaseSync.roomKey === null )
					return;

				var membersRef = JumpStart.firebaseSync.firebaseRoot.child(JumpStart.firebaseSync.appId).child('rooms').child(JumpStart.firebaseSync.roomKey).child('members');
				membersRef.once("value", function(snapshot) {
					var members = snapshot.val();

					var count = 0;
					var x;
					for( x in members )
						count++;

					if( count > 0 )
						JumpStart.localUser.firstUser = false;

					// Now we're ready for game logic
					prepPrecache();
				});

				clearInterval(myHandle);
			}, 100);
		}
		else
			prepPrecache();
	});
}

jumpStart.prototype.doneCaching = function()
{
	// Spawn any synced objects that already exist on the server...
	// DO WORK FIXME

	var index;
	for( index in this.pendingObjects )
		this.networkSpawn(index, this.pendingObjects[index], true);

	this.initialSync = false;

	if( window.hasOwnProperty("onReady") )
		onReady();
	else
		console.log("Your app is ready, but you have no onReady callback function!");
};

jumpStart.prototype.networkSpawn = function(key, syncData, isInitial)
{
	var instance = this.spawnInstance(syncData.modelFile, {'key': key, 'syncData': syncData});

	if( syncData.hasOwnProperty('spawnListeners') )
	{
		for( x in syncData.spawnListeners )
		{
			// Just replace ALL listeners, and we'll end up as the one named 'default'.
			if( x.indexOf("_") !== 0 && typeof window[x] === 'function' )
			{
				instance.JumpStart.onSpawn = {};
				instance.JumpStart.onSpawn[x] = window[x];
			}

			break;
		}
	}

	if( syncData.hasOwnProperty('tickListeners') )
	{
		for( x in syncData.tickListeners )
		{
			// Just replace ALL listeners, and we'll end up as the one named 'default'.
			if( x.indexOf("_") !== 0 && typeof window[x] === 'function' )
			{
				instance.JumpStart.onTick = {};
				instance.JumpStart.onTick[x] = window[x];
			}

			break;
		}
	}

	if( syncData.hasOwnProperty('cursorDownListeners') )
	{
		for( x in syncData.cursorDownListeners )
		{
			// Just replace ALL listeners, and we'll end up as the one named 'default'.
			if( x.indexOf("_") !== 0 && typeof window[x] === 'function' )
			{
				instance.JumpStart.onCursorDown = {};
				instance.JumpStart.onCursorDown[x] = window[x];
			}

			break;
		}
	}

	if( syncData.hasOwnProperty('cursorUpListeners') )
	{
		for( x in syncData.cursorUpListeners )
		{
			// Just replace ALL listeners, and we'll end up as the one named 'default'.
			if( x.indexOf("_") !== 0 && typeof window[x] === 'function' )
			{
				instance.JumpStart.onCursorUp = {};
				instance.JumpStart.onCursorUp[x] = window[x];
			}

			break;
		}
	}

	if( syncData.hasOwnProperty('cursorEnterListeners') )
	{
		for( x in syncData.cursorEnterListeners )
		{
			// Just replace ALL listeners, and we'll end up as the one named 'default'.
			if( x.indexOf("_") !== 0 && typeof window[x] === 'function' )
			{
				instance.JumpStart.onCursorEnter = {};
				instance.JumpStart.onCursorEnter[x] = window[x];
			}

			break;
		}
	}

	if( syncData.hasOwnProperty('cursorLeaveListeners') )
	{
		for( x in syncData.cursorLeaveListeners )
		{
			// Just replace ALL listeners, and we'll end up as the one named 'default'.
			if( x.indexOf("_") !== 0 && typeof window[x] === 'function' )
			{
				instance.JumpStart.onCursorLeave = {};
				instance.JumpStart.onCursorLeave[x] = window[x];
			}

			break;
		}
	}


	// If the object has a spawn listener, NOW is the time...
	for( x in instance.JumpStart.onSpawn )
		instance.JumpStart.onSpawn[x].call(instance, false, isInitial);	// FIXME: This isInital flag is bullshit!!

	this.syncedInstances[x] = instance;

	return instance;
};

jumpStart.prototype.run = function()
{
	// Start the game loop
	this.onTick();
};

jumpStart.prototype.onTick = function()
{
	if( !this.initialized )
		return;

	this.processPendingDataListeners();

	this.deltaTime = this.clock.getDelta();
	g_deltaTime = this.deltaTime;

	// FIXME: We should really prep event listeners before processing cursor move, in case any of them have new listeners assigned with the = function syntax.
	this.processCursorMove();

	// FIXME: PLACEHOLDER FOR REAL INPUT EVENTS!!
	if( this.pendingClick )
	{
		this.onCursorDown();
		this.pendingClick = false;
	}
	else if( this.pendingClickUp )
	{
		this.onCursorUp();
		this.pendingClickUp = false;
	}

	if( this.pendingEventA )
	{
		this.pendingEventA();
		this.pendingEventA = null;
	}

	if( window.hasOwnProperty("onTick") )
		onTick();

	requestAnimationFrame( function(){ JumpStart.onTick(); } );

	var sceneObject;
	var x, y, z;
	for( x in this.scene.children )
	{
		sceneObject = this.scene.children[x];
		if( !sceneObject.hasOwnProperty("JumpStart") )
			continue;

		this.prepEventListeners(sceneObject);

//		/* FOR LISTENERS ATTACHED DIRECTLY TO SCENE OBJECTS. REQUIRED IF NO CROSSHAIR!!
//		if( !this.webMode )
//		{
	// DO ONTICK EVENT TOO!! ???? (maybe not, it might not be neded here.)
	/*
			if( typeof sceneObject.JumpStart.onCursorDown === 'function' ||
					Object.keys(sceneObject.JumpStart.onCursorDown).length !== 0 )
			{
				if( !(sceneObject.JumpStart.hasCursorEffects & 0x2) )
				{*/
					/* FIXME: Required if no crosshair!!
					sceneObject.addEventListener('cursorup', function()
					{
						var y;
						for( y in this.JumpStart.onCursorUp )
							this.JumpStart.onCursorUp[y].call(this);
					});
					*/
/*
					sceneObject.JumpStart.hasCursorEffects |= 0x2;
				}

				if( typeof sceneObject.JumpStart.onCursorDown === 'function' )
				{
					sceneObject.JumpStart.onCursorDown = {'default': sceneObject.JumpStart.onCursorDown};
				}

				// FIXME: Only supporting 1 event callback.  Should support N.
				for( z in sceneObject.JumpStart.onCursorDown )
				{
					sceneObject.JumpStart.cursorDownListeners = z;
					break;
				}
			}
			*/
/*
			if( !(sceneObject.JumpStart.hasCursorEffects & 0x4) &&
				Object.keys(sceneObject.JumpStart.onCursorDown).length !== 0)
			{
				sceneObject.addEventListener('cursordown', function()
				{
					var y;
					for( y in this.JumpStart.onCursorDown )
						this.JumpStart.onCursorDown[y].call(this);
				});

				sceneObject.JumpStart.hasCursorEffects |= 0x4;
			}

			if( !(sceneObject.JumpStart.hasCursorEffects & 0x8) &&
				Object.keys(sceneObject.JumpStart.onCursorEnter).length !== 0)
			{
				sceneObject.addEventListener('cursorenter', function()
				{
					var y;
					for( y in this.JumpStart.onCursorEnter )
						this.JumpStart.onCursorEnter[y].call(this);
				});

				sceneObject.JumpStart.hasCursorEffects |= 0x8;
			}

			if( !(sceneObject.JumpStart.hasCursorEffects & 0x10) &&
				Object.keys(sceneObject.JumpStart.onCursorLeave).length !== 0)
			{
				sceneObject.addEventListener('cursorleave', function()
				{
					var y;
					for( y in this.JumpStart.onCursorLeave )
						this.JumpStart.onCursorLeave[y].call(this);
				});

				sceneObject.JumpStart.hasCursorEffects |= 0x10;
			}
		}
//		*/

		if( sceneObject.JumpStart.hasOwnProperty("onTick") )
		{
			for( y in sceneObject.JumpStart.onTick )
			{
				sceneObject.JumpStart.onTick[y].call(sceneObject);
			}
		}
	}

	//this.processCursorMove();

	this.renderer.render( this.scene, this.camera );
};

jumpStart.prototype.onWindowResize = function()
{
	if( !JumpStart.webMode )
		return;

	JumpStart.camera.aspect = window.innerWidth / window.innerHeight;
	JumpStart.camera.updateProjectionMatrix();
	JumpStart.renderer.setSize( window.innerWidth, window.innerHeight );
};

jumpStart.prototype.setOptions = function(options)
{
	if( this.initialized )
	{
		console.log("Options cannot be changed after JumpStart has been initialized.");
		return;
	}

	var y;
	var x;
	for( x in options )
	{
		// Only handle options that exist.
		if( !this.options.hasOwnProperty(x) )
			continue;

		if( typeof options[x] !== 'object' )
			this.options[x] = options[x];
		else
		{
			for( y in options[x] )
			{
				// Only handle options that exist.
				if( !this.options[x].hasOwnProperty(y) )
					continue;

				this.options[x][y] = options[x][y];
			}
		}
	}

	// Determine if we must raycast every cursor move:
	if( this.options.enabledCursorEvents.cursorEnter || this.options.enabledCursorEvents.cursorLeave )
		this.options.enabledCursorEvents.cursorMove = true;
};

jumpStart.prototype.loadModels = function()
{
	// Handle various argument types.
	var models;
	if( Array.isArray(arguments[0]) )
		models = arguments[0];
	else if( arguments.length === 1 )
		models = [arguments[0]];
	else
		models = arguments;

	this.modelLoader.batchName = "batch" + Date.now();

	var x;
	for( x in models )
	{
		var fileName = models[x];
		JumpStart.models.push({"fileName": fileName, "batchName": JumpStart.modelLoader.batchName});
		
		if( JumpStart.options.legacyLoader )
			JumpStart.objectLoader.load(fileName, JumpStart.modelLoader.batchCallbackFactory(fileName, JumpStart.modelLoader.batchName));
		else
			JumpStart.objectLoader.load(fileName, fileName.substring(0, fileName.length - 3) + "mtl", JumpStart.modelLoader.batchCallbackFactory(fileName, JumpStart.modelLoader.batchName));
	}

	return {
		"then": function(callback)
		{
			JumpStart.modelLoader.callbacks[JumpStart.modelLoader.batchName] = callback;
		}
	};
};

jumpStart.prototype.spawnInstance = function(fileName, userOptions)
{
	var options = {
		"parent": null,
		"key": "",
		"syncData": null
	};

	if( typeof userOptions !== 'undefined' )
	{
		// Merg user args
		var x;
		for( x in userOptions )
		{
			// Only handle options that exist.
			if( !options.hasOwnProperty(x) )
				continue;

			options[x] = userOptions[x];
		}
	}

	// Make sure the fileName is a cached model.
	// do work

	var clone;
	var x;
	for( x in this.models )
	{
		if( this.models[x].fileName === fileName && this.models[x].hasOwnProperty("object") )
		{
			// Clone the model
			clone = this.models[x].object.clone();

			// Set the position
			clone.position.copy(this.worldOffset);

			// Set the orientation
			clone.rotation.set(0.0, 0.0, 0.0);

			// Add the instance to the scene
			if( !options.parent )
				this.scene.add(clone);
			else
				options.parent.add(clone);

			this.prepInstance.call(clone, fileName);

			// Add this object to the synced instance list
//			/*
			if( options.key !== "" )
			{
				this.syncedInstances[options.key] = clone;
				this.numSyncedInstances++;
				g_numSyncedInstances = this.numSyncedInstances;

				this.firebaseSync.addObject(clone, options.key, options.syncData);
			}
//			*/
			
			console.log("Spawned an object");

			return clone;
		}
	}

	console.log("Model is not precached" + fileName);

	return null;
};

jumpStart.prototype.prepInstance = function(modelFile)
{
	var sceneObject = this;

	// TODO: Sync event handlers if dev desires (object name = callback function name)

	// Prepare it to get callback logic.
	sceneObject.JumpStart =
	{
		"onSpawn": {},
		"onTick": {},
		"onCursorDown": {},
		"onCursorUp": {},
		"onCursorEnter": {},
		"onCursorLeave": {},
		"spawnListeners": {},
		"tickListeners": {},
		"cursorDownListeners": {},
		"cursorUpListeners": {},
		"cursorEnterListeners": {},
		"cursorLeaveListeners": {},
		"blocksLOS": true,
		"tintColor": new THREE.Color(),
//		"physicsFlags": 0x0,	// 0 = disabled, 0x1 = atrest, 0x2 = freefall
//		"thrust": new THREE.Vector3(0, 0, 0),
//		"freefallRotate": new THREE.Vector3((Math.PI / 2.0) * Math.random(), (Math.PI / 2.0) * Math.random(), (Math.PI / 2.0) * Math.random()),
		"hasCursorEffects": 0x0,	// Used to optimize raycasting as well as attach window-level listeners to objects, if desired.
		"modelFile": modelFile,
		"setTint": function(tintColor)
		{
			if( JumpStart.webMode )
			{
				var x, mesh;
				for( x in this.children )
				{
					mesh = this.children[x];

					if( mesh.material && mesh.material instanceof THREE.MeshPhongMaterial )
						mesh.material.ambient = tintColor;
				}
			}
			else
			{
				var altspaceTintColor = {"r": tintColor.r * 0.5, "g": tintColor.g * 0.5, "b": tintColor.b * 0.5};

				this.userData.tintColor = altspaceTintColor;

				this.traverse(function(child)
				{
					this.userData.tintColor = altspaceTintColor;
				}.bind(this));
			}
		}.bind(this),
		"addDataListener": function(property, listener)
		{
			JumpStart.addDataListener(this, property, listener);
		}.bind(this)
		/*
		"setModel": function(userModelName)
		{
			// FIXME: setGeometry was removed from THREE.js, need a better implementation.
			// Such as a JumpStart.clone method that will clone all JumpStart properties & callbacks along with regular stuff.
			var x;
			for( x in JumpStart.models )
			{
				if( JumpStart.models[x].fileName === fileName && JumpStart.models[x].hasOwnProperty("object") )
				{
					this
				}
			}
		}.bind(this)
		*/
	};
};

jumpStart.prototype.prepEventListeners = function(sceneObject, inEventName)
{
	var eventName = null;
	if( typeof inEventName === 'string' )
		eventName = inEventName;

	var x;
	if( !eventName || eventName === 'spawn' )
	{
		if( typeof sceneObject.JumpStart.onSpawn === 'function' )
			sceneObject.JumpStart.onSpawn = {'default': sceneObject.JumpStart.onSpawn};

		// FIXME: Only supporting 1 event callback. Should support N.
		for( x in sceneObject.JumpStart.onSpawn )
		{
			if( x.indexOf("_") !== 0 && typeof window[x] === 'function' )
			{
				sceneObject.JumpStart.spawnListeners[x] = x;
				break;
			}
		}
	}

	if( !eventName || eventName === 'tick' )
	{
		if( typeof sceneObject.JumpStart.onTick === 'function' )
			sceneObject.JumpStart.onTick = {'default': sceneObject.JumpStart.onTick};

		// FIXME: Only supporting 1 event callback. Should support N.
		for( x in sceneObject.JumpStart.onTick )
		{
			if( x.indexOf("_") !== 0 && typeof window[x] === 'function' )
			{
				sceneObject.JumpStart.tickListeners[x] = x;
				break;
			}
		}
	}

	if( !eventName || eventName === 'cursordown' )
	{
		if( typeof sceneObject.JumpStart.onCursorDown === 'function' )
			sceneObject.JumpStart.onCursorDown = {'default': sceneObject.JumpStart.onCursorDown};

		// FIXME: Only supporting 1 event callback. Should support N.
		for( x in sceneObject.JumpStart.onCursorDown )
		{
			if( x.indexOf("_") !== 0 && typeof window[x] === 'function' )
			{
				sceneObject.JumpStart.cursorDownListeners[x] = x;
				break;
			}
		}
	}

	if( !eventName || eventName === 'cursorup' )
	{
		if( typeof sceneObject.JumpStart.onCursorUp === 'function' )
			sceneObject.JumpStart.onCursorUp = {'default': sceneObject.JumpStart.onCursorUp};

		// FIXME: Only supporting 1 event callback. Should support N.
		for( x in sceneObject.JumpStart.onCursorUp )
		{
			if( x.indexOf("_") !== 0 && typeof window[x] === 'function' )
			{
				sceneObject.JumpStart.cursorUpListeners[x] = x;
				break;
			}
		}
	}

	if( !eventName || eventName === 'cursorenter' )
	{
		if( typeof sceneObject.JumpStart.onCursorEnter === 'function' )
			sceneObject.JumpStart.onCursorEnter = {'default': sceneObject.JumpStart.onCursorEnter};

		// FIXME: Only supporting 1 event callback. Should support N.
		for( x in sceneObject.JumpStart.onCursorEnter )
		{
			if( x.indexOf("_") !== 0 && typeof window[x] === 'function' )
			{
				sceneObject.JumpStart.cursorEnterListeners[x] = x;
				break;
			}
		}
	}

	if( !eventName || eventName === 'cursorleave' )
	{
		if( typeof sceneObject.JumpStart.onCursorLeave === 'function' )
			sceneObject.JumpStart.onCursorLeave = {'default': sceneObject.JumpStart.onCursorLeave};

		// FIXME: Only supporting 1 event callback. Should support N.
		for( x in sceneObject.JumpStart.onCursorLeave )
		{
			if( x.indexOf("_") !== 0 && typeof window[x] === 'function' )
			{
				sceneObject.JumpStart.cursorLeaveListeners[x] = x;
				break;
			}
		}
	}
};

jumpStart.prototype.removeSyncedObject = function(victim, userIsLocal)
{
	if( !victim )
		return;

	var isLocal = (typeof userIsLocal !== 'undefined') ? userIsLocal : true;

	if( this.firebaseSync )
	{
		// If this is a networked object, remove it from the Firebase
		var x;
		for( x in this.syncedInstances )
		{
			if( this.syncedInstances[x] === victim )
			{
				if( isLocal )
					this.firebaseSync.removeObject(x);

				// Remove it from the local array of synced instances too
				delete this.syncedInstances[x];
				this.numSyncedInstances--;
				break;
			}
		}
	}

	// Remove the local object instance too (and always)
	this.scene.remove(victim);
};

/*
jumpStart.prototype.syncObject = function(sceneObject)
{
	if( this.firebaseSync )
		this.firebaseSync.saveObject(sceneObject);
};
*/

jumpStart.prototype.addSyncedObject = function(sceneObject, userSyncData, userKey)
{
	/*
	var x;
	for( x in this.syncedInstances )
	{
		if( this.syncedInstances[x] === sceneObject )
		{
			console.log("Object is already synced!!");
			return;
		}
	}
	*/

	// Prep listeners NOW, before we are added to the firebase.
	this.prepEventListeners(sceneObject);

	var x;
	for( x in sceneObject.JumpStart.onSpawn )
		sceneObject.JumpStart.onSpawn[x].call(sceneObject, true);

	var key, syncData;
	// Add this unique object to the Firebase
	// Hash the unique ID's because they are VERY long.
	// In the case of conflicts, the 2nd object does not spawn. (Thanks to firebase.js)
	if( this.firebaseSync && (typeof userKey !== 'string' || userKey === "") )
		key = __hash(this.firebaseSync.senderId + Date.now() + sceneObject.uuid);
	else
		key = userKey;

		// Any property of sceneObject.JumpStart that can change AND that we want synced needs to be in syncData.
		syncData = {
			"modelFile": sceneObject.JumpStart.modelFile,
			"spawnListeners": sceneObject.JumpStart.spawnListeners,
			"tickListeners": sceneObject.JumpStart.tickListeners,
			"cursorDownListeners": sceneObject.JumpStart.cursorDownListeners,
			"cursorUpListeners": sceneObject.JumpStart.cursorUpListeners,
			"cursorEnterListeners": sceneObject.JumpStart.cursorEnterListeners,
			"cursorLeaveListeners": sceneObject.JumpStart.cursorLeaveListeners
		};

		// Now merg in any values we were passed by the user as well (1 level deep)
		// WARNING: User variable names are sharing space with JumpStart variable names in sceneObject.JumpStart.userData.syncData!!
		// FIXME: Fix this ASAP (if at all) because this will affect user code on the frontend of the API!!
		// FIXME: x2 FIXME because user variables are probably getting whiped out when this function is called.
		if( typeof userSyncData !== 'undefined' )
		{
			var x, y;
			for( x in userSyncData )
			{
				// Only handle options that exist.
//				if( !syncData.hasOwnProperty(x) )
//					continue;

				if( typeof userSyncData[x] !== 'object' )
					syncData[x] = userSyncData[x];
				else
				{
					if( !syncData.hasOwnProperty(x) )
						syncData[x] = {};
					
					for( y in userSyncData[x] )
					{
						syncData[x][y] = userSyncData[x][y];
					}
				}
			}
		}

		sceneObject.userData.syncData = syncData;
		console.log(sceneObject.userData.syncData);
//	}
	

	if( !this.firebaseSync )
		return;

	this.firebaseSync.addObject(sceneObject, key);

	// Store this key with this object locally
	this.syncedInstances[key] = sceneObject;
	this.numSyncedInstances++;
	g_numSyncedInstances = this.numSyncedInstances;

	console.log("Added synced object with key " + key);
};

function jumpStartModelLoader()
{
	this.callbacks = {};
	this.batchName = "";
}

jumpStartModelLoader.prototype.addCallback = function(name, func)
{
	if( typeof this.callbacks[name] !== 'undefined' && this.callbacks[name] )
		this.removeCallback(name);

	this.callbacks[name] = func;
};

jumpStartModelLoader.prototype.removeCallback = function(name)
{
	this.callbacks[name] = null;
};

jumpStartModelLoader.prototype.onModelBatchLoaded = function(batchName)
{
	if( this.callbacks.hasOwnProperty(batchName) )
	{
		this.callbacks[batchName]();
	}
};

jumpStartModelLoader.prototype.batchCallbackFactory = function(fileName, batchName)
{
	return function(loadedObject)
	{
		JumpStart.modelLoader.onModelLoaded(fileName, loadedObject, batchName);
	};
}

jumpStartModelLoader.prototype.onModelLoaded = function(fileName, loadedObject, batchName)
{
	// Assume we are finished loading models until we know otherwise.
	var batchFinishedLoading = true;

	var x;
	for( x in JumpStart.models )
	{
		if( JumpStart.models[x].batchName !== batchName )
			continue;

		if( JumpStart.models[x].fileName === fileName )
			JumpStart.models[x].object = loadedObject;
		else if( !JumpStart.models[x].hasOwnProperty("object") )
			batchFinishedLoading = false;
	}

	if( batchFinishedLoading )
		JumpStart.modelLoader.onAllModelsLoaded(batchName);
}

jumpStartModelLoader.prototype.onAllModelsLoaded = function(batchName)
{
	var batchSize = 0;
	var x;
	for( x in JumpStart.models )
	{
		if( JumpStart.models[x].batchName === batchName )
			batchSize++;
	}

	console.log("Loaded " + batchSize + " models.");

	JumpStart.modelLoader.onModelBatchLoaded(batchName);
}

function jumpStartDebugUI()
{
	this.editPanelElem = null;
	this.editFunction = null;
	this.focusedObject = null;
}

jumpStartDebugUI.prototype.editOnTick = function()
{
	var sceneObject = JumpStart.debugui.focusedObject;

	// Grab a couple of pointers...
	var contentElem = JumpStart.debugui.editPanelElem.getElementsByClassName('JumpStartDevPane')[0];

	while( contentElem.hasChildNodes() )
	    contentElem.removeChild(contentElem.lastChild);

	// Get the template we want to spawn...
	var templateElem = document.getElementById('JumpStartFunctionEdit');
	if( templateElem )
		contentElem.innerHTML = templateElem.innerHTML;
	
	// Get our textarea element
	var textareaElem = contentElem.getElementsByClassName('JumpStartFunctionEntry')[0];

	// FIXME: Just getting the 'default' event for now.  Should support N events!!
	var currentListener = null;
	var x;
	for( x in sceneObject.JumpStart.onTick )
	{
		currentListener = sceneObject.JumpStart.onTick[x];
		break;
	}

	textareaElem.value = currentListener;
};

jumpStartDebugUI.prototype.editListener = function(listenerName)
{
	var sceneObject = JumpStart.debugui.focusedObject;

	// Grab a couple of pointers...
	var contentElem = JumpStart.debugui.editPanelElem.getElementsByClassName('JumpStartDevPane')[0];

	while( contentElem.hasChildNodes() )
	    contentElem.removeChild(contentElem.lastChild);

	// Get the template we want to spawn...
	var templateElem = document.getElementById('JumpStartFunctionEdit');
	if( templateElem )
		contentElem.innerHTML = templateElem.innerHTML;
	
	// Get our textarea element
	var textareaElem = contentElem.getElementsByClassName('JumpStartFunctionEntry')[0];

	// FIXME: Just getting the 'default' event for now.  Should support N events!!
	var currentListener = null;
	var funcName = null;
	var funcArgs = null;
	var funcMeat = null;
	var x;
	for( x in sceneObject.JumpStart[listenerName] )
	{
		currentListener = sceneObject.JumpStart[listenerName][x];
		funcName = x;
		break;
	}

	// Strip some stuff from this listener...
	var textareaContent = "" + currentListener;

	var found = textareaContent.indexOf("function ");
	if( found === 0 )
	{
		found = textareaContent.indexOf("(");
		if( found >= 0 )
		{
			funcArgs = textareaContent.substring(found + 1);
			found = funcArgs.indexOf(")");
			if( found >= 0 )
				funcArgs = funcArgs.substring(0, found);
		}

		found = textareaContent.indexOf("{");
		if( found >= 0 )
		{
			funcMeat = textareaContent.substring(found+2);
			found = funcMeat.lastIndexOf("}");
			if( found >= 0 )
				funcMeat = funcMeat.substring(0, found-1);
		}
	}
	/*
	else
	{
		funcArgs = textareaContect.substring(found+12);

		found = textareaContent.indexOf("{");
		if( found >= 0 )
			funcMeat = "	" + functextareaContentArgs.substring(found+1);

		found = funcMeat.lastIndexOf("}");
		if( found >= 0 )
			funcMeat = funcMeat.substring(0, found);
	}
	*/

	textareaElem.value = funcMeat;

	JumpStart.debugui.editFunction = {'name': funcName, 'args': funcArgs, 'meat': funcMeat, 'type': listenerName};

	// Set the listener drop down list (for N listener support)
	var select = contentElem.getElementsByClassName('JumpStartFunctionSelect')[0];
	var option = document.createElement("option");

	var upperListenerName = listenerName;
	var firstLetter = upperListenerName.substring(0, 1).toUpperCase();
	upperListenerName = firstLetter + upperListenerName.substring(1);
	option.text = upperListenerName + ": " + funcName + "(" + funcArgs + ")";
	select.appendChild(option);
};

jumpStartDebugUI.prototype.cancelChanges = function()
{
	//var victim = document.body.getElementsByClassName("JumpStartContainerPanel")[0];
	var victim = JumpStart.debugui.editPanelElem;
	document.body.removeChild(victim);

	JumpStart.debugui.editPanelElem = null;
	JumpStart.debugui.focusedObject = null;
	JumpStart.debugui.editFunction = null;
};

jumpStartDebugUI.prototype.applyChanges = function()
{
	var textareaElem = JumpStart.debugui.editPanelElem.getElementsByClassName('JumpStartFunctionEntry')[0];
	textareaContent = textareaElem.value;

	var editFunction = JumpStart.debugui.editFunction;

	var funcArgs = editFunction.args;
	if( !funcArgs )
		funcArgs = "";

	var code = editFunction.name + " = function(" + funcArgs + ") { " + textareaContent + " };";
	eval(code);
	JumpStart.debugui.focusedObject.JumpStart[editFunction.type][editFunction.name] = window[editFunction.name];

	var victim = JumpStart.debugui.editPanelElem;
	document.body.removeChild(victim);

	JumpStart.debugui.editPanelElem = null;
	JumpStart.debugui.focusedObject = null;
	JumpStart.debugui.editFunction = null;
};


// Method: hash
// Purpose:
//   Generate a hash of the given value.
// Credits:
//   This function is based on a function by baderj on the XBMC forums.
//   The thread is located at: http://forum.xbmc.org/showthread.php?tid=58389
__hash = function(value) {

	var unsignNumber = function(number, bytes) {
  		return number >= 0 ? number : Math.pow(256, bytes || 4) + number;
	};
	
  var data = value;
  data = data.replace(/\//g, "\\");

  var CRC = 0xffffffff;
  data = data.toLowerCase();
  for( var j = 0; j < data.length; j++) {
    var c = data.charCodeAt(j);
    CRC ^= c << 24;
    for( var i = 0; i < 8; i++) {
      if( unsignNumber(CRC, 8) & 0x80000000) {
        CRC = (CRC << 1) ^ 0x04C11DB7;
      }
      else {
        CRC <<= 1;
      }
    }
  }

  if(CRC < 0) {
    CRC = CRC >>> 0;
  }

  var CRC_str = CRC.toString(16);
  while(CRC_str.length < 8) {
    CRC_str = '0' + CRC_str;
  }

  return CRC_str;
};