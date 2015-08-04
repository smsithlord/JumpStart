// Author: Elijah Newman-Gomez

// NOTE:
//	You only need to modify this file if you are unable to do what you want using
//	the instructions from index.html.

// THIS FILE IS A WORK IN PROGRESS AND WILL PROBABLY BE CHANGED DRASTICALLY,
// but since SpawnInstance gives you a native WebGL THREE object, the code
// that you generate should be pretty forward-compatible w/o extra effort.

// Create global object for us to use.
var g_JumpStartLoader = new JumpStartLoader();

function LoadModels()
{
	var models;
	if( Array.isArray(arguments[0]) )
		models = arguments[0];
	else if( arguments.length === 1 )
		models = [arguments[0]];
	else
		models = arguments;

	g_JumpStartLoader.temporalName = "flux" + Date.now();

	var i;
	for( i = 0; i < models.length; i ++ )
	{
		var filename = models[i];
		g_Objects.push({"filename": filename, "temporalName": g_JumpStartLoader.temporalName});
		g_Loader.load(filename, loadCallbackFactory(filename, g_JumpStartLoader.temporalName));
	}

	return {
		"then": function(callback)
		{
			g_JumpStartLoader.callbacks[g_JumpStartLoader.temporalName] = callback;
		}
	};
}

// METHOD: loadCallbackFactory
// PURPOSE:
//	JavaScript closure that allows the filename to be passed to the onModelLoaded method for each loadedObject.
function loadCallbackFactory(filename, temporalName)
{
	return function(loadedObject)
	{
		onModelLoaded(filename, loadedObject, temporalName);
	};
}

// METHOD: onModelLoaded
// PURPOSE:
//	Assocaite the filename with the loadedObject within the g_Objects array & detect when all models are loaded.
function onModelLoaded(filename, loadedObject, temporalName)
{
	var modelsRemain = false;

	var i;
	for( i = 0; i < g_Objects.length; i++ )
	{
		if( g_Objects[i].temporalName !== temporalName )
			continue;

		if( g_Objects[i].filename === filename )
			g_Objects[i].object = loadedObject;
		else if( !g_Objects[i].hasOwnProperty("object") )
			modelsRemain = true;
	}

	if( !modelsRemain )
		onAllModelsLoaded(temporalName);
}

// METHOD: onAllModelsLoaded
// PURPOSE:
//	Just print a console message & trigger the firebaseInit method (for now).
function onAllModelsLoaded(temporalName)
{
	var batchSize = 0;
	var i;
	for( i = 0; i < g_Objects.length; i++ )
	{
		if( g_Objects[i].temporalName === temporalName )
			batchSize++;
	}

	console.log("Loaded " + batchSize + " objects.");

	g_JumpStartLoader.OnModelBatchLoaded(temporalName);

	// Connect to the Firebase to get the current game state
	//firebaseInit();
}

function finishInit()
{
		var floorSize;
		if( window.hasOwnProperty("altspace") )
			floorSize = g_Enclosure.innerWidth;
		else
			floorSize = 1000;	//g_StandWidth * g_WorldScale;

		// Create the floor plane
		g_FloorPlane = new THREE.Mesh( 
			new THREE.BoxGeometry(floorSize, 0.25, floorSize),
			new THREE.MeshBasicMaterial( { color: "#0000ff", transparent: true, opacity: 0.0 })
		);

		g_FloorPlane.translateY(g_WorldOffset.y);

		g_Scene.add(g_FloorPlane);

/*
		// Create the crosshair
		g_Crosshair = spawnInstance("models/FourInRow/crosshair.obj");

		if( window.hasOwnProperty("altspace") )
		{
			// Scale the crosshair for VR
			var scale = new THREE.Vector3(0.5, 0.5, 0.5);
			g_Crosshair.scale.copy( scale );
		}
		else
		{
			// Scale the crosshair for a web browser
			var scale = new THREE.Vector3(0.1, 0.1, 0.1);
			g_Crosshair.scale.copy( scale );
		}
*/

/*
		// If we are inside Altspace
		if( window.hasOwnProperty("altspace") )
		{
			g_Scene.addEventListener( "cursordown", onCursorDown);
//			g_Scene.addEventListener( "cursorup", onCursorUp);
			g_Scene.addEventListener( "cursormove", onAltCursorMove);

			// Must specify this listener as the defaultTarget if we want to capture window-level events such as holocursormove
			var eventParams = {};
			g_CursorEvents = new CursorEvents(eventParams);

			g_CursorEvents.enableMouseEvents(g_Camera);
		}
		else
		{
			document.addEventListener( 'mousedown', onCursorDown, false);
			window.addEventListener("mousemove", onCursorMove);
		}
*/

		// Start the game loop
		onAnimationTick();

		OnJumpStartReady();
}

// Create a new class to handle multiple asynchronous calls & callbacks stemming from LoadModels method.
function JumpStartLoader()
{
	this.callbacks = {};
	this.temporalName;
}

JumpStartLoader.prototype.addCallback = function(name, func)
{
	if( typeof this.callbacks[name] !== 'undefined' && this.callbacks[name] )
		this.removeCallback(name);

	this.callbacks[name] = func;
};

JumpStartLoader.prototype.removeCallback = function(name)
{
	this.callbacks[name] = null;
};

JumpStartLoader.prototype.OnModelBatchLoaded = function(temporalName)
{
	if( this.callbacks.hasOwnProperty(temporalName) )
	{
		this.callbacks[temporalName]();
	}
};






// Sometimes the AltContentLoaded event could happen more than once (BUG)
var g_AltContentAlreadyLoaded = false;

// Define some "important stuff" we'll be using as global variables
var g_Clock,
g_DeltaTime,
g_Loader,
g_Scene,
g_Renderer,
g_Camera,
g_Enclosure,
g_RayCaster,
g_FloorPlane,
g_CursorEvents,
g_CursorPoint,
g_CursorOrigin,
g_CursorObject,
g_WorldOffset,
g_WorldScale;

var g_WorldScale = 1.0;

// Declare all of the models that need to be loaded
var g_Objects = [];

/*
if(window.attachEvent) {
    window.attachEvent('onload', addReadyListeners);
} else {
    if(window.onload) {
        var curronload = window.onload;
        var newonload = function() {
            curronload();
            addReadyListeners();
        };
        window.onload = newonload;
    } else {
        window.onload = addReadyListeners;
    }
}
*/

//function addReadyListeners()
//{
// Listen for the Altspace "ready" event
if( window.hasOwnProperty("altspace") )
{
	window.addEventListener("AltContentLoaded", function()
	{
		altspace.getEnclosure().then(function(enclosure)
		{
			g_Enclosure = enclosure;
			InitJumpStart();
		});
	});
}
else
{
	// Otherwise prepare for web mode
	window.addEventListener( 'DOMContentLoaded', function(){ InitJumpStart(); });
	window.addEventListener( 'resize', onWindowResize, false );
	document.body.style.backgroundColor = "rgba(0, 0, 0, 1.0)";
}
//};

function InitJumpStart()
{
	if( g_AltContentAlreadyLoaded )
		return;

	g_AltContentAlreadyLoaded = true;

	g_Loader = new THREE.AltOBJMTLLoader();
	g_Scene = new THREE.Scene();
	g_Clock = new THREE.Clock();
	g_RayCaster = new THREE.Raycaster();

	if ( window.hasOwnProperty("altspace") )
	{
		g_WorldScale *= 500.0 / (g_Enclosure.pixelsPerMeter / 1.0);

		g_WorldOffset = new THREE.Vector3(0.0, (-g_Enclosure.innerHeight / 2.0), 0.0);
		g_Renderer = altspace.getThreeJSRenderer();
	}
	else
	{
		g_WorldOffset = new THREE.Vector3(0.0, 0.0, 0.0);

		g_Renderer = new THREE.WebGLRenderer();
		g_Renderer.setClearColor("#AAAAAA");
		g_Renderer.setSize( window.innerWidth, window.innerHeight );
		document.body.appendChild( g_Renderer.domElement );

		var aspect = window.innerWidth / window.innerHeight;
		g_Camera = new THREE.PerspectiveCamera(45, aspect, 1, 2000 );
		g_Camera.position.z = 300; // stand back from origin
		g_Camera.position.y = 150;	// slightly above origin
		g_Camera.position.x = 100;
		g_Camera.lookAt( g_Scene.position );

		g_Camera.translateY(50);

		// OBJMTLLoader always uses PhongMaterial, so we need light in scene.
		var ambient = new THREE.AmbientLight( 0xffffff );
		g_Scene.add( ambient );
	}

	finishInit();

/*
	// Begin loading all models
	var i;
	for( i = 0; i < g_Objects.length; i++ )
	{
		var filename = g_Objects[i].filename;
		g_Loader.load(filename, loadCallbackFactory(filename));
	}
*/
}

// METHOD: onWindowResize
// PURPOSE:
//	WEB MODE ONLY - Adjust the scene to match window size.
function onWindowResize()
{
	if( window.hasOwnProperty("altspace") )
		return;

	g_Camera.aspect = window.innerWidth / window.innerHeight;
	g_Camera.updateProjectionMatrix();
	g_Renderer.setSize( window.innerWidth, window.innerHeight );
}

// METHOD: spawnInstance
// PURPOSE:
//	Creates a clone of the asset specified by filename and adds it to the scene at the given offsets.
//	ONLY the filename argument is required.  All other arguments are optional.
//	If given an originObject, the offset is relative to that object's position.
//	If given a key, that means that this object already exists on the Firebase and will be synced automatically.
//	Use null values (or leave them undefined) for arguments that you wish to use defaults for.
function SpawnInstance(filename, originObject, offsetPosition, offsetAngles, key, scale, doParent)
{
	var goodDoParent = false;
	if( typeof doParent !== 'undefined' && doParent !== null )
		goodDoParent = doParent;

	var goodScale = g_WorldScale;
	if( typeof scale !== 'undefined' && scale )
		goodScale = scale;

	//var goodOriginObject = g_Scene;
	var goodOriginObject = null;
	if( typeof originObject !== 'undefined' && originObject )
		goodOriginObject = originObject;

	var offset = new THREE.Vector3(0, 0, 0);
	if( typeof offsetPosition !== 'undefined' && offsetPosition )
		offset = offsetPosition;

	var angles = new THREE.Vector3(0, 0, 0);
	if( typeof offsetAngles !== 'undefined' && offsetAngles )
		angles = offsetAngles;

	// Only models listed in g_Objects can be spawned!!
	var scale = new THREE.Vector3(goodScale, goodScale, goodScale);
	var clone;
	var i;
	for( i = 0; i < g_Objects.length; i++ )
	{
		if( g_Objects[i].filename === filename && g_Objects[i].hasOwnProperty("object") )
		{
			// Clone the model
			clone = g_Objects[i].object.clone();

			// Set the position
			if( goodOriginObject && !goodDoParent )
				clone.position.copy(goodOriginObject.position);

			if( !goodOriginObject )
			{
				clone.translateX(g_WorldOffset.x);
				clone.translateY(g_WorldOffset.y);
				clone.translateZ(g_WorldOffset.z);
			}

			clone.translateX(offset.x);
			clone.translateY(offset.y);
			clone.translateZ(offset.z);

			// Set the orientation
			if( goodOriginObject )
				clone.rotation.copy(goodOriginObject.rotation);

			clone.rotateX(angles.x);
			clone.rotateY(angles.y);
			clone.rotateZ(angles.z);

			// Scale the object
			if( !goodDoParent )
				clone.scale.copy(scale);

			// Add the instance to the scene
			if( !goodDoParent )
				g_Scene.add(clone);
			else
				goodOriginObject.add(clone);

			// Add this object to the synced instance list
			if( typeof key !== 'undefined' && key !== null )
			{
				g_SyncedInstances[key] = clone;
				g_NumSyncedInstances++;

				g_FirebaseSync.addObject(clone, key);
			}

			clone.onTick = {};

			console.log("Spawned an object");

			return clone;
		}
	}

	return null;
}

// METHOD: onAnimationTick
// PURPOSE:
//	Render the scene and update cursor events.
function onAnimationTick()
{
	g_DeltaTime = g_Clock.getDelta();

	if( window.hasOwnProperty("OnTick") )
		OnTick();

	requestAnimationFrame( onAnimationTick );

	if( g_CursorEvents )
		g_CursorEvents.update();

	var x;
	var i;
	for( i = 0; i < g_Scene.children.length; i++ )
	{
		if( g_Scene.children[i].hasOwnProperty("onTick") )
		{
			for( x in g_Scene.children[i].onTick )
			{
				g_Scene.children[i].onTick[x].call(g_Scene.children[i]);
			}
		}
	}

	g_Renderer.render( g_Scene, g_Camera );
}