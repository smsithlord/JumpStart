// Declare some globals
var g_localUser, g_worldOffset, g_worldScale, g_objectLoader, g_camera, g_renderer, g_scene, g_clock, g_rayCaster, g_enclosure, g_deltaTime, g_cursorEvents;

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
		JumpStart.connectToFirebase();
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
	this.cursorEvents = null;
	this.clickedObject = null;
	this.hoveredObject = null;
	this.deltaTime = 0.0;

	this.models = [];

	this.options =
	{
		"legacyLoader": false,
		"worldScale": 1.0,
		"scaleWithEnclosure": false,
		"enabledCursorEvents":
		{
			"cursorDown": true,
			"cursorUp": true,
			"cursorOver": true,
			"cursorOff": true,
			"cursorMove": true
		},
		"camera":
		{
			"lookAtOrigin": true,
			"position": new THREE.Vector3(100.0, 150.0, 300.0),
			"translation": new THREE.Vector3(0.0, 50.0, 0.0)
		},
		"firebase":
		{
			"rootUrl": "",
			"appId": "",
			"params": { "TRACE": false}
		},
		"debugMode": true
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
		this.firebaseSync.connect(JumpStart.onFirebaseConnect(), JumpStart.onFirebaseAddObject(), JumpStart.onFirebaseRemoveObject());
	}
};

jumpStart.prototype.onFirebaseConnect = function()
{
	console.log("Connected to firebase.");

	// Wait for synced Firebase objects to be received (OBSOLETE??)
	// Also wait for the page to refresh if it needs to?
	setTimeout(function() { JumpStart.initiate(); }, 1000);
};

jumpStart.prototype.onFirebaseAddObject = function()
{
	console.log("firebase object added");
};

jumpStart.prototype.onFirebaseRemoveObject = function()
{
	console.log("firebase object removed");
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

	var intersects = this.rayCaster.intersectObjects(this.scene.children, true);

	function unhoverObject(sceneObject)
	{
		var y;
		for( y in sceneObject.JumpStart.onCursorOff )
			sceneObject.JumpStart.onCursorOff[y].call(sceneObject);
	}

	var foundHoveredObject = false;
	var oldHoveredObject = this.hoveredObject;
	var x, sceneObject, futureHoverObject, y;
	for( x in intersects )
	{
		sceneObject = intersects[x].object.parent;
		if( !sceneObject.hasOwnProperty("JumpStart") || !sceneObject.JumpStart.blocksLOS )
			continue;

		if( (this.options.enabledCursorEvents.cursorOver &&
			Object.keys(sceneObject.JumpStart.onCursorOver).length !== 0) ||
			(this.options.enabledCursorEvents.cursorOff) &&
			Object.keys(sceneObject.JumpStart.onCursorOff).length !== 0)
		{
			foundHoveredObject = true;

			if( this.hoveredObject && this.hoveredObject !== sceneObject )
			{
				unhoverObject(this.hoveredObject);
				this.hoveredObject = null;
			}

			// Now set this new object as hovered
			for( y in sceneObject.JumpStart.onCursorOver )
				sceneObject.JumpStart.onCursorOver[y].call(sceneObject);

			this.hoveredObject = sceneObject;
		}
	}

	if( !foundHoveredObject && this.hoveredObject )
	{
		unhoverObject(this.hoveredObject);
		this.hoveredObject = null;
	}

};

jumpStart.prototype.initiate = function()
{
	if( this.altContentAlreadyLoaded )
		return;

	this.altContentAlreadyLoaded = true;

	if( this.webMode )
	{
		this.enclosure = { "innerWidth": window.innerWidth, "innerHeight": window.innerHeight, "innerDepth": window.innerWidth };
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

	if( this.options.legacyLoader )
		this.objectLoader = new THREE.AltOBJMTLLoader();
	else
		this.objectLoader = new THREE.OBJMTLLoader();

	this.scene = new THREE.Scene();
	this.clock = new THREE.Clock();
	this.rayCaster = new THREE.Raycaster();

	// FIXME: Why is this a spoofed ray?  Is it needed for web mode?
	this.cursorRay = {"origin": new THREE.Vector3(), "direction": new THREE.Vector3()};
	this.futureCursorRay = {"origin": new THREE.Vector3(), "direction": new THREE.Vector3()};

	this.localUser.lookOrigin = new THREE.Vector3();
	this.localUser.lookDirection = new THREE.Vector3();

	if ( this.webMode )
	{
		this.worldScale = this.options["worldScale"];
		this.worldOffset = new THREE.Vector3(0.0, 0.0, 0.0);

		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setClearColor("#AAAAAA");
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		document.body.appendChild( this.renderer.domElement );

		var aspect = window.innerWidth / window.innerHeight;
		this.camera = new THREE.PerspectiveCamera(45, aspect, 1, 2000 );

		this.camera.position.copy(this.options.camera.position);

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
		if( this.options.scaleWithEnclosure )
			this.worldScale = 500.0 / (this.enclosure.pixelsPerMeter / 1.0) * this.options["worldScale"];
		else
			this.worldScale = this.options["worldScale"];

		this.worldOffset = new THREE.Vector3(0.0, (-this.enclosure.innerHeight / 2.0), 0.0);

		if( this.options.legacyLoader )
			this.renderer = altspace.getThreeJSRenderer();
		else
			this.renderer = altspace.getThreeJSRenderer({version:'0.2.0'});

		g_CursorEvents = new CursorEvents(g_Scene);
		g_CursorEvents.enableMouseEvents(g_Camera);
	}

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
	g_cursorEvents = this.cursorEvents;
	g_deltaTime = this.deltaTime;

	// We are ready to rock-n-roll!!
	this.initialized = true;

	if( window.hasOwnProperty("OnReady") )
		OnReady();
	else
		console.log("Your app is ready, but you have no OnReady callback function!");
}

jumpStart.prototype.run = function()
{
	// Start the game loop
	this.onTick();
};

jumpStart.prototype.onTick = function()
{
	if( !this.initialized )
		return;

	this.deltaTime = this.clock.getDelta();
	g_DeltaTime = this.deltaTime;

	this.processCursorMove();

	if( window.hasOwnProperty("OnTick") )
		OnTick();

	requestAnimationFrame( function(){ JumpStart.onTick(); } );

	var sceneObject;
	var x, y;
	for( x in this.scene.children )
	{
		sceneObject = this.scene.children[x];
		if( !sceneObject.hasOwnProperty("JumpStart") )
			continue;

		if( sceneObject.JumpStart.hasOwnProperty("onTick") )
		{
			for( y in sceneObject.JumpStart.onTick )
			{
				sceneObject.JumpStart.onTick[y].call(sceneObject);
			}
		}
	}

	if( this.cursorEvents )
		this.cursorEvents.update();

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
				this.options[x][y] = options[x][y];
			}
		}
	}

	// Determine if we must raycast every cursor move:
	if( this.options.enabledCursorEvents.cursorOver || this.options.enabledCursorEvents.cursorOff )
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
/*
jumpStart.prototype.addSyncedObject = function(sceneObject, syncData, key)
{
	var syncData = {
		"model": sceneObject.model,
		"owner": g_LocalUserName,
		"velocity": new THREE.Vector3(0, 0, 0),
		"freefallRot": new THREE.Vector3(0, 0, 0),
		"atRestOrientation": new THREE.Vector3(0, (Math.PI / 2.0), 0),
		"isPhysics": true,
		"matched": false,
		"physicsState": 1,
		"isLiveToken": true
	};

	MakePhysics(g_LiveToken);
	g_LiveToken.freefallRot.set(0, 0, 0);

	addSyncedObject(g_LiveToken, syncData);
};
*/

jumpStart.prototype.spawnInstance = function(arg)
{
	// Handle various argument types.
	var options;
	if( typeof arg === 'string' )
		options = {"fileName": arg};
	else
		options = arg;

	// Make sure the fileName is a cached model.
	// do work

	if( !options.hasOwnProperty("scale") )
		options["scale"] = new THREE.Vector3(1.0, 1.0, 1.0);

	var clone;
	var x;
	for( x in this.models )
	{
		if( this.models[x].fileName === options["fileName"] && this.models[x].hasOwnProperty("object") )
		{
			// Clone the model
			clone = this.models[x].object.clone();

			// Set the position
			clone.position.copy(this.worldOffset);

			// Set the orientation
			clone.rotation.set(0.0, 0.0, 0.0);

			// Scale the object
			clone.scale.copy(options.scale.multiplyScalar(this.worldScale));

			// Add the instance to the scene
			if( !options.hasOwnProperty("parent") || !options["parent"] )
				this.scene.add(clone);
			else
				options["parent"].add(clone);
/*
			// Add this object to the synced instance list
			if( typeof key !== 'undefined' && key !== null )
			{
				g_SyncedInstances[key] = clone;
				g_NumSyncedInstances++;

				g_FirebaseSync.addObject(clone, key);
			}
*/

			this.prepInstance.call(clone);
			
			console.log("Spawned an object");

			return clone;
		}
	}

	return null;
};

jumpStart.prototype.prepInstance = function()
{
	var sceneObject = this;

	// Prepare it to get callback logic.
	sceneObject.JumpStart =
	{
		"onTick": {},
		"onCursorDown": {},
		"onCursorUp": {},
		"onCursorOver": {},
		"onCursorOff": {},
		"blocksLOS": true,
		"tintColor": new THREE.Color(),
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
		}.bind(this)
	};
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