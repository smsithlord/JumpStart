// Declare some globals
var g_WorldOffset, g_WorldScale, g_ObjectLoader, g_Camera, g_Renderer, g_Scene, g_Clock, g_rayCaster, g_Enclosure, g_DeltaTime;	//g_CursorEvents

// Create global object for us to use.
var JumpStart = new jumpStart();

// Listen for ready events
if( !JumpStart.webMode )
{
	window.addEventListener("AltContentLoaded", function()
	{
		altspace.getEnclosure().then(function(enclosure)
		{
			JumpStart.enclosure = enclosure;
			JumpStart.initiate();
		});
	});
}
else
{
	window.addEventListener( 'DOMContentLoaded', function(){ JumpStart.initiate(); });
	window.addEventListener( 'resize', function() { JumpStart.onWindowResize(); }, false );
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
	this.enclosure = null;
	this.scene = null;
//	this.cursorEvents = null;
	this.deltaTime = 0.0;

	this.models = [];

	this.options =
	{
		"worldScale": 1.0,
		"camera":
		{
			"lookAtOrigin": true,
			"position": new THREE.Vector3(100.0, 150.0, 300.0),
			"translation": new THREE.Vector3(0.0, 50.0, 0.0)
		}
	};

	this.worldScale;
	this.worldOffset = new THREE.Vector3();
	this.webMode = !window.hasOwnProperty("altspace");
}

jumpStart.prototype.initiate = function()
{
	if( this.altContentAlreadyLoaded )
		return;

	this.altContentAlreadyLoaded = true;

	this.objectLoader = new THREE.AltOBJMTLLoader();
	this.scene = new THREE.Scene();
	this.clock = new THREE.Clock();
	this.rayCaster = new THREE.Raycaster();

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
		this.worldScale *= 500.0 / (this.enclosure.pixelsPerMeter / 1.0) * this.options["worldScale"];

		this.worldOffset = new THREE.Vector3(0.0, (-this.enclosure.innerHeight / 2.0), 0.0);
		this.renderer = altspace.getThreeJSRenderer();
	}

	g_WorldOffset = this.worldOffset;
	g_WorldScale = this.worldScale;
	g_ObjectLoader = this.objectLoader;
	g_Camera = this.camera;
	g_Renderer = this.renderer;
	g_Scene = this.scene;
	g_Clock = this.clock;
	g_rayCaster = this.rayCaster;
	g_Enclosure = this.enclosure;
//	g_CursorEvents = this.cursorEvents;
	g_DeltaTime = this.deltaTime;

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
	JumpStart.deltaTime = JumpStart.clock.getDelta();
	g_DeltaTime = JumpStart.deltaTime;

	if( window.hasOwnProperty("OnTick") )
		OnTick();

	requestAnimationFrame( JumpStart.onTick );

//	if( JumpStart.cursorEvents )
//		JumpStart.cursorEvents.update();

	var x, y;
	for( x in JumpStart.scene.children )
	{
		if( JumpStart.scene.children[x].hasOwnProperty("onTick") )
		{
			for( y in JumpStart.scene.children[x].onTick )
			{
				JumpStart.scene.children[x].onTick[y].call(JumpStart.scene.children[x]);
			}
		}
	}

	JumpStart.renderer.render( JumpStart.scene, JumpStart.camera );
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

	var x;
	for( x in options )
		this.options[x] = options[x];
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
		JumpStart.objectLoader.load(fileName, JumpStart.modelLoader.batchCallbackFactory(fileName, JumpStart.modelLoader.batchName));
	}

	return {
		"then": function(callback)
		{
			JumpStart.modelLoader.callbacks[JumpStart.modelLoader.batchName] = callback;
		}
	};
};

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

			// Prepare it to get onTick logic.
			clone.onTick = {};

			console.log("Spawned an object");

			return clone;
		}
	}

	return null;
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