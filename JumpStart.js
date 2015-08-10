// TODO:
// - Reduce firebase footprint when mouse events are disabled in options.

// Declare some globals
var g_localUser, g_worldOffset, g_worldScale, g_objectLoader, g_camera, g_renderer, g_scene, g_clock, g_rayCaster, g_enclosure, g_deltaTime;

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
	this.pendingObjects = {};
	this.numSyncedInstances = 0;

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
			"cursorEnter": true,
			"cursorLeave": true,
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
		this.firebaseSync.connect(JumpStart.onFirebaseConnect(), function(key, syncData) { JumpStart.onFirebaseAddObject(key, syncData); }, JumpStart.onFirebaseRemoveObject());
	}
};

jumpStart.prototype.onFirebaseConnect = function()
{
	console.log("Connected to firebase.");

	// Finish initiating the game world...
	// Might want to wait to make sure all items get sycned
	setTimeout(function(){
		JumpStart.initiate();
	}, 1000);
};

jumpStart.prototype.onFirebaseAddObject = function(key, syncData)
{
	if( !this.syncedInstances.hasOwnProperty(key) && !this.pendingObjects.hasOwnProperty(key) )
		this.pendingObjects[key] = syncData;
};

jumpStart.prototype.onFirebaseRemoveObject = function()
{
	console.log("firebase object removed");
};

jumpStart.prototype.addSyncedObject = function(sceneObject, syncData)
{
	// TODO: Make networked cursor event callbacks OPTIONAL!!
	var syncData = {
		"modelFile": sceneObect.jumpStart.modelFile,
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
	// Currently using option B cuz its like 3am right now...

	var intersects = this.rayCaster.intersectObjects(this.scene.children, true);

	function unhoverObject(sceneObject)
	{
		var y;
		for( y in sceneObject.JumpStart.onCursorLeave )
			sceneObject.JumpStart.onCursorLeave[y].call(sceneObject);
	}

	var cursorHit = null;
	var oldHoveredObject = this.hoveredObject;
	var x, sceneObject, futureHoverObject, y;
	for( x in intersects )
	{
		if( intersects[x].object.hasOwnProperty("isCursorPlane") )
		{
			var goodPoint = true;
//			if( !this.webMode && false )
//			{
				// Make sure it's a INWARD surface
				var samplePoint = new THREE.Vector3();
				samplePoint.copy(intersects[x].point);
				samplePoint.add(intersects[x].face.normal);

				var distA = samplePoint.distanceTo(this.scene.position);

				var mirroredNormal = new THREE.Vector3();
				mirroredNormal.copy(intersects[x].face.normal).multiplyScalar(-1.0);

				samplePoint.copy(intersects[x].point);
				samplePoint.add(mirroredNormal);

				var distB = samplePoint.distanceTo(this.scene.position);

				if( distA > distB )
					goodPoint = false;
//			}

			if( goodPoint )
			{
				if( this.hoveredObject )
				{
					unhoverObject(this.hoveredObject);
					this.hoveredObject = null;
				}

				cursorHit = intersects[x];
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
					cursorHit = intersects[x];
					break;
				}
			}
		}
	}

	if( !cursorHit && this.hoveredObject )
	{
		unhoverObject(this.hoveredObject);
		this.hoveredObject = null;
	}
	else if( this.crosshair && cursorHit )
	{
		this.crosshair.position.copy(cursorHit.point);

		var normalMatrix = new THREE.Matrix3().getNormalMatrix( cursorHit.object.matrixWorld );
		var worldNormal = cursorHit.face.normal.clone().applyMatrix3( normalMatrix ).normalize();
		worldNormal.add(cursorHit.point);

		this.crosshair.lookAt(worldNormal);

/*
		if( cursorHit.face.hasOwnProperty('centroid') )
		{
document.getElementById("info").innerHTML = "<h1>" + cursorHit.face.centroid;
		// set the position of the cone in front of the face centroid in object space
		// cone height is 100, so offset the position by half of that
			this.crosshair.position = cursorHit.face.centroid.clone().addSelf( cursorHit.face.normal.clone().multiplyScalar(50) );
		}
		*/
	}

};

jumpStart.prototype.initiate = function()
{
	if( this.altContentAlreadyLoaded )
		return;

	this.altContentAlreadyLoaded = true;

	if( this.webMode )
	{
		//this.enclosure = { "innerWidth": window.innerWidth / 3.0, "innerHeight": window.innerHeight / 3.0, "innerDepth": window.innerWidth / 3.0 };
		this.enclosure = { "innerWidth": Math.round(1024 / 2.5), "innerHeight": Math.round(1024 / 2.5), "innerDepth": Math.round(1024 / 2.5) };
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
	this.localUser.firstUser = true;

	this.worldOffset = new THREE.Vector3(0.0, (-this.enclosure.innerHeight / 2.0), 0.0);

	if ( this.webMode )
	{
		this.worldScale = this.options["worldScale"];

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

		if( this.options.scaleWithEnclosure )
			this.worldScale = 500.0 / (this.enclosure.pixelsPerMeter / 1.0) * this.options["worldScale"];
		else
			this.worldScale = this.options["worldScale"];

		if( this.options.legacyLoader )
			this.renderer = altspace.getThreeJSRenderer();
		else
			this.renderer = altspace.getThreeJSRenderer({version:'0.2.0'});
	}

	// Create some invisible planes for raycasting.
	var bottomPlane = new THREE.Mesh(
		//new THREE.PlaneGeometry( this.enclosure.innderWidth, this.enclosure.innerDepth),
		new THREE.BoxGeometry(this.enclosure.innerWidth, 0.25, this.enclosure.innerDepth),
		new THREE.MeshBasicMaterial( { color: "#9400d3", transparent: false, opacity: 0.5 })
	);
	bottomPlane.isCursorPlane = true;
	bottomPlane.position.y = -(this.enclosure.innerHeight / 2.0) - 0.25;
	this.scene.add(bottomPlane);

	var topPlane = new THREE.Mesh(
		//new THREE.PlaneGeometry( this.enclosure.innderWidth, this.enclosure.innerDepth),
		new THREE.BoxGeometry(this.enclosure.innerWidth, 0.25, this.enclosure.innerDepth),
		new THREE.MeshBasicMaterial( { color: "#ffd700", transparent: false, opacity: 0.5 })
	);
	topPlane.isCursorPlane = true;
	topPlane.position.y = this.enclosure.innerHeight / 2.0;

	this.scene.add(topPlane);

	var northPlane = new THREE.Mesh(
		new THREE.BoxGeometry(this.enclosure.innerWidth, this.enclosure.innerHeight, 0.25),
		new THREE.MeshBasicMaterial( { color: "#00bfff", transparent: false, opacity: 0.5 })
	);
	northPlane.isCursorPlane = true;
	northPlane.position.z = -(this.enclosure.innerDepth / 2.0) - 0.25;
	this.scene.add(northPlane);

	var southPlane = new THREE.Mesh(
		new THREE.BoxGeometry(this.enclosure.innerWidth, this.enclosure.innerHeight, 0.25),
		new THREE.MeshBasicMaterial( { color: "#00bfff", transparent: false, opacity: 0.5 })
	);
	southPlane.isCursorPlane = true;
	southPlane.position.z = this.enclosure.innerDepth / 2.0;
	this.scene.add(southPlane);

	var westPlane = new THREE.Mesh(
		new THREE.BoxGeometry(0.25, this.enclosure.innerHeight, this.enclosure.innerDepth),
		new THREE.MeshBasicMaterial( { color: "#1e90ff", transparent: false, opacity: 0.5 })
	);
	westPlane.isCursorPlane = true;
	westPlane.position.x = -(this.enclosure.innerDepth / 2.0) - 0.25;
	this.scene.add(westPlane);

	var eastPlane = new THREE.Mesh(
		new THREE.BoxGeometry(0.25, this.enclosure.innerHeight, this.enclosure.innerDepth),
		new THREE.MeshBasicMaterial( { color: "#1e90ff", transparent: false, opacity: 0.5 })
	);
	eastPlane.isCursorPlane = true;
	eastPlane.position.x = this.enclosure.innerDepth / 2.0;
	this.scene.add(eastPlane);

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

	// We are ready to rock-n-roll!!
	this.initialized = true;

	// Load our crosshair
	this.loadModels("models/JumpStart/crosshair.obj").then(function()
	{
		// Spawn it in
		var crosshair = JumpStart.spawnInstance("models/JumpStart/crosshair.obj");
		crosshair.scale.multiplyScalar(1.0);

		crosshair.JumpStart.onTick["_spinMe"] = function()
		{
			if( !this.hasOwnProperty('spinAmount') || this.spinAmount >= Math.PI * 2.0 )
				this.spinAmount = 0.0;

			this.spinAmount += 1.0 * g_deltaTime;
			this.rotateZ(this.spinAmount);
		};

		JumpStart.crosshair = crosshair;

		if( !JumpStart.webMode )
		{
			crosshair.addEventListener("cursordown", function(e) { JumpStart.onCursorDown(e); });
			crosshair.addEventListener("cursorup", function(e) { JumpStart.onCursorUp(e); });
		}

		function prepReady()
		{
			if( window.hasOwnProperty("OnReady") )
				OnReady();
			else
				console.log("Your app is ready, but you have no OnReady callback function!");
		}

		function prepPrecache()
		{
			if( window.hasOwnProperty("OnPrecache") )
				OnPrecache();
			else
				prepReady();
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

					if( count > 1 )
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

jumpStart.prototype.doneCashing = function()
{
	// Spawn any synced objects that already exist on the server...
	// DO WORK FIXME

	function eventFactory(eventName, sceneObject)
	{
		return function()
		{
			window[eventName].call(sceneObject);
		}
	}

	var key, syncData, x, index;
	for( key in this.pendingObjects )
	{
		syncData = this.pendingObjects[key];

		var instance = this.spawnInstance(syncData.modelFile, {'key': key});

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

		console.log(instance);
	}

	if( window.hasOwnProperty("OnReady") )
		OnReady();
	else
		console.log("Your app is ready, but you have no OnReady callback function!");
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

	this.deltaTime = this.clock.getDelta();
	g_deltaTime = this.deltaTime;

//	this.processCursorMove();

	if( window.hasOwnProperty("OnTick") )
		OnTick();

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

	this.processCursorMove();

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
/*
jumpStart.prototype.addSyncedObject = function(sceneObject, syncData, key)
{
	var syncData = {
		"modelFile": sceneObject.model,
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
	var scale = new THREE.Vector3(1.0, 1.0, 1.0);

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

			// Scale the object
			clone.scale.copy(scale.multiplyScalar(this.worldScale));

			// Add the instance to the scene
			if( !options.parent )
				this.scene.add(clone);
			else
				options.parent.add(clone);

			this.prepInstance.call(clone, fileName);

			// Add this object to the synced instance list
			if( options.key !== "" )
			{
				this.syncedInstances[options.key] = clone;
				this.numSyncedInstances++;

				this.firebaseSync.addObject(clone, options.key);
			}
			
			console.log("Spawned an object");

			return clone;
		}
	}

	return null;
};

jumpStart.prototype.prepInstance = function(modelFile)
{
	var sceneObject = this;

	// TODO: Sync event handlers if dev desires (object name = callback function name)

	// Prepare it to get callback logic.
	sceneObject.JumpStart =
	{
		"onTick": {},
		"onCursorDown": {},
		"onCursorUp": {},
		"onCursorEnter": {},
		"onCursorLeave": {},
		"tickListeners": {},
		"cursorDownListeners": {},
		"cursorUpListeners": {},
		"cursorEnterListeners": {},
		"cursorLeaveListeners": {},
		"blocksLOS": true,
		"tintColor": new THREE.Color(),
		"hasCursorEffects": 0x0,
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
		}.bind(this)
	};
};

jumpStart.prototype.prepEventListeners = function(sceneObject, inEventName)
{
	var eventName = null;
	if( typeof inEventName === 'string' )
		eventName = inEventName;

	var x;
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

jumpStart.prototype.addSyncedObject = function(sceneObject, userSyncData)
{
	if( !this.firebaseSync )
		return;

	// Prep listeners NOW, before we are added to the firebase.
	this.prepEventListeners(sceneObject);
	
	// Any property of sceneObject.JumpStart that can change AND that we want synced needs to be in syncData.
	var syncData = {
		"modelFile": sceneObject.JumpStart.modelFile,
		"tickListeners": sceneObject.JumpStart.tickListeners,
		"cursorDownListeners": sceneObject.JumpStart.cursorDownListeners,
		"cursorUpListeners": sceneObject.JumpStart.cursorUpListeners,
		"cursorEnterListeners": sceneObject.JumpStart.cursorEnterListeners,
		"cursorLeaveListeners": sceneObject.JumpStart.cursorLeaveListeners
	};

	// Now merg in any values we were passed by the user as well (1 level deep)
	// WARNING: User variable names are sharing space with JumpStart variable names in sceneObject.JumpStart.userData.syncData!!
	// FIXME: Fix this ASAP (if at all) because this will affect user code on the frontend of the API!!
	if( typeof userSyncData !== 'undefined' )
	{
		var x, y;
		for( x in userSyncData )
		{
			// Only handle options that exist.
			if( !syncData.hasOwnProperty(x) )
				continue;

			if( typeof userSyncData[x] !== 'object' )
				syncData[x] = userSyncData[x];
			else
			{
				for( y in userSyncData[x] )
				{
					syncData[x][y] = userSyncData[x][y];
				}
			}
		}
	}

	sceneObject.userData.syncData = syncData;

	// Add this unique object to the Firebase
	// Hash the unique ID's because they are VERY long.
	// In the case of conflicts, the 2nd object does not spawn. (Thanks to firebase.js)
	var key = __hash(this.firebaseSync.senderId + Date.now() + sceneObject.uuid);
	this.firebaseSync.addObject(sceneObject, key);

	// Store this key with this object locally
	this.syncedInstances[key] = sceneObject;
	this.numSyncedInstances++;

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