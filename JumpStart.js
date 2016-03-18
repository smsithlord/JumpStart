// Declare some globals
var g_isGear, g_gamepadsEnabled, g_gamepads, g_activeGamepad, g_materialCreator, g_localUser, g_worldOffset, g_worldScale, g_objectLoader, g_camera, g_renderer, g_scene, g_clock, g_rayCaster, g_enclosure, g_deltaTime, g_crosshair, g_lookHit, g_numSyncedInstances, g_networkReady, g_floorPlane, g_roofPlane, g_westPlane, g_northPlane, g_eastPlane, g_southPlane, g_hoveredObject;

g_isGear = navigator.userAgent.match(/mobile/i);
//g_isGear = true;

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
				altspace.getThreeJSTrackingSkeleton().then(function(object)
				{
					JumpStart.localUser.trackingSkeleton = object;
					JumpStart.connectToFirebase();
				});
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
	window.addEventListener( 'mousedown', function(e) { JumpStart.onMouseDown(e); e.preventDefault(); return false; }, false);
	window.addEventListener( 'mouseup', function(e) { JumpStart.onMouseUp(e); e.preventDefault(); return false; }, false);
	document.body.style.backgroundColor = "rgba(0, 0, 0, 1.0)";
}

function jumpStart()
{
	// Certain values are read-only after JumpStart has been initialized
	this.initialized = false;
	this.altContentAlreadyLoaded = false;
	this.personalBrowser = null;
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
	this.materialCreator = null;
	this.syncedInstances = {};
	this.infoSlate = null;
	this.requestedRoomId = null;
	this.fpsSlate = null;
	this.webLook = false;
	this.webLookPrev = null;
	this.webMouse = null;
	this.gamepads = null;
	this.gamepadsEnabled = false;
	this.activeGamepad = null;
	this.boundFadeObjects = new Array();

	// Any properties of a scene object's JumpStart sub-object that are NOT whitelisted get auto-synced.
	//this.noSyncProperties = ["addDataListener", "setTint", "setColor", "setVisible", "makePhysics", "makeStatic", "applyForce", "sync", "hasCursorEffects", "blocksLOS", "onCursorLeave", "onCursorUp", "onCursorDown", "onTick", "onSpawn", "onNetworkRemoved", "tintColor", "velocity", "key"];
	this.noSyncProperties = ["addDataListener", "cloneMaterial", "setTint", "setColor", "setVisible", "makePhysics", "makeStatic", "applyForce", "sync", "hasCursorEffects", "onCursorLeave", "onCursorUp", "onCursorDown", "onTick", "onSpawn", "onNetworkRemoved", "tintColor", "velocity", "key"];

	this.networkReady = false;	// Know if we are networked & ready to go.
	this.localDataListeners = {};	// Need to simulate network activity locally
	this.pendingObjects = {};
	this.numSyncedInstances = 0;
	this.initialSync = true;
	this.debugui = new jumpStartDebugUI();
	this.pendingDataListeners = [];
	//this.floorPlane = {};
	this.floorPlane = null;
	this.roofPlane = null;
	this.westPlane = null;
	this.northPlane = null;
	this.eastPlane = null;
	this.southPlane = null;

	this.audioContext = new (window.webkitAudioContext || window.AudioContext)();
	this.cachedSounds = {};

	// FIXME: placeholders for real input event handlers.  will be something basic, like unity itself uses.
	this.pendingClick = false;
	this.pendingClickUp = false;
	this.pendingEventA = null;

	this.models = [];

	this.options =
	{
		"titleImageURL": "",
		"debugMode": false,
		"legacyLoader": false,
		"worldScale": 1.0,
		"scaleWithEnclosure": false,
		"showFPS": true,
		"raycastEnabled": true,
		"showCrosshair": true,
		"showCursorPlanes": false,
		"enabledCursorEvents":
		{
			"cursorDown": true,
			"cursorUp": true,
			"cursorEnter": true,
			"cursorLeave": true,
			"cursorMove": true,
			"bottomPlane": true,
			"topPlane": true,
			"northPlane": true,
			"southPlane": true,
			"eastPlane": true,
			"westPlane": true
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
			"suppressPersonalBrowser": false,
			"params": { "AUTOSYNC": true, "TRACE": false }
		}
	};

	this.worldScale;
	this.worldOffset = new THREE.Vector3();
	this.webMode = !(window.hasOwnProperty("altspace") && window.altspace.inClient);
	this.isGear = /mobile/i.test(navigator.userAgent);
}

jumpStart.prototype.makeInvisible = function(sceneObject)
{
	sceneObject.traverse(function(child)
	{
		if( child.material && child.material instanceof THREE.MeshPhongMaterial )
		{
			child.material.visible = false;
		}
	}.bind(this));
};

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
//	if( !this.initialSync )
//		this.networkSpawn(key, syncData, false);
	if( !this.pendingObjects.hasOwnProperty(key) )
		this.pendingObjects[key] = syncData;
};

jumpStart.prototype.onFirebaseRemoveObject = function(key, syncData)
{
	var object = this.syncedInstances[key];

	if( !object )
		return;

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
	this.prepEventListeners(sceneObject);

	if( !this.syncedInstances.hasOwnProperty(sceneObject.JumpStart.key) )
	{
		this.addSyncedObject(sceneObject);
		return;
	}

	if( this.networkReady )
	{
		// First, copy all updated values from JumpStart into userData.syncData
		var x;
		for( x in sceneObject.JumpStart )
		{
			if( this.noSyncProperties.indexOf(x) !== -1 )
				continue;

			sceneObject.userData.syncData[x] = sceneObject.JumpStart[x];
		}

		if( this.networkReady )
			this.firebaseSync.saveObject(sceneObject);
	}


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
	var cursorPlane;

	if( !this.options["legacyLoader"] )
		depth = 0.0;

	if( this.options["legacyLoader"] )
	{
		cursorPlane = new THREE.Mesh(
			new THREE.BoxGeometry(params.width, params.height, depth),
			new THREE.MeshBasicMaterial( { color: getRandomColor(), transparent: true, opacity: 0.5, visible: this.options["showCursorPlanes"] })
		);
	}
	else
	{
		/*
		cursorPlane = new THREE.Mesh(
			new THREE.PlaneGeometry(params.width, params.height),
			new THREE.MeshBasicMaterial( { color: getRandomColor(), transparent: true, opacity: 0.5, visible: this.options["showCursorPlanes"] })
		);*/
cursorPlane = new THREE.Mesh(
			new THREE.BoxGeometry(params.width, params.height, depth),
			new THREE.MeshBasicMaterial( { color: getRandomColor(), transparent: true, opacity: 0.5, visible: this.options["showCursorPlanes"] })
		);
	}
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

	if( !this.webMode )
	{
		cursorPlane.addEventListener("cursordown", function(e) { JumpStart.pendingClick = true; });
		cursorPlane.addEventListener("cursorup", function(e) { JumpStart.pendingClickUp = true; });
	}

	this.scene.add(cursorPlane);

	return cursorPlane;
};

jumpStart.prototype.onMouseDown = function(e)
{
	if( e.button === 0 )
	{
		this.onCursorDown();
	}
	else if( e.button === 2 )
	{
//		this.webLook = true;

		var pos = new THREE.Vector3().copy(this.cursorRay.origin).add(this.cursorRay.direction);
		g_camera.lookAt(pos);
	}
};

jumpStart.prototype.onCursorDown = function()
{
	if( this.clickedObject )
		this.onCursorUp();

	// FIXME: Add options for how non-JumpStart objects interact with raycasting and mouse events.
	var intersects;
	if( this.options.raycastEnabled )
	{
		if( typeof g_rayCastObjects !== "undefined" )
		{
			/*
			var rayCastObjects = g_rayCastObjects.slice(0);
			rayCastObjects.push(this.floorPlane);
			rayCastObjects.push(this.roofPlane);
			rayCastObjects.push(this.westPlane);
			rayCastObjects.push(this.northPlane);
			rayCastObjects.push(this.eastPlane);
			rayCastObjects.push(this.southPlane);

			intersects = this.rayCaster.intersectObjects(rayCastObjects, true);
			*/

			intersects = this.rayCaster.intersectObjects(g_rayCastObjects, true);
		}
		else
			intersects = this.rayCaster.intersectObjects(this.scene.children, true);
	}
	else
		intersects = this.rayCaster.intersectObjects([this.floorPlane, this.roofPlane, this.westPlane, this.northPlane, this.eastPlane, this.southPlane], true);

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
	{
		window.onCursorDown();
	}
};

jumpStart.prototype.onMouseUp = function(e)
{
	if( e.button === 0 )
	{
		this.onCursorUp();
	}
	else if( e.button === 2 )
	{
		this.webLook = false;
	}
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
	if( !this.webLook )
	{
//		console.log(e.clientX + " " + e.clientY + " vs " + window.innerWidth + "  " + window.innerHeight);
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

		this.futureCursorRay = { "origin": this.camera.position, "direction": direction };
	}
	else
	{
		console.log("Delta: " + (this.webLookPrev.x - e.clientX));

		var mouse3D = new THREE.Vector3(0, 0, 0);

		var valX = (e.clientX / window.innerWidth) * 2 - 1;
		if( valX > 0.0001 )
			valX = (window.innerWidth / 2.0) + 1;
		else if( valX < -0.0001 )
			valX = (window.innerWidth / 2.0) - 1;

		var valY = -(e.clientY / window.innerHeight) * 2 + 1;
		if( valY > 0.0001 )
			valY = (window.innerHeight / 2.0) - 1;
		else if( valY < -0.0001 )
			valY = (window.innerHeight / 2.0) + 1;

		mouse3D.x = (valX / window.innerWidth) * 2 - 1;
		mouse3D.y = -(valY / window.innerHeight) * 2 + 1;
//		mouse3D.x = this.webMouse.x + ((this.webLookPrev.x - e.clientX) / 0.01);
//		mouse3D.y = this.webMouse.y;// + (((this.webLookPrev.y - e.clientY) / window.innerHeight) * 2 + 1);
		mouse3D.z = 0.5;

		this.webMouse.x = mouse3D.x;
		this.webMouse.y = mouse3D.y;
		this.webLookPrev.x = e.clientX;
		this.webLookPrev.y = e.clientY;

		// Convert the 2D position to a 3D point
		mouse3D.unproject(this.camera);

		// Get a look vector from the camera to mouse3D
		var direction = new THREE.Vector3();
		direction = mouse3D.sub(this.camera.position).normalize();

		this.futureCursorRay = { "origin": this.camera.position, "direction": direction };
	}
}

jumpStart.prototype.onCursorMove = function(e)
{
	if( e.hasOwnProperty("ray") )
		this.futureCursorRay = e.ray;
	else
		this.futureCursorRay = e.cursorRay;	// Only needed until 0.1 is completely depreciated
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
	this.localUser.lookOrigin.multiplyScalar(1.0/this.worldScale);
	this.localUser.lookDirection.copy(this.cursorRay.direction);

	// Set the raycaster
	this.rayCaster.set( this.cursorRay.origin, this.cursorRay.direction );

	// FIXME: TWO OPTIONS
	// A. Build a list of every eligible scene object THEN raycast.
	// B. Raycast, then filter for eligible objects.
	// Currently using option B cuz its like 3am right now...

	var intersects;
	var intersects;
	if( this.options.raycastEnabled )
	{
		if( typeof g_rayCastObjects !== "undefined" )
		{
			/*
			var rayCastObjects = g_rayCastObjects.slice(0);
			rayCastObjects.push(this.floorPlane);
			rayCastObjects.push(this.roofPlane);
			rayCastObjects.push(this.westPlane);
			rayCastObjects.push(this.northPlane);
			rayCastObjects.push(this.eastPlane);
			rayCastObjects.push(this.southPlane);

			intersects = this.rayCaster.intersectObjects(rayCastObjects, true);
			*/

			intersects = this.rayCaster.intersectObjects(g_rayCastObjects, true);
		}
		else
			intersects = this.rayCaster.intersectObjects(this.scene.children, true);
	}
	else
		intersects = this.rayCaster.intersectObjects([this.floorPlane, this.roofPlane, this.westPlane, this.northPlane, this.eastPlane, this.southPlane], true);

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
//			console.log(intersects[x].object.blocksLOS);
			if( intersects[x].object.hasOwnProperty("blocksLOS") && !intersects[x].object.blocksLOS )
				continue;

			var goodPoint = true;

			// Make sure it's a INWARD surface
			if( this.options["legacyLoader"] )
			{
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
			}

			if( goodPoint || true)
			{
				if( this.hoveredObject )
				{
					unhoverObject(this.hoveredObject);
					this.hoveredObject = null;
					g_hoveredObject = this.hoveredObject;
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
						g_hoveredObject = this.hoveredObject;
					}

					// Now set this new object as hovered
					for( y in sceneObject.JumpStart.onCursorEnter )
						sceneObject.JumpStart.onCursorEnter[y].call(sceneObject);

					this.hoveredObject = sceneObject;
					g_hoveredObject = this.hoveredObject;
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

	var oldScale = new THREE.Vector3().copy(this.crosshair.scale);

	if( !this.localUser.lookHit && this.hoveredObject )
	{
		unhoverObject(this.hoveredObject);
		this.hoveredObject = null;
		g_hoveredObject = this.hoveredObject;
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

	if( !this.localUser.lookHit )
		this.crosshair.scale.set(0.0001, 0.0001, 0.0001);
	else
	{
//		this.crosshair.scale.copy(oldScale);
		this.crosshair.scale.set(1, 1, 1);
	}

//		this.crosshair.scale.set(1, 1, 1);
};

jumpStart.prototype.createInfoSlate = function()
{
	if( this.infoSlate )
		return this.infoSlate;

	var slate = document.createElement("div");
	slate.style.cssText = "position: absolute; left: 0; right: 0; top: 0; bottom: 0;";

	return slate;
};

jumpStart.prototype.showInfoSlate = function()
{
	if( !this.infoSlate )
		this.infoSlate = this.createInfoSlate();

	if( this.infoSlate.parentNode !== document.body )
		document.body.appendChild(this.infoSlate);

	this.infoSlate.style.display = "block";
};

jumpStart.prototype.hideInfoSlate = function()
{
	if( !this.infoSlate )
		this.infoSlate = this.createInfoSlate();

//	if( this.infoSlate.parentNode !== document.body )
//		return;

	this.infoSlate.style.display = "none";
};

jumpStart.prototype.destroyInfoSlate = function()
{
	if( !this.infoSlate )
		return;
	
	this.infoSlate.className = "zoomOutOfLoading";

	setTimeout(function()
	{
		JumpStart.infoSlate.parentNode.removeChild(JumpStart.infoSlate);
		JumpStart.infoSlate = null;
	}, 1000);
};

jumpStart.prototype.showLoadingMsg = function(msg)
{
	if( !this.infoSlate )
		return;

	var cleanMsg = msg.trim();
	if( cleanMsg !== "" )
		console.log(cleanMsg);

//	var consoleMsg = msg;
//	consoleMsg.replace(/^\s+|\s+$/g,'');
	document.getElementById("loadingMsg").innerHTML = msg;
	this.showInfoSlate();
}

jumpStart.prototype.initiate = function()
{
	if( this.altContentAlreadyLoaded )
		return;

	this.altContentAlreadyLoaded = true;

	this.worldScale = this.options["worldScale"];
	this.hoveredObject = null;
	g_hoveredObject = this.hoveredObject;

	// Figure out if we are passed a roomId in our URL
	// Based on the function at: https://css-tricks.com/snippets/javascript/get-url-variables/
	function getQueryVariable(variable)
	{
		var query = window.location.search.substring(1);
		var vars = query.split("&");
		var i;
		for( i=0; i < vars.length; i++ )
		{
			var pair = vars[i].split("=");
			if( pair[0] === variable )
				return pair[1];
		}

		return null;
	}

	this.requestedRoomId = getQueryVariable("room");

	this.infoSlate = this.createInfoSlate();

	var html = "<div id='loadingSlate' style='position: absolute; width: 100%; height: 100%;'><table height='100%' width='100%'><tr><td align='center' valign='bottom' height='100'>";

	var imgCount = 2;
	if( this.options["titleImageURL"] !== "" )
	{
		imgCount++;
		html += "<div id='titleImageSlate' style='position: relative; left: 0; right: 0;''><center><img id='titleImageElem' src='";
		html += this.options["titleImageURL"];
		html += "' onload='var elem = document.getElementById(\"loadingSlate\"); if( typeof elem.loadedImageCount === \"undefined\" ) elem.loadedImageCount = 0; elem.loadedImageCount++; if( elem.loadedImageCount == " + imgCount + " ) { elem.className = \"zoomIntoLoading\"; elem.style.display = \"block\"; JumpStart.finishInit(); }' /></center></div>";
		//html += "' /></center></div>";
	}

	var logo = "jumpstartlogo.png";
	if( !this.webMode )
		logo = "loadingAlt.png";

	html += "</td></tr><tr><td height='1%' align='center' valign='middle'>";
	html += "<img src='misc/" + logo + "' id='loadingLogo' onload='var elem = document.getElementById(\"loadingSlate\"); if( typeof elem.loadedImageCount === \"undefined\" ) elem.loadedImageCount = 0; elem.loadedImageCount++; if( elem.loadedImageCount == " + imgCount + " ) { elem.className = \"zoomIntoLoading\"; elem.style.display = \"block\"; JumpStart.finishInit(); }' />";
	//html += "<img src='misc/jumpstartlogo.png' id='loadingLogo' />";
	html += "</td></tr><tr><td align='center' valign='top' height='100'>";
	html += "<div id='loadingMsg'>Initializing...</div>";
	html += "</td></tr></table>";

	var loadingElem = "<div id='loadingRing' style='position: absolute; top: 0; bottom: 0; left: 0; right: 0;'><table width='100%' height='100%'><tr><td align='center' valign='middle'><img src='misc/loading.png' class='spinningImage' onload='var elem = document.getElementById(\"loadingSlate\"); if( typeof elem.loadedImageCount === \"undefined\" ) elem.loadedImageCount = 0; elem.loadedImageCount++; if( elem.loadedImageCount == " + imgCount + " ) { elem.className = \"zoomIntoLoading\"; elem.style.display = \"block\"; JumpStart.finishInit(); }' /></td></tr></table></div></div>";
	//var loadingElem = "<div id='loadingRing' style='position: absolute; top: 0; bottom: 0; left: 0; right: 0;'><table width='100%' height='100%'><tr><td align='center' valign='middle'><img src='misc/loading.png' class='spinningImage' /></td></tr></table></div></div>";
	html += loadingElem;

	this.infoSlate.innerHTML = html;
	this.showInfoSlate();
	return;
}

jumpStart.prototype.finishInit = function()
{
	//document.getElementById("loadingSlate").className += " zoomIntoLoading";

	if( this.webMode )
	{
		this.worldScale = 1.0;
		
		//this.enclosure = { "innerWidth": window.innerWidth / 3.0, "innerHeight": window.innerHeight / 3.0, "innerDepth": window.innerWidth / 3.0 };
		var commonVal = Math.round(1024 / 2.5);
		this.enclosure = {
			"innerWidth": commonVal,
			"innerHeight": commonVal,
			"innerDepth": commonVal,
			"adjustedWidth": commonVal,
			"adjustedHeight": commonVal,
			"adjustedDepth": commonVal,
			"scaledWidth": Math.round(commonVal * (1 / this.worldScale)),
			"scaledHeight": Math.round(commonVal * (1 / this.worldScale)),
			"scaledDepth": Math.round(commonVal * (1 / this.worldScale))
		};

		this.webLookPrev = { "x": commonVal / 2.0, "y": commonVal / 2.0};
		this.webMouse = {"x": commonVal / 2.0, "y": commonVal / 2.0}

		this.localUser = { "userId": "WebUser" + Date.now(), "displayName": "WebUser", "trackingSkeleton": null };

		this.localUser.displayName = "WebUser" + Date.now();
//		if( this.options.debugMode )
//			this.localUser.displayName = "Flynn";
		/* don't ask until after init
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
		*/

		// Web controls
		/*
var element = document.body;
				var pointerlockchange = function ( event ) {

					if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {
						controlsEnabled = true;
						controls.enabled = true;
						blocker.style.display = 'none';
					} else {
						controls.enabled = false;
						blocker.style.display = '-webkit-box';
						blocker.style.display = '-moz-box';
						blocker.style.display = 'box';
						instructions.style.display = '';
					}

					console.log("alpha");
				};
				var pointerlockerror = function ( event ) {
					console.log("beta");
//					instructions.style.display = '';
				};
				// Hook pointer lock state change events
				document.addEventListener( 'pointerlockchange', pointerlockchange, false );
				document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
				document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );
				document.addEventListener( 'pointerlockerror', pointerlockerror, false );
				document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
				document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );
				setTimeout(function(){ document.body.requestPointerLock(); }, 10000);
*/
		document.body.addEventListener("contextmenu", function(e){
			e.preventDefault();
			return false;
		});

	}
	else
	{
		// Altspace has a different style of scaling
		this.worldScale *= 3.0;

		if( this.enclosure.innerDepth === 300 )
			this.worldScale *= 0.3;

		// Adjust for enclosure scale, if desired.
		if( this.options["scaleWithEnclosure"] )
			this.worldScale *= this.enclosure.pixelsPerMeter / 280;

		this.enclosure.adjustedWidth = Math.round(this.enclosure.innerWidth * JumpStart.worldScale);
		this.enclosure.adjustedHeight = Math.round(this.enclosure.innerHeight * JumpStart.worldScale);
		this.enclosure.adjustedDepth = Math.round(this.enclosure.innerDepth * JumpStart.worldScale);

		this.enclosure.scaledWidth = Math.round(this.enclosure.innerWidth * (1 / JumpStart.worldScale));
		this.enclosure.scaledHeight = Math.round(this.enclosure.innerHeight * (1 / JumpStart.worldScale));
		this.enclosure.scaledDepth = Math.round(this.enclosure.innerDepth * (1 / JumpStart.worldScale));
	}

	var scaledRatio = this.enclosure.innerHeight / this.enclosure.adjustedHeight;
	this.worldOffset = new THREE.Vector3(0.0, (-this.enclosure.innerHeight / 2.0) * scaledRatio, 0.0);

	var width = this.enclosure.scaledWidth;
	//if( this.options.legacyLoader )
	//	width = this.enclosure.innerWidth;

	var height = this.enclosure.scaledHeight;
	//if( this.options.legacyLoader )
	//	height = this.enclosure.innerHeight;

	var depth = this.enclosure.scaledDepth;
	//if( this.options.legacyLoader )
	//	depth = this.enclosure.innerDepth;

	// Offset us if we are in the personal browser
	//if( this.enclosure.innerDepth === 100 || this.enclosure.innerDepth === 300 )
	if( this.enclosure.innerDepth === 1.0 || Math.floor(this.enclosure.pixelsPerMeter) === 645 )
	{
		this.worldOffset.z = depth / (-2.0);

		// Everything has been pushed back, but Altspace will hide anything that is outside
		// of what it thinks are the bounds.  So our working depth is actually HALF and
		// we must fudge the offset.
		depth = depth / 2.0;
		this.worldOffset.z += depth / 2.0;
		this.personalBrowser = true;
	}
	else
		this.personalBrowser = false;

//			console.log(this.enclosure.innerDepth);

//	this.enclosure.bounds = {};
//	this.enclosure.bounds.bottomCenter = new THREE.Vector3(0, (-this.enclosure.innerHeight / 2.0) * scaledRatio, 0);

	if( this.options.legacyLoader )
		this.objectLoader = new THREE.AltOBJMTLLoader();
	else
	{
		/*
		this.objectLoader = altspace.utilities.multiloader;
		this.objectLoader.init({
			crossOrigin: 'anonymous',
			baseUrl: "http://localhost:8000/live/"
		});
		*/
		this.objectLoader = new THREE.OBJMTLLoader();
//		this.materialCreator = new THREE.MTLLoader.MaterialCreator();
//		this.materialCreator.crossOrigin = 'anonymous';
	}

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

	if ( this.webMode )
	{
		this.renderer = new THREE.WebGLRenderer({ alpha: true });
		this.renderer.setClearColor( 0x00ff00, 0.3 );
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

		this.localUser.lookOrigin = new THREE.Vector3().copy(this.camera.position);

		// OBJMTLLoader always uses PhongMaterial, so we need light in scene.
		var ambient = new THREE.AmbientLight( 0xffffff );
		this.scene.add( ambient );
	}
	else
	{
		this.scene.addEventListener( "cursormove", function(e) { JumpStart.onCursorMove(e); });

		if( this.options.legacyLoader )
			this.renderer = altspace.getThreeJSRenderer({version:'0.1.0'});
		else
			this.renderer = altspace.getThreeJSRenderer();
	}

	// Create some invisible planes for raycasting.
	if( this.options.enabledCursorEvents.bottomPlane )
	{
		var bottomPlane = JumpStart.spawnCursorPlane({
			"position": new THREE.Vector3(0, 0, 0).add(this.worldOffset),
			"rotate": new THREE.Vector3(-Math.PI / 2.0, 0, 0),
			"width": width,
			"height": depth
		});

		// Save this for users to use
		this.floorPlane = bottomPlane;
	}

	if( this.options.enabledCursorEvents.topPlane )
	{
		var topPlane = JumpStart.spawnCursorPlane({
			"position": new THREE.Vector3(0, -2.0 * this.worldOffset.y, 0).add(this.worldOffset),
			"rotate": new THREE.Vector3(Math.PI / 2.0, 0, 0),
			"width": width,
			"height": depth
		});

		this.roofPlane = topPlane;
	}

	if( this.options.enabledCursorEvents.northPlane )
	{
		var northPlane = JumpStart.spawnCursorPlane({
			"position": new THREE.Vector3(0, -this.worldOffset.y, depth / (-2.0)).add(this.worldOffset),
			"rotate": new THREE.Vector3(0, 0, 0),
			"width": width,
			"height": height
		});

		this.northPlane = northPlane;
	}

	if( this.options.enabledCursorEvents.southPlane )
	{
		var southPlane = JumpStart.spawnCursorPlane({
			"position": new THREE.Vector3(0, -this.worldOffset.y, depth / 2.0).add(this.worldOffset),
			"rotate": new THREE.Vector3(0, Math.PI, 0),
			"width": width,
			"height": height
		});

		this.southPlane = southPlane;
	}

	if( this.options.enabledCursorEvents.westPlane )
	{
		var westPlane = JumpStart.spawnCursorPlane({
			"position": new THREE.Vector3(width / (-2.0), -this.worldOffset.y, 0).add(this.worldOffset),
			"rotate": new THREE.Vector3(0, Math.PI / 2.0, 0),
			"width": depth,
			"height": height
		});

		this.westPlane = westPlane;
	}

	if( this.options.enabledCursorEvents.eastPlane )
	{
		var eastPlane = JumpStart.spawnCursorPlane({
			"position": new THREE.Vector3(width / (2.0), -this.worldOffset.y, 0).add(this.worldOffset),
			"rotate": new THREE.Vector3(0, -Math.PI / 2.0, 0),
			"width": depth,
			"height": height
		});

		this.eastPlane = eastPlane;
	}

	g_gamepads = this.gamepads;
	g_gamepadsEnabled = this.gamepadsEnabled;
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
	g_roofPlane = this.roofPlane;
	g_westPlane = this.westPlane;
	g_northPlane = this.northPlane;
	g_eastPlane = this.eastPlane;
	g_southPlane = this.southPlane;
	g_activeGamepad = this.activeGamepad;

	// We are ready to rock-n-roll!!
	this.initialized = true;

	if( (JumpStart.options.firebase.rootUrl === "" || JumpStart.options.firebase.appId === "" || JumpStart.requestedRoomId) &&
		(!JumpStart.personalBrowser || !JumpStart.options["surppressPersonalBrowser"]) )
	{
		// Load our crosshair
		this.loadModels("models/JumpStart/crosshair.obj").then(function()
		{
			// Spawn it in
			var crosshair = JumpStart.spawnInstance("models/JumpStart/crosshair.obj");
			crosshair.JumpStart.blocksLOS = false;

			// Should it be invisible?
			if( !JumpStart.options["showCrosshair"] )
			{
				crosshair.traverse(function(child)
				{
					if( child.material && child.material instanceof THREE.MeshPhongMaterial )
					{
						child.material.visible = false;
					}
				}.bind(this));
			}

			crosshair.JumpStart.onTick = function()
			{
				if( !JumpStart.options["showCrosshair"] )
					return;
				
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

			JumpStart.reallyFinishInit();
			return;
		});
	}
	else
		JumpStart.reallyFinishInit();
}

jumpStart.prototype.reallyFinishInit = function()
{
	function prepPrecache()
	{
		if( !JumpStart.webMode )
		{
			JumpStart.gamepadsEnabled = true;

			this.gamepads = altspace.getGamepads();
			g_gamepads = this.gamepads;
		}
		else
		{
			// FIXME: This webMode check for controller support sucks!
//			var gamepadSupportAvailable = !!navigator.webkitGetGamepads || !!navigator.webkitGamepads || !!navigator.getGamePads || !!navigator.gamepads;

			JumpStart.gamepadsEnabled = true;//gamepadSupportAvailable;

			if( JumpStart.gamepadsEnabled )
			{
				if( !!navigator.getGamepads )
					this.gamepads = navigator.getGamepads();
				else
					this.gamepads = navigator.webkitGetGamepads();

				g_gamepads = this.gamepads;
			}
		}

		// User global, if it exists.
		if( window.hasOwnProperty("onPrecache") )
		{
			JumpStart.showLoadingMsg("Precaching custom assets...");
			onPrecache();
		}
		else
			JumpStart.doneCaching();
	}

	// Wait for us to get our room key
	if( JumpStart.options.firebase.rootUrl !== "" && JumpStart.options.firebase.appId !== "" )
	{
		JumpStart.showLoadingMsg("Waiting for Firebase session...");

		var myHandle = setInterval(function()
		{
			if( !JumpStart.firebaseSync.roomKey )
				return;

			clearInterval(myHandle);
/*
			var membersRef = JumpStart.firebaseSync.firebaseRoot.child(JumpStart.firebaseSync.appId).child('rooms').child(JumpStart.firebaseSync.roomKey).child('members');
			membersRef.once("value", function(snapshot) {
				var members = snapshot.val();

				var count = 0;
				var x;
				for( x in members )
					count++;
console.log("Member count: " + count);
				if( count > 0 )
					JumpStart.localUser.firstUser = false;

				// Now we're ready for game logic
				prepPrecache();
			});
*/

			var readyRef = JumpStart.firebaseSync.firebaseRoot.child(JumpStart.firebaseSync.appId).child('rooms').child(JumpStart.firebaseSync.roomKey).child('ready');
			readyRef.once("value", function(snapshot) {
				var ready = snapshot.val();

				if( typeof ready !== 'undefined' && ready )
					JumpStart.localUser.firstUser = false;

				// Now we're ready for game logic
				prepPrecache();
			});
		}, 100);
	}
	else
		prepPrecache();
};

jumpStart.prototype.doneCaching = function()
{
	// Spawn any synced objects that already exist on the server...
	// DO WORK FIXME

	var index;
	for( index in this.pendingObjects )
		this.networkSpawn(index, this.pendingObjects[index], true);

	this.initialSync = false;

	if( window.hasOwnProperty("onReady") )
	{
		if( this.firebaseSync )
		{
			if( this.firebaseSync.reloadWithNewURL )
				JumpStart.showLoadingMsg("Creating new Firebase session...");
			else
				JumpStart.showLoadingMsg("Connecting to Firebase session...");
		}

		if(  JumpStart.options.firebase.rootUrl !== "" && JumpStart.options.firebase.appId !== "" )
		{
			JumpStartRoomCheck();

			if( !g_doneChecking )
				g_checkRoom = setInterval(JumpStartRoomCheck, 2000);
		}
		else
		{
			JumpStart.showLoadingMsg("Ready.");
			onReady();
		}
	}
	else
	{
		console.log("Your app is ready, but you have no onReady callback function!");
		JumpStart.showLoadingMsg("Your app is missing its window-level onReady callback function.");
	}

	if (window.hasOwnProperty("onTouchpadGesture"))
	{
		altspace.addEventListener("touchpadgesture", onTouchpadGesture);
	}
};

var g_doneChecking = false;
var g_checkingRoom = false;
var g_checkRoom = null;
function JumpStartRoomCheck()
{
	if( g_checkingRoom )
		return;

	g_checkingRoom = true;
	var readyRef = JumpStart.firebaseSync.firebaseRoot.child(JumpStart.firebaseSync.appId).child('rooms').child(JumpStart.firebaseSync.roomKey).child('ready');
	readyRef.once("value", function(snapshot) {
		var ready = snapshot.val();

		if( typeof ready !== "undefined" && ready )
			JumpStart.localUser.firstUser = false;
		else
			JumpStart.localUser.firstUser = true;

		if( JumpStart.firebaseSync.firebaseRoom )
		{
			if( !JumpStart.personalBrowser || !JumpStart.options.firebase["suppressPersonalBrowser"] )
			{
				var roomRef = JumpStart.firebaseSync.firebaseRoot.child(JumpStart.firebaseSync.appId).child('rooms').child(JumpStart.firebaseSync.roomKey);
				roomRef.child("ready").set(true, function(errorObject)
				{
					if (errorObject) {
						console.error("firebase operation failed", errorObject);
						JumpStart.localUser.firstUser = false;
					}

					// Now we're ready for game logic
					JumpStart.showLoadingMsg("Connected.");
					onReady();

					g_checkingRoom = false;
					g_doneChecking = true;
					if( g_checkRoom )
					{
						clearInterval(g_checkRoom);
						g_checkRoom = null;
					}
				});
			}
			else
			{
				JumpStart.showLoadingMsg("Connected.");
				onReady();

				g_checkingRoom = false;
				g_doneChecking = true;
				if( g_checkRoom )
					{
						clearInterval(g_checkRoom);
						g_checkRoom = null;
					}
			}
		}
		else
		{
			g_checkingRoom = false;
			
			if( JumpStart.requestedRoomId )
			{
//				JumpStart.showLoadingMsg("<font style='color: #ff0000; font-weight: 900;'>FAILED to connect to Firebase room.  Reloading...</font>");
//							location.reload();
			}
			else
			{
				if( g_checkRoom )
				{
					clearInterval(g_checkRoom);
					g_checkRoom = null;
				}
			}
		}
	});
}

jumpStart.prototype.networkSpawn = function(key, syncData, isInitial)
{
	// 1. Copy everything that exists in syncData into JumpStart
	// 2. If there are any event listeners named, apply them to the object.

	if( this.pendingObjects.hasOwnProperty(key) )
		delete this.pendingObjects[key];

	if( typeof syncData === 'undefined' )
		return;

	var instance = this.spawnInstance(syncData.modelFile, {'key': key, 'syncData': syncData});

	this.updateJumpStartProperties(instance, syncData);

	// If the object has a spawn listener, NOW is the time...
	for( x in instance.JumpStart.onSpawn )
		instance.JumpStart.onSpawn[x].call(instance, false, isInitial);	// FIXME: This isInital flag is bullshit!!

	instance.JumpStart.key = key;
	this.syncedInstances[key] = instance;
	this.numSyncedInstances++;

	return instance;
};

jumpStart.prototype.updateJumpStartProperties = function(instance, syncData)
{
	var needsAppliedForce = false;

	var x, y;
	for( x in syncData )
	{
		if( !instance.JumpStart.hasOwnProperty(x) && typeof syncData[x] === 'object' )
		{
			// Try to determine which type of object it is
			if( syncData[x].hasOwnProperty('x') && syncData[x].hasOwnProperty('y') && syncData[x].hasOwnProperty('z') )
				instance.JumpStart[x] = new THREE.Vector3();
			else
				instance.JumpStart[x] = {};
		}

		if( typeof syncData[x] === 'object' )
		{
			for( y in syncData[x] )
				instance.JumpStart[x][y] = syncData[x][y];
		}
		else
		{
			// Apply any force that is needed
			/*
			if( (!instance.userData.hasOwnProperty("lastAppliedForce") || !instance.userData.lastAppliedForce.equals(instance.JumpStart.appliedForce)) || 
				(x === "physicsState" && syncData[x] !== instance.JumpStart.physicsState) )
*/

			if( x === "physicsState" && syncData[x] === 0 && instance.JumpStart.hasOwnProperty("velocity") )
			{
				instance.JumpStart.velocity.set(0, 0, 0);
				if( window.hasOwnProperty("TikiBallHasStopped") )
					TikiBallHasStopped();
			}

			if( (x === "physicsState" && syncData[x] !== instance.JumpStart.physicsState && syncData[x] !== 0) ||
				(x === "physicsState" && syncData[x] !== 0 && (!instance.userData.hasOwnProperty("lastAppliedForce") || !instance.userData.lastAppliedForce.equals(instance.JumpStart.appliedForce))) )
			{
				if( !instance.userData.hasOwnProperty("lastAppliedForce") )
					instance.userData.lastAppliedForce = new THREE.Vector3();

				if( instance.JumpStart.hasOwnProperty("appliedForce") )
					instance.userData.lastAppliedForce.copy(instance.JumpStart.appliedForce);

				needsAppliedForce = true;
				
				if( window.hasOwnProperty("MakeDrumHitParticles") && instance.JumpStart.appliedForce.length() > 0.0 )
				{
					if( instance.JumpStart.hasOwnProperty("velocity") )
					{
						instance.JumpStart.velocity.set(0, 0, 0);
						instance.userData.velocity.set(0, 0, 0);

						MakeDrumHitParticles(instance);
					}
				}
			}

			// Copy the value over like regular
			instance.JumpStart[x] = syncData[x];
		}
	}

	if( needsAppliedForce && instance.JumpStart.hasOwnProperty("velocity") )
	{
		//console.log(instance.JumpStart.velocity);
//		console.log((instance.JumpStart.appliedForce.equals(syncData.appliedForce) && instance.JumpStart.velocity.equals(syncData.velocity)));
//		instance.JumpStart.velocity.copy(syncData.velocity);



//		instance.JumpStart.velocity.add(instance.JumpStart.appliedForce);
		instance.JumpStart.velocity.copy(instance.JumpStart.appliedForce);
	}

	if( syncData.hasOwnProperty('networkRemovedListeners') )
	{
		for( x in syncData.networkRemovedListeners )
		{
			// Just replace ALL listeners, and we'll end up as the one named 'default'.
			if( x.indexOf("_") !== 0 && typeof window[x] === 'function' )
			{
				instance.JumpStart.onNetworkRemoved = {};
				instance.JumpStart.onNetworkRemoved[x] = window[x];
			}

			break;
		}
	}
	else
	{
		// If the object has an onSpawn listener that isn't named default, then clear it!
		for( x in instance.JumpStart.onNetworkRemoved )
		{
			if( x !== "default" )
				instance.JumpStart.onNetworkRemoved = {};

			break;
		}
	}

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
	else
	{
		// If the object has an onSpawn listener that isn't named default, then clear it!
		for( x in instance.JumpStart.onSpawn )
		{
			if( x !== "default" )
				instance.JumpStart.onSpawn = {};

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
	else
	{
		// If the object has an onSpawn listener that isn't named default, then clear it!
		for( x in instance.JumpStart.onTick )
		{
			if( x !== "default" )
				instance.JumpStart.onTick = {};

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
	else
	{
		// If the object has an onSpawn listener that isn't named default, then clear it!
		for( x in instance.JumpStart.onCursorDown )
		{
			if( x !== "default" )
				instance.JumpStart.onCursorDown = {};

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
	else
	{
		// If the object has an onSpawn listener that isn't named default, then clear it!
		for( x in instance.JumpStart.onCursorUp )
		{
			if( x !== "default" )
				instance.JumpStart.onCursorUp = {};

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
	else
	{
		// If the object has an onSpawn listener that isn't named default, then clear it!
		for( x in instance.JumpStart.onCursorEnter )
		{
			if( x !== "default" )
				instance.JumpStart.onCursorEnter = {};

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
	else
	{
		// If the object has an onSpawn listener that isn't named default, then clear it!
		for( x in instance.JumpStart.onCursorLeave )
		{
			if( x !== "default" )
				instance.JumpStart.onCursorLeave = {};

			break;
		}
	}
};

jumpStart.prototype.run = function()
{
	if( !this.firebaseSync || this.requestedRoomId )
	{
		var html = "";
		if( JumpStart.options["titleImageURL"] !== "" )
		{
			/*
			html += "<div style='position: fixed; top: 0; left: 0; right: 0;''><center><img src='";
			html += JumpStart.options["titleImageURL"];
			html += "'' /></center></div>";
			*/

			function getRealTop(elem, in_top, in_scale)
			{
				var rect = elem.getBoundingClientRect();

				var scale;
				if( typeof in_scale === 'undefined' )
					scale = rect.width / elem.offsetWidth;
				else
					scale = in_scale;
					
				var top;
				if( typeof in_top === 'undefined' )
					top = 0;
				else
					top = in_top;

				if( !elem.parentNode || elem.parentNode === document.body )
					return {"top": (top + rect.top), "scale": scale};

				var parentRect = elem.parentNode.getBoundingClientRect();

				top = (parentRect.top + rect.top);

				if( elem.parentNode && elem.parentNode !== document.body )
				{
					var values = getRealTop(elem.parentNode, top, scale);
					return {"top": values.top, "scale": values.scale};
				}
				else
					return {"top": top, "scale": scale};
			}

			var elem = document.getElementById("titleImageSlate");
			var simpleDist = elem.offsetTop;
			var values = getRealTop(elem);

			var distFromTop = Math.round(values.top);

			elem.parentElement.removeChild(elem);

			elem.style.position = "absolute";
			if( distFromTop === 0 )
			{
				elem.style.top = simpleDist + "px";
				values.scale = 1.0;
			}
			else
				elem.style.top = (distFromTop) + "px";

			elem.style.transform = "scale(" + values.scale + ")";
			elem.style.webkitTransform = "scale(" + values.scale + ")";
			document.body.appendChild(elem);

			var delay = 0.1;
			if( values.scale === 1.0 )
				delay = 1000;

			setTimeout(function()
			{
				var elem = document.getElementById("titleImageSlate");
				elem.style.top = 0;
				elem.style.transform = "scale(1.0)";
				elem.style.webkitTransform = "scale(1.0)";
			}, delay);

			//elem.style.top = "0";
//			return;
//			if( elem )
//			{
//				elem = elem.parentNode.removeChild(elem);
//				elem.style.position = "absolute";
//				document.body.appendChild(elem);
//			}
		}

		this.showLoadingMsg("");
		this.destroyInfoSlate();

		if( JumpStart.options["showFPS"] )
		{
			var fpsSlate = document.createElement("div");
			fpsSlate.id = "fps";
			fpsSlate.style.cssText = "position: fixed; top: 0; left: 0;";

			document.body.appendChild(fpsSlate);
			JumpStart.fpsSlate = fpsSlate;
		}

		var headerImage = document.createElement("div");
		headerImage.innerHTML = html;
		
		document.body.appendChild(headerImage);

		//this.clock.start();
		// Start the game loop
		this.onTick();

		// Init some stuff for Altspace
		/*
		if( !this.webMode )
		{
			var x, clone;
			for( x in this.models )
			{
				clone = this.models[x].object.clone();
//				clone.JumpStart.blocksLOS = false;
				clone.scale.set(0.0001, 0.0001, 0.0001);
				this.scene.add(clone);
//				JumpStart.makeInvisible(clone);
//				this.scene.remove(clone);
			}
		}
		*/
	}
};

var frameSamples = new Array();
jumpStart.prototype.onTick = function()
{
	if( !this.initialized )
		return;

	if( this.gamepadsEnabled )
	{
		if( this.webMode )
		{
			if( !!navigator.getGamepads )
				this.gamepads = navigator.getGamepads();
			else
				this.gamepads = navigator.webkitGetGamepads();
		}
		else
			this.gamepads = altspace.getGamepads();
		
		g_gamepads = this.gamepads;	// probably not needed

		var myGamepad = null;

		if( this.activeGamepad )
			myGamepad = this.activeGamepad;
		else
		{
			var x, gamepad;
			for( x in this.gamepads )
			{
				gamepad = this.gamepads[x];
				if( typeof gamepad !== "undefined" && typeof gamepad.buttons !== "undefined" && gamepad.buttons.length > 0 )
				{
					var needsBreak = false;
					var i;
					for( i = 0; i < gamepad.buttons.length; i++ )
					{
						if( gamepad.buttons[i].value )
						{
							myGamepad = gamepad;
							needsBreak = true;
							break;
						}
					}

					if( needsBreak )
						break;
				}
			}

			this.activeGamepad = myGamepad;
			g_activeGamepad = this.activeGamepad;
		}

		if( myGamepad && typeof myGamepad.buttons !== "undefined" )
		{
			var i;
			for( i = 0; i < myGamepad.buttons.length; i++ )
			{
				var buttonIndex = i;

				var button = myGamepad.buttons[buttonIndex];
				if( !button.hasOwnProperty("previousValue") )
					button.previousValue = false;
				
				if( button.previousValue !== button.value )
				{
					// Button has been pressed!
					if( button.value )
					{
						if( window.hasOwnProperty("onGamepadButtonDown") )
							onGamepadButtonDown(button, buttonIndex)
					}
					else
					{
						if( window.hasOwnProperty("onGamepadButtonUp") )
							onGamepadButtonUp(button, buttonIndex)
					}
				}

				button.previousValue = button.value;
			}
		}
	}

	if( this.fpsSlate )
	{
		var timeScale = 1.0;
		if( window.hasOwnProperty("g_timeScale") )
			timeScale = g_timeScale;
		
		frameSamples.push(g_deltaTime / timeScale);

		var average = 0;
		if( frameSamples.length > 10 )
		{
			var sum = 0;
			var x;
			for( x in frameSamples )
				sum += frameSamples[x];

			average = sum / frameSamples.length;
			frameSamples = new Array();

			this.fpsSlate.innerHTML = "<h2><b>" + Math.round(1.0 / average) + " fps</b></h2>";
		}
	}

	function recursive(parentObject)
	{
		var childrenSnapshot = new Array();
		var x;
		for( x in parentObject.children )
			childrenSnapshot.push(parentObject.children[x]);

//		if( typeof g_rayCastObjects !== "undefined" )
//			childrenSnapshot.push(parentObject);

		var sceneObject;
		var i, x, y, z;
//		for( x in parentObject.children )
		for( i = 0; i < childrenSnapshot.length; i++ )
		{
			if( parentObject !== g_scene && !parentObject.hasOwnProperty("JumpStart") )
				continue;

			//sceneObject = parentObject.children[x];
			sceneObject = childrenSnapshot[i];
			if( sceneObject === undefined || !sceneObject.hasOwnProperty("JumpStart") )
				continue;

			// Fix up anything the local app dev assigned to listeners
			this.prepEventListeners(sceneObject);

			// Sync current state with network state
			//if( sceneObject.userData.hasOwnProperty("syncData") )
			if( sceneObject.JumpStart.hasOwnProperty("key") && typeof this.syncedInstances[sceneObject.JumpStart.key] !== 'undefined' )
				this.updateJumpStartProperties(sceneObject, sceneObject.userData.syncData);

			if( sceneObject.JumpStart.hasOwnProperty("physicsState") && sceneObject.JumpStart.physicsState !== 0 )
			{
				// Sense velocity is not synced, make sure it exists on anything that needs it.
				if( !sceneObject.JumpStart.hasOwnProperty("velocity") )
					sceneObject.JumpStart.velocity = new THREE.Vector3(0, 0, 0);

				var state = sceneObject.JumpStart.physicsState;
				if( (state & 0x1) && !(state & 0x2) )
				{
					// Gravity is a bit much, so cut it in half.
					sceneObject.JumpStart.velocity.y -= 9.8 * g_deltaTime;
				}

				// Terminal velocity because we have no air drag
				var velLen = sceneObject.JumpStart.velocity.length();
				var termVel = 5.0;
				if( window.hasOwnProperty("g_terminalVelocity") )
					termVel = g_terminalVelocity;

				if( window.hasOwnProperty("g_timeScale") )
					termVel *= g_timeScale;

				if( velLen > termVel )
					sceneObject.JumpStart.velocity.multiplyScalar(0.9);
				/*
				if( !window.hasOwnProperty("g_terminalVelocity") )
				{
console.log("subbing " + velLen);
					if( velLen > 5.0 )
						sceneObject.JumpStart.velocity -= velLen;

							//sceneObject.JumpStart.velocity.normalize().multiplyScalar( 5.0 );
				}
				*/
	//				else if( sceneObject.JumpStart.velocity.length() > g_terminalVelocity )
	//					sceneObject.JumpStart.velocity.normalize().multiplyScalar( g_terminalVelocity );

				// Update the rotation
				sceneObject.rotateX((sceneObject.JumpStart.freefallRot.x * 5.0) * this.deltaTime);
				sceneObject.rotateY((sceneObject.JumpStart.freefallRot.y * 5.0) * this.deltaTime);
				sceneObject.rotateZ((sceneObject.JumpStart.freefallRot.z * 5.0) * this.deltaTime);

				// Bounce us off of walls
				var maxWidth = this.enclosure.scaledDepth / 2;
				var maxHeight = this.enclosure.scaledHeight / 2;
				var maxDepth = this.enclosure.scaledDepth / 2;

				if( sceneObject.position.x > maxWidth )
				{
					sceneObject.position.x = maxWidth;
					sceneObject.JumpStart.velocity.x = -sceneObject.JumpStart.velocity.x;
				}
				else if( sceneObject.position.x < -maxWidth )
				{
					sceneObject.position.x = -maxWidth;
					sceneObject.JumpStart.velocity.x = -sceneObject.JumpStart.velocity.x;
				}

				if( sceneObject.position.z > maxDepth )
				{
					sceneObject.position.z = maxDepth;
					sceneObject.JumpStart.velocity.z = -sceneObject.JumpStart.velocity.z;
				}
				else if( sceneObject.position.z < -maxDepth )
				{
					sceneObject.position.z = -maxDepth;
					sceneObject.JumpStart.velocity.z = -sceneObject.JumpStart.velocity.z;
				}

				if( sceneObject.position.y > maxHeight )
				{
					sceneObject.position.y = maxHeight;
					sceneObject.JumpStart.velocity.y = -sceneObject.JumpStart.velocity.y;
				}
				else if( sceneObject.position.y < -maxHeight )
				{
					sceneObject.position.y = -maxHeight;
					sceneObject.JumpStart.velocity.y = -sceneObject.JumpStart.velocity.y;
				}

				var deltaPos = new THREE.Vector3().copy(sceneObject.JumpStart.velocity).multiplyScalar(60.0).multiplyScalar(JumpStart.deltaTime);
				if( !(state & 0x4) )
					sceneObject.position.add(deltaPos);
				else
				{
					sceneObject.translateX(deltaPos.x);
					sceneObject.translateY(deltaPos.y);
					sceneObject.translateZ(deltaPos.z);
				}
			}

			if( sceneObject.JumpStart.hasOwnProperty("onTick") )
			{
				for( y in sceneObject.JumpStart.onTick )
					sceneObject.JumpStart.onTick[y].call(sceneObject);
			}

			// If this has bound-fade on, adjust the scale according to
			// how close it is to the edge of the enclosure. (at the end of this tick)
			if( sceneObject.userData.hasOwnProperty("boundFade") && sceneObject.userData.boundFade )
				this.boundFadeObjects.push(sceneObject);

			if( sceneObject.children.length > 0 )
			{
//				// Also disable recursive calls onto children when manually controlling raycast objects
//				if( typeof g_rayCastObjects === "undefined" )
					recursive.call(this, sceneObject);
			}
		}
	}

	if( !this.initialized )
		return;

	// Spawn anything that needs to be spawned
	var index;
	for( index in this.pendingObjects )
		this.networkSpawn(index, this.pendingObjects[index], false);

	this.processPendingDataListeners();

	this.deltaTime = this.clock.getDelta();
	g_deltaTime = this.deltaTime;

	if( window.hasOwnProperty("g_timeScale") )
		g_deltaTime = g_deltaTime * g_timeScale;

	// FIXME: We should really prep event listeners before processing cursor move, in case any of them have new listeners assigned with the = function syntax.
	this.processCursorMove();

/*
	if( this.webMode && this.webLook )
	{
		var pos = new THREE.Vector3().copy(this.cursorRay.origin).add(this.cursorRay.direction);
		g_camera.lookAt(pos);
	}
	*/

/*
	// Do post-tick stuff for cursor planes
	for( x in posttickCursorPlanes )
	{
		sceneObject = posttickCursorPlanes[x];

		if( JumpStart.localUser.lookHit && JumpStart.localUser.lookHit !== sceneObject )
		{
			console.log("yoo");
			sceneObject.position.set(0, -9999999, 0);
		}
	}
*/
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

//	this.boundFadeObjects = new Array();

	var i, fadeObject;
	for( i = 0; i < this.boundFadeObjects.length; i++ )
	{
		fadeObject = this.boundFadeObjects[i];

		if( fadeObject === undefined || fadeObject.userData.boundFadeScale === undefined )
			continue;

		//fadeObject.userData.boundFadeScale !== undefined
		fadeObject.scale.copy(fadeObject.userData.boundFadeScale);
	}

	this.boundFadeObjects = new Array();

/*
	if( typeof g_rayCastObjects !== "undefined" )
	{
		console.log("here");
		for( i = 0; i < g_rayCastObjects.length; i++ )
		{
			recursive.call(this, g_rayCastObjects[i]);
		}
	}
	else

*/
		recursive.call(this, this.scene);

	var pos = new THREE.Vector3();
	var boundScaleAmount, boundScaleDif, testDif;
	for( i = 0; i < this.boundFadeObjects.length; i++ )
	{
		if( this.boundFadeObjects[i] === undefined )
			continue;

		fadeObject = this.boundFadeObjects[i];
		pos.setFromMatrixPosition(fadeObject.matrixWorld);
		pos.multiplyScalar(1.0 / this.worldScale);

		boundScaleDif = -this.worldOffset.y - Math.abs(pos.x);

		testDif = -this.worldOffset.y - Math.abs(pos.y);
		if( testDif < boundScaleDif )
			boundScaleDif = testDif;

		testDif = -this.worldOffset.y - Math.abs(pos.z);
		if( testDif < boundScaleDif )
			boundScaleDif = testDif;

		if( boundScaleDif < 20.0 )
		{
			if( !fadeObject.userData.hasOwnProperty("boundFadeScale") )
				fadeObject.userData.boundFadeScale = new THREE.Vector3();

			fadeObject.userData.boundFadeScale.copy(fadeObject.scale);

			if( boundScaleDif < 0 )
				fadeObject.scale.set(0.0001, 0.0001, 0.0001);
			else
			{
				boundScaleAmount = 20.0 / boundScaleDif;
				fadeObject.scale.multiplyScalar(1.0 / boundScaleAmount);
			}
		}
		else if( fadeObject.userData.hasOwnProperty("boundFadeScale") )
			delete fadeObject.userData.boundFadeScale;
	}

	var enclosurePlanes = [
		{"plane": this.floorPlane, "axis": "y", "greater": false},
		{"plane": this.roofPlane, "axis": "y", "greater": true},
		{"plane": this.westPlane, "axis": "x", "greater": false},
		{"plane": this.eastPlane, "axis": "x", "greater": true},
		{"plane": this.northPlane, "axis": "z", "greater": false},
		{"plane": this.southPlane, "axis": "z", "greater": true}
	];

	var i, plane;
	for( i = 0; i < enclosurePlanes.length; i++ )
	{
		enclosurePlane = enclosurePlanes[i];

		plane = enclosurePlane.plane;

		if( !plane )
			continue;

		if( !plane.hasOwnProperty("originalScale") )
		{
			plane.originalScale = new THREE.Vector3().copy(plane.scale);
			plane.scaledHidden = false;
		}
		else
		{
			if( this.localUser.lookOrigin )
			{
				if( enclosurePlane.greater && this.localUser.lookOrigin[enclosurePlane.axis] > plane.position[enclosurePlane.axis] )
				{
					if( !plane.scaledHidden )
					{
						plane.scale.set(0.0001, 0.0001, 0.0001);
						plane.scaledHidden = true;
					}
				}
				else if( !enclosurePlane.greater && this.localUser.lookOrigin[enclosurePlane.axis] < plane.position[enclosurePlane.axis] )
				{
					if( !plane.scaledHidden )
					{
						plane.scale.set(0.0001, 0.0001, 0.0001);
						plane.scaledHidden = true;
					}
				}
				else
				{
					if( plane.scaledHidden )
					{
						plane.scale.copy(plane.originalScale);
						plane.scaledHidden = false;
					}
				}
			}
		}
	}

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

/*
jumpStart.prototype.loadMaterial = function(fileName, inBaseUrl)
{
	alt.multiloader.init({
		crossOrigin: 'anonymous',
		baseUrl: inBaseUrl,
	});

	var req = new alt.multiloader.LoadRequest();
	var names = Object.keys(CONFIG.pieces);

	req.mtlUrls.push(file+'.mtl');

	var boardFile = CONFIG.board.modelFile;
	req.objUrls.push(boardFile+'.obj');
	req.mtlUrls.push(boardFile+'.mtl');
	alt.multiloader.load(req, function(){//onComplete
		if(req.error) {
			throw new Error(req.error);
		}
		for(var i=0; i < req.objects.length; i++) {
			var object = req.objects[i];
			if(i+1 === req.objects.length) {//board is last object
				object.name = 'board';
				board = object;
				continue;
			}
			object.scale.set(modelScale, modelScale, modelScale);
			object.userData.pieceType = names[i];
			object.userData.pieceColor = 'white';
			whitePieces[i] = object;
			var objectClone = object.clone();
			objectClone.userData.pieceColor = 'black';
			blackPieces[i] = objectClone;
			//Set the black color later.
		}
		onComplete();
	});
};

jumpStart.prototype.loadModelWithMaterial = function(modelFile, materialFile)
{
	this.modelLoader.batchName = "batch" + Date.now();

	JumpStart.models.push({"fileName": fileName, "batchName": JumpStart.modelLoader.batchName});
	
//	if( JumpStart.options.legacyLoader )
//		JumpStart.objectLoader.load(fileName, JumpStart.modelLoader.batchCallbackFactory(fileName, JumpStart.modelLoader.batchName));
//	else
//	{
		JumpStart.objectLoader.load(modelFile, materialFile, JumpStart.modelLoader.batchCallbackFactory(modelFile, JumpStart.modelLoader.batchName));
//	}
};
*/
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

/*
	var req = null;
	if( !JumpStart.options.legacyLoader )
		req = new this.objectLoader.LoadRequest();
	*/

	if( models.indexOf("models/JumpStart/crosshair.obj") >= 0 )
		this.showLoadingMsg("Loading engine assets...");
	else
		this.showLoadingMsg("Loading models: 0/" + models.length);

	var x;
	for( x in models )
	{
		var fileName = models[x];
		JumpStart.models.push({"fileName": fileName, "batchName": JumpStart.modelLoader.batchName});
		
//		this.showLoadingMsg("Loading " + fileName);

		if( JumpStart.options.legacyLoader )
			JumpStart.objectLoader.load(fileName, JumpStart.modelLoader.batchCallbackFactory(fileName, JumpStart.modelLoader.batchName));
		else
		{
//			req.objUrls.push(fileName);
//			req.mtlUrls.push(fileName.substring(0, fileName.length - 3) + "mtl");
			JumpStart.objectLoader.load(fileName, fileName.substring(0, fileName.length - 3) + "mtl", JumpStart.modelLoader.batchCallbackFactory(fileName, JumpStart.modelLoader.batchName));
		}
	}

/*
	this.objectLoader.load(req, function()
	{
		//console.log("Done loading!");
		if( req.error )
		{
			console.log("Error loading object!");
		}
		else
		{
			for( x = 0; x < req.objects.length; x++ )
			{
				var object = req.objects[x];
								//console.log(object);
				JumpStart.modelLoader.batchCallbackFactory(models[x], JumpStart.modelLoader.batchName)(object);
			}
		}
	});
*/

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

	if( fileName && fileName !== "" )
	{
		var x;
		for( x in this.models )
		{
			if( this.models[x].fileName === fileName && this.models[x].hasOwnProperty("object") )
			{
				// Clone the model
				clone = this.models[x].object.clone();
				break;
			}
		}
	}
	else
		clone = new THREE.Object3D();

	if( clone )
	{
		// Set the position
		if( !options.parent )
			clone.position.copy(this.worldOffset);

		// Set the orientation
		clone.rotation.set(0.0, 0.0, 0.0);

		// Add the instance to the scene
		if( !options.parent )
			this.scene.add(clone);
		else
			options.parent.add(clone);

		this.prepInstance.call(clone, fileName);

		if( !this.webMode )
		{
			clone.addEventListener("cursordown", function(e) { JumpStart.pendingClick = true; });
			clone.addEventListener("cursorup", function(e) { JumpStart.pendingClickUp = true; });
		}

		// Add this object to the synced instance list
//			/*
		if( options.key !== "" )
		{
			this.syncedInstances[options.key] = clone;
			clone.JumpStart.key = options.key;
			this.numSyncedInstances++;
			g_numSyncedInstances = this.numSyncedInstances;

			this.firebaseSync.addObject(clone, options.key, options.syncData);
		}
//			*/
		
		// Mark the material as needing to be updated
		/*
		var y, mesh;
		for( y in clone.children )
		{
			mesh = clone.children[y];

			if( mesh.material )
			{
//					mesh.material.needsUpdate = true;
				console.log(mesh.material.needsUpdate);
				document.getElementById("info").innerHTML = mesh.material.needsUpdate;
			}
		}
*/
//			console.log("Spawned an object");
		return clone;
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
		"onNetworkRemoved": {},
		"onSpawn": {},
		"onTick": {},
		"onCursorDown": {},
		"onCursorUp": {},
		"onCursorEnter": {},
		"onCursorLeave": {},
		"networkRemoved": {},
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
			// FIXME Inside of Altsapce it works fine, but in web mode every instance of the material used on the
			// object gets highlighted, even if on a different object instance.

			// Sets the TINT (or brightness) of an object.
			if( !JumpStart.options["legacyLoader"] )
			{
				if( !JumpStart.webMode )
				{
					tintColor.multiplyScalar(0.5);
					this.userData.tintColor = tintColor;

					this.traverse(function(child)
					{
						child.userData.tintColor = tintColor;
					}.bind(this));
				}
				else
				{
					this.traverse(function(child)
					{
						if( child.material && child.material instanceof THREE.MeshPhongMaterial )
						{
							child.material.color = tintColor;
							child.material.needsUpdate = true;
						}
					}.bind(this));
				}
			}
			else
			{
				if( !JumpStart.webMode )
				{
					tintColor.multiplyScalar(0.5);
					this.userData.tintColor = tintColor;

					this.traverse(function(child)
					{
						child.userData.tintColor = tintColor;
					}.bind(this));
				}
				else
				{
					this.traverse(function(child)
					{
						if( child.material && child.material instanceof THREE.MeshPhongMaterial )
						{
							child.material.color = tintColor;
							child.material.needsUpdate = true;
						}
					}.bind(this));
				}
			}
		}.bind(this),
		"cloneMaterial": function () 
		{
			this.traverse(function (child) 
			{
				if (!child.material) { return; }
				child.material = child.material.clone();
			}.bind(this));
		}.bind(this),
		"setVisible": function(visible)
		{
			this.traverse(function(child)
			{
				child.visible = visible;
			}.bind(this));
		}.bind(this),
		"setColor": function(color)
		{
			this.traverse(function(child)
			{
				if( child.material && child.material instanceof THREE.MeshPhongMaterial )
				{
					child.material.color = color;
					child.material.needsUpdate = true;
				}
			}.bind(this));
		}.bind(this),
		"addDataListener": function(property, listener)
		{
			JumpStart.addDataListener(this, property, listener);
		}.bind(this),
		"sync": function()
		{
			JumpStart.syncObject(this);
		}.bind(this),
		"applyForce": function(force)
		{
			JumpStart.applyForce(this, force);
		}.bind(this),
		"makePhysics": function()
		{
			JumpStart.makePhysics(this);
		}.bind(this),
		"makeStatic": function()
		{
			JumpStart.makeStatic(this);
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

	sceneObject.JumpStart.setTint(new THREE.Color(1.0, 1.0, 1.0));
};

jumpStart.prototype.prepEventListeners = function(sceneObject, inEventName)
{
	var eventName = null;
	if( typeof inEventName === 'string' )
		eventName = inEventName;

	var x;
	if( !eventName || eventName === 'networkRemoved' )
	{
		sceneObject.JumpStart.networkRemovedListeners = {};

		if( typeof sceneObject.JumpStart.onNetworkRemoved === 'function' )
			sceneObject.JumpStart.onNetworkRemoved = {'default': sceneObject.JumpStart.onNetworkRemoved};

		// FIXME: Only supporting 1 event callback. Should support N.
		for( x in sceneObject.JumpStart.onNetworkRemoved )
		{
			if( x.indexOf("_") !== 0 && typeof window[x] === 'function' )
			{
				sceneObject.JumpStart.networkRemovedListeners[x] = x;
				break;
			}
		}
	}

	if( !eventName || eventName === 'spawn' )
	{
		sceneObject.JumpStart.spawnListeners = {};

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
		sceneObject.JumpStart.tickListeners = {};

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
/*
		if( sceneObject.userData.syncData )
		{
			var syncData = sceneObject.userData.syncData;

			if( syncData.hasOwnProperty("tickListeners") )
				delete syncData.tickListeners;
		}
		*/
	}

	if( !eventName || eventName === 'cursordown' )
	{
		sceneObject.JumpStart.cursorDownListeners = {};

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
		sceneObject.JumpStart.cursorUpListeners = {};

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
/*
		if( sceneObject.userData.syncData )
		{
			var syncData = sceneObject.userData.syncData;

			if( syncData.hasOwnProperty("cursorUpListeners") )
				delete syncData.cursorUpListeners;
		}
		*/
	}

	if( !eventName || eventName === 'cursorenter' )
	{
		sceneObject.JumpStart.cursorEnterListeners = {};

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
/*
		if( sceneObject.userData.syncData )
		{
			var syncData = sceneObject.userData.syncData;

			if( syncData.hasOwnProperty("cursorEnterListeners") )
				delete syncData.cursorEnterListeners;
		}
		*/
	}

	if( !eventName || eventName === 'cursorleave' )
	{
		sceneObject.JumpStart.cursorLeaveListeners = {};

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
/*
		if( sceneObject.userData.syncData )
		{
			var syncData = sceneObject.userData.syncData;

			if( syncData.hasOwnProperty("cursorLeaveListeners") )
				delete syncData.cursorLeaveListeners;
		}
			*/
	}
};

jumpStart.prototype.removeSyncedObject = function(victim, userIsLocal)
{
	if( !victim )
		return;

	var isLocal = (typeof userIsLocal !== 'undefined') ? userIsLocal : true;

	// If this is a networked object, remove it from the Firebase
	var x;
	for( x in this.syncedInstances )
	{
		if( this.syncedInstances[x] === victim )
		{
			if( isLocal && this.firebaseSync )
				this.firebaseSync.removeObject(x);

			// Remove it from the local array of synced instances too
			delete this.syncedInstances[x];
			this.numSyncedInstances--;
			break;
		}
	}

	var hasListener = false;
	for( x in victim.JumpStart.onNetworkRemoved )
	{
		victim.JumpStart.onNetworkRemoved[x].call(victim, userIsLocal);
		hasListener = true;
	}

	if( !hasListener )
	{
		// Remove the local object instance too (unless the object has an onNetworkRemoved callback)
		this.scene.remove(victim);
	}
};

jumpStart.prototype.unsyncObject = function(sceneObject)
{
	var x;
	for( x in this.syncedInstances )
	{
		if( this.syncedInstances[x] === sceneObject )
		{
			// Remove it from the local array of synced instances too
			delete this.syncedInstances[x];
			this.numSyncedInstances--;

			if( this.firebaseSync )
				this.firebaseSync.removeObject(x);

			// If we have an onNetworkRemoved listener, now is the time
			for( x in sceneObject.JumpStart.onNetworkRemoved )
				sceneObject.JumpStart.onNetworkRemoved[x].call(sceneObject, true);

			break;
		}
	}
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

	var key;
	// Add this unique object to the Firebase
	// Hash the unique ID's because they are VERY long.
	// In the case of conflicts, the 2nd object does not spawn. (Thanks to firebase.js)
	if( this.firebaseSync && (typeof userKey !== 'string' || userKey === "") )
		key = __hash(this.firebaseSync.senderId + Date.now() + sceneObject.uuid);
	else if( (typeof userKey !== 'string' || userKey === "") )
		key = __hash(this.localUser.displayName + Date.now() + sceneObject.uuid);
	else
		key = userKey;


	/* UPDATE: Instead, just put all non-whitelisted values from JumpStart into syncdata to simplify things
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
	*/

	var syncData = {};
	for( x in sceneObject.JumpStart )
	{
		if( this.noSyncProperties.indexOf(x) !== -1 )
			continue;

		//syncData[x] = sceneObject.JumpStart[x];

		// FIXME: Is this really needed anymore? Would the above line not be a deep enough copy to keep syncData and JumpStart data separate?
		if( typeof sceneObject.JumpStart[x] !== 'object' )
			syncData[x] = sceneObject.JumpStart[x];
		else
		{
			if( !syncData.hasOwnProperty(x) )
				syncData[x] = {};
				
			for( y in sceneObject.JumpStart[x] )
				syncData[x][y] = sceneObject.JumpStart[x][y];
		}
	}

	// Now merg in any values we were passed by the user as well (1 level deep)
	// WARNING: User variable names are sharing space with JumpStart variable names in sceneObject.JumpStart.userData.syncData!!
	// FIXME: Fix this ASAP (if at all) because this will affect user code on the frontend of the API!!
	// FIXME: x2 FIXME because user variables are probably getting whiped out when this function is called.
	if( typeof userSyncData !== 'undefined' && userSyncData )
	{
		var x, y;
		for( x in userSyncData )
		{
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

	if( this.firebaseSync )
		this.firebaseSync.addObject(sceneObject, key);

	// Store this key with this object locally
	this.syncedInstances[key] = sceneObject;
	sceneObject.JumpStart.key = key;
	this.numSyncedInstances++;
	g_numSyncedInstances = this.numSyncedInstances;

//	console.log("Added synced object with key " + key);
};

jumpStart.prototype.makeStatic = function(sceneObject)
{
	sceneObject.JumpStart.physicsState = 0;
};

jumpStart.prototype.makePhysics = function(sceneObject)
{
	if( !sceneObject.hasOwnProperty("JumpStart") )
	{
		console.log("Only objects created with JumpStart.spawnInstance can be turned into physics objects!");
		return;
	}

//	if( sceneObject.JumpStart.hasOwnProperty("physicsState") )
//		console.log("Object is already physics!");

	// synced
	sceneObject.JumpStart.physicsState = 0x1;
	sceneObject.JumpStart.appliedForce = new THREE.Vector3(0, 0, 0);
	sceneObject.JumpStart.freefallRot = new THREE.Vector3((Math.PI / 2.0) * Math.random(), (Math.PI / 2.0) * Math.random(), (Math.PI / 2.0) * Math.random());

	// NOT synced
	sceneObject.JumpStart.velocity = new THREE.Vector3(0, 0, 0);
};

jumpStart.prototype.applyForce = function(sceneObject, force)
{
	if( !sceneObject.hasOwnProperty("JumpStart") )
	{
		console.log("Only objects created with JumpStart.spawnInstance can be turned into physics objects!");
		return;
	}

	if( !sceneObject.JumpStart.hasOwnProperty("physicsState") || sceneObject.JumpStart.physicsState === 0 )
		this.makePhysics(sceneObject);

	// FIXME FIX ME: This only works because it is an error to assign a vector this way!!!
//	sceneObject.JumpStart.appliedForce = force;
	sceneObject.JumpStart.appliedForce.copy(force);

//	sceneObject.JumpStart.appliedForce.copy(force);
//	sceneObject.JumpStart.appliedForce.copy(sceneObject.JumpStart.velocity);
//	sceneObject.JumpStart.appliedForce.add(force);


	sceneObject.JumpStart.velocity.copy(force);
//	sceneObject.JumpStart.velocity.add(force);
};

jumpStart.prototype.stopSyncing = function(sceneObject)
{
	if( this.syncedInstances.hasOwnProperty(sceneObject.JumpStart.key) )
		delete this.syncedInstances[sceneObject.JumpStart.key];
};

jumpStart.prototype.precacheSound = function(sound_file_name)
{
	if( typeof this.cachedSounds[sound_file_name] !== 'undefined' )
		return;

	var req = new XMLHttpRequest();
	req.open('GET', sound_file_name + '.ogg');
	req.responseType = 'arraybuffer';
	req.onload = function () {
		this.audioContext.decodeAudioData(req.response, function (buffer) {
			this.cachedSounds[sound_file_name] = buffer;
		}.bind(this));
	}.bind(this);
	req.send();
};

jumpStart.prototype.killSound = function(sound)
{
	sound.source.stop(0);
};

jumpStart.prototype.playSound = function(sound_file_name, volume_scale, user_loop)
{
	if( typeof this.cachedSounds[sound_file_name] === 'undefined' )
	{
		console.log("The sound " + sound_file_name + " is not cached!");
		this.precacheSound(sound_file_name);

		// Playing un-cached sounds is disabled!! (by default)
		return;
	}

	var volumeScale = (typeof volume_scale == 'undefined') ? 1.0 : volume_scale;

	var cachedSound = this.cachedSounds[sound_file_name];
	var source = this.audioContext.createBufferSource();
	source.buffer = cachedSound;
	source.loop = !!user_loop;

	var gainNode = this.audioContext.createGain();
	gainNode.gain.value = 1.0 * volumeScale;
	source.connect(gainNode);
	gainNode.connect(this.audioContext.destination);

	source.start(0);

	return {source: source, gainNode: gainNode};
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

	var completed = 0;
	var remaining = 0;
	var engineBatch = false;

	var x;
	for( x in JumpStart.models )
	{
		if( JumpStart.models[x].batchName !== batchName )
			continue;

		if( JumpStart.models[x].fileName === "models/JumpStart/crosshair.obj" )
			engineBatch = true;

		if( JumpStart.models[x].fileName === fileName )
		{
			JumpStart.models[x].object = loadedObject;
			completed++;
		}
		else if( !JumpStart.models[x].hasOwnProperty("object") )
		{
			batchFinishedLoading = false;
			remaining++;
		}
		else
			completed++;
	}

	if( !engineBatch )
		JumpStart.showLoadingMsg("Loading models: " + completed + "/" + (completed + remaining));

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

//	console.log("Loaded " + batchSize + " models.");

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

/*
	try { 
        esprima.parse('var answer =  42 *;');
    }
    catch(err) {
        console.log("Error is " + err);
    }
 */

	//console.log(syntax);

	var victim = JumpStart.debugui.editPanelElem;
	document.body.removeChild(victim);

	JumpStart.debugui.editPanelElem = null;
	JumpStart.debugui.focusedObject = null;
	JumpStart.debugui.editFunction = null;
};


/*
FirebaseSync.prototype._copyObjectData = function( object, objectData) {

	object.position.x = objectData.position.x;
	object.position.y = objectData.position.y;
	object.position.z = objectData.position.z;

	object.rotation.x = objectData.rotation.x;
	object.rotation.y = objectData.rotation.y;
	object.rotation.z = objectData.rotation.z;

	object.scale.x = objectData.scale.x;
	object.scale.y = objectData.scale.y;
	object.scale.z = objectData.scale.z;

	if ( objectData.hasOwnProperty( "syncData" )) {

		// copy top-level syncData into object.userData
		var syncDataClone = JSON.parse( JSON.stringify( objectData.syncData ));
		object.userData.syncData = syncDataClone;

		// Now do stuff for JumpStart
		if( window.hasOwnProperty("JumpStart") && object.hasOwnProperty("JumpStart") )
			JumpStart.updateJumpStartProperties(object, object.userData.syncData);
	}

}
*/



FirebaseSync.prototype.addDataListener = function(object, property, eventType, listener) {

	if ( !this.firebaseRoom ) return; // still initializing

	var objectKey = this.uuid2key[ object.uuid ];
	if ( !objectKey ) {
		console.error("Object not yet added to FirebaseSync", object);
		return ; // Cannot save positon if we don't have object's key.
	}

	var propertyLocation = this.firebaseRoom.child("objects").child(objectKey).child(property);

	function callbackFactory(snapshot, callback, eventType) {
		// If our local state already looks like the incoming, ignore.
		if( object.userData.syncData[snapshot.key()] != snapshot.val() )
			callback.call(this, snapshot, eventType);
	}

	propertyLocation.on(eventType, function(snapshot) { callbackFactory(snapshot, listener, eventType); }, this._firebaseCancel, object);

	if ( this.TRACE ) console.log("Added " + property + " " + eventType + " listener for " + object);
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



// First attempt at adding hierarchy support to Object.lookAt()
// WestLangley
// EDIT: Second attempt -- added zz85's lookAtWorld() and worldToLocal()

THREE.Object3D.prototype.worldToLocal = function ( vector ) {
    
    if ( !this.__inverseMatrixWorld ) this.__inverseMatrixWorld = new THREE.Matrix4();
    
    return this.__inverseMatrixWorld.getInverse( this.matrixWorld ).multiplyVector3( vector );
    
};

THREE.Object3D.prototype.lookAtWorld = function( vector ) {

    // todo: need to check for parent...
    this.parent.worldToLocal( vector );
    
    this.lookAt( vector );

};
 
THREE.Object3D.prototype.lookAt2 = function(vector) {
    
    // todo: need to check for parent...
    var vec3 = new THREE.Matrix4().getInverse(this.parent.matrixWorld).multiplyVector3(vector.clone());

    this.matrix.lookAt(vec3, this.position, this.up);

    if (this.rotationAutoUpdate) {

        this.rotation.getRotationFromMatrix(this.matrix);

    }

};
