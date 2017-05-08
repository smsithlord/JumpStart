// Global objects
function JumpStart(options, appBehaviors)
{
	this.version = "0.2.3";
	this.shouldSimulateLag = false;
	this.tickLag = 0.0;	// for simulating bad performance.

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
		"roomID",	// Given in the URI query as "room". null if none.
		"isAltspace",	// Altspace or web mode
		"isGear",
		"isInitialized",
		"isReady",
		"isRunning",
		"isEnclosure",	// Enclosure or personal browser
		"users",
		"camera",
		"renderer",
		"clock",
		"raycaster",
		//"fontLoader",	// preset during load
		//"fontUrl",	// preset during load
		//"font",	// preset during load
		"cursorRay",
		"enclosure",
		"localUser",
		"scene",
		"world",
		"worldOffset",
		"deltaTime",
		"elapsedTime",
		"gamepad",
		"gamepads",
		"activeGamepadIndex",
		"previousGamepadStates"
	];

	// Declare them all as null
	var i;
	for( i in publicVariables )
		this[publicVariables[i]] = null;

	// List all PRIVATE member variables
	var privateVariables = [
		"sessionKey",
		"state",	// 0: ready for setOptions	1: ready for precacheFile and doneCaching	2: ready for run	3: running // IS THIS ACTUALLY USED?
		"options",
		"futureCursorRay",
		"clickedObject",
		"hoveredObject",
		"webLook",
		"webLookPrev",
		"webMouse",
		"boundFadeObjects",
		"invisibleMaterial",
		"models",
		"objects",
		"sounds",
		"cursorPlanes",
		"enclosureBoundaries",
		"behaviors",
		"listeners",
		"syncedObjects",
		"pendingUpdates",
		"firebase",
		"pendingEvents",
		"pendingFirebaseEvents",
		"selfSyncingObject",	// Used to avoid syncing to updates that we locally send
		"doneCaching",
		"audioContext",	// For precaching sounds, etc.
		"raycastArray",	// gets used locally every tick
		"freshObjects", // a list of objects that were spawned in the current tick
		"needsLocationUpdate",
		"lastPushTime",
		"lastRandChars",
		"debug"	// Helper class
		//"octree"	// Octree disabled for now
	];

	// Declare them all as null
	for( i in privateVariables )
		this[privateVariables[i]] = null;

	// Set as many synchronous non-null PUBLIC member variables as possible
	this.gamepad = undefined;
	this.roomID = this.getQueryVariable("room");
	this.isAltspace = (window.hasOwnProperty("altspace") && window.altspace.inClient);
	this.isGear = navigator.userAgent.match(/mobile/i);
	this.quality = (this.isGear) ? "low" : "high";
	this.isInitialized = false;
	this.isReady = false;
	this.isRunning = false;
	this.gamepads = (this.isAltspace) ? altspace.getGamepads() : navigator.getGamepads();
	this.activeGamepadIndex = -1;
	this.previousGamepadStates = [];
	this.hoveredObject = null;
	this.clickedObject = null;
	//this.fontUrl = "https://cdn.rawgit.com/mrdoob/three.js/r74/examples/fonts/helvetiker_regular.typeface.js";

	// Set as many synchronous non-null PRIVATE member veriables as possible 
	this.sessionKey = "key" + Math.random() + "-" + Math.random() + "-" + Math.random() + "-" + Math.random();
	this.options =
	{
		"appID": "example",
		"multiuserOnly": false,
		"enclosureOnly": true,
		"sceneScale": 1.0,	// relative scale
		"scaleWithEnclosure": true,	// false means consistent size, regardless of enclosure size
		"timeScale": 1.0,
		"webControls": true,
		"debug":
		{
			"showCursorPlanes": false
		},
		"camera":
		{
			"position": {x: 200, y: 240, z: 800}
		}
	};
	this.firebase = {
		"rootRef": null,
		"roomRef": null,
		"usersRef": null,
		"connectedRef": null,
		"localUserRef": null,
		"state": null,
		"isLocallyInitializing": false
	};
	this.users = {};
	this.models = [];
	this.objects = {};
	this.sounds = {};
	this.syncedObjects = {};
	this.pendingUpdates = {};
	this.raycastArray = [];
	this.freshObjects = [];
	this.cursorPlanes = {};
	this.pendingEvents = {};
	this.pendingFirebaseEvents = {};
	this.selfSyncingObject = false;
	this.needsLocationUpdate = false;
	this.lastPushTime = 0;
	this.lastRandChars = [];
	this.audioContext = new AudioContext();//new window.webkitAudioContext();	// Is webkit required? (probably??)
	this.enclosureBoundaries = 
	{
		"floor": null,
		"ceiling": null,
		"north": null,
		"east": null,
		"south": null,
		"west": null
	};
	this.behaviors = {
		"footballPass":
		{
			"applyBehavior": function(options)
			{
				// REQUIRED: targetPosition, originalPosition
				if( !!options )
				{
					this.syncData.footballPass = 
					{
						"targetPosition": options.targetPosition,
						"originalPosition": options.originalPosition,
						"height": (!!options.height) ? options.height : 100.0,
						"speed": (!!options.speed) ? options.speed : "auto",
						"callbackFuncName": (!!options.callbackFuncName) ? options.callbackFuncName : "defaultCallback"
					}

					var distance = this.syncData.footballPass.targetPosition.distanceTo(this.syncData.footballPass.originalPosition);
					//var autoSpeed = 50.0 + (0.9 * distance);
					if( this.syncData.footballPass.speed === "auto" )
						this.syncData.footballPass.speed = 50.0 + (0.9 * distance);

	//				var autoSpeed = 50.0 + (0.9 * distance);
					this.syncData.footballPass.time = distance / this.syncData.footballPass.speed;

					this.addEventListener("tick", jumpStart.behaviors.footballPass.tickBehavior);
				}

				return true;
			},
			"defaultCallback": function()
			{

			},
			"removeOnFinish": function()
			{
				jumpStart.removeInstance(this);
			},
			"flagAsNaturalDeathAndRemove": function()
			{
				this.userData.naturalDeath = true;
				jumpStart.removeInstance(this);
			},
			"ownerRemoveOnFinish": function()
			{
				if( this.ownerID === jumpStart.localUser.userID )
					jumpStart.removeInstance(this);
			},
			"tickBehavior": function()
			{
				if( !!!this.userData.footballPass )
					this.userData.footballPass = {"amount": 0.0};

				if( this.userData.footballPass.amount < 1.0 )
				{
					this.userData.footballPass.amount += jumpStart.deltaTime / this.syncData.footballPass.time;

					var justFinished = false;
					if( this.userData.footballPass.amount >= 1.0 )
					{
						this.userData.footballPass.amount = 1.0;
						justFinished = true;
					}

					this.position.lerpVectors(this.syncData.footballPass.originalPosition, this.syncData.footballPass.targetPosition, this.userData.footballPass.amount);

					var amount = this.userData.footballPass.amount;
					amount *= 2.0;

					if( amount <= 1 )
					{
						amount = 1 - amount;
						amount *= amount;
						this.position.y += this.syncData.footballPass.height - (amount * this.syncData.footballPass.height);
					}
					else
					{
						amount -= 1;
						amount *= amount;
						this.position.y += this.syncData.footballPass.height - (amount * this.syncData.footballPass.height);
					}

					if( justFinished )
					{
						jumpStart.behaviors.footballPass[this.syncData.footballPass.callbackFuncName].call(this);
						//jumpStart.removeInstance(ball);
					}
				}
			}
		},
		"autoRemoval":
		{
			"autoRemove": function()
			{
				// Take control
				this.ownerID = jumpStart.localUser.userID;
				
				// Remove us the next tick cycle, to avoid immediate respawn issues.
				//console.log("Auto removed!");
			//	this.userData.autoRemoval.removerID = jumpStart.localUser.userID;
				//this.sync();
				//jumpStart.removeInstance(this);

				this.userData.pendingDelete = 0.5;
				this.userData.autoRemoval.removerID = jumpStart.localUser.userID;
				this.addEventListener("tick", function()
				{
					this.userData.pendingDelete -= jumpStart.deltaTime;

					if( this.userData.pendingDelete <= 0 )
					{
						console.log("Auto removed!");
						//this.userData.autoRemoval.removerID = jumpStart.localUser.userID;
						jumpStart.removeInstance(this);
					}
				});
			},
			"onUserDisconnect": function(val)
			{
				if( val.id !== this.ownerID )
					return;
				
				var needsRemove = false;

				// Figure out if we are the guy that should handle it.
				var index = -1;
				var x, user;
				for( x in jumpStart.users )
				{
					var user = jumpStart.users[x];
					if( user.id === this.ownerID )
						continue;

					index++;

					if( user.id === jumpStart.localUser.userID )
					{
						if( index === 0 )
							needsRemove = true;

						break;
					}
				}

				if( needsRemove )
					jumpStart.behaviors.autoRemoval.autoRemove.call(this);
			},
			"applyBehavior": function(options)
			{
				if( !!options )
				{
					this.addEventListener("spawn", jumpStart.behaviors.autoRemoval.spawnBehavior);
					this.addEventListener("userdisconnect", jumpStart.behaviors.autoRemoval.onUserDisconnect);
					this.syncData.autoRemoval = {
						"sessionKey": jumpStart.sessionKey
					};
				}

				this.userData.autoRemoval = {
					"removerID": ""
				};

				return true;
			},
			"unapplyBehavior": function()
			{
				this.removeEventListener("spawn", jumpStart.behaviors.autoRemoval.spawnBehavior);
				this.removeEventListener("userdisconnect", jumpStart.behaviors.autoRemoval.onUserDisconnect);
				delete this.syncData["autoRemoval"];
				delete this.userData["autoRemoval"];
				return true;
			},
			"spawnBehavior": function(isInitialSync)
			{
				if( !isInitialSync )
					return;

				var needsRemoval = true;
				var x, user;
				for( x in jumpStart.users )
				{
					user = jumpStart.users[x];
					if( user.id === this.ownerID && (this.ownerID !== jumpStart.localUser.userID || this.syncData.autoRemoval.sessionKey === jumpStart.sessionKey) )
					{
						needsRemoval = false;
						break;
					}
				}

				if( needsRemoval || this.ownerID === jumpStart.localUser.userID )
					jumpStart.behaviors.autoRemoval.autoRemove.call(this);
			}
		},
		"autoSync":
		{
			"applyBehavior": function(options)
			{
				if( !!options )
				{
					this.syncData.autoSync = {
						"distanceTolerance": (!!options.distanceTolerance) ? options.distanceTolerance : 5.0,
						"minInterval": (!!options.minInterval) ? options.minInterval : 0.2
					};

					this.addEventListener("tick", jumpStart.behaviors.autoSync.tickBehavior);
				}

				this.userData.autoSync = {
					"previousPosition": new THREE.Vector3(),
					"previousQuaternion": new THREE.Quaternion(),
					"previousTime": 0
				};

				return true;
			},
			"unapplyBehavior": function()
			{
				delete this.syncData["autoSync"];
				//delete this.userData["autoSync"];
				this.removeEventListener("tick", jumpStart.behaviors.autoSync.tickBehavior);
				//this.removeEventListener("spawn", jumpStart.behaviors.autoSync.spawnBehavior);
				return true;
			},
			"tickBehavior": function()
			{
				if( !!this.userData.autoRemoval && !!this.userData.autoRemoval.removerID && this.userData.autoRemoval.removerID === jumpStart.localUser.userID )
					return;
				
			//	if( !!!this.userData.autoSync )
			//		this.userData.autoSync = {};

				// Only auto-sync objects we own
				if( this.ownerID !== jumpStart.localUser.userID )
					return;

				var shouldSync = false;
				if( !!!this.userData.autoSync.previousPosition || !!!this.userData.autoSync.previousTime )
					shouldSync = true;

				if( !shouldSync && jumpStart.elapsedTime - this.userData.autoSync.previousTime > this.syncData.autoSync.minInterval )
				{
					if( this.position.distanceTo(this.userData.autoSync.previousPosition) > this.syncData.autoSync.distanceTolerance )
						shouldSync = true;
					else
					{
						// FIXME: THIS WAY OF COMPARING 2 QUATERNIONS IS CRAP!!
						var vector1 = new THREE.Vector3(0,0,Math.PI);
						vector1.applyQuaternion(this.quaternion);

						var vector2 = new THREE.Vector3(0,0,Math.PI);
						vector2.applyQuaternion(this.userData.autoSync.previousQuaternion);

						if(vector1.distanceTo(vector2) > 1.0)
							shouldSync = true;
					}
				}

				if( shouldSync )
				{
					this.userData.autoSync.previousPosition.copy(this.position);
					this.userData.autoSync.previousQuaternion.copy(this.quaternion);
					this.userData.autoSync.previousTime = jumpStart.elapsedTime;
					this.sync();
				}
			}
		},
		"shrinkRemove": // local behavior
		{
			"applyBehavior": function(options)
			{
				// determine if we are in "local" mode or not
				var isLocalMode = false;
				if( !!options && !!options.localMode )
					isLocalMode = true;
				else if( !!!options && this.syncData.localMode )
					isLocalMode = true;

				// build syncable data
				var syncableData;
				if( !!options )	// USE OPTIONS INSTEAD OF COMPARING USER ID CUZ OF REJOINING USERS
				{
					syncableData = {
						"speed": (!!options.speed) ? options.speed : 1.0,
						"delay": (!!options.delay) ? options.delay : 0.0,
						"localMode": (!!options.localMode) ? options.localMode : false,
						"ownerRemoveOnly": (!!options.ownerRemoveOnly) ? options.ownerRemoveOnly : true
					};

					this.syncData.shrinkRemove = syncableData;
					this.addEventListener("tick", jumpStart.behaviors.shrinkRemove.tickBehavior);
				}
				else
					syncableData = this.syncData.shrinkRemove;

				this.userData.shrinkRemove = {
					"remaining": syncableData.delay,
					"waitingForNetwork": false,
					"syncableData": (!isLocalMode) ? null : syncableData
				};

				/*
				// local tick listeners are NOT synced
				this.addEventListener("tick", function()
				{
					if( this.userData.shrinkRemove.remaining === 0 )
						return;

					var syncableData = (!!this.userData.shirnkRemove.syncableData) ? this.userData.shirnkRemove.syncableData : this.syncData.shrinkRemove;
					if( !syncableData.localMode && this.scale.x <= 0.0001 && syncableData.ownerRemoveOnly && jumpStart.localUser.userID !== this.ownerID )
						return;

					this.userData.shrinkRemove.remaining -= jumpStart.deltaTime;
					if( this.userData.shrinkRemove.remaining <= 0 )
					{
						this.userData.shrinkRemove.remaining = 0;

						this.scale.x -= syncableData.speed * jumpStart.deltaTime;
						this.scale.y -= syncableData.speed * jumpStart.deltaTime;
						this.scale.z -= syncableData.speed * jumpStart.deltaTime;

						if( this.scale.x <= 0.0001 && (syncableData.localMode || !syncableData.ownerRemoveOnly || jumpStart.localUser.userID === this.ownerID) )
							jumpStart.removeInstance(this);
					}
				});
				*/

				return true;
			},
			"tickBehavior": function()
			{
				if( this.userData.shrinkRemove.waitingForNetwork )
					return;

				//if( this.userData.shrinkRemove.remaining === 0 )
				//	return;

				var syncableData = (!!this.userData.shrinkRemove.syncableData) ? this.userData.shrinkRemove.syncableData : this.syncData.shrinkRemove;
				var isLocalMode = syncableData.localMode;

				if( this.scale.x <= 0.0001 || (!syncableData.localMode && syncableData.ownerRemoveOnly && jumpStart.localUser.userID !== this.ownerID) )
					return;

				this.userData.shrinkRemove.remaining -= jumpStart.deltaTime;
				if( this.userData.shrinkRemove.remaining <= 0 )
				{
					this.userData.shrinkRemove.remaining = 0;

					this.scale.x -= syncableData.speed * jumpStart.deltaTime;
					this.scale.y -= syncableData.speed * jumpStart.deltaTime;
					this.scale.z -= syncableData.speed * jumpStart.deltaTime;

					if( this.scale.x <= 0.0001 )
					{
						if( syncableData.localMode || !syncableData.ownerRemoveOnly || jumpStart.localUser.userID === this.ownerID )
							jumpStart.removeInstance(this);
						else
							this.userData.shrinkRemove.waitingForNetwork = true;
					}
				}
			},
			"unapplyBehavior": function()
			{
				var syncableData = (!!this.userData.shirnkRemove.syncableData) ? this.userData.shirnkRemove.syncableData : this.syncData.shrinkRemove;
				var isLocalMode = syncableData.localMode;

				delete this.userData["shrinkRemove"];

				if( isLocalMode )
					delete this.syncData["shrinkRemove"];

				this.removeEventListener("tick", jumpStart.behaviors.shrinkRemove.tickBehavior);
				return true;
			}
		},
		"dropShadow":
		{
			"applyBehavior": function(options)
			{
				if( !!options )
				{
					this.syncData.dropShadow = {
						"scale": (!!options.scale) ? options.scale : 1.0,
						"useParent": (!!options.useParent) ? options.useParent : false
					};

					//this.addEventListener("spawn", jumpStart.behaviors.dropShadow.spawnBehavior);
					this.addEventListener("tick", jumpStart.behaviors.dropShadow.tickBehavior);
				}

				var target = (this.syncData.dropShadow.useParent) ? this.parent : this;

				var tempRad = (!!this.boundingSphere) ? this.boundingSphere.radius : 10.0;
				var geometry = new THREE.SphereGeometry( 1.0, 5, 8, 0, Math.PI);
				var material = new THREE.MeshBasicMaterial( {color: 0x000000, transparent: true, opacity: 0.5} );
				var shadowObject = new THREE.Mesh( geometry, material );
				var shadow = jumpStart.spawnInstance(null, {"object": shadowObject});
				shadow.scale.z = 0.1;
				shadow.scale.x = tempRad * this.syncData.dropShadow.scale * target.scale.x;
				shadow.scale.y = tempRad * this.syncData.dropShadow.scale * target.scale.x;
				shadow.rotateX(-Math.PI / 2.0);
				this.addEventListener("remove", jumpStart.generateRemoveWatcher(shadow));

				this.userData.dropShadow = {
					"shadow": shadow
				};

				return true;
			},/*
			"createShadow": function()
			{
				this.userData.dropShadowshadow = shadow;
			},
			"spawnBehavior": function(isInitialSync)
			{
				jumpStart.behaviors.dropShadow.createShadow.call(this);
			},*/
			"tickBehavior": function()
			{
				//if( !!!this.userData.dropShadow )
				//	jumpStart.behaviors.dropShadow.createShadow.call(this);

				var target = (this.syncData.dropShadow.useParent) ? this.parent : this;
				var shadow = this.userData.dropShadow.shadow;
				shadow.position.copy(target.position);
				shadow.position.y = 0.0;

				var tempRad = (!!this.boundingSphere) ? this.boundingSphere.radius : 10.0;
				shadow.scale.x = tempRad * this.syncData.dropShadow.scale * target.scale.x;
				shadow.scale.y = tempRad * this.syncData.dropShadow.scale * target.scale.x;
			},
			"unapplyBehavior": function()
			{
				delete this.userData["dropShadow"];
				delete this.syncData["dropShadow"];
				this.removeEventListener("tick", jumpStart.behaviors.dropShadow.tickBehavior);
				return true;
			}
		},
		"asyncModel": // local behavior (but its presence gets synced so we're loved.)
		{
			"applyBehavior": function(options)
			{
				if( !!options )
				{
					this.userData.asyncModel = {
						"modelFile": options.modelFile,
						"callback": (typeof options.callback === "function") ? options.callback : null,
						"useBubbleIn": (options.hasOwnProperty("useBubbleIn")) ? options.useBubbleIn : true,
						"bubbleInSpeed": (!!options.bubbleInSpeed) ? options.bubbleInSpeed : 4.0,
						"visualObject": null
					};
				}
				else
				{
					this.unapplyBehavior("asyncModel");
					return;
				}

				function onModelReady()
				{
					// abort if the object that called us has already been deleted
					if( !!!jumpStart.objects[this.uuid] )
						return;

					var visualObject;
					if( !!this.userData.asyncModel && !!this.userData.asyncModel.visualObject )
						visualObject = this.userData.asyncModel.visualObject;

					if( !!!visualObject )
					{
						visualObject = jumpStart.spawnInstance(this.userData.asyncModel.modelFile, {"parent": this});
						visualObject.userData.modelParent = this;
						this.userData.asyncModel.visualObject = visualObject;
					}

					this.boundingSphere = visualObject.boundingSphere.clone();

					if( this.userData.asyncModel.useBubbleIn )
						visualObject.applyBehavior("bubbleIn", {"speed": this.userData.asyncModel.bubbleInSpeed});

					// if the local user has attached a local non-synced function to userData.asyncModel.callback, call it for them.
					if( !!this.userData.asyncModel.callback )
						this.userData.asyncModel.callback(visualObject);
				}

				// load it right away if the model is ready
				var foundModel = jumpStart.findModel(this.userData.asyncModel.modelFile);
				if( !!foundModel && foundModel.doneLoading )
				{
					// delay 1 tick (other than the visual model) so we don't cluster love user code
					var visualObject = jumpStart.spawnInstance(this.userData.asyncModel.modelFile, {"parent": this});
					visualObject.userData.modelParent = this;
					this.userData.asyncModel.visualObject = visualObject;

					visualObject.addEventListener("tick", function()
					{
						onModelReady.call(this.userData.modelParent);
						this.removeEventListener("tick", arguments.callee);
					});
				}
				else
				{
					jumpStart.loadModelsEx([this.userData.asyncModel.modelFile], function(fileNames, request)
					{
						onModelReady.call(this);
					}.bind(this));
				}

				return true;
			},
			"unapplyBehavior": function()
			{
				delete this.userData["aynscModel"];
				return true;
			}
		},
		"bubbleIn": // local behavior
		{
			"applyBehavior": function(options)
			{
				if( !!options )
				{
					this.syncData.bubbleIn = {
						"speed": (!!options.speed) ? options.speed : 2.0,
						"maxScale": (!!options.maxScale) ? options.maxScale : 1.0
					};

					this.addEventListener("tick", jumpStart.behaviors.bubbleIn.tickBehavior);
				}

				this.userData.bubbleIn = {
					"scaleDirection": 1.0
				};

				this.scale.set(0.001, 0.001, 0.001);
				return true;
			},
			"unapplyBehavior": function()
			{
				delete this.userData["bubbleIn"];
				delete this.syncData["bubbleIn"];
				//this.removeEventListener("tick", jumpStart.behaviors.shrinkRemove.tickBehavior);
				return true;
			},
			"tickBehavior": function()
			{
				if( !this.syncData.bubbleIn || this.userData.bubbleIn.scaleDirection === 0 )
					return;

				var ds = this.syncData.bubbleIn.speed * jumpStart.deltaTime * this.userData.bubbleIn.scaleDirection;
				if( this.userData.bubbleIn.scaleDirection < 0 )
					ds *= 0.5;

				this.scale.x += ds;
				this.scale.y += ds;
				this.scale.z += ds;

				if( this.userData.bubbleIn.scaleDirection > 0 && this.scale.x > this.syncData.bubbleIn.maxScale + 0.2 )
				{
					this.userData.bubbleIn.scaleDirection = -1.0;
					this.scale.set(this.syncData.bubbleIn.maxScale + 0.2, this.syncData.bubbleIn.maxScale + 0.2, this.syncData.bubbleIn.maxScale + 0.2);

					//var tempScale = new THREE.Vector3().multiplyScalar(this.syncData.bubbleIn.maxScale + 0.2);
					//this.scale.copy(tempScale);
				}
				else if( this.userData.bubbleIn.scaleDirection < 0 && this.scale.x <= this.syncData.bubbleIn.maxScale )
				{
					this.userData.bubbleIn.scaleDirection = 0;
					this.scale.set(this.syncData.bubbleIn.maxScale, this.syncData.bubbleIn.maxScale, this.syncData.bubbleIn.maxScale);
					this.removeEventListener("tick", jumpStart.behaviors.bubbleIn.tickBehavior);
				}
			}
		},
		"physics": {
			"applyBehavior": function(options)
			{
				//console.log("Apply physics");
				//console.log(options);
				//console.log(this.syncData.physics);
				this.updateMatrixWorld();
				if( !!options )
				{
					this.syncData.physics = {
						"force": (!!options.force) ? options.force.clone() : new THREE.Vector3(),
						"rotation": (!!options.rotation) ? options.rotation.clone() : new THREE.Vector3((Math.PI / 2.0) * Math.random(), (Math.PI / 2.0) * Math.random(), (Math.PI / 2.0) * Math.random()),
						"physicsScale": (!!options.physicsScale) ? options.physicsScale : 1.0
					};

					this.addEventListener("tick", jumpStart.behaviors.physics.tickBehavior);
					//this.addEventListener("spawn", jumpStart.behaviors.physics.spawnBehavior);
				//	this.updateMatrixWorld();
				}

				var force = this.syncData.physics.force;
				var rotation = this.syncData.physics.rotation;
				this.userData.physics = {
					"velocity": new THREE.Vector3(force.x, force.y, force.z),
					"rotVelocity": new THREE.Vector3(rotation.x, rotation.y, rotation.z)
				};

				//console.log(this.syncData.physics);

				return true;
			},
			"unapplyBehavior": function()
			{
				//console.log("unapply physics");
				delete this.syncData["physics"];
				delete this.userData["physics"];
				this.removeEventListener("tick", jumpStart.behaviors.physics.tickBehavior);
				//this.behaviors.physics = false;
				//this.updateMatrixWorld();
			//	this.removeEventListener("spawn", jumpStart.behaviors.physics.spawnBehavior);

				//console.log(this.behaviors);
				//if( this.syncData.vitalData && this.syncData.vitalData.behaviors )
				//{
				//	console.log("removing physics locally");
				//	delete this.syncData.vitalData.behaviors["physics"];
					//delete this.behaviors["physics"];
			//	}

				//delete this.behaviors["physics"];
				return true;
			},/*
			"spawnBehavior": function()
			{
				// if we are a client & we are present when this object is spawned, we MISS its applybehavior msg...
				// so trigger it from here.
console.log("Spawning");
				//if( !this.userData.hasOwnProperty("physics") )
				//	jumpStart.behaviors.physics.applyBehavior.call(this, this.behaviors.physics);
			},*/
			"tickBehavior": function()
			{
				// 
//				if( !!!this.userData.physics )
//					return;
				
				// at rest
				if( this.userData.physics.velocity.length() === 0 && this.userData.physics.rotVelocity.length() === 0 )
					return;

			//	console.log(this.userData.physics.rotVelocity);
				//console.log(jumpStart.options.sceneScale);
				this.userData.physics.velocity.y -= 9.8 * jumpStart.deltaTime * this.syncData.physics.physicsScale;// * jumpStart.options.sceneScale;

				// Terminal velocity because we have no air drag
				var airDrag = 8.0;
				var termVel = 16.0;
				var velLen = this.userData.physics.velocity.length();
				if( velLen > termVel )
				{
					var drag = this.userData.physics.velocity.clone();
					drag.normalize();
					drag.multiplyScalar(airDrag * jumpStart.deltaTime * this.syncData.physics.physicsScale * jumpStart.options.sceneScale);

					this.userData.physics.velocity.sub(drag);//.multiplyScalar(0.9)
				}

				//var termVel = 5000.0;
				//var velLen = this.userData.physics.velocity.length();
				//if( velLen > termVel )
				//	this.userData.physics.velocity.multiplyScalar(0.9);

//console.log(this.userData.physics.rotVelocity);
				// Update the rotation
				//console.log(this.rotation);
				this.rotateX((this.userData.physics.rotVelocity.x * 5.0) * jumpStart.deltaTime * this.syncData.physics.physicsScale * jumpStart.options.sceneScale);
				this.rotateY((this.userData.physics.rotVelocity.y * 5.0) * jumpStart.deltaTime * this.syncData.physics.physicsScale * jumpStart.options.sceneScale);
				this.rotateZ((this.userData.physics.rotVelocity.z * 5.0) * jumpStart.deltaTime * this.syncData.physics.physicsScale * jumpStart.options.sceneScale);
				//var testerQuaternion = this.quaternion.clone();
				//console.log(this.rotation);

				// Bounce us off of walls
				//var derOffset = ((jumpStart.enclosure.scaledWidth * jumpStart.options.sceneScale) / 2.0);
				var radius = (this.boundingSphere) ? this.boundingSphere.radius * 0.5 : 0.0;
				var maximums = {
					//"x": ((jumpStart.enclosure.scaledWidth * jumpStart.options.sceneScale) / 2.0) - radius,
					//"y": ((jumpStart.enclosure.scaledHeight * jumpStart.options.sceneScale) / 2.0) - radius,
					//"z": ((jumpStart.enclosure.scaledDepth * jumpStart.options.sceneScale) / 2.0) - radius
					//"x": (jumpStart.enclosure.scaledWidth / 2.0) - radius,
					//"y": (jumpStart.enclosure.scaledHeight / 2.0) - radius,
					//"z": (jumpStart.enclosure.scaledDepth / 2.0) - radius
					"x": (jumpStart.enclosure.innerWidth * jumpStart.options.sceneScale / 2.0) - radius,
					"y": (jumpStart.enclosure.innerHeight / 2.0) - radius,	// y axis doesn't move w/ encosure scale
					"z": (jumpStart.enclosure.innerDepth * jumpStart.options.sceneScale / 2.0) - radius
				};

				//this.updateMatrixWorld();	// FIX ME: This was needed for some reason, but it messes with the physics behavior on network clients.
				var pos = this.getWorldPosition();//new THREE.Vector3().setFromMatrixPosition(this.matrixWorld);
				//jumpStart.world.worldToLocal(pos);

				var magicFactor = (jumpStart.isAltspace) ? 160.0 : 80.0;// * 1 / jumpStart.scene.scale;//80.0;
				var deltaPos = this.userData.physics.velocity.clone();
				//deltaPos.normalize();
//deltaPos.multiplyScalar(100.0);
				deltaPos.multiplyScalar(100.0);// * this.syncData.physics.physicsScale);
				//deltaPos.multiplyScalar(magicFactor);// * jumpStart.deltaTime);
				//deltaPos.add(this.userData.physics.velocity);
				deltaPos.multiplyScalar(jumpStart.deltaTime * this.syncData.physics.physicsScale * jumpStart.options.sceneScale);
				//var magicFactor = 1.0;
				//var delta = magicFactor * jumpStart.deltaTime * this.syncData.physics.physicsScale;
				//var deltaPos = this.userData.physics.velocity.clone();
				//deltaPos.add(new THREE.Vector3(delta, delta, delta));
				//var deltaPos = this.userData.physics.velocity.clone().multiplyScalar(100.0 * jumpStart.deltaTime * this.syncData.physics.physicsScale);
				//.multiplyScalar(jumpStart.options.sceneScale)
				//deltaPos.multiplyScalar(1 / jumpStart.options.sceneScale);
				pos.add(deltaPos);

				var hitMaximums = {
					"x": false,
					"y": false,
					"z": false
				};

				var hitMinimums = {
					"x": false,
					"y": false,
					"z": false
				};

				var x, max;
				for( x in maximums )
				{
					if( pos[x] > maximums[x] )
					{
						pos[x] = maximums[x];
						this.userData.physics.velocity[x] *= -1.0;
						hitMaximums[x] = true;
					}
					else if( pos[x] < -maximums[x] )
					{
						pos[x] = -maximums[x];
						this.userData.physics.velocity[x] *= -1.0;
						hitMinimums[x] = true;
					}
				}

				var comeToRest = false;
				if( hitMinimums.y )
				{
					this.userData.physics.velocity.y *= 0.6;
					var oldVelY = this.userData.physics.velocity.y;

					this.userData.physics.velocity.multiplyScalar(0.4);
					this.userData.physics.velocity.y = oldVelY;

					if( this.userData.physics.velocity.length() < 1.0 )
					{
						console.log("bring to rest");
						comeToRest = true;
					}
				}
//this.updateMatrixWorld();
//console.log(pos);
				pos.multiplyScalar(1 / jumpStart.options.sceneScale);
				pos.sub(jumpStart.world.position);
				//jumpStart.world.worldToLocal(pos);


				//pos.add(jumpStart.worldOffset);
				//pos = jumpStart.world.worldToLocal(pos);
//console.log(pos);
				//jumpStart.world.worldToLocal(pos);
				
				// reapply stuff here to get exact values that apps might depend on
				for( x in hitMinimums )
				{
					if( hitMinimums[x] )
					{
						if( x === "y" )
							pos[x] = (this.boundingSphere) ? this.boundingSphere.radius * 0.5 : 0.0;
						else
							pos[x] = -maximums[x] * (1 / jumpStart.options.sceneScale);
						//pos[x] = -Math.abs(jumpStart.worldOffset[x]);
					}
				}

				for( x in hitMaximums )
				{
					if( hitMaximums[x] )
					{
						if( x === "y" )
						{
							var tempRad = (this.boundingSphere) ? this.boundingSphere.radius * 0.5 : 0.0;
							pos[x] = (-2.0 * jumpStart.worldOffset.y) - tempRad;
						}
						else
							pos[x] = maximums[x] * (1 / jumpStart.options.sceneScale);
						//pos[x] = Math.abs(jumpStart.worldOffset[x]);
					}
				}

				if( comeToRest )
				{
					this.userData.physics.velocity.set(0, 0, 0);
					this.userData.physics.rotVelocity.set(0, 0, 0);
				}

				//this.updateMatrixWorld();
				this.position.copy(pos);
				//				this.quaternion.copy(testerQuaternion);
				//this.updateMatrixWorld();
			},
			"spawnBehavior": function(isInitialSync)
			{
				//this.updateMatrixWorld();
				//this.position.add(jumpStart.world.position);
				//this.updateMatrixWorld();
				//this.userData.physics = {
				//	"enabled": true,
				//	"velocity": new THREE.Vector3(this.syncData.physics.force.x, this.syncData.physics.force.y, this.syncData.physics.force.z),
				//	"rotVelocity": new THREE.Vector3(this.syncData.physics.rotation.x, this.syncData.physics.rotation.y, this.syncData.physics.rotation.z)
				//};
			}
		},
		"lerpSync":
		{
			/*"syncPrep": function(options)
			{
				// The lerpSync behavior is special and always has the final word on object transform.
				// We can't wait for our applyBehavior method to be called at the end of this jumpStart.onTick
				// cycle because newly connecting users need lerpSync prepped before the tick cycle is even finished!!
				// syncPrep does all the important stuff in a way that both newly connecting users & local users can utilize.

				// This method gets called mid-tick from doPendingUpdates automatically by JumpStart if the object has a lerpSync behavior.

				if( !!!options )
					options = {};

				this.userData.lerpSync = {};
				this.userData.lerpSync.targetPosition = new THREE.Vector3();
				this.userData.lerpSync.targetQuaternion = new THREE.Quaternion();
				this.userData.lerpSync.originalPosition = new THREE.Vector3();
				this.userData.lerpSync.originalQuaternion = new THREE.Quaternion();
				this.userData.lerpSync.time = 1.0;
				this.userData.lerpSync.amount = 1.0;

				this.addEventListener("tick", jumpStart.behaviors.lerpSync.tickBehavior);
			},*/
			"applyBehavior": function(options)
			{
				// lerpsync should never be applied ontop of itself!!
				if( !!this.userData.lerpSync )
					return true;

				if( !!options )
				{
					this.syncData.lerpSync = {
						"speed": (!!options.speed) ? options.speed : 50.0
					};

					this.addEventListener("tick", jumpStart.behaviors.lerpSync.tickBehavior);
				}

				this.userData.lerpSync = {
					"targetPosition": this.position.clone(),
					"targetQuaternion": this.quaternion.clone(),
					"originalPosition": this.position.clone(),
					"originalQuaternion": this.quaternion.clone(),
					"amount": 0.0
				};

				//this.addEventListener("tick", jumpStart.behaviors.lerpSync.tickBehavior);

				return true;
			},
			"unapplyBehavior": function()
			{
				delete this.syncData["lerpSync"];
				delete this.userData["lerpSync"];
				this.removeEventListener("tick", jumpStart.behaviors.lerpSync.tickBehavior);
				return true;
			},
			"tickBehavior": function()
			{
				if( this.ownerID === jumpStart.localUser.userID || this.userData.lerpSync.amount >= 1.0 )
					return;

			//	console.log(this.syncData.lerpSync.speed);
				//this.position.lerp(this.userData.lerpSync.targetPosition, 1.0 / this.syncData.lerpSync.speed);
				this.userData.lerpSync.amount += (this.syncData.lerpSync.speed * 0.05) * jumpStart.deltaTime;//1.0 / this.syncData.lerpSync.speed;//jumpStart.deltaTime / this.userData.lerpSync.time;

				if( this.userData.lerpSync.amount >= 1.0 )
				{
					//console.log("maxed ");
					this.userData.lerpSync.amount = 1.0;
					this.position.copy(this.userData.lerpSync.targetPosition);
					this.quaternion.copy(this.userData.lerpSync.targetQuaternion)
				}
				else
				{
					//console.log("NOT maxed");
					this.position.lerpVectors(this.userData.lerpSync.originalPosition, this.userData.lerpSync.targetPosition, this.userData.lerpSync.amount);
					//this.position.lerp(this.userData.lerpSync.targetPosition, this.userData.lerpSync.amount);

					var currentQuaternion = this.userData.lerpSync.originalQuaternion.clone();
					currentQuaternion.slerp(this.userData.lerpSync.targetQuaternion, this.userData.lerpSync.amount);
					this.quaternion.copy(currentQuaternion);
				}
			}
		}
	};

	var x;
	for( x in appBehaviors )
		this.behaviors[x] = appBehaviors[x];
	
	this.listeners = {
		"userconnect": {},
		"userdisconnect": {},
		"precache": {},
		"initialize": {},	// Only used by the local user when initializing a multiuser room
		"ready": {},
		"tick": {},
		"cursordown": {},
		"cursorup": {},
		"cursormove": {},
		"keypress": {},
		"keydown": {},
		"touchpadgesture": {},
		"gamepadbutton": {}
	};

	// Attach default window-level event listeners
	if( !this.isAltspace )
		window.addEventListener( 'resize', function() { jumpStart.onWindowResize(); }, false );
	else
		altspace.addEventListener("touchpadgesture", function(e) { this.onTouchPadGesture.call(this, e); }.bind(this));

	window.addEventListener("keypress", function(e) { this.onKeyEvent.call(this, e); }.bind(this));
	window.addEventListener("keydown", function(e) { this.onKeyEvent.call(this, e); }.bind(this));

	// Merg app options with defaultOptions (up to 2 lvls deep)
	// FIX ME: Make this recursive
	if( !!options )
	{
		var x, y;
		for( x in this.options )
		{
			if( typeof this.options[x] !== "object" )
				this.options[x] = (options.hasOwnProperty(x)) ? options[x] : this.options[x];
			else if( options.hasOwnProperty(x) )
			{
				for( y in this.options[x] )
					this.options[x][y] = (options[x].hasOwnProperty(y)) ? options[x][y] : this.options[x][y];
			}
		}
	}



	// ********************************************************************************* //
	// All systems go.  Begin async tomfoolery.  Organized into sub-routines for sanity. //
	// ********************************************************************************* //

	// ASYNC 1: Load all CSS / JavaScript files sequentially
	loadHeadFiles.call(this).then(function()
	{
		// THREE & Firebase are now loaded.

		// test some stuff with vertexcolors
		//console.log(THREE.GLTFLoader);

		//modify the MTLLoader...
		//THREE.MTLLoader.MaterialCreator.prototype = 
		//{

		//};

		resolveEnvironment.call(this).then(function()
		{
			// Abort if app is enclosureOnly but not in an enclosure
			if( this.isAltspace && this.options.enclosureOnly && !this.isEnclosure )
			{
				// ABORT
				this.DOMReady.then(function()
				{
					this.displayInfoPanel("beamMe");

					// Must call render once for Altspace to know we want a 3D enclosure
					this.renderer = altspace.getThreeJSRenderer();
					this.renderer.render(null, null);
				}.bind(this));
			}
			else
			{
				this.precacheApp().then(function()
				{
					onDonePrecaching.call(this);
				}.bind(this));
			}

			function onDonePrecaching()
			{
				createScene.call(this);

				if( !this.options.multiuserOnly )
				{
					// If we are not multiuser, then the world hasn't been created yet.
					this.world = this.spawnInstance(null, {"parent": this.scene});
					this.world.name = "jumpStartWorld";
					//this.world.position.add(this.worldOffset);
					this.world.position.set(0, -this.enclosure.scaledHeight / 2.0, 0);
					//this.world.updateMatrixWorld();

					var listenerName;
					for( listenerName in this.listeners.initialize )
						this.listeners.initialize[listenerName]();

					this.onReadyToReady();
				}
				else
				{
					// Connect to firebase
					var root = "https://jumpstart-2.firebaseio.com/apps/" + this.options.appID;
					this.firebase.rootRef = new Firebase(root);
					
					// Check if this app exists
					this.firebase.rootRef.child("appData").child("createdAt").once("value", function(snapshot)
					{
						if(!snapshot.exists())
							createApp.call(this);
						else
							onAppExists.call(this);
					}.bind(this));

					function createApp()
					{
						console.warn("JumpStart: AppID \"" + this.options.appID + "\" does not exist on the server, so it will be created.");

						// FIX ME:  Add some type of app ID validity check
						this.firebase.rootRef.child("appData").update({"createdAt": Firebase.ServerValue.TIMESTAMP}, function(error)
						{
							if( error )
								console.log("JumpStart: " + error);
							else
								onAppExists.call(this);
						}.bind(this));
					}

					function onAppExists()
					{
						// Are we given a room ID?
						if( !this.roomID )
							createRoom.call(this);
						else
						{
							// Make sure this is a valid room ID AND subscribe to the state variable for future state change detection
							this.firebase.rootRef.child("rooms").child(this.roomID).child("state").on("value", onRoomStateChange.bind(this));
						}
					}

					function createRoom()
					{
						console.warn("JumpStart: No room parameter given in URL, creating new room.");
						// synchronous call with asynchronous error catching
						this.firebase.roomRef = this.firebase.rootRef.child("rooms").push({"state": "initializing", "createdAt": Firebase.ServerValue.TIMESTAMP}, function(error)
						{
							if( error )
								console.log("JumpStart: " + error);
						});

						this.roomID = this.firebase.roomRef.key();
						this.needsLocationUpdate = true;

						// Update the URL
						// FIX ME: This destroys the entire URI query.



						/*
						var pathName = document.location.pathname;
						pathName = pathName.substring(pathName.lastIndexOf("/") + 1);
						window.location.href = pathName + "?room=" + this.firebase.roomRef.key();
						*/




						//window.history.replaceState(null, document.title, pathName + "?room=" + this.firebase.roomRef.key());
						//window.history.pushState(null, null, pathName + "?room=" + this.firebase.roomRef.key());
						//var dummy = {"stuff": pathName + "?room=" + this.firebase.roomRef.key()};
						//setTimeout(function()
						//{
							//window.history.pushState(null, null, this.stuff);
							//window.history.replaceState(null, document.title, this.stuff);
							//window.history.replaceState(null, document.title, pathName + "?room=" + this.firebase.roomRef.key());
						//}.bind(dummy), 2000);

						// ASYNC, continues in jumpStart.onRoomStateChange when isLocallyInitializing is TRUE && isFirstCheck
						this.firebase.isLocallyInitializing = true;
						this.firebase.rootRef.child("rooms").child(this.roomID).child("state").on("value", onRoomStateChange.bind(this));
					}

					function onRoomStateChange(snapshot)
					{
						if( !snapshot.exists() )
							console.error("JumpStart: Invalid room ID \"" + this.roomID + "\" specified.");
						else
						{
							this.firebase.state = snapshot.val();							

							if( this.firebase.isLocallyInitializing )
							{
								if( this.firebase.state === "initializing" )
								{
									console.log("JumpStart: Initializing game room.");

									this.world = this.spawnInstance(null, {"parent": this.scene});
									this.world.name = "jumpStartWorld";
									this.world.position.set(0, -this.enclosure.scaledHeight / 2.0, 0);
									//this.scene.updateMatrixWorld();
									this.world.sync();

									// Check for initialize listeners
									var listenerName;
									for( listenerName in this.listeners.initialize )
										this.listeners.initialize[listenerName]();

									// ASYNC will continue in onRoomStateChange
									this.firebase.roomRef.update({"state": "ready"}, function(error)
									{
										if( error )
											console.log(error);
									}.bind(this));
								}
								else if( this.firebase.state === "ready" )
									onStateReady.call(this);
							}
							else
							{
								if( this.firebase.state === "ready" )
								{
									this.firebase.roomRef = this.firebase.rootRef.child("rooms").child(this.roomID);
									onStateReady.call(this);
								}
							}

							function onStateReady()
							{
								this.firebase.usersRef = this.firebase.roomRef.child("users");

								this.firebase.connectedRef = new Firebase("https://jumpstart-2.firebaseio.com/.info/connected");

								//this.firebase.localUserRef = this.firebase.usersRef.push();
								this.firebase.localUserRef = this.firebase.usersRef.child(jumpStart.localUser.userID);
								this.firebase.connectedRef.on("value", function(snapshot)
								{
									var val = snapshot.val();
									if( val )
									{
										this.firebase.localUserRef.onDisconnect().remove();
										this.firebase.localUserRef.set({"id": jumpStart.localUser.userID, "displayName": jumpStart.localUser.displayName});
									}
								}.bind(this));

								this.firebase.usersRef.on("child_removed", function(snapshot)
								{
									if( !this.pendingEvents.hasOwnProperty("userdisconnect") )
										this.pendingEvents.userdisconnect = {};
									
									var val = snapshot.val();
									this.pendingEvents["userdisconnect"][val.id] = val;
								}.bind(this));

								this.firebase.usersRef.on("child_added", function(snapshot)
								{
									if( !this.pendingEvents.hasOwnProperty("userconnect") )
										this.pendingEvents.userconnect = {};

									var val = snapshot.val();
									this.pendingEvents["userconnect"][val.id] = val;
								}.bind(this));

								this.firebase.usersRef.on("value", function(snapshot)
								{
									var val = snapshot.val();
									if( val )
									{
										var k;
										for( k in val )
											this.users[k] = val[k];
										//this.users = val;
									}
								}.bind(this));

								var initialKeys = {};

								// Spawn all of the initial objects
								this.firebase.roomRef.child("objects").once("value", function(parentSnapshot)
								{
									if( !parentSnapshot.exists() || parentSnapshot.numChildren() === 0 )
									{
										onInitialObjectsReady.call(this);
									}
									else
									{
										var parentData = parentSnapshot.val();

										var x;
										for( x in parentData )
										{
											initialKeys[x] = true;
											mergData.call(this, parentData[x], x);
										}

										console.log("JumpStart: Finished syncing initial state.")
										onInitialObjectsReady.call(this);
									}
								}.bind(this));

								function onInitialObjectsReady()
								{
									this.onReadyToReady();

									// Listen for objects being added
									this.firebase.roomRef.child("objects").on("child_added", function(snapshot)
									{
										var key = snapshot.key();

										// Don't doulbe-sync objects during initilization
										if( initialKeys.hasOwnProperty(key) )
										{
											delete initialKeys[key];
											return;
										}

										var data = snapshot.val();
										mergData.call(this, data, key);
									}.bind(this));
								}

								function mergData(data, key)
								{
									this.pendingUpdates[key] = {};

									var isInitialSync = initialKeys.hasOwnProperty(key);
									if( isInitialSync )
									{
										this.pendingUpdates[key].needsSpawn = true;
										this.pendingUpdates[key].isInitialSync = isInitialSync;

										this.pendingUpdates[key].transform = data.transform;
										this.pendingUpdates[key].vitalData = data.vitalData;
										this.pendingUpdates[key].syncData = data.syncData;

										if( this.isLocallyInitializing )
											return;
									}
									else if( !!!data.vitalData || data.vitalData.ownerID === this.localUser.userID )
									{
										if( !jumpStart.selfSyncingObject )
											this.pendingUpdates[key].needsSpawn = true;
									}
									else
										this.pendingUpdates[key].needsSpawn = true;

									// QUICK FIX FOR DOUBLE SPAWNING INITIALIZE STAGE OBJECTS:
									if( !!this.syncedObjects[key] )
										this.pendingUpdates[key].needsSpawn = false;

									console.log("JumpStart: New synced object detected!");

									// Spawn the object
									this.firebase.roomRef.child("objects").child(key).child("transform").on("value", function(snapshot)
									{
										if( initialKeys.hasOwnProperty(key) || jumpStart.selfSyncingObject )
											return;

										if( !snapshot.exists() )
										{
											// The object has been removed.
											objectRemoved.call(this, key);
											return;
										}
										
										if( !this.pendingUpdates.hasOwnProperty(key) )
											this.pendingUpdates[key] = {};

										this.pendingUpdates[key].transform = snapshot.val();

										//if( this.pendingUpdates[key].transform.name === "da bomb" )
										//	console.log(this.pendingUpdates[key].transform);
									}.bind(this));

									this.firebase.roomRef.child("objects").child(key).child("vitalData").on("value", function(snapshot)
									{
										if( initialKeys.hasOwnProperty(key) || jumpStart.selfSyncingObject )
											return;

										if( !snapshot.exists() )
										{
											// The object has been removed.
											objectRemoved.call(this, key);
											return;
										}

										if( !this.pendingUpdates.hasOwnProperty(key) )
											this.pendingUpdates[key] = {};

										this.pendingUpdates[key].vitalData = snapshot.val();
									}.bind(this));
//console.log("adding " + key);
									this.firebase.roomRef.child("objects").child(key).child("syncData").on("value", function(snapshot)
									{
										if( initialKeys.hasOwnProperty(key) || jumpStart.selfSyncingObject )
											return;

										if( !snapshot.exists() )
										{
											// The object has been removed.
											objectRemoved.call(this, key);
											return;
										}

										if( !this.pendingUpdates.hasOwnProperty(key) )
											this.pendingUpdates[key] = {};

										this.pendingUpdates[key].syncData = snapshot.val();
//										console.log("Update: ");
//										console.log(snapshot.val());
									}.bind(this));

									function objectRemoved(key)
									{
										var object = this.syncedObjects[key];
										if( !!!object )
											return;

										delete this.syncedObjects[key];

										var preventDefault = false;
										var listenerName, result;
										for( listenerName in object.listeners.networkRemove )
										{
											result = object.listeners.networkRemove[listenerName].call(object);

											if( typeof result !== "undefined" && !result )
												preventDefault = true;
										}

										if( !preventDefault )
											this.removeInstance(object);
									}
								};
							}
						}
					}
				}
			}
/*
			function precacheApp()
			{
				return {
					"then": function(callback)
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
								callback.call(this);
							else
							{
								console.warn("JumpStart: Asynchronous precaching initiated by a listener.");
								this.doneCaching = callback.bind(this);
							}
						}
					}.bind(this)
				}
			}
*/
			function createScene()
			{
				// Attach body-level event listeners for web mode
				if( !this.isAltspace && this.options.webControls )
				{
					// FIX ME: Make sure that these useCapture and preventDefaults are properly setup for web mode in these listeners
					document.body.addEventListener("contextmenu", function(e) { e.preventDefault(); return false; }, true);
					window.addEventListener( 'mousemove', this.onMouseMove.bind(this), false);
					window.addEventListener( 'mousedown', function(e) { this.onMouseDown(e); e.preventDefault(); return false; }.bind(this), false);
					window.addEventListener( 'mouseup', function(e) { this.onMouseUp(e); e.preventDefault(); return false; }.bind(this), false);
					this.addEventListener("keydown", function(keydownEvent)
					{
						switch(keydownEvent.keyCode )
						{
							case 83:
								this.camera.translateZ(20 * this.options.sceneScale);
								break;

							case 87:
								this.camera.translateZ(-20 * this.options.sceneScale);
								break;

							case 65:
								this.camera.translateX(-20 * this.options.sceneScale);
								break;

							case 68:
								this.camera.translateX(20 * this.options.sceneScale);
								break;
						}
					}.bind(this), true);
				}

				// Convert the camera position from a generic object to a THREE.Vector3 (now that THREE.js is loaded.)
				this.options.camera.position = new THREE.Vector3(this.options.camera.position.x, this.options.camera.position.y, this.options.camera.position.z);

				// Create an invisible material
				this.invisibleMaterial = new THREE.MeshBasicMaterial( { color: "#ffffff", transparent: true, opacity: 0.5, visible: false});

				this.worldOffset = new THREE.Vector3(0.0, -this.enclosure.scaledHeight / 2.0, 0.0);

				this.scene = new THREE.Scene();
				this.scene.scale.multiplyScalar(this.options.sceneScale);
				this.scene.addEventListener("cursormove", this.onCursorMove.bind(this));
				this.scene.addEventListener("cursordown", this.onCursorDown.bind(this));
				this.scene.addEventListener("cursorup", this.onCursorUp.bind(this));

				this.clock = new THREE.Clock();
				this.raycaster = new THREE.Raycaster();
				//this.fontLoader = new THREE.FontLoader();

				// load a font in
			//	this.fontLoader.load(this.fontUrl, function(font)
			//	{
			//		this.font = font;

					// FIX ME: It might be worth it for all blocksLOS objects to always know the distance from themselves to the player's eye so that we can perform the raycasts in order of distance, and only on objects within range.
					this.raycaster.intersectObjectsAdv = function(objects, recursive, recursiveCompare)
					{
						function ascSort(a, b)
						{
							return a.distance - b.distance;
						}

						function intersectObject(object, raycaster, intersects, recursive)
						{
							var result = recursiveCompare(object);
							if( object.visible === false || !!!result || !result )
								return;

							object.raycast(raycaster, intersects);

							if( recursive === true )
							{
								var children = object.children;

								var i;
								for( i = 0; i < children.length; i ++ )
									intersectObject( children[ i ], raycaster, intersects, true );
							}
						}

						var intersects = [];

						var i, result;
						for( i = 0; i < objects.length; i++ )
							intersectObject(objects[i], this, intersects, recursive);

						intersects.sort(ascSort);

						return intersects;
					};



					// FIX ME: Why is this a spoofed ray?  We should have THREE.js loaded by now to make a real one.
					this.cursorRay = {"origin": new THREE.Vector3(), "direction": new THREE.Vector3()};
					this.futureCursorRay = {"origin": new THREE.Vector3(), "direction": new THREE.Vector3()};

					if ( !this.isAltspace )
					{
						this.renderer = new THREE.WebGLRenderer({ alpha: true });
						this.renderer.setClearColor( 0x000000, 0 );
						this.renderer.setSize( window.innerWidth, window.innerHeight );

						this.DOMReady().then(function() { document.body.appendChild( this.renderer.domElement ); }.bind(this));

						var aspect = window.innerWidth / window.innerHeight;
						this.camera = new THREE.PerspectiveCamera(45, aspect, 1, 4000 * this.options.sceneScale );

						var pos = this.options.camera.position.clone().add(this.worldOffset.clone().multiplyScalar(this.options.sceneScale));
						this.camera.position.copy(pos);

						var lookAtSpot = this.worldOffset.clone().multiplyScalar(this.options.sceneScale);
						lookAtSpot.y += 50;

						this.camera.lookAt(lookAtSpot);

						this.localUser.cursorRayOrigin.copy(this.camera.position);

						// OBJMTLLoader always uses PhongMaterial, so we need light in scene.
						var ambient = new THREE.AmbientLight( 0xffffff );
						this.scene.add( ambient );
					}
					else
						this.renderer = altspace.getThreeJSRenderer();
				//}.bind(this));
			}
		}.bind(this));
	}.bind(this));

	function loadHeadFiles()
	{
		// Async
		return {
				"then": function(loadHeadFilesCallback)
				{
					// Define the list of CSS files
					var baseStyles = ["engine/misc/JumpStartStyle.css"];

					// Load all the CSS files
					this.loadStylesheets(baseStyles).then(function()
					{
						console.log("JumpStart: Loaded " + baseStyles.length + " stylesheet(s).");

						// Define the list of JavaScript files
						var baseScripts = [
							"https://cdn.firebase.com/js/client/2.3.2/firebase.js",
							"https://cdn.rawgit.com/mrdoob/three.js/r84/build/three.min.js",
							"https://cdn.rawgit.com/mrdoob/three.js/r84/examples/js/loaders/MTLLoader.js",
							"https://cdn.rawgit.com/mrdoob/three.js/r84/examples/js/loaders/OBJLoader.js",
							//"https://cdn.rawgit.com/mrdoob/three.js/r84/examples/js/loaders/GLTFParserLoader.js",
							//"engine/misc/UltimateLoader.min.js",
							"http://altspacevr.github.io/AltspaceSDK/dist/altspace.min.js",
							//"https://cdn.rawgit.com/norybiak/UltimateLoader/v0.4.3/dist/UltimateLoader.min.js",
							"https://cdn.rawgit.com/norybiak/UltimateLoader/v0.3.1/dist/UltimateLoader.min.js",
							"engine/misc/AltVRNC.min.js",
							"engine/misc/GLTFLoader.js"

							/*
							"http://sdk.altvr.com/libs/three.js/r73/build/three.min.js",
							"http://sdk.altvr.com/libs/three.js/r73/examples/js/loaders/OBJMTLLoader.js",
							"http://sdk.altvr.com/libs/three.js/r73/examples/js/loaders/MTLLoader.js",
							"http://sdk.altvr.com/libs/three.js/r73/examples/js/geometries/TextGeometry.js",
							"http://sdk.altvr.com/libs/three.js/r73/examples/js/utils/FontUtils.js",
							"http://sdk.altvr.com/libs/three.js/r73/examples/fonts/helvetiker_regular.typeface.js",
							"http://sdk.altvr.com/libs/altspace.js/0.5.3/altspace.min.js"
							*/
							//"engine/misc/threeoctree.js"	// Octree disabled for now
						];

						// Load all the JavaScript files
						this.loadJavaScripts(baseScripts).then(function(result)
							{
								// Load the font right away
								this.fontUrl = "https://cdn.rawgit.com/mrdoob/three.js/r74/examples/fonts/helvetiker_regular.typeface.js";
								this.fontLoader = new THREE.FontLoader();
								this.fontLoader.load(this.fontUrl, function(font)
								{
									this.font = font;

									console.log("JumpStart: Loaded " + baseScripts.length + " JavaScript(s) and 1 font.");
									loadHeadFilesCallback();
								}.bind(this));
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
						var commonVal = Math.round(1024);// / 2.5);	// FIX ME: Why this magic number?
						var pixelsPerMeter = 100.0;	// FIX ME: Why this magic number?

						if( !this.options["scaleWithEnclosure"] )
							this.options.sceneScale *= pixelsPerMeter / 100.0;	// FIX ME: Why this magic number?

						var enclosure = {
							"innerWidth": commonVal,
							"innerHeight": commonVal,
							"innerDepth": commonVal,
							"scaledWidth": Math.round(commonVal * (1 / this.options.sceneScale)),
							"scaledHeight": Math.round(commonVal * (1 / this.options.sceneScale)),
							"scaledDepth": Math.round(commonVal * (1 / this.options.sceneScale)),
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
								this.options.sceneScale *= enclosure.pixelsPerMeter / 100.0;	// FIX ME: Why this magic number?

							// FIX ME: These are only needed in specific cases.
							enclosure.adjustedWidth = Math.round(enclosure.innerWidth * this.options.sceneScale);
							enclosure.adjustedHeight = Math.round(enclosure.innerHeight * this.options.sceneScale);
							enclosure.adjustedDepth = Math.round(enclosure.innerDepth * this.options.sceneScale);

							enclosure.scaledWidth = enclosure.innerWidth * (1 / this.options.sceneScale);
							enclosure.scaledHeight = enclosure.innerHeight * (1 / this.options.sceneScale);
							enclosure.scaledDepth = enclosure.innerDepth * (1 / this.options.sceneScale);

							onGetEnclosure.call(this, enclosure);
						}.bind(this));
					}

					function onGetEnclosure(enclosure)
					{
						this.enclosure = enclosure;
						this.isEnclosure = (this.isAltspace && Math.abs(this.enclosure.pixelsPerMeter - 521) > 1) ? true : false;

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
							user.userID = user.userId;

							this.localUser = user;
							resolveEnvironmentCallback();
						}
					}
				}.bind(this)
		}
	}
}

JumpStart.prototype.generateRemoveWatcher = function(victim)
{
	return function(){jumpStart.removeInstance(victim);};
};

JumpStart.prototype.generateId = function()
{
	var PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';

	var now = new Date().getTime();
	var duplicateTime = (now === this.lastPushTime);
	this.lastPushTime = now;

	var timeStampChars = new Array(8);
	for (var i = 7; i >= 0; i--) {
		timeStampChars[i] = PUSH_CHARS.charAt(now % 64);
		// NOTE: Can't use << here because javascript will convert to int and lose the upper bits.
		now = Math.floor(now / 64);
	}
	if (now !== 0) throw new Error('We should have converted the entire timestamp.');

	var id = timeStampChars.join('');

	if (!duplicateTime) {
		for (i = 0; i < 12; i++) {
			this.lastRandChars[i] = Math.floor(Math.random() * 64);
		}
	} else {
		// If the timestamp hasn't changed since last push, use the same random number, except incremented by 1.
		for (i = 11; i >= 0 && this.lastRandChars[i] === 63; i--) {
			this.lastRandChars[i] = 0;
		}
		this.lastRandChars[i]++;
	}
	for (i = 0; i < 12; i++) {
		id += PUSH_CHARS.charAt(this.lastRandChars[i]);
	}
	if(id.length != 20) throw new Error('Length should be 20.');
	return id;
};

JumpStart.prototype.getMaterial = function(sceneObject)
{
	var max = sceneObject.children.length;
	var i, child;
	for( i = 0; i < max; i++ )
	{
		child = sceneObject.children[i];
		if( !!!child.material || !!!child.material.map )
			child = null;
	}

	if( !!child )
		return child.material;
};

JumpStart.prototype.addBehavior = function(behavior)
{
	var x;
	for( x in behavior )
	{
		this.behaviors[x] = behavior[x];
		break;
	}
};

JumpStart.prototype.onKeyEvent = function(e)
{
	if( !this.pendingEvents.hasOwnProperty(e.type) )
		this.pendingEvents[e.type] = {};

	var code = (e.type === "keypress") ? e.charCode : e.keyCode;
	this.pendingEvents[e.type][code] = e;
};

JumpStart.prototype.onTouchPadGesture = function(e)
{
	if( !this.pendingEvents.hasOwnProperty("touchpadgesture") )
		this.pendingEvents["touchpadgesture"] = {};

	var code = e.gesture;
	this.pendingEvents["touchpadgesture"][code] = e;
};

JumpStart.prototype.precacheApp = function()
{
	return {
		"then": function(callback)
		{
			// Get stuff ready that we might use during precache
			//this.objectLoader = new THREE.OBJMTLLoader();

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
					callback.call(this);
				else
				{
					console.warn("JumpStart: Asynchronous precaching initiated by a listener.");
					this.doneCaching = callback.bind(this);
				}
			}
		}.bind(this)
	}
}

JumpStart.prototype.onReadyToPrecache = function()
{
	return {
		"then": function(callback)
		{
			// Get stuff ready that we might use during precache
		//	this.objectLoader = new THREE.OBJMTLLoader();

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
					console.warn("JumpStart: Asynchronous precaching initiated by a listener.");
			}
		}.bind(this)
	};
};

JumpStart.prototype.spawnTextPlane = function(options)
{
	this.tickLag += 0.04;

	var defaultOptions = {
		"width": "auto",
		"height": 12,
		"text": "88888888",
		"fontSize": 12,
		"color": "rgba(255,255,255,1.0)",
		"background": "rgba(0,0,0,1.0)",
		"backgroundImageElem": null,
		"parent": null
	};

	if( !!options )
	{
		var x;
		for( x in defaultOptions )
			options[x] = (options.hasOwnProperty(x)) ? options[x] : defaultOptions[x];
	}
	else
		options = defaultOptions;

	if( options.width === "auto" )
		options.width = (options.fontSize / 1.5) * options.text.length;

	var geometry = new THREE.BoxGeometry(options.width, options.height, 0);

	// create a canvas element
	var scoreCanvas = document.createElement('canvas');
//	scoreCanvas.style.cssText = "position: fixed; top: " + Math.random() * 300 + "px; left: 0;";
//	document.body.appendChild(scoreCanvas);

	scoreCanvas.width = options.width * 12.0;
	scoreCanvas.height = options.height * 12.0;
	var scoreContext = scoreCanvas.getContext('2d');
	if( options.backgroundImageElem )
	{
		var width = scoreCanvas.width;
		var height = scoreCanvas.height;
		scoreContext.drawImage(options.backgroundImageElem, 0, 0, width, height);	
	}
	else
	{
		scoreContext.fillStyle = options.background;
		scoreContext.fillRect(0, 0, scoreCanvas.width, scoreCanvas.height);
	}
	scoreContext.textAlign = "center";
	scoreContext.textBaseline = "middle";
	scoreContext.font = "Bold " + options.fontSize * 13 + "px Arial";
	scoreContext.fillStyle = options.color;
   	scoreContext.fillText(options.text, scoreCanvas.width / 2.0, scoreCanvas.height / 2.0);

	// canvas contents will be used for a texture
	var scoreTexture = new THREE.Texture(scoreCanvas); 
	scoreTexture.needsUpdate = true;

	var material = new THREE.MeshBasicMaterial({map: scoreTexture, visible: true});

	var scoreSlate = new THREE.Mesh(geometry, material);
	var scoreboard = this.spawnInstance(null, {"object": scoreSlate, "parent": options.parent});
	scoreboard.userData.scoreCanvas = scoreCanvas;
	scoreboard.userData.scoreContext = scoreContext;
	scoreboard.userData.scoreTexture = scoreTexture;

	//scoreboard.userData.options = options;

/*
	scoreboard.traverse(function(child)
	{
		if( child.material && child.material instanceof THREE.MeshBasicMaterial )
		{
			if( !!!child.material.isUniqueClone || !child.material.isUniqueClone )
			{
				child.material = child.material.clone();
				child.material.map = child.material.map.clone();
				child.material.isUniqueClone = true;
				scoreboard.userData.scoreTexture = child.material.map;
			}
		}
	}.bind(scoreboard));
*/


/* nobody said they wanted to auto-apply this behavior
	scoreboard.addEventListener("tick", function()
	{
		var eyePosition;
		if( !jumpStart.isAltspace )
			eyePosition = jumpStart.camera.position.clone().multiplyScalar(1/jumpStart.options.sceneScale);
		else
		{
			var joint = jumpStart.localUser.skeleton.getJoint("Eye");
			eyePosition = joint.position.clone().multiplyScalar(1/jumpStart.options.sceneScale);
//			var scaledJointPosition = joint.position.clone().multiplyScalar(1/this.worldScale).multiplyScalar(1/this.options.sceneScale);
//			eyePosition = scaledJointPosition;
		}

		eyePosition.y = this.position.y;
		this.lookAt(eyePosition);
		this.rotateY(Math.PI);
	});
*/
	return scoreboard;
};

JumpStart.prototype.updateTextPlane = function(textPlane, options)
{
	this.tickLag += 0.04;

	var defaultOptions = {
		"width": "auto",
		"height": 12,
		"text": "88888888",
		"fontSize": 12,
		"color": "rgba(255,255,255,1.0)",
		"background": "rgba(0,0,0,1.0)",
		"backgroundImageElem": null
	};

	if( !!options )
	{
		var x;
		for( x in defaultOptions )
			options[x] = (options.hasOwnProperty(x)) ? options[x] : defaultOptions[x];
	}
	else
		options = defaultOptions;

	var scoreCanvas = textPlane.userData.scoreCanvas;
	//var scoreContext = scoreCanvas.getContext('2d');
	var scoreContext = textPlane.userData.scoreContext;
	if( options.backgroundImageElem )
	{
		var width = textPlane.userData.scoreCanvas.width;
		var height = textPlane.userData.scoreCanvas.height;
		scoreContext.drawImage(options.backgroundImageElem, 0, 0, width, height);	
	}
	else
	{
		scoreContext.fillStyle = options.background;
		scoreContext.fillRect(0, 0, textPlane.userData.scoreCanvas.width, textPlane.userData.scoreCanvas.height);
	}

	scoreContext.textAlign = "center";
	scoreContext.textBaseline = "middle";
	scoreContext.font = "Bold " + options.fontSize * 13 + "px Arial";
	scoreContext.fillStyle = options.color;
   	scoreContext.fillText(options.text, scoreCanvas.width / 2.0, scoreCanvas.height / 2.0);

  	textPlane.userData.scoreTexture.needsUpdate = true;
/*
	textPlane.traverse(function(child)
	{
		if( child.material && child.material instanceof THREE.MeshBasicMaterial )
			child.material.map.needsUpdate = true;
	});
*/
};

JumpStart.prototype.spawnCursorPlane = function(options)
{
	var defaultOptions = {
		"width": this.enclosure.scaledWidth,
		"height": this.enclosure.scaledHeight,
		"parent": this.world
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

	var cursorPlane = new THREE.Mesh(
		new THREE.BoxGeometry(options.width, options.height, 0),
		new THREE.MeshBasicMaterial( { color: getRandomColor(), transparent: true, opacity: (this.options.debug["showCursorPlanes"]) ? 0.5 : 0, visible: this.options.debug["showCursorPlanes"] })
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

JumpStart.prototype.precacheSound = function(fileName)
{
	if( !!this.sounds[fileName] )
		return;

	longFileName = (fileName.indexOf("assets/") !== 0 && fileName.indexOf("engine/") !== 0 ) ? "assets/" + this.options.appID + "/" + fileName + ".ogg" : fileName + ".ogg";

	var req = new XMLHttpRequest();
	req.open("GET", longFileName);
	req.responseType = "arraybuffer";
	req.onload = function()
	{
		this.audioContext.decodeAudioData(req.response, function(buffer)
		{
			this.sounds[fileName] = buffer;
		}.bind(this));
	}.bind(this);
	req.send();
};

JumpStart.prototype.playSound = function(fileName, volumeScale, loop)
{
	if( !!!this.sounds[fileName] )
	{
		console.warn("JumpStart: The sound " + fileName + " is not yet cached!");
		this.precacheSound(fileName);
		return;
	}

	var volumeScale = (!!volumeScale) ? volumeScale : 1.0;

	var sound = this.sounds[fileName];
	var source = this.audioContext.createBufferSource();
	source.buffer = sound;
	source.loop = !!loop;

	var gainNode = this.audioContext.createGain();
	gainNode.gain.value = 1.0 * volumeScale;
	source.connect(gainNode);
	gainNode.connect(this.audioContext.destination);

	source.start(0);

	return {"source": source, "gainNode": gainNode};
};

JumpStart.prototype.onReadyToReady = function()
{
	this.isReady = true;

	// This will spawn the world, but nothing else.
	this.doPendingUpdates();

	// AUTOMATICALLY ADJUST WORLD POSITION (the world is mispositioned if the app started in the private browser)
	// FIX ME: This should be an app option, not automatic.
	this.scene.getObjectByName("jumpStartWorld").position.set(0, -this.enclosure.scaledHeight / 2.0, 0);

	if( this.needsLocationUpdate )
	{
		var pathName = document.location.pathname;
		pathName = pathName.substring(pathName.lastIndexOf("/") + 1);
		window.location.href = pathName + "?room=" + this.roomID;
		return;
	}

//	if( this.isAltspace )
//		this.scene.add(this.localUser.skeleton);

	// Add the app menu to the UI
	/*
	if( this.options.appMenu )
	{
		var elem = document.createElement("div");
		//elem.style.cssText = "position: fixed; top: 0; right: 0;";
		elem.className = "JS_APPMENU";
		elem.innerHTML = this.options.appID + "<img src='engine/misc/appMenu.png' class='JS_APP_MENU_LOGO' />";
		elem.addEventListener("mouseover", function(e)
		{
			e.srcElement.src = "engine/misc/appMenu_on.png";
		});
		elem.addEventListener("mouseout", function(e)
		{
			e.srcElement.src = "engine/misc/appMenu.png";
		});
		elem.addEventListener("click", function(e)
		{
			var elem = document.getElementsByClassName("JS_MORE_APPS")[0];

			if( elem.isHidden )
			{
				elem.style.display = "block";
				elem.isHidden = false;
			}
			else
			{
				elem.style.display = "none";
				elem.isHidden = true;
			}
		});

		document.body.appendChild(elem);

		var moreApps = document.createElement("div");
		moreApps.className = "JS_MORE_APPS";
		moreApps.innerHTML = "MORE APPS";
		moreApps.isHidden = true;

		var moreAppsContainer = document.createElement("div");
		moreAppsContainer.className = "JS_MORE_APPS_CONTAINER";

		var apps = [
			{
				"appID": "BuildingBlocks",
				"url": "BuildingBlocks.html",
				"isJumpStart": true
			},
			{
				"appID": "LineRacers",
				"url": "LineRacers.html",
				"isJumpStart": true
			},
			{
				"appID": "MoleWhack",
				"url": "MoleWhack.html",
				"isJumpStart": true
			},
			{
				"appID": "TicTacToe",
				"url": "TicTacToe.html",
				"isJumpStart": true
			},
			{
				"appID": "AirHockey",
				"url": "http://www.jumpstartsdk.com/live/AirHockey.html",
				"isJumpStart": false
			},
			{
				"appID": "AstroCatastrophe",
				"url": "http://www.jumpstartsdk.com/live/AstroCatastrophe.html",
				"isJumpStart": false
			},
			{
				"appID": "SpacePilot",
				"url": "http://www.jumpstartsdk.com/live/SpacePilot.html",
				"isJumpStart": false
			},
			{
				"appID": "GatorSmasher",
				"url": "http://www.jumpstartsdk.com/live/GatorSmasher.html",
				"isJumpStart": false
			},
			{
				"appID": "TikiDrum",
				"url": "http://www.jumpstartsdk.com/live/TikiDrum.html",
				"isJumpStart": false
			},
			{
				"appID": "SpookyMemory",
				"url": "http://www.jumpstartsdk.com/live/SpookyMemory.html",
				"isJumpStart": false
			},
			{
				"appID": "ComboBreaker",
				"url": "http://www.jumpstartsdk.com/live/ComboBreaker.html",
				"isJumpStart": false
			},
			{
				"appID": "Sammy",
				"url": "http://www.jumpstartsdk.com/live/Sammy.html",
				"isJumpStart": false
			}
		];

		var i, app;
		for( i in apps )
		{
//			if( apps[i].appID === jumpStart.options.appID )
//				continue;

			app = document.createElement("div");
			app["app"] = apps[i];
			app.className = "JS_APP";

			if( !apps[i].isJumpStart )
				app.style.color = "#bb0000";

			app.innerHTML = apps[i].appID;
			var appURL = apps[i].url;
			app.addEventListener("click", function(e)
			{
				window.location = e.srcElement.app.url;
			});

			moreAppsContainer.appendChild(app);
		}

		moreApps.appendChild(moreAppsContainer);
		document.body.appendChild(moreApps);
	}
*/
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
		console.warn("JumpStart: Asynchronous ready-idle initiated by a listener.");
};

JumpStart.prototype.run = function()
{
	this.isRunning = true;

	this.onTick();
	console.log("JumpStart: Simulation started.");
};

JumpStart.prototype.extractData = function(data, targetData, maxDepth, currentDepth)
{
	if( arguments.length < 3 )
		maxDepth = Infinity;

	if( arguments.length < 4 )
		currentDepth = 0;

	// added 7/24/2016 to sync removed properties
	//if( !!!targetData.listeners )
	//	targetData = {};

	var x, childData, childDataType, listenerName, funcName, handler, dotIndex, behaviorName, eventName, behaviorHandler;
	for( x in data)
	{
		if( x === "listeners" )
		{
			for( listenerName in data[x] )
			{
				for( funcName in data[x][listenerName] )
				{
					handler = window[funcName];

					if( !!!handler )
					{
						dotIndex = funcName.indexOf("-");
						if( dotIndex > 0 )
						{
							behaviorName = funcName.substring(0, dotIndex);
							eventName = funcName.substring(dotIndex + 1);

							if( !!this.behaviors[behaviorName] )
							{
								behaviorHandler = this.behaviors[behaviorName][eventName];
								if( !!behaviorHandler )
									handler = behaviorHandler;
							}
						}
					}

					targetData.listeners[listenerName][funcName] = handler;
				}
			}
		}
		else
		{
			childData = data[x];
			childDataType = typeof childData;

			if( childDataType === "object" && currentDepth < maxDepth )
			{
				if( !!!targetData[x] )
					targetData[x] = {};

				this.extractData.call(this, childData, targetData[x], maxDepth, currentDepth+1);
			}
			else if( childDataType === "number" || childDataType === "string" || childDataType === "boolean" )
				targetData[x] = childData;
		}
	}
};

JumpStart.prototype.doPendingUpdates = function()
{
	// Handle pending object updates
	//console.log("tick");
	var deadUpdates = [];
	var x, y, data, instance, pendingApplyBehaviors, pendingUnapplyBehaviors;

	var pendingUpdates = {};
	for( x in this.pendingUpdates )
		pendingUpdates[x] = this.pendingUpdates[x];

	for( x in pendingUpdates )
	{
		data = pendingUpdates[x];
		//console.log(data);

		pendingApplyBehaviors = [];
		pendingUnapplyBehaviors = [];
		if( !!data.needsSpawn )
		{
			instance = this.spawnInstance(null, {"networkData": data, "syncKey": x, "isInitialSync": !!data.isInitialSync});
			if(!!data.transform)
			{
				// so things start with the correct transform on clients
				instance.name = data.transform.name;
				instance.position.set(data.transform.position.x, data.transform.position.y, data.transform.position.z);
				instance.quaternion.set(data.transform.quaternion.x, data.transform.quaternion.y, data.transform.quaternion.z, data.transform.quaternion.w);
				instance.scale.set(data.transform.scale.x, data.transform.scale.y, data.transform.scale.z);
			}
		}
		else
		{
			instance = this.syncedObjects[x];

			if( !instance )
			{
				//delete this.pendingUpdates[x];
				//deadUpdates.push(x);
				continue;
			}

			var x;
			// Handle changed behaviors BEFORE merging in the rest of the networked data (WHY? this causes an issue with physics behavior.)
			if( !!data.vitalData && !!data.vitalData.behaviors )
			{
				for( x in data.vitalData.behaviors )
				{
					if( !data.vitalData.behaviors[x] )
						continue;

					if( !!!instance.behaviors || !instance.behaviors.hasOwnProperty(x) || !instance.behaviors[x] )
					{
						console.log('inverse pushing' + x);
						pendingApplyBehaviors.push(x);
						//instance.applyBehavior(x, {}, data);
					}
				}
			}

			if( !!instance.behaviors )
			{
				for( x in instance.behaviors )
				{
//					if( instance.behaviors[x] )
//						continue;

//					if( !!data.vitalData && (!!!data.vitalData.behaviors || (!!!data.vitalData.behaviors[x] && !data.vitalData.behaviors[x])) && instance.behaviors[x] && instance.ownerID !== jumpStart.localUser.userID )
//					if( !!data.vitalData && (!!!data.vitalData.behaviors || !!!data.vitalData.behaviors[x]))//&& instance.ownerID !== jumpStart.localUser.userID )
					if( !!data.vitalData && (!!!data.vitalData.behaviors || (!!!data.vitalData.behaviors[x] && !data.vitalData.behaviors[x])) && instance.behaviors[x] && instance.ownerID !== jumpStart.localUser.userID )
					{
						console.log("Pushing " + x);
						pendingUnapplyBehaviors.push(x);
						//instance.unapplyBehavior(x);
					}
						//instance.unapplyBehavior(x);
				}
			}
		}
//console.log("doing da bomb update");
		var deferredTransform = false;
		if( !!data.transform )//hasOwnProperty("transform") )
		{
			instance.name = data.transform.name;

			// There is only ONE case where transform updates would not be applied:
			// Check if lerpSync behavior exists on this instance or in the data
			if(
				(!!data.vitalData && !!data.vitalData.behaviors && !!data.vitalData.behaviors.lerpSync) ||
				(!!instance.behaviors.lerpSync && (!!!data.vitalData || !!data.vitalData.behaviors.lerpSync))
			 )
			{
				deferredTransform = true;
			}
			else
			{
				//if( !instance.ignoreSync.transform.quaternion || (instance.ignoreSync.transform.quaternion && data.vitalData && !data.vitalData.ignoreSync.transform.quaternion) )

				if( !instance.ignoreSync.transform.position || (instance.ignoreSync.transform.position && data.vitalData && !data.vitalData.ignoreSync.transform.position) )
					instance.position.set(data.transform.position.x, data.transform.position.y, data.transform.position.z);
				
				// NOTE: the !!!instance.quaternion._x check was extremely important to get pre-existing objects's quaternions correctly who started with ignore sync.
				if( !instance.ignoreSync.transform.quaternion || !!!instance.quaternion._x || (instance.ignoreSync.transform.quaternion && data.vitalData && !data.vitalData.ignoreSync.transform.quaternion) )
					instance.quaternion.set(data.transform.quaternion._x, data.transform.quaternion._y, data.transform.quaternion._z, data.transform.quaternion._w);

				if( !instance.ignoreSync.transform.scale || (instance.ignoreSync.transform.scale && data.vitalData && !data.vitalData.ignoreSync.transform.scale) )
					instance.scale.set(data.transform.scale.x, data.transform.scale.y, data.transform.scale.z);
			}
		}

		if( data.hasOwnProperty("vitalData") )
			this.extractData.call(this, data.vitalData, instance, Infinity);

		if( data.hasOwnProperty("syncData") )
		{
			instance.syncData = {};
			this.extractData.call(this, data.syncData, instance.syncData, Infinity);
		}

		// Unpply any behaviors that need to be applied
		for( i = 0; i < pendingUnapplyBehaviors.length; i++ )
		{
			//console.log("Unapply alpha " + pendingUnapplyBehaviors.length);
			instance.unapplyBehavior(pendingUnapplyBehaviors[i]);
		}

		// Deferred transforms means a lerpSync behavior applied to this object
		if( deferredTransform && !!instance.behaviors.lerpSync )
		{
			// pre-prep this instance for lerpSync if this is its 1st sync received
			//if( !!!instance.userData.lerpSync )
			//	jumpStart.behaviors.lerpSync.syncPrep.call(instance);
			//console.log(pendingApplyBehaviors);
			var lerpBehaviorIndex = pendingApplyBehaviors.indexOf("lerpSync");
			if( !!!instance.userData.lerpSync )//lerpBehaviorIndex >= 0 )
			{
				//var blah = pendingApplyBehaviors.splice(lerpBehaviorIndex, 1);
				//console.log("blah");
				//console.log(blah);
				instance.applyBehavior("lerpSync");
			}

			if( !!!data.isInitialSync )
			{
				if( !instance.ignoreSync.transform.position || (instance.ignoreSync.transform.position && !data.vitalData.ignoreSync.transform.position) )
				{
					//if( instance.name === "da bomb" )
					//	console.log("setting position async");
					//instance.updateMatrixWorld();
					instance.userData.lerpSync.targetPosition.set(data.transform.position.x, data.transform.position.y, data.transform.position.z);
				}
				if( !instance.ignoreSync.transform.quaternion || (instance.ignoreSync.transform.quaternion && !data.vitalData.ignoreSync.transform.quaternion) )
					instance.userData.lerpSync.targetQuaternion.set(data.transform.quaternion._x, data.transform.quaternion._y, data.transform.quaternion._z, data.transform.quaternion._w);

				if(
					!instance.ignoreSync.transform.position ||
					(instance.ignoreSync.transform.position && !data.vitalData.ignoreSync.transform.position) ||
					!instance.ignoreSync.transform.quaternion ||
					(instance.ignoreSync.transform.quaternion && !data.vitalData.ignoreSync.transform.quaternion) ||
					!instance.ignoreSync.transform.scale ||
					(instance.ignoreSync.transform.scale && !data.vitalData.ignoreSync.transform.scale)
					)
				{
					//var distance = instance.position.distanceTo(instance.userData.lerpSync.targetPosition);
					//var autoSpeed = instance.syncData.lerpSync.speed + (0.9 * distance);
					//instance.userData.lerpSync.time = 1.0 / instance.syncData.lerpSync.speed;//distance / autoSpeed;
					//if( instance.userData.lerpSync.time === 0 )
					//	instance.userData.lerpSync.time = 0.25;
					instance.userData.lerpSync.targetPosition.x = data.transform.position.x;
					instance.userData.lerpSync.targetPosition.y = data.transform.position.y;
					instance.userData.lerpSync.targetPosition.z = data.transform.position.z;
					instance.userData.lerpSync.targetQuaternion._x = data.transform.quaternion._x;
					instance.userData.lerpSync.targetQuaternion._y = data.transform.quaternion._y;
					instance.userData.lerpSync.targetQuaternion._z = data.transform.quaternion._z;
					instance.userData.lerpSync.targetQuaternion._w = data.transform.quaternion._w;
					instance.userData.lerpSync.amount = 0.0;
					instance.userData.lerpSync.originalPosition.copy(instance.position);
					instance.userData.lerpSync.originalQuaternion.copy(instance.quaternion);
				}

				// FIX ME: Only position & quaternion is being lerped so far, but the scale need to be lerped too.
				if( !instance.ignoreSync.transform.scale || (instance.ignoreSync.transform.scale && !data.vitalData.ignoreSync.transform.scale) )
					instance.scale.set(data.transform.scale.x, data.transform.scale.y, data.transform.scale.z);
			}
			else
			{
				// If this is the initial sysnc, just copy the transform in immediately
				instance.position.set(data.transform.position.x, data.transform.position.y, data.transform.position.z);
				instance.quaternion.set(data.transform.quaternion._x, data.transform.quaternion._y, data.transform.quaternion._z, data.transform.quaternion._w);
				instance.scale.set(data.transform.scale.x, data.transform.scale.y, data.transform.scale.z);
			}
		}

		var i, behavior;
		for( i = 0; i < pendingApplyBehaviors.length; i++ )
		{
			// double check that we STILL need to be applied
			// (the same check that is done before adding this behavior to the pending list)
			//if( !!!instance.behaviors || !instance.behaviors.hasOwnProperty(pendingApplyBehaviors[i]) || !instance.behaviors[pendingApplyBehaviors[i]] )
				instance.applyBehavior(pendingApplyBehaviors[i], "NO_OPTIONS");
		}

//		if( !!instance && instance.name === "da bomb" )
//			console.log("Removing da bomb");
		//delete this.pendingUpdates[x];
		//deadUpdates.push(x);

		//delete this.pendingUpdates[x];
	}

	//var max = pendingUpdates.length;
	//var i;
	//for( i = 0; i < max; i++ )
	for( x in pendingUpdates )
		delete this.pendingUpdates[x];
};

JumpStart.prototype.onGamepadButtonEvent = function(e)
{
	if( !this.pendingEvents.hasOwnProperty(e.type) )
		this.pendingEvents[e.type] = {};

	this.pendingEvents[e.type][e.buttonCode] = e;
};

JumpStart.prototype.simulateLag = function()
{
	if( this.shouldSimulateLag )
	{
		var length = new Date().getTime() + (this.tickLag * 1000);
		while( new Date().getTime() <= length )
		{

		}
	}

	return true;
};

JumpStart.prototype.onTick = function()
{
	this.tickLag += 0.01;
	var dummy = this.simulateLag();
	this.tickLag = 0.0;

	if( !this.isInitialized )
		return;
///*
	// do gamepad input
	if( this.isAltspace )
	{
		//console.log("uno");
		this.gamepads = altspace.getGamepads();	// NOTE: This always returns an empty array the 1st time the enclosure is loaded.  Unknown why.  Probably an API bug.
		//console.log("Detected: " + this.gamepads);
	}
	else
	{
		//console.log("dos");
		this.gamepads = (!!navigator.getGamepads) ? navigator.getGamepads() : this.gamepads = navigator.webkitGetGamepads();
	}

//*/	
	// Detect a gamepad
	if( this.activeGamepadIndex === -1 )
	{
		var gamepadIndex, gamepad, previousGamepadState, buttonIndex;
		for( gamepadIndex in this.gamepads )
		{
			gamepad = this.gamepads[gamepadIndex];

			//console.log(typeof this.previousGamepadStates[gamepadIndex]);
			if( typeof this.previousGamepadStates[gamepadIndex] === "undefined" )
			{
				this.previousGamepadStates[gamepadIndex] = {"buttons": []};
			}

			previousGamepadState = this.previousGamepadStates[gamepadIndex];

			if( !!gamepad && !!gamepad.buttons && gamepad.buttons.length > 0 )
			{
				for( buttonIndex in gamepad.buttons )
				{
				//	if( gamepad.mapping === "steamvr" && gamepad.buttons[buttonIndex].value !== 0 )
					//	console.log(gamepad.buttons[buttonIndex].value);

					if( typeof previousGamepadState.buttons[buttonIndex] === "undefined" )
					{
						previousGamepadState.buttons[buttonIndex] = {};
					}
					else if( previousGamepadState.buttons[buttonIndex].value !== gamepad.buttons[buttonIndex].value )
					{
					//	console.log("try 2 set!!!");
						if( this.activeGamepadIndex === -1 )
						{
							this.activeGamepadIndex = gamepadIndex;
							this.gamepad = this.gamepads[this.activeGamepadIndex];
						//	console.log("SET SET SET SET!!!");
						}
					}

					previousGamepadState.buttons[buttonIndex].value = gamepad.buttons[buttonIndex].value;
				}
			}
		}
	}

	if( this.activeGamepadIndex !== -1 )
	{
		// Poll the active gamepad
		var gamepad = this.gamepads[this.activeGamepadIndex];
		if( !!!gamepad )
		{
			this.activeGamepadIndex = -1;
		}
		else
		{
			var previousGamepadState = this.previousGamepadStates[this.activeGamepadIndex];

			if( !!gamepad.buttons && gamepad.buttons.length > 0 )
			{
				var buttonIndex;
				for( buttonIndex in gamepad.buttons )
				{
					if( gamepad.buttons[buttonIndex].value !== previousGamepadState.buttons[buttonIndex].value )
					{
						// Button value has changed
						var fakeEvent = {
							"type": "gamepadbutton",
							"buttonCode": parseInt(buttonIndex),
							"value": gamepad.buttons[buttonIndex].value
						};

						this.onGamepadButtonEvent(fakeEvent);
						previousGamepadState.buttons[buttonIndex].value = gamepad.buttons[buttonIndex].value;
					}
				}
			}
		}
	}

	function doPendingListeners()
	{
		// Do some more event listeners
		var w, x, y, z, eventCategory, object, listenerName;
		for( x in this.pendingEvents )
		{
			eventCategory = this.pendingEvents[x];
			for( y in eventCategory )
			{
				for( z in this.listeners[x] )
					this.listeners[x][z].call(this, eventCategory[y]);

				if( x === "userdisconnect" )
				{
					for( w in this.objects )
					{
						object = this.objects[w];
						for( listenerName in object.listeners.userdisconnect )
							object.listeners.userdisconnect[listenerName].call(object, eventCategory[y]);
					}

					delete jumpStart.users[eventCategory[y].id];
				}
				else if( x === "userconnect" )
				{
					for( w in this.objects )
					{
						object = this.objects[w];
						for( listenerName in object.listeners.userconnect )
							object.listeners.userconnect[listenerName].call(object, eventCategory[y]);
					}

					jumpStart.users[eventCategory[y].id] = eventCategory[y];
				}
			}

			this.pendingEvents[x] = {};
		}
	};

	this.doPendingUpdates();
	doPendingListeners.call(this);

	var i, freshObject, listenerName, isInitialSync, behavior, x;
	for( i in this.freshObjects )
	{
		freshObject = this.freshObjects[i];

		isInitialSync = (!!freshObject.__isInitialSync) ? freshObject.__isInitialSync : false;
		delete freshObject["__isInitialSync"];

		// apply behavior listeners // FIXME: what if we are the owner and spawned them during initialization?
		if( freshObject.ownerID !== jumpStart.localUser.userID || isInitialSync )
		{
			for( x in freshObject.behaviors )
			{
				if( freshObject.behaviors[x] )
				{
					if( x === "lerpSync" )
						console.log("Applying lerpsync " + isInitialSync);
					jumpStart.behaviors[x].applyBehavior.call(freshObject);
				}
			}
		}

		// spawn listeners
		for( listenerName in freshObject.listeners.spawn )
			freshObject.listeners.spawn[listenerName].call(freshObject, isInitialSync);
	}
	this.freshObjects.length = 0;

	var count = 0;
	var y;
	for( x in this.objects )
	{
		object = this.objects[x];
		if( false && object.parent !== this.scene )
		{
			// FIX ME: Delete this property from the object.
			console.error("JumpStart: It's gone!! The object was removed from the scene before it should have been!");
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
			{
				if( !!!object.listeners.tick[y] )
					continue;
				
				object.listeners.tick[y].call(object);
			}
		}
	}

	this.raycastArray.length = count;

	// Check for spawn listeners on fresh objects
	/*
	var i, freshObject, listenerName, isInitialSync;
	for( i in this.freshObjects )
	{
		freshObject = this.freshObjects[i];

		isInitialSync = (!!freshObject.__isInitialSync) ? freshObject.__isInitialSync : false;
		delete freshObject["__isInitialSync"];

		for( listenerName in freshObject.listeners.spawn )
			freshObject.listeners.spawn[listenerName].call(freshObject, isInitialSync);
	}
	*/
	//this.freshObjects.length = 0;

	// Check for tick listeners
	var listenerName;
	for( listenerName in this.listeners.tick )
		this.listeners.tick[listenerName]();

	requestAnimationFrame( function(){ jumpStart.onTick(); } );

	if( this.renderer )
		this.renderer.render( this.scene, this.camera );

	this.elapsedTime = this.clock.elapsedTime;
	this.deltaTime = this.clock.getDelta();
	this.deltaTime *= this.options.timeScale;

	this.processCursorMove();
};

JumpStart.prototype.makeMaterialsInvisible = function(object)
{
	object.traverse(function(child)
	{
		if( child.material && child.material instanceof THREE.MeshPhongMaterial )
			child.material.visible = false;
	}.bind(this));
};

JumpStart.prototype.applyInvisibleMaterial = function(object)
{
	var model = this.findModel(object.modelFile);
	
	model.object.traverse(function(child)
	{
		if( child.material && child.material instanceof THREE.MeshPhongMaterial )
			child.material = this.invisibleMaterial;
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
			var pos = this.localUser.cursorRayOrigin.clone().multiplyScalar(this.options.sceneScale).add(this.localUser.cursorRayDirection);
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
	if( !this.isRunning || !this.renderer )
		return;

	this.cursorRay = this.futureCursorRay;

	// Update the local user's look info
	this.localUser.cursorRayOrigin.copy(this.cursorRay.origin);
	this.localUser.cursorRayOrigin.multiplyScalar(1.0 / this.options.sceneScale);
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
/*
	this.raycastArray.sort(function(a, b)
	{
		var worldPosA = new THREE.Vector3().setFromMatrixPosition(a.matrixWorld);
		var worldPosB = this.localUser.cursorRayOrigin;//this.cursorRay.origin;//new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);
		return worldPosA.distanceTo(worldPosB) * -1.0;
	}.bind(this));

	var i, object, intersection;
	for( i in this.raycastArray )
	{
		intersection = this.raycaster.intersectObject(this.raycastArray[i], true);

		if( intersection.length === 0 )
			continue;
		else
			intersection = intersection[0];

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
		this.localUser.cursorHit.scaledPoint = intersection.point.clone().multiplyScalar(1 / this.options.sceneScale).sub(this.world.position);

		this.localUser.cursorHit.mesh = intersection.object;
		this.localUser.cursorHit.object = object;

		hasIntersection = true;
		break;
	}
*/

	// FIX ME: Wish there was a way to quit after 1st "hit".
	var intersects = this.raycaster.intersectObjectsAdv(this.raycastArray, true, function(obj)
	{
		return !(obj.hasOwnProperty("blocksLOS") && !obj.blocksLOS);
	});

	this.tickLag += 0.01 * this.raycastArray.length;

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
		this.localUser.cursorHit.scaledPoint = intersection.point.clone().multiplyScalar(1 / this.options.sceneScale).sub(this.world.position);

		this.localUser.cursorHit.mesh = intersection.object;
		this.localUser.cursorHit.object = object;

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

JumpStart.prototype.isWorldPosInsideOfEnclosure = function(worldPos)
{
	//if( !this.isAltspace )	// FIXME: fix this parody!
	//{
	//	return true;
	//}

	var x;
	for( x in worldPos )
	{
		//if( worldPos[x] + this.world.position[x] > this.enclosure.scaledWidth/2.0 || worldPos[x] + this.world.position[x] < -this.enclosure.scaledWidth/2.0 )
		if( worldPos[x] + this.world.position[x] > this.enclosure.scaledWidth/2.0 || worldPos[x] + this.world.position[x] < -this.enclosure.scaledWidth/2.0 )
			return false;
	}

	return true;
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
		if( this.hoveredObject === this.clickedObject || !this.clickedObject.blocksLOS )
		{
			// Check for cursorup listeners
			var listenerName;
			for( listenerName in this.clickedObject.listeners.cursorup )
				this.clickedObject.listeners.cursorup[listenerName].call(this.clickedObject);
		}

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

JumpStart.prototype.loadModelsGLTF = function(fileNames, callback)
{
	var max = fileNames.length;
	var i;
	for( i = 0; i < max; i++ )
	{
		if( fileNames[i].indexOf("assets/") !== 0  && fileNames[i].indexOf("engine/") !== 0 )
			fileNames[i] = "assets/" + this.options.appID + "/" + fileNames[i];
	}

	//new THREE.TextureLoader().load("assets/LightBaker/models/thaiComplete.png", function(texture)
	//{
		//console.log(texture);
		/*
	function computeBoundingSphere(geometry)
	{
		geometry.computeBoundingSphere();

		var sphere = geometry.boundingSphere.clone();
		sphere.radius *= 1.15;	// Scale up slightly
		return sphere;
	}
	*/
		UltimateLoader.multiload(fileNames, function(objects)
		{
			for( var i = 0; i < objects.length; i++ )
			{
				// load a texture & uv's
				//var texture = new THREE.TextureLoader().load("assets/LightBaker/models/thaiComplete.png", function(er)
				//{
				//	console.log(er);
				//});
				//texture.wrapS = THREE.RepeatWrapping;
				//texture.wrapT = THREE.RepeatWrapping;
				//texture.repeat.set( 4, 4 );
				//objects[i].children[0].children[0].material.image = "assets/LightBaker/models/thaiComplete.png";//map = texture;
				//objects[i].children[0].children[0].material.map = texture;
				//console.log(objects[i].children[0].children[0].material.map);
				//objects[i].children[0].children[0].material.needsUpdate = true;

				//objects[i].children[0].children[0].boundingSphere = computeBoundingSphere(objects[i].children[0].children[0].geometry);

				var used = false;
				objects[i].traverse(function(child)
				{
					if( !used )
					{
						if( !!child.geometry )
						{
							var slimName = fileNames[i];
							var found = slimName.lastIndexOf(".");
							if( found > 0 )
								slimName = slimName.substring(0, found);
							//console.log(child.geometry.attributes);
							//var texture = new THREE.TextureLoader().load("assets/AirRush/models/wood.jpg");
							//child.material = new THREE.MeshBasicMaterial({"color": "rgb(255, 255, 255)", "vertexColors": THREE.VertexColors, "map": texture});
							jumpStart.models.push({
								"modelFile": slimName,
								"object": child,
								"quality": this.quality,
								"doneLoading": true
								//"object": objects[i].children[0].children[0]
							});

							used = true;
						}
					}
				});
			}

			callback(objects);
			//console.log(objects);
			//setTimeout(function()
			//{
			//	callback(fileNames);
			//}, 100);
		});
	//});
};

JumpStart.prototype.loadModelsEx = function(fileNames, callback)
{
	// fileNames are relative to the "assets/[appID]/" path.
	// Convert all fileNames to valid paths.

	var batchQuality = this.quality;
	var qualityPath = "";//(batchQuality === "low") ? "/low" : "";

	var max = fileNames.length;
	var i;
	for( i = 0; i < max; i++ )
	{
		if( fileNames[i].indexOf("assets/") !== 0  && fileNames[i].indexOf("engine/") !== 0 )
			fileNames[i] = "assets/" + this.options.appID + "/" + fileNames[i];
	}

	// step up 2 dir levels
	var found = fileNames[0].lastIndexOf("/");
	var urlFile = (found > 0 ) ? fileNames[0].substring(found+1) : fileNames[0];

	found = location.pathname.lastIndexOf("/");
	var urlPath = (found > 0) ? location.pathname.substring(1, found) : "";

//	var defaultMaterial = new THREE.MeshBasicMaterial({"color": "rgb(255, 255, 255)", "vertexColors": THREE.VertexColors});

	var multiloader = this.multiloader;//altspace.utilities.multiloader;
	if( !!!multiloader )
	{
		// PUT THE LOADER HERE!!
		// ORIGINALLY FROM ALTSPACE SDK: https://github.com/AltspaceVR/AltspaceSDK/blob/master/src/utilities/multiloader.js
		// MODIFIED by Elijah Newman-Gomez to allow model quality switching for GearVR users.
		this.OBJMTLLoader = (function(){
			 function load(objFile, mtlFile, callback, progress, error)
			 {
			 	//console.log(THREE.MTLLoader.prototype.parse);
			 	//console.log(THREE.MTLLoader.prototype);
			 	//console.log(THREE.MTLLoader.MaterialCreator.prototype);
///*
				THREE.MTLLoader.MaterialCreator.prototype.createMaterial_ = function ( materialName )
				{

					// Create material

					var scope = this;
					var mat = this.materialsInfo[ materialName ];
					var params = {

						name: materialName,
						side: this.side,
						"vertexColors": THREE.VertexColors

					};

					function resolveURL( baseUrl, url ) {

						if ( typeof url !== 'string' || url === '' )
							return '';

						// Absolute URL
						if ( /^https?:\/\//i.test( url ) ) return url;

						return baseUrl + url;

					}

					function setMapForType( mapType, value ) {

						if ( params[ mapType ] ) return; // Keep the first encountered texture

						var texParams = scope.getTextureParams( value, params );
						var map = scope.loadTexture( resolveURL( scope.baseUrl, texParams.url ) );

						map.repeat.copy( texParams.scale );
						map.offset.copy( texParams.offset );

						map.wrapS = scope.wrap;
						map.wrapT = scope.wrap;

						params[ mapType ] = map;

					}

					for ( var prop in mat ) {

						var value = mat[ prop ];

						if ( value === '' ) continue;

						switch ( prop.toLowerCase() ) {

							// Ns is material specular exponent

							case 'kd':

								// Diffuse color (color under white light) using RGB values

								params.color = new THREE.Color().fromArray( value );

								break;

							case 'ks':

								// Specular color (color when light is reflected from shiny surface) using RGB values
								params.specular = new THREE.Color().fromArray( value );

								break;

							case 'map_kd':

								// Diffuse texture map

								setMapForType( "map", value );

								break;

							case 'map_ks':

								// Specular map

								setMapForType( "specularMap", value );

								break;

							case 'map_bump':
							case 'bump':

								// Bump texture map

								setMapForType( "bumpMap", value );

								break;

							case 'ns':

								// The specular exponent (defines the focus of the specular highlight)
								// A high exponent results in a tight, concentrated highlight. Ns values normally range from 0 to 1000.

								params.shininess = parseFloat( value );

								break;

							case 'd':

								if ( value < 1 ) {

									params.opacity = value;
									params.transparent = true;

								}

								break;

							case 'Tr':

								if ( value > 0 ) {

									params.opacity = 1 - value;
									params.transparent = true;

								}

								break;

							default:
								break;

						}

					}

					params.vertexColors = true;

					this.materials[ materialName ] = new THREE.MeshBasicMaterial( params );
					return this.materials[ materialName ];

				};
				//*/

				var mtlLoader = new THREE.MTLLoader();

				var baseUrl = mtlFile.split('/').slice(0, -1).join('/');
				mtlLoader.setBaseUrl(baseUrl + '/');
				mtlLoader.load(mtlFile, function (materialCreator)
				{
					// test some stuff with vertexcolors
					THREE.OBJLoader.prototype.parse = function ( text )
					{
						//console.time( 'OBJLoader' );

						var state = this._createParserState();

						if ( text.indexOf( '\r\n' ) !== - 1 ) {

							// This is faster than String.split with regex that splits on both
							text = text.replace( /\r\n/g, '\n' );

						}

						if ( text.indexOf( '\\\n' ) !== - 1) {

							// join lines separated by a line continuation character (\)
							text = text.replace( /\\\n/g, '' );

						}

						var lines = text.split( '\n' );
						var line = '', lineFirstChar = '', lineSecondChar = '';
						var lineLength = 0;
						var result = [];

						// Faster to just trim left side of the line. Use if available.
						var trimLeft = ( typeof ''.trimLeft === 'function' );

						for ( var i = 0, l = lines.length; i < l; i ++ ) {

							line = lines[ i ];

							line = trimLeft ? line.trimLeft() : line.trim();

							lineLength = line.length;

							if ( lineLength === 0 ) continue;

							lineFirstChar = line.charAt( 0 );

							// @todo invoke passed in handler if any
							if ( lineFirstChar === '#' ) continue;

							if ( lineFirstChar === 'v' ) {

								lineSecondChar = line.charAt( 1 );

								if ( lineSecondChar === ' ' && ( result = this.regexp.vertex_pattern.exec( line ) ) !== null ) {

									// 0                  1      2      3
									// ["v 1.0 2.0 3.0", "1.0", "2.0", "3.0"]

									state.vertices.push(
										parseFloat( result[ 1 ] ),
										parseFloat( result[ 2 ] ),
										parseFloat( result[ 3 ] )
									);

								} else if ( lineSecondChar === 'n' && ( result = this.regexp.normal_pattern.exec( line ) ) !== null ) {

									// 0                   1      2      3
									// ["vn 1.0 2.0 3.0", "1.0", "2.0", "3.0"]

									state.normals.push(
										parseFloat( result[ 1 ] ),
										parseFloat( result[ 2 ] ),
										parseFloat( result[ 3 ] )
									);

								} else if ( lineSecondChar === 't' && ( result = this.regexp.uv_pattern.exec( line ) ) !== null ) {

									// 0               1      2
									// ["vt 0.1 0.2", "0.1", "0.2"]

									state.uvs.push(
										parseFloat( result[ 1 ] ),
										parseFloat( result[ 2 ] )
									);

								} else {

									throw new Error( "Unexpected vertex/normal/uv line: '" + line  + "'" );

								}

							} else if ( lineFirstChar === "f" ) {

								if ( ( result = this.regexp.face_vertex_uv_normal.exec( line ) ) !== null ) {

									// f vertex/uv/normal vertex/uv/normal vertex/uv/normal
									// 0                        1    2    3    4    5    6    7    8    9   10         11         12
									// ["f 1/1/1 2/2/2 3/3/3", "1", "1", "1", "2", "2", "2", "3", "3", "3", undefined, undefined, undefined]

									state.addFace(
										result[ 1 ], result[ 4 ], result[ 7 ], result[ 10 ],
										result[ 2 ], result[ 5 ], result[ 8 ], result[ 11 ],
										result[ 3 ], result[ 6 ], result[ 9 ], result[ 12 ]
									);

								} else if ( ( result = this.regexp.face_vertex_uv.exec( line ) ) !== null ) {

									// f vertex/uv vertex/uv vertex/uv
									// 0                  1    2    3    4    5    6   7          8
									// ["f 1/1 2/2 3/3", "1", "1", "2", "2", "3", "3", undefined, undefined]

									state.addFace(
										result[ 1 ], result[ 3 ], result[ 5 ], result[ 7 ],
										result[ 2 ], result[ 4 ], result[ 6 ], result[ 8 ]
									);

								} else if ( ( result = this.regexp.face_vertex_normal.exec( line ) ) !== null ) {

									// f vertex//normal vertex//normal vertex//normal
									// 0                     1    2    3    4    5    6   7          8
									// ["f 1//1 2//2 3//3", "1", "1", "2", "2", "3", "3", undefined, undefined]

									state.addFace(
										result[ 1 ], result[ 3 ], result[ 5 ], result[ 7 ],
										undefined, undefined, undefined, undefined,
										result[ 2 ], result[ 4 ], result[ 6 ], result[ 8 ]
									);

								} else if ( ( result = this.regexp.face_vertex.exec( line ) ) !== null ) {

									// f vertex vertex vertex
									// 0            1    2    3   4
									// ["f 1 2 3", "1", "2", "3", undefined]

									state.addFace(
										result[ 1 ], result[ 2 ], result[ 3 ], result[ 4 ]
									);

								} else {

									throw new Error( "Unexpected face line: '" + line  + "'" );

								}

							} else if ( lineFirstChar === "l" ) {

								var lineParts = line.substring( 1 ).trim().split( " " );
								var lineVertices = [], lineUVs = [];

								if ( line.indexOf( "/" ) === - 1 ) {

									lineVertices = lineParts;

								} else {

									for ( var li = 0, llen = lineParts.length; li < llen; li ++ ) {

										var parts = lineParts[ li ].split( "/" );

										if ( parts[ 0 ] !== "" ) lineVertices.push( parts[ 0 ] );
										if ( parts[ 1 ] !== "" ) lineUVs.push( parts[ 1 ] );

									}

								}
								state.addLineGeometry( lineVertices, lineUVs );

							} else if ( ( result = this.regexp.object_pattern.exec( line ) ) !== null ) {

								// o object_name
								// or
								// g group_name

								// WORKAROUND: https://bugs.chromium.org/p/v8/issues/detail?id=2869
								// var name = result[ 0 ].substr( 1 ).trim();
								var name = ( " " + result[ 0 ].substr( 1 ).trim() ).substr( 1 );

								state.startObject( name );

							} else if ( this.regexp.material_use_pattern.test( line ) ) {

								// material

								state.object.startMaterial( line.substring( 7 ).trim(), state.materialLibraries );

							} else if ( this.regexp.material_library_pattern.test( line ) ) {

								// mtl file

								state.materialLibraries.push( line.substring( 7 ).trim() );

							} else if ( ( result = this.regexp.smoothing_pattern.exec( line ) ) !== null ) {

								// smooth shading

								// @todo Handle files that have varying smooth values for a set of faces inside one geometry,
								// but does not define a usemtl for each face set.
								// This should be detected and a dummy material created (later MultiMaterial and geometry groups).
								// This requires some care to not create extra material on each smooth value for "normal" obj files.
								// where explicit usemtl defines geometry groups.
								// Example asset: examples/models/obj/cerberus/Cerberus.obj

								var value = result[ 1 ].trim().toLowerCase();
								state.object.smooth = ( value === '1' || value === 'on' );

								var material = state.object.currentMaterial();
								if ( material ) {

									material.smooth = state.object.smooth;

								}

							} else {

								// Handle null terminated files without exception
								if ( line === '\0' ) continue;

								throw new Error( "Unexpected line: '" + line  + "'" );

							}

						}

/*
						// merg verts
						var duplicates = [];
						var i, j;
						for( i = 0; i < state.vertices.length - 2; i += 3 )
						{
							for( j = 0; j < state.vertices.length - 2; j += 3)
							{
								if( j !== i )
								{
//console.log("yepperz");
									// check each vertex with all others
									if( 
										state.vertices[i] == state.vertices[j] &&
										state.vertices[i+1] == state.vertices[j+1] &&
										state.vertices[i+2] == state.vertices[j+2]
										)
									{
										//duplicates.push()
										console.log("Duplicate found!");
									}
								}
							}
						}
console.log(state.vertices);
*/
						state.finalize();

						var container = new THREE.Group();
						container.materialLibraries = [].concat( state.materialLibraries );

						for ( var i = 0, l = state.objects.length; i < l; i ++ ) {

							var object = state.objects[ i ];
							var geometry = object.geometry;
							var materials = object.materials;
							var isLine = ( geometry.type === 'Line' );

							// Skip o/g line declarations that did not follow with any faces
							if ( geometry.vertices.length === 0 ) continue;

							var buffergeometry = new THREE.BufferGeometry();

							var vertexColors = [];
							for( var j = 0; j < geometry.vertices.length; j++ )
							{
								vertexColors.push(parseFloat(1));
							}
							buffergeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( geometry.vertices ), 3 ) );
							buffergeometry.addAttribute( 'color', new THREE.BufferAttribute( new Float32Array( vertexColors ), 3 ) );

							if ( geometry.normals.length > 0 ) {

								buffergeometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( geometry.normals ), 3 ) );

							} else {

								buffergeometry.computeVertexNormals();

							}

							if ( geometry.uvs.length > 0 ) {

								buffergeometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( geometry.uvs ), 2 ) );

							}

							// Create materials

							var createdMaterials = [];

							for ( var mi = 0, miLen = materials.length; mi < miLen ; mi++ ) {

								var sourceMaterial = materials[mi];
								var material = undefined;

								if ( this.materials !== null ) {

									material = this.materials.create( sourceMaterial.name );

									// mtl etc. loaders probably can't create line materials correctly, copy properties to a line material.
									if ( isLine && material && ! ( material instanceof THREE.LineBasicMaterial ) ) {

										var materialLine = new THREE.LineBasicMaterial();
										materialLine.copy( material );
										material = materialLine;

									}

								}

								if ( ! material ) {

									material = ( ! isLine ? new THREE.MeshPhongMaterial() : new THREE.LineBasicMaterial() );
									material.name = sourceMaterial.name;

								}
								//console.log(material);
//material.vertexColors = THREE.VertexColors;
								material.shading = sourceMaterial.smooth ? THREE.SmoothShading : THREE.FlatShading;

								createdMaterials.push(material);

							}

							// Create mesh

							var mesh;

							if ( createdMaterials.length > 1 ) {

								for ( var mi = 0, miLen = materials.length; mi < miLen ; mi++ ) {

									var sourceMaterial = materials[mi];
									buffergeometry.addGroup( sourceMaterial.groupStart, sourceMaterial.groupCount, mi );

								}

								var multiMaterial = new THREE.MultiMaterial( createdMaterials );
								mesh = ( ! isLine ? new THREE.Mesh( buffergeometry, multiMaterial ) : new THREE.LineSegments( buffergeometry, multiMaterial ) );

							} else {

								mesh = ( ! isLine ? new THREE.Mesh( buffergeometry, createdMaterials[ 0 ] ) : new THREE.LineSegments( buffergeometry, createdMaterials[ 0 ] ) );
							}

							mesh.name = object.name;

							container.add( mesh );

						}

						//console.timeEnd( 'OBJLoader' );

						return container;

					};

					var objLoader = new THREE.OBJLoader();
					objLoader.setMaterials(materialCreator);
					objLoader.load(objFile, function(obj)
					{
						/*
						obj.traverse(function(child)
						{
							if( child instanceof THREE.Mesh )
							{
								console.log("yar");
								child.material = defaultMaterial.clone();
							}
						});
						//console.log(obj);
						*/
						callback(obj);
					});
					
		        }, progress, error);
		    }

		    return {
				load: load
			};
		})();

		this.multiloader = (function(){
			var loader;
			var TRACE;
			var baseUrl = '';
			var crossOrigin = '';//assigned to THREE.MTLLoader.crossOrigin

			function LoadRequest(){
				//To create loadRequst: new MultiLoader.LoadRequest()

				var objUrls = [];//Paths to model geometry file, in Wavefront OBJ format.
				var mtlUrls = [];//Paths to model materials file, in Wavefront MTL format.
				var objects = [];//objects[i] is result of loader.load(objUrl[i], mtlUrl[i])
				var error;//String indicating loading error with at least one file.
				var objectsLoaded = 0;//Used internally to determine when loading complete.

				return {
					objUrls: objUrls,
					mtlUrls: mtlUrls,
					objects: objects,
					error: error,
					objectsLoaded: objectsLoaded
				};

			}//end of LoadRequest

			function init(params){
				var p = params || {};
				TRACE = p.TRACE || false;
				if (p.crossOrigin) crossOrigin = p.crossOrigin;
				if (p.baseUrl) baseUrl = p.baseUrl;
				if (baseUrl.slice(-1) !== '/') baseUrl += '/';

				//loader = new altspace.utilities.shims.OBJMTLLoader();
				loader = jumpStart.OBJMTLLoader;
				loader.crossOrigin = crossOrigin;
				if (TRACE) console.log('MultiLoader initialized with params', params);
			}

			function load(loadRequest, batchInfo, onComplete){
				var req = loadRequest;
				var start = Date.now();
				if (!req || !req instanceof LoadRequest){
					throw new Error('MultiLoader.load expects first arg of type LoadRequest');
				}
				if (!onComplete || typeof(onComplete) !== 'function'){
					throw new Error('MultiLoader.load expects second arg of type function');
				}
				if (!req.objUrls || !req.mtlUrls || req.objUrls.length !== req.mtlUrls.length){
					throw new Error('MultiLoader.load called with bad LoadRequest');
				}
				var reqCount = req.objUrls.length;
				if (TRACE) console.log('Loading models...')
				for (var i=0; i < reqCount; i++){
					batchInfo.objQualities[i] = batchInfo.batchQuality;
					batchInfo.loadModelHandle = function(req, i, batchInfo){//We need i in the closure to store result.
						var objUrl = req.objUrls[i];
						var mtlUrl = req.mtlUrls[i];

						// modify the obj & mtl urls according to quality
						//var qualityPath;
						//if( batchInfo.objQualities[i] === "low" )
						//	qualityPath = "low";

						function getQualityUrl(batchInfo, regularUrl)
						{
							var qualityPath = "";
							if( batchInfo.objQualities[i] === "low" )
								qualityPath = "low/";

							var qualityUrl = regularUrl;
							// find the assets/models path
							var index = qualityUrl.indexOf("models/");
							if( index >= 0 )
								qualityUrl = qualityUrl.substring(0, index + 7) + qualityPath + qualityUrl.substring(index + 7);

							return qualityUrl;
						}

						var qualityUrl = getQualityUrl(batchInfo, req.objUrls[i]);

						var objUrl = baseUrl + qualityUrl;//req.objUrls[i];
						var mtlUrl = baseUrl + getQualityUrl(batchInfo, req.mtlUrls[i]);

						if (TRACE) console.log('Loading obj:'+objUrl+', mtl:'+mtlUrl);
						loader.load(objUrl, mtlUrl, createLoaderCallback(req, reqCount, i, onComplete), onProgress, onErrorCallback(req, batchInfo, i));
					};
					batchInfo.loadModelHandle(req, i, batchInfo);
				}
			}

			function createLoaderCallback(req, reqCount, i, onComplete)
			{
				return function(object3d)
				{
					//onLoaded
					req.objects[i] = object3d;
					req.objectsLoaded++;

					//if( batchInfo.objQualities[i] === )

					if(req.objectsLoaded === reqCount){
						//var elapsed = ((Date.now()-start)/1000.0).toFixed(2);
						//if (TRACE) console.log('Loaded '+reqCount+' models in '+elapsed+' seconds');
						onComplete();
					}
				};
			}

			function onErrorCallback(req, batchInfo, i)
			{
				return function(e)
				{
					//onError
					//console.log("error be:");
					//console.log(e);
					//if( batchInfo[]
					//var url = xhr.target.responseURL || '';
					//req.error = 'Error loading file '+url;

					if( e.type === "load" )
					{
						var quality = batchInfo.objQualities[i];
						if( quality === "low" )
						{
							batchInfo.objQualities[i] = "high";
							batchInfo.loadModelHandle(req, i, batchInfo);
						}
					}
				};
			}

			function onProgress(xhr){
				if (xhr.lengthComputable && xhr.target.responseURL) {
					//Skip progress log if no xhr url, meaning it's a local file.
					var percentComplete = xhr.loaded / xhr.total * 100;
					var filename = xhr.target.responseURL.split('/').pop();
				//	if (TRACE) console.log('...'+filename+' '+Math.round(percentComplete,2)+'% downloaded');
				}
			}

			return {
				init: init,
				load: load,
				LoadRequest: LoadRequest,
			};

		}());
	}
	multiloader = this.multiloader;

	if( !!!multiloader.hasBeenInit )
	{
		multiloader.hasBeenInit = true;
		multiloader.init({
			crossOrigin: "anonymous",
			baseUrl: ""
		});
	}

	var loadRequest = new multiloader.LoadRequest();
	var objUrls = [];
	var fileName, objUrl;
	for( i = 0; i < max; i++ )
	{
		fileName = fileNames[i];

		if( jumpStart.isModelDefined(fileName) )
			continue;

		objUrl = urlPath + qualityPath + "/" + fileName + ".obj";
		loadRequest.objUrls.push(objUrl);
		objUrls.push(objUrl);

		// FIXME: need to run tests to see if loading same texture twice actually takes place. (it shouldn't)
		loadRequest.mtlUrls.push(urlPath + qualityPath + "/" + fileName + ".mtl");
	}


	var batchInfo = {
		"callback": callback,
		"fileNames": fileNames,
		"objUrls": objUrls,
		"urlPath": urlPath,
		"batchQuality": batchQuality,
		"objQualities": []
	};

	var max = batchInfo.fileNames.length;
	var i;
	for( i = 0; i < max; i++ )
		batchInfo.objQualities.push(batchInfo.batchQuality);

	multiloader.load(loadRequest, batchInfo, function(request)
	{
		// SUCCESS

		var i, object, fileName;
		for( i = 0; i < loadRequest.objects.length; i++ )
		{
			object = loadRequest.objects[i];

			// load a texture & uv's
			//var texture = new THREE.TextureLoader().load("assets/LightBaker/models/thaiComplete.png", function(er)
			//{
			//	console.log(er);
			//});
			//texture.wrapS = THREE.RepeatWrapping;
			//texture.wrapT = THREE.RepeatWrapping;
			//texture.repeat.set( 4, 4 );
			//objects[i].children[0].children[0].material.image = "assets/LightBaker/models/thaiComplete.png";//map = texture;
			//objects[i].children[0].children[0].material.map = texture;
			//console.log(objects[i].children[0].children[0].material.map);
			//objects[i].children[0].children[0].material.needsUpdate = true;

			//objects[i].children[0].children[0].boundingSphere = computeBoundingSphere(objects[i].children[0].children[0].geometry);

			var used = false;
			object.traverse(function(child)
			{
				if( !used )
				{
					if( !!child.geometry )
					{
						var slimName = fileNames[i];
						var found = slimName.lastIndexOf(".");
						if( found > 0 )
							slimName = slimName.substring(0, found);
						//console.log(child.geometry.attributes);
						//var texture = new THREE.TextureLoader().load("assets/AirRush/models/wood.jpg");
						//child.material = new THREE.MeshBasicMaterial({"color": "rgb(255, 255, 255)", "vertexColors": THREE.VertexColors, "map": texture});
						

						fileName = this.fileNames[i];	// the clean filename w/o quality
					//	console.log("yarrrrrrrrrrrrrrrrrr");
					//	console.log(fileName);
						jumpStart.models.push({
							"modelFile": fileName,
							"object": child,
							"quality": this.objQualities[i],
							"doneLoading": true
						});

						used = true;
					}
				}
			}.bind(this));
		}

		console.log("JumpStart: Loaded " + loadRequest.objectsLoaded + " model(s).");
		batchInfo.callback(batchInfo.fileNames, request);
	}.bind(batchInfo));

};

JumpStart.prototype.loadModels = function(fileNames)
{
	// fileNames are relative to the "assets/[appID]/" path.
	// Convert all fileNames to valid paths.

	var i;
	for( i in fileNames )
	{
		if( fileNames[i].indexOf("assets/") !== 0 && fileNames[i].indexOf("engine/") !== 0 )
			fileNames[i] = "assets/" + this.options.appID + "/" + fileNames[i];
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

				var multiloader = altspace.utilities.multiloader;	// old LoadModels uses regular Altspace loader.
				if( !!!multiloader.hasBeenInit )
				{
					multiloader.hasBeenInit = true;
					multiloader.init({
						crossOrigin: "anonymous",
						baseUrl: ""
					});
				}

				var loadRequest = new multiloader.LoadRequest();
				var i, fileName;
				for( i = 0; i < fileNames.length; i++ )
				{
					fileName = fileNames[i];

					if( jumpStart.isModelDefined(fileName) )
						continue;
					
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

					console.log("JumpStart: Loaded " + loadRequest.objectsLoaded + " model(s).");
					promiseCallback(loadRequest);
				}.bind(this));
			}.bind(this)
		};
};

// PURPOSE:
//	- Private method for checking if a model is already cached.
JumpStart.prototype.findModel = function(modelFile)
{
	if( modelFile.indexOf("assets/") !== 0 && modelFile.indexOf("engine/") !== 0 )
		modelFile = "assets/" + this.options.appID + "/" + modelFile;

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
	if( !instance || !this.objects.hasOwnProperty(instance.uuid) )
		return;

	var uuid = instance.uuid;
	//object = this.objects[uuid];	// FIX ME: Don't search through the objects array twice! Combine this with the if statement above.

	// Unhover this object, but ignore listeners
	if( this.hoveredObject === instance )
		this.hoveredObject = null;

	// Unclick this object, but ignore listeners
	if( this.clickedObject === instance )
		this.clickedObject = null;

	// Now remove this object
	for( listenerName in instance.listeners.remove )
		instance.listeners.remove[listenerName].call(instance);

	// remove all children
	var goodChildren = new Array();
	var i, child;
	for( i = 0; i < instance.children.length; i++ )
		goodChildren.push(instance.children[i]);

	for( i = 0; i < goodChildren.length; i++ )
	{
		child = goodChildren[i];
		if( child.hasOwnProperty("blocksLOS") )
		{
			//console.log("Traverse remove this child");
			this.removeInstance(child);
		}
		else
		{
			this.scene.remove(child);
			if( child.parent )
				child.parent.remove(child);
		}
	}

	this.scene.remove(instance);
	if( instance.parent )
		instance.parent.remove(instance);

	if( instance.syncKey && this.syncedObjects.hasOwnProperty(instance.syncKey))
	{
		// Remove us from immediately from our local synced objects list
		delete this.syncedObjects[instance.syncKey];

		// Remove us from the firebase
		this.firebase.roomRef.child("objects").child(instance.syncKey).remove();
	}

	delete this.objects[uuid];

	//console.log("JumpStart: Removed an instance.");
};

JumpStart.prototype.enclosureBoundary = function(boundaryID)
{
	function addTickListener(axis, direction)
	{
		if( !!!direction )
			direction = 1.0;

		this.addEventListener("tick", function()
		{
			if( jumpStart.cursorRay )
			{
				if( jumpStart.cursorRay.origin[axis] * (1 / jumpStart.options.sceneScale) > this.position[axis] )
				{
					if( direction > 0 )
						hide.call(this);
					else
						show.call(this);
				}
				else if( jumpStart.cursorRay.origin[axis] * (1 / jumpStart.options.sceneScale) < this.position[axis] )
				{
					if( direction > 0 )
						show.call(this);
					else
						hide.call(this);
				}
			}
		});
	}

	function hide()
	{
		if( this.userData.isHidden )
			return;

		this.userData.isHidden = true;
		this.userData.originalScale.copy(this.scale);
		this.scale.set(0.0001, 0.0001, 0.0001);
	}

	function show()
	{
		if( !this.userData.isHidden )
			return;
		
		this.userData.isHidden = false;
		this.scale.copy(this.userData.originalScale);
	}

	var boundary;

	if( !!this.enclosureBoundaries.boundaryID )
		boundary = this.enclosureBoundaries.boundaryID;
	else
	{
		boundary = this.spawnCursorPlane({"parent": jumpStart.scene});
		boundary.blocksLOS = true;

		boundary.userData.isBoundaryPlane = true;

		switch( boundaryID )
		{
			case "floor":
				boundary.rotateX(Math.PI / 2.0);
				boundary.position.copy(this.worldOffset);
				break;

			case "ceiling":
				boundary.rotateX(Math.PI / 2.0);
				boundary.position.set(0, -this.worldOffset.y, 0);
				break;

			case "north":
				boundary.position.set(0, 0, -this.worldOffset.y);
				addTickListener.call(boundary, "z", 1.0);
				break;

			case "south":
				boundary.position.set(0, 0, this.worldOffset.y);
				addTickListener.call(boundary, "z", -1.0);
				break;

			case "west":
				boundary.rotateY(Math.PI / 2.0);
				boundary.position.set(this.worldOffset.y, 0, 0);
				addTickListener.call(boundary, "x", -1.0);
				break;

			case "east":
				boundary.rotateY(Math.PI / 2.0);
				boundary.position.set(-this.worldOffset.y, 0, 0);
				addTickListener.call(boundary, "x", 1.0);
				break;
		}

		boundary.userData.originalScale = new THREE.Vector3();
		this.enclosureBoundaries[boundaryID] = boundary;
	}

	return boundary;
};

JumpStart.prototype.isModelLoaded = function(modelFile)
{
	return this.models.find(function(t){ return (!!!t.object && t.modeFile === modelFile); });
};

// if the model is defined but NOT loaded, then it is probably LOADING right now.
JumpStart.prototype.isModelDefined = function(modelFile)
{
	if( modelFile.indexOf("assets/") !== 0 && modelFile.indexOf("engine/") !== 0 )
		modelFile = "assets/" + this.options.appID + "/" + modelFile;

	return this.models.find(function(t){ return (t.modeFile === modelFile); });
};

JumpStart.prototype.spawnInstance = function(modelFile, options)
{
	this.tickLag += 0.02;

	var defaultOptions = {
		"object": null,
		"parent": this.world,
		"networkData": null,
		"syncKey": null,
		"isInitialSync": false
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

	if( !!!modelFile )
		modelFile = (options.networkData && !!options.networkData.vitalData) ? options.networkData.vitalData.modelFile : "";

	var instance;
	if( options.object )
		instance = options.object;
	else if( modelFile !== "" )
	{
		var existingModel = this.findModel(modelFile);

		if( !existingModel )
		{
			console.error("JumpStart: The model " + modelFile + " is not yet cached.");
			return;
		}
		else
		{
			instance = existingModel.object.clone();	// is this optimal w/ altspace???
			//instance.geometry = existingMode.object.geometry;
		}
	}
	else
		instance = new THREE.Group();

/*
	if( !!instance.geometry )
	{
		var oldObject = instance;
		instance = new THREE.Group();
		instance.add(oldObject);
	}
*/
	//if( instance.modelFile === "models/base" )
		//console.log("spawnz0r");
	//instance.position.set(0, this.worldOffset.y, 0);

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
	
	if( !!options.networkData && !!options.networkData.transform && options.networkData.transform.name === "jumpStartWorld" )
	{
		this.scene.add(instance);
		this.world = instance;
	}
	else
		options.parent.add(instance);

	// We will need to check for spawn listeners on this object before the next tick
	if( options.isInitialSync )
		instance.__isInitialSync = true;

//	if( !options.isInitialSync )
		this.freshObjects.push(instance);

	function computeBoundingSphere(geometry)
	{
		geometry.computeBoundingSphere();

		var sphere = geometry.boundingSphere.clone();
		sphere.radius *= 1.15;	// Scale up slightly
		return sphere;
	}

	// Compute a collision radius based on a bounding sphere for a child mesh that contains geometry
	var computedBoundingSphere = null;
	var i, mesh;
	for( i in instance.children )
	{
		mesh = instance.children[i];

		//if( !!mesh.geometry.faces && mesh.geometry.faces.length > 0 )
		//{
		//	console.log("yip 111");
			computedBoundingSphere = computeBoundingSphere(mesh.geometry);
			break;
		//}
	}

	//if( !computedBoundingSphere && !!instance.geometry && instance.geometry.faces && instance.geometry.faces.length > 0 )
	if( !!instance.geometry )
	{
		//console.log("yip 222");
		computedBoundingSphere = computeBoundingSphere(instance.geometry);
	}
	else
	{
		//console.log("NO GEOMETRY FOUND!!!");
		//console.log(instance);
	}

	if( !!computedBoundingSphere )
	{
		//console.log("Applying bounding sphere w/ radius " + computedBoundingSphere.radius);
		this.boundingSphere = computedBoundingSphere;
	}

	//console.log(instance.children);

	// List all the object-level listeners
	var validEvents = ["tick", "cursorenter", "cursorexit", "cursordown", "cursorup", "spawn", "remove", "networkRemove", "userconnect", "userdisconnect"];
	var computedListeners = {};
	for( i in validEvents )
		computedListeners[validEvents[i]] = {};

	// Just extend this object instead of adding a namespace
	var originalObjectAddEventListener = instance.addEventListener;
	var originalObjectRemoveEventListener = instance.removeEventListener;

	var vitalDataNames = ["ownerID", "modelFile", "blocksLOS", "listeners", "behaviors", "ignoreSync"];	// These get synced
	var jumpStartData = {
		"ownerID": this.localUser.userID,
		"blocksLOS": false,
		"modelFile": modelFile,
		"boundingSphere": computedBoundingSphere,
		"listeners": computedListeners,
		"syncData": {},
		"ignoreSync": {
			"transform": {
				"position": false,
				"quaternion": false,
				"scale": false
			},
			"vitalData": {},
			"syncData": {}
		},
		"spoofVisible": true,	// because Altspace does not respect object.visible values directly
		"syncKey": options.syncKey,
		"behaviors": {},
		"setColor": function(color)
		{
			this.traverse(function(child)
			{
				if( child.material && child.material instanceof THREE.MeshPhongMaterial )
				{
					if( !!!child.material.isUniqueClone || !child.material.isUniqueClone )
					{
						child.material = child.material.clone();
						child.material.isUniqueClone = true;
					}

					child.material.color = color;
					child.material.needsUpdate = true;
				}
			}.bind(this));
		},
		"setTint": function(tintColor)
		{
			// FIXME Inside of Altsapce it works fine, but in web mode every instance of the material used on the
			// object gets highlighted, even if on a different object instance.

			// Sets the TINT (or brightness) of an object.
			if( jumpStart.isAltspace )
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
		},
		"applyBehavior": function(behaviorName, options)
		{
			if( !!!options )
				options = {};

			if( options === "NO_OPTIONS" )
				options = undefined;

			var behavior = jumpStart.behaviors[behaviorName];
			if( !!behavior )
			{
				if( typeof behavior.applyBehavior === "function" && behavior.applyBehavior.call(this, options) )
					this.behaviors[behaviorName] = true;
				else
					console.warn("Behavior \"" + behaviorName + "\" failed to apply.");
			}
			else
				console.warn("Behavior \"" + behaviorName + "\" does not exist.");
		},
		"unapplyBehavior": function(behaviorName, options)
		{
			//if( !this.behaviors.hasOwnProperty(behaviorName) || !this.behaviors[behaviorName] )
			//	return;
			
			if( !!!options )
				options = {};

			var behavior = jumpStart.behaviors[behaviorName];
			if( !!behavior )
			{
				if( behavior.unapplyBehavior.call(this, options) )
				{
				//	delete this.behaviors[behaviorName];
					this.behaviors[behaviorName] = false;
				}
				else
					console.warn("Behavior \"" + behaviorName + "\" failed to unapply.");
			}
			else
				console.warn("Behavior \"" + behaviorName + "\" does not exist.");
		},
		"sync": function(options)
		{
			if( !jumpStart.options.multiuserOnly || !jumpStart.objects.hasOwnProperty(this.uuid) )
				return;

			//if( this.name === "da bomb" )
			//	console.log("syncing");

			var defaultOptions = {
				"transform": false,
				"vitalData": false,
				"syncData": false
			};

			var autoOptions = {
					"transform": true,
					"vitalData": true,
					"syncData": true
				};

			// Merg options with defaultOptions, or use autoOptions if nothing at all is given.
			if( !!options )
			{
				var x;
				for( x in defaultOptions )
					options[x] = (!!options[x]) ? options[x] : defaultOptions[x];
			}
			else
				options = autoOptions;

			function makeSyncable(object, maxDepth, currentDepth)
			{
				if( arguments.length < 2 )
					maxDepth = 0;

				maxDepth = Infinity;

				if( arguments.length < 3 )
					currentDepth = 0;

				var result;
				var objectType = typeof object;
				if( objectType === "function" )
				{
					// Add function names for global functions
					funcName = object.name;

					if( !!funcName ) 
						result = funcName;
				}
				else if( objectType === "number" || objectType === "string" || objectType === "boolean" )
				{
					result = object;
				}
				else if( objectType === "object" )
				{
					result = {};

					var keys = Object.keys(object);
					var type, funcName;
					for( x in keys)
					{
						type = typeof object[keys[x]];
						if( type === "function" )
						{
							// Add TRUE for function names that are global functions
							funcName = object[keys[x]].name;
							if( !funcName )
							{
								// Functions with no names might be behavior functions.
								if( keys[x].indexOf("-") > 0 )
									funcName = keys[x];
							}

							if( !!funcName ) 
								result[keys[x]] = true;
						}
						else if( type === "object" && currentDepth < maxDepth )
							result[keys[x]] = makeSyncable(object[keys[x]], maxDepth, currentDepth + 1);
						else if( type === "number" || type === "string" || type === "boolean" )
							result[keys[x]] = object[keys[x]];
					}
				}

				return result;
			}

			var data = {};
			var x, y, z, i, keys, type;

			if( options.transform )
			{
				var transform = {
					"position": makeSyncable(this.position),
					"quaternion": makeSyncable(this.quaternion),
					"scale": makeSyncable(this.scale),
					"name": this.name
				};

				data.transform = transform;
			}

			if( options.vitalData )
			{
				var vitalData = {};
				for( i in vitalDataNames )
					vitalData[vitalDataNames[i]] = makeSyncable(this[vitalDataNames[i]]);

				data.vitalData = vitalData;
			}

			if( options.syncData )
			{
				var syncData = makeSyncable(this.syncData);
//				console.log("Data: ");
//				console.log(syncData);
				data.syncData = syncData;
			}

			// FIX ME: Only non-default values should need to be stored on the firebase.
			if( this.syncKey )
			{
				jumpStart.selfSyncingObject = true;	// DISABLED ON 7/24/2016 (TODO: Look into side-effects!!)  Turns out update does not get syncronously called on local client.
				jumpStart.firebase.roomRef.child("objects").child(this.syncKey).update(data, function(error)
				{
					if( error )
						console.log("JumpStart: " + error);
				});
				
				jumpStart.selfSyncingObject = false;

//				console.log("JumpStart: Syncing object with key " + this.syncKey + ".");
			}
			else
			{
				jumpStart.selfSyncingObject = true;
				var ref = jumpStart.firebase.roomRef.child("objects").push(data, function(error)
				{
					if( error )
						console.log("JumpStart:" + error);
				});
				jumpStart.selfSyncingObject = false;

				this.syncKey = ref.key();
				jumpStart.syncedObjects[ref.key()] = this;

				console.log("JumpStart: Syncing object with key " + ref.key() + " for the first time.");
			}
		},
		"addEventListener": function(eventType, listener)
		{
			// Make sure this is a valid event type
			if( validEvents.indexOf(eventType) < 0 )
			{
				console.warn("JumpStart: Invalid event type \"" + eventType + "\" specified. Applying as non-JumpStart listener.");
				originalObjectAddEventListener.apply(this, arguments);
				return;
			}

			// Create the container if this is the first listener being added for this event type
			if( !this.listeners.hasOwnProperty(eventType) )
				this.listeners[eventType] = {};

			// Determine if this is a global named function that can be used as a synced listener
			var listenerName = listener.name;
			var isLocalListener;
			if( listenerName === "" )
				isLocalListener = true;
			else
				isLocalListener = (typeof window[listenerName] !== "function");

			if( isLocalListener )
			{
				// Check for behavior listeners too
				var x, y, behavior, handler, doBreak;
				for( x in jumpStart.behaviors )
				{
					behavior = jumpStart.behaviors[x];
					for( y in behavior )
					{
						handler = behavior[y];
						
						if( handler === listener )
						{
							listenerName = x + "-" + y;
							isLocalListener = false;
							doBreak = true;
							break;
						}
					}

					if( doBreak )
						break;
				}
			}

			if( isLocalListener )
			{
//				if( jumpStart.options.multiuserOnly )
//					console.warn("JumpStart: Only global functions can be synced as event listeners.");

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

			// Assign the listener
			this.listeners[eventType][listenerName] = listener;

			// BaseClass::addEventListener
			//originalObjectAddEventListener.apply(this, arguments);
		}.bind(instance),
		"removeEventListener": function(eventType, listener)
		{
			// Make sure this is a valid event type
			if( validEvents.indexOf(eventType) < 0 )
			{
				console.warn("JumpStart: Invalid event type \"" + eventType + "\" specified. Removing as non-JumpStart listener.");
				originalObjectRemoveEventListener.apply(this, arguments);
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

			// BaseClass::addEventListener
			//originalObjectRemoveEventListener.apply(this, arguments);
		}.bind(instance),
		"hasEventListener": function(eventType, listener)
		{
			// Make sure this is a valid event type
			if( validEvents.indexOf(eventType) < 0 )
			{
				console.warn("JumpStart: Invalid event type \"" + eventType + "\" specified. Removing as non-JumpStart listener.");
				originalRemoveEventListener.apply(window, arguments);
				return;
			}

			if( this.listeners.hasOwnProperty(eventType) )
			{
				var x;
				for( x in this.listeners[eventType] )
				{
					if( this.listeners[eventType][x] === listener )
					{
						return true;
					}
				}

				return false;
			}

			// BaseClass::addEventListener
			originalRemoveEventListener.apply(window, arguments);
		}.bind(instance)
	};
	
	// If we are a network spawn, we need to merg our networkData in
	if( options.networkData )
	{
		// vitalData
		this.extractData.call(this, options.networkData.vitalData, jumpStartData);

		// syncData
		this.extractData.call(this, options.networkData.syncData, jumpStartData.syncData);

		this.syncedObjects[options.syncKey] = instance;
	}

	var x;
	for( x in jumpStartData )
	{
		// Warn if we are overwriting anything (other than *EventListener methods, because we call BaseClass on those).
		if( typeof instance[x] !== "undefined" && x !== "addEventListener" && x !== "removeEventListener" && x !== "hasEventListener" )
			console.warn("JumpStart: Object already has property " + x + ".");
		
		instance[x] = jumpStartData[x];
	}

	// JumpStart object bookkeeping.
	this.objects[instance.uuid] = instance;

//	console.log("JumpStart: Spawned an object.");

	if( !this.isReady )
		instance.__isInitialSync = true;

	// make everything not have an altspace collider by default.
	this.makeNonCollide(instance);
	
	if( instance.modelFile === "models/base" )
		console.log(instance.parent);

	return instance;
};

JumpStart.prototype.makeNonCollide = function(sceneObject)
{
	if( !this.isAltspace )
		return;

	var max = sceneObject.children.length;
	var i, instance;
	for( i = 0; i < max; i++ )
	{
		instance = sceneObject.children[i];
		instance.userData.altspace = {collider: {enabled: false}};
	}

	sceneObject.userData.altspace = {collider: {enabled: false}};
};

JumpStart.prototype.makeCollide = function(sceneObject)
{
	if( !this.isAltspace )
		return;

	var max = sceneObject.children.length;
	var i, instance;
	for( i = 0; i < max; i++ )
	{
		instance = sceneObject.children[i];
		instance.userData.altspace = {collider: {enabled: true}};
	}

	sceneObject.userData.altspace = {collider: {enabled: true}};
};

JumpStart.prototype.addEventListener = function(eventType, listener)
{
	var validEvents = Object.keys(this.listeners);

	// Make sure this is a valid event type
	if( validEvents.indexOf(eventType) < 0 )
	{
		console.warn("JumpStart: Invalid event type \"" + eventType + "\" specified.");//
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
		console.warn("JumpStart: Invalid event type \"" + eventType + "\" specified.");
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

	console.warn("JumpStart: The specificed " + eventType + " listener was not found in removeEventListener.");
};


JumpStart.prototype.displayInfoPanel = function(panelName, data)
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

JumpStart.prototype.throbScaleDOM = function(elem, interval, scale)
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

JumpStart.prototype.rockDOM = function(elem, interval, degrees)
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

JumpStart.prototype.throbHeightDOM = function(elem, interval)
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

JumpStart.prototype.loadStylesheets = function(fileNames)
{
	// Decalre some important variables
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

JumpStart.prototype.loadJavaScripts = function(fileNames)
{
	// Decalre some important variables
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

JumpStart.prototype.loadImages = function(fileNames)
{
	// Decalre some important variables
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

// Figure out if we are passed a roomID in our URL
// Based on the function at: https://css-tricks.com/snippets/javascript/get-url-variables/
JumpStart.prototype.getQueryVariable = function(name)
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

JumpStart.prototype.DOMReady = function()
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

JumpStart.prototype.DOMLoaded = function()
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

window.jumpStartBehaviors = {};
window.jumpStartBehavior = function(behavior)
{
	var x;
	for( x in behavior )
	{
		jumpStartBehaviors[x] = behavior[x];
		break;
	}
};

window.loadJumpStart = function(options)
{
	window.jumpStart = new JumpStart(options, jumpStartBehaviors);
};

				/* LERP MOVE BEHAVIOR PROTOTYPE (needs refinement)
				car.addEventListener("spawn", function(isInitialSync)
				{
					// car.applyBehavior("lerpMove");
					var distance = jumpStart.localUser.cursorHit.scaledPoint.distanceTo(this.position);
					//var speed = 100.0;
					var autoSpeed = 50 + (0.9 * distance);

					this.syncData.lerpMove = {};
					this.syncData.lerpMove.target = jumpStart.localUser.cursorHit.scaledPoint.clone();
					this.syncData.lerpMove.time =  distance / autoSpeed;

					this.userData.lerpMove = {};
					this.userData.lerpMove.original = this.position.clone();
					this.userData.lerpMove.amount = 0.0;

					this.addEventListener("tick", function()
					{
						if( this.userData.lerpMove.amount < 1.0 )
						{
							this.userData.lerpMove.amount += jumpStart.deltaTime / this.syncData.lerpMove.time;

							var justFinished = false;
							if( this.userData.lerpMove.amount >= 1.0 )
							{
								this.userData.lerpMove.amount = 1.0;
								justFinished = true;
							}

							this.position.lerpVectors(this.userData.lerpMove.original, this.syncData.lerpMove.target, this.userData.lerpMove.amount);

							if( justFinished )
							{
								console.log("Animation finished!");
							}
						}
					});
				});
				*/