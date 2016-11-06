jumpStartBehavior({
	"rcdm":
	{
		"managerObjectName": "__rcdmManager",
		"activeVehicles": {},
		"vehicleTypes": {},
		"getRandomVehicleTypeName": function()
		{
			var typeNames = [];
			var x;
			for( x in jumpStart.behaviors.rcdm.vehicleTypes )
				typeNames.push(x);

			var index = Math.floor(Math.random() * typeNames.length) + 0;
			return typeNames[index];
		},
		"applyBehavior": function(options)
		{
			if( !!!this.syncData.rcdm )
			{
				///////////////////////
				// SERVER-SIDE SETUP //
				///////////////////////

				var vehicleTypeName = (!!options.custom && !!options.custom.vehicleTypeName) ? options.custom.vehicleTypeName : "rcdmChopper";
				var vehicleType = jumpStart.behaviors.rcdm.getVehicleType(vehicleTypeName);

				// vehicleClawOffset
				var vehicleClawOffset = vehicleType.clawOffset;

				// merg custom claw
				var claw = {
					"wireModel": (!!options.custom && !!options.custom.claw && !!options.custom.claw.wireModel) ? options.custom.claw.wireModel : "models/wire",
					"bodyModel": (!!options.custom && !!options.custom.claw && !!options.custom.claw.bodyModel) ? options.custom.claw.bodyModel : "models/claw",
					"offset": vehicleClawOffset,
					//"offset": (!!options.custom && !!options.custom.claw && !!options.custom.claw.offset) ? options.custom.claw.offset : new THREE.Vector3(0, -7.0, 0),
					"maxLength": (!!options.custom && !!options.custom.claw && !!options.custom.claw.maxLength) ? options.custom.claw.maxLength : 60.0
				};

				// merg custom parts
				var parts = (!!options.custom && !!options.custom.parts ) ? options.custom.parts : {};
				parts = jumpStart.behaviors.rcdm.mergParts(parts, vehicleType.parts);

				var custom = {
					"vehicleTypeName": vehicleTypeName,
					"parts": parts,
					"claw": claw
				};
/*
				var vehicleType = jumpStart.behaviors.rcdm.getVehicleType(custom.vehicleTypeName);
				var x, part;
				for( x in vehicleType.parts )
				{
					part = vehicleType.parts[x];
					custom.parts[x] = {
						"modelFile": (!!options.parts && !!options.parts[x] && !!options.parts[x].modelFile) ? options.parts[x].modelFile : part.modelFile
					};
				}
				*/

				this.syncData.rcdm = {
					"operatorID": jumpStart.localUser.userID,
					"operatorName": jumpStart.localUser.displayName,
					"health": (!!options.health) ? options.health : 100,
					"lerpSpeed": 20.0,	// gets overrided by vehicles
					"clawState": (!!options.clawState) ? options.clawState : "none",
					"clawGripped": "",
					"custom": custom
				};


				this.addEventListener("spawn", jumpStart.behaviors.rcdm.spawnBehavior);
				this.addEventListener("remove", jumpStart.behaviors.rcdm.removeBehavior);
				this.addEventListener("tick", jumpStart.behaviors.rcdm.tickBehavior);
				this.applyBehavior("autoSync");
				
				if( !!jumpStart.behaviors.rcdm.vehicleTypes[this.syncData.rcdm.custom.vehicleTypeName] )
					this.applyBehavior(this.syncData.rcdm.custom.vehicleTypeName);

				this.applyBehavior("lerpSync", {"speed": this.syncData.rcdm.lerpSpeed});	// now that avgSpeed has been overridden
			}

			this.userData.rcdm = {
				"parts": {}	// this will hold actual object3d refs that vehicle classes create
			};

			///////////////////////
			// CLIENT-SIDE SETUP //
			///////////////////////

			// lock controls
			if( this.ownerID === jumpStart.localUser.userID && jumpStart.gamepad )
			{
				var preventAxis = [];
				var numAxes = jumpStart.gamepad.axes.length;
				for( var i= 0; i < numAxes; i++ )
					preventAxis.push(true);

				var preventButtons = [];
				var numButtons = jumpStart.gamepad.buttons.length;
				for( var i= 0; i < numButtons; i++ )
					preventButtons.push(true);

				if( jumpStart.isAltspace && typeof jumpStart.gamepad.preventDefault === "function" )
					jumpStart.gamepad.preventDefault(preventAxis, preventButtons);
			}

			// FIXME: why isn't this calling itself anymore???
			//this.behaviors.rcdm.spawn.call(this);

			return true;
		},
		"addVehicleType": function(vehicleType)
		{
			if( !!!jumpStart.behaviors.rcdm.vehicleTypes[vehicleType.id] )
			{
				jumpStart.behaviors.rcdm.vehicleTypes[vehicleType.id] = vehicleType;
				console.log("Added vehicle type " + vehicleType.name);
			}
		},
		"applyFrontGunLogic": function()
		{
			// FRONTGUN LOGIC
			function frontGunListener()
			{
				var vehicle = this.userData.vehicle;
				var vehicleType = jumpStart.behaviors.rcdm.getVehicleType("rcdmChopper5");

				if( this.userData.currentCooldown > 0 )
					this.userData.currentCooldown -= jumpStart.deltaTime;

				if( this.userData.currentCooldown <= 0 )
				{
					// charging is now complete
					this.userData.currentCooldown = 0;
				}

				if( this.userData.currentShotsFired !== vehicle.syncData.rcdm.custom.parts[this.userData.partName].shotsFired )
				{
					this.userData.currentShotsFired = vehicle.syncData.rcdm.custom.parts[this.userData.partName].shotsFired;
					
					if( !!this.userData.asyncModel.visualObject )
					{
						this.userData.asyncModel.visualObject.position.z = -6.0;

						// MAKE THE MUZZLE FLASH
						var flash = this.userData.asyncModel.visualObject.userData.flash;
						if( !!!flash )
						{
							var geometry = new THREE.SphereGeometry( 1.2, 5, 8, 0);
							var material = new THREE.MeshBasicMaterial( {color: 0xff0000, transparent: true, opacity: 0.5} );
							var flashObject = new THREE.Mesh( geometry, material );
							flash = jumpStart.spawnInstance(null, {"object": flashObject, "parent": this.userData.asyncModel.visualObject});
							flash.scale.z = 1.8;
							flash.position.z = 16.0;
							flash.userData.scaleDirection = 0;
							flash.userData.originalScale = 0.0001;
							flash.addEventListener("tick", function()
							{
								if( this.userData.scaleDirection === 0 )
									return;

								var delta = 3.0 * this.userData.scaleDirection * jumpStart.deltaTime;
								delta = new THREE.Vector3(delta, delta, delta);

								this.scale.add(delta);
								if( this.userData.scaleDirection === 1.0 )
								{
									if( this.scale.x <= 1.5 )
									{
										this.userData.scaleDirection = -1.0;
										this.scale.set(1.5, 1.5, 2.0 * 1.5);
									}
								}
								else
								{
									if( this.scale.x <= this.userData.originalScale )
									{
										this.userData.scaleDirection = 0;
										this.scale.set(this.userData.originalScale, this.userData.originalScale, 2.0 * this.userData.originalScale);
									}
								}
							});

							this.userData.asyncModel.visualObject.userData.flash = flash;
						}

						flash.userData.scaleDirection = 1.0;
					}

					// FIRE BULLET
					var bullet = jumpStart.spawnInstance(null);
					bullet.position.copy(jumpStart.world.worldToLocal(this.getWorldPosition()));
					bullet.quaternion.copy(this.getWorldQuaternion());
					bullet.translateZ(6.0);
					bullet.userData.speed = 120.0;
					bullet.userData.goodTime = 2.0;
					bullet.userData.deathRotate = new THREE.Vector3(Math.random() * 2.0 * Math.PI * (Math.random() > 0.5) ? 1.0 : -1.0, Math.random() * 2.0 * Math.PI * (Math.random() > 0.5) ? 1.0 : -1.0, Math.random() * 2.0 * Math.PI * (Math.random() > 0.5) ? 1.0 : -1.0);

					bullet.applyBehavior("asyncModel", {"modelFile": "models/player_laser", "callback": function(visualObject)
						{
							visualObject.applyBehavior("dropShadow", {"useParent": true});
						}});					
					bullet.addEventListener("tick", function()
					{
						// destroy us if we go out of bounds
						if( !jumpStart.isWorldPosInsideOfEnclosure(this.position) )	// && this.ownerID === jumpStart.localUser.userID )
						{
							jumpStart.removeInstance(this);
							return;
						}
			
						this.translateZ(this.userData.speed * jumpStart.deltaTime);

						if( this.userData.goodTime > 0 )
						{
							this.userData.goodTime -= jumpStart.deltaTime;

							if( this.userData.goodTime <= 0 )
							{
								// good time has ended!!
								this.userData.goodTime = 0;
								this.applyBehavior("shrinkRemove", {"localMode": true});
							}
						}
						else
						{
							if( this.userData.speed > 0.2 )
							{
								this.userData.speed -= 0.5 * jumpStart.deltaTime;
								if( this.userData.speed < 0.2 )
									this.userData.speed = 0.2;
							}

							this.rotateX(this.userData.deathRotate.x * jumpStart.deltaTime);
							this.rotateY(this.userData.deathRotate.y * jumpStart.deltaTime);
							this.rotateZ(6.0 * this.userData.deathRotate.z * jumpStart.deltaTime);
						}
					});
				}

				if( !!this.userData.asyncModel.visualObject && this.userData.asyncModel.visualObject.position.z < 0 )
				{
					this.userData.asyncModel.visualObject.position.z += 4.0 * jumpStart.deltaTime;
					if( this.userData.asyncModel.visualObject.position.z >= 0 )
					{
						// recoil complete
						this.userData.asyncModel.visualObject.position.z = 0;
					}
				}
			}

			function frontGunFire()
			{
				// return true if we can fire (and update a value on the ship for us to sync), false if we cannot (and leave synced data unchanged)
				// we only get called from the local user

				// "this" is frontGunX
				if( this.userData.currentCooldown === 0 )
				{
					var vehicle = this.userData.vehicle;

					// reset the local cooldown
					this.userData.currentCooldown = vehicle.syncData.rcdm.custom.parts[this.userData.partName].cooldown;

					// also adjust the reset of any siblings
					var x, part;
					for( x in vehicle.userData.rcdm.parts )
					{
						part = vehicle.userData.rcdm.parts[x];
						if( x.indexOf("frontGun") === 0 && part !== this )
							part.userData.currentCooldown += 0.2;
					}

					// update our shots fired
					vehicle.syncData.rcdm.custom.parts[this.userData.partName].shotsFired++;
					return true;
				}
				else
					return false;
			}

			// TODO: this type of gun should be a behavior, so that its userdata can be better organized.
			//this.userData.rcdm.parts.frontGun0.userData.currentCooldown = vehicleType.custom.parts.frontGun0.cooldown;
			function spawnGun()
			{
				var vehicle = this.userData.vehicle;

				this.userData.currentShotsFired = 0;
				this.userData.currentCooldown = vehicle.syncData.rcdm.custom.parts[this.userData.partName].cooldown;
				this.userData.fire = frontGunFire;
				this.addEventListener("tick", frontGunListener);
			}

			var x;
			for( x in this.userData.rcdm.parts )
			{
				if( x.indexOf("frontGun") === 0 )
					spawnGun.call(this.userData.rcdm.parts[x]);
			}
		},
		"getVehicleType": function(vehicleTypeName)
		{
			return jumpStart.behaviors.rcdm.vehicleTypes[vehicleTypeName];
		},
		"retractClaw": function(vehicle)
		{
			// does the claw need to be created?
			if( !!!vehicle.userData.rcdm.claw )
				jumpStart.behaviors.rcdm.createClaw(vehicle);

			vehicle.addEventListener("tick", jumpStart.behaviors.rcdm.wireRetracting);
		},
		"extendClaw": function(vehicle)
		{
			// create the claw if needed
			if( !!!vehicle.userData.rcdm.claw )
				jumpStart.behaviors.rcdm.createClaw(vehicle);

			vehicle.userData.rcdm.wireLength = vehicle.userData.rcdm.minWireLength;
			vehicle.addEventListener("tick", jumpStart.behaviors.rcdm.wireExtending);
		},
		"wireExtending": function()
		{
			this.userData.rcdm.wireLength += 50.0 * jumpStart.deltaTime;

			if( this.userData.rcdm.wireLength >= this.syncData.rcdm.custom.claw.maxLength )
			{
				this.userData.rcdm.wireLength = this.syncData.rcdm.custom.claw.maxLength;
				this.removeEventListener("tick", jumpStart.behaviors.rcdm.wireExtending);

				if( this.ownerID === jumpStart.localUser.userID )
				{
					this.syncData.rcdm.clawState = "extended";
					this.sync({"syncData": true});

					this.userData.rcdm.clawDelay = 1.0;
				}
			}
		},
		"wireRetracting": function()
		{
			this.userData.rcdm.wireLength -= 50.0 * jumpStart.deltaTime;

			if( this.userData.rcdm.wireLength <= this.userData.rcdm.minWireLength )
			{
				this.userData.rcdm.wireLength = this.userData.rcdm.minWireLength;
				this.removeEventListener("tick", jumpStart.behaviors.rcdm.wireRetracting);

				if( this.ownerID === jumpStart.localUser.userID )
				{
					this.syncData.rcdm.clawState = "retracted";
					this.sync({"syncData": true});

					this.userData.rcdm.clawDelay = Infinity;	// delay until sync handled
				}
			}
		},
		"graspClaw": function(vehicle)
		{
			var target = jumpStart.behaviors.graspable.objects[vehicle.syncData.rcdm.clawGripped];
			if( vehicle.ownerID === jumpStart.localUser.userID )
			{
				target.ownerID = jumpStart.localUser.userID;
				if( target.behaviors.hasOwnProperty("physics") && target.behaviors.physics )
					target.unapplyBehavior("physics");

				target.sync();
			}
		},
		"ungraspClaw": function(vehicle, oldGripped)
		{
			var victim = jumpStart.behaviors.graspable.objects[oldGripped];
			if( vehicle.ownerID === jumpStart.localUser.userID )
			{
				victim.ownerID = jumpStart.localUser.userID;
				victim.applyBehavior("physics", {"physicsScale": 0.8});
				victim.sync();
			}
		},
		"createClaw": function(vehicle)
		{
			var wire = jumpStart.spawnInstance(null);
			wire.position.copy(vehicle.position);
			wire.quaternion.copy(vehicle.quaternion);
			wire.translateX(vehicle.syncData.rcdm.custom.claw.offset.x);
			wire.translateY(vehicle.syncData.rcdm.custom.claw.offset.y);
			wire.translateZ(vehicle.syncData.rcdm.custom.claw.offset.z);
			wire.applyBehavior("asyncModel", {"modelFile": vehicle.syncData.rcdm.custom.claw.wireModel});
			wire.userData.vehicle = vehicle;
			vehicle.userData.rcdm.wire = wire;
			vehicle.userData.rcdm.wireLength = vehicle.syncData.rcdm.custom.claw.maxLength;
			vehicle.addEventListener("remove", jumpStart.generateRemoveWatcher(wire));

			wire.addEventListener("remove", function()
			{
				this.userData.vehicle.userData.rcdm.wire = null;
			});

			wire.addEventListener("tick", function()
			{
				var vehicle = this.userData.vehicle;
				this.position.copy(vehicle.position);
				this.quaternion.copy(vehicle.quaternion);
				this.translateX(vehicle.syncData.rcdm.custom.claw.offset.x);
				this.translateY(vehicle.syncData.rcdm.custom.claw.offset.y);
				this.translateZ(vehicle.syncData.rcdm.custom.claw.offset.z);

				var wireLength = vehicle.userData.rcdm.wireLength;
				var claw = vehicle.userData.rcdm.claw;
				var wire = vehicle.userData.rcdm.wire;
				var gripped = (vehicle.syncData.rcdm.clawGripped !== "") ? jumpStart.behaviors.graspable.objects[vehicle.syncData.rcdm.clawGripped] : null;

				var wireEnd = (!!gripped) ? gripped : claw;
				if( !!!wireEnd )
					return;

				this.lookAt(wireEnd.position);
				
				var offset = vehicle.position.clone().sub(wireEnd.position);
				var oldPos = wireEnd.position.clone();
				var oldDist = oldPos.distanceTo(this.position);

				wireEnd.position.x += offset.x * 0.03;
				wireEnd.position.z += offset.z * 0.03;

				var zScale = wireLength * 2.0;
				this.scale.z = zScale;

				this.lookAt(wireEnd.position);
				wireEnd.position.copy(this.position);
				wireEnd.quaternion.copy(this.quaternion);
				wireEnd.translateZ(zScale / 2.0);

				if( wireEnd.position.y > this.position.y )
					wireEnd.position.y = this.position.y;

				var wireEndRadius = (!!wireEnd.boundingSphere) ? wireEnd.boundingSphere.radius * 0.5 : 10.0;
				if( wireEnd.position.y < wireEndRadius )
					wireEnd.position.y = wireEndRadius;

				wireEnd.position.y -= 1.0 * jumpStart.deltaTime;

				if( wireEnd.position.y < wireEndRadius )
					wireEnd.position.y = wireEndRadius;

				if( wireEnd.position.distanceTo(this.position) > oldDist && wireEnd.position.y === wireEndRadius )
				{
					wireEnd.position.copy(oldPos);
					this.lookAt(wireEnd.position);
					zScale = this.position.distanceTo(wireEnd.position) * 2.0;
					this.scale.z = zScale;
					wireEnd.quaternion.copy(this.quaternion);
				}

				if( wireEnd !== claw )
				{
					// claw is holding a wireEnd
					claw.position.copy(wireEnd.position);
					claw.quaternion.copy(wireEnd.quaternion);

					var wireEndRadius = (!!wireEnd.boundingSphere) ? wireEnd.boundingSphere.radius : 10.0;
					var clawRadius = (!!claw.boundingSphere) ? claw.boundingSphere.radius : 10.0;
					claw.translateZ(-wireEndRadius + clawRadius / 2.0);
				}

				claw.quaternion.copy(vehicle.userData.rcdm.wire.quaternion);
				claw.rotateX(-Math.PI / 2.0);
			});

			var claw = jumpStart.spawnInstance(null);
			claw.position.copy(wire.position);
			claw.quaternion.copy(wire.quaternion);
			claw.position.y -= vehicle.syncData.rcdm.custom.claw.maxLength;
			claw.applyBehavior("asyncModel", {
				"useBubbleIn": false,
				"modelFile": vehicle.syncData.rcdm.custom.claw.bodyModel,
				"callback": function()
				{
					this.applyBehavior("dropShadow");
				}.bind(claw)
			});
			claw.userData.vehicle = vehicle;
			claw.addEventListener("tick", function()
			{
				var vehicle = this.userData.vehicle;
				var clawState = vehicle.syncData.rcdm.clawState;
				if( clawState === "none" || clawState == "retracted" )
					return;

				if( vehicle.userData.rcdm.clawDelay === 0 && vehicle.ownerID === jumpStart.localUser.userID && vehicle.syncData.rcdm.clawGripped === "" )
				{
					var count = 0;
					var x;
					for( x in jumpStart.behaviors.graspable.objects )
						count++;

					// check if a pumpkin is within range
					var nearestDist;
					var nearestGraspable;
					var x, realGraspable, dist;
					for( x in jumpStart.behaviors.graspable.objects )
					{
						realGraspable = jumpStart.behaviors.graspable.objects[x];
						dist = realGraspable.position.distanceTo(this.position);
						if( !!!nearestDist || dist < nearestDist )
						{
							nearestDist = dist;
							nearestGraspable = realGraspable;
						}
					}

					var clawRadius = (!!this.boundingSphere) ? this.boundingSphere.radius * 0.5 : 10.0;
					var graspableRadius = (!!nearestGraspable.boundingSphere) ? nearestGraspable.boundingSphere.radius : 10.0;
					if( !!nearestGraspable && nearestDist - graspableRadius < clawRadius )
					{
						vehicle.syncData.rcdm.clawGripped = nearestGraspable.syncData.graspable.id;
						vehicle.sync({"vitalData": true});
					}
				}
			});

			vehicle.userData.rcdm.claw = claw;
			vehicle.addEventListener("remove", jumpStart.generateRemoveWatcher(claw));

			claw.addEventListener("remove", function()
			{
				this.userData.vehicle.userData.rcdm.claw = null;
			});
		},
		"createShadow": function(target)
		{
			// shadow
			var geometry = new THREE.SphereGeometry( this.boundingSphere.radius, 5, 8, 0, Math.PI);
			var material = new THREE.MeshBasicMaterial( {color: 0x000000, transparent: true, opacity: 0.5} );
			var shadowObject = new THREE.Mesh( geometry, material );
			var shadow = jumpStart.spawnInstance(null, {"object": shadowObject});
			shadow.scale.z = 0.1;
			shadow.rotateX(-Math.PI / 2.0);
			shadow.userData.target = this;
			shadow.addEventListener("tick", function()
			{
				this.position.copy(this.userData.target.position);
				this.position.y = 0.0;
			});

			this.addEventListener("remove", jumpStart.generateRemoveWatcher(shadow));
		},
		"removeBehavior": function()
		{
			// if the ship is removed, drop anything that its holding.
			if( this.syncData.rcdm.clawGripped !== "" )
			{
				jumpStart.behaviors.rcdm.ungraspClaw(this, this.syncData.rcdm.clawGripped);
				this.userData.rcdm.clawDelay = 1.0;
			}

			if( this.ownerID === jumpStart.localUser.userID )
			{
				if( !!jumpStart.gamepad && typeof jumpStart.gamepad.preventDefault === "function" )
				{
					var preventAxis = [];
					var numAxes = jumpStart.gamepad.axes.length;
					for( var i= 0; i < numAxes; i++ )
						preventAxis.push(false);

					var preventButtons = [];
					var numButtons = jumpStart.gamepad.buttons.length;
					for( var i= 0; i < numButtons; i++ )
						preventButtons.push(false);

					jumpStart.gamepad.preventDefault(preventAxis, preventButtons);
				}
			}
		},
		"spawnBehavior": function(isInitialSync)
		{
			this.userData.rcdm = {
				"oldClawState": "none",
				"oldClawGripped": "",
				"clawDelay": 1.0,
				"claw": null,
				"wire": null,
				"gripped": null,
				"minWireLength": 15.0,
				"wireLength": 15.0,
				"parts": {},
				"collision": function(victim, minDist)
				{
					// position the vehicle minDist from the victim
					var offset = this.position.clone().sub(victim.position).normalize().multiplyScalar(minDist);
					this.position.copy(offset);
				}
			};

			var params = {
				size: 10.0,
				height: 1,
				font: jumpStart.font,//"helvetiker",
				curveSegments: (!!jumpStart.isGearVR) ? 1 : 2
			};

			var geometry = new THREE.TextGeometry(this.syncData.rcdm.operatorName, params);
			//var geometry = new THREE.TextGeometry("SM Sith Lord", params);
			var material = new THREE.MeshBasicMaterial({color:'white'});
			var mesh = new THREE.Mesh(geometry, material);
			geometry.computeBoundingBox();

			var displacement = new THREE.Vector3().copy(geometry.boundingBox.max).sub(geometry.boundingBox.min);

			var text = jumpStart.spawnInstance(null);
			text.position.copy(this.position);
			text.quaternion.copy(this.quaternion);
			text.position.y += 35.0;

			this.addEventListener("remove", jumpStart.generateRemoveWatcher(text));

			// auto-position above this vehicle
			text.userData.target = this;
			text.addEventListener("tick", function()
			{
				this.position.copy(this.userData.target.position);
				this.position.y += 35.0;

				var lookPos;
				if( jumpStart.isAltspace )
					lookPos = jumpStart.localUser.skeleton.getJoint("Eye").position.clone();
				else
					lookPos = jumpStart.camera.position.clone();

				this.lookAt(jumpStart.world.worldToLocal(lookPos));
			});

			// 3d mesh
			var textMesh = jumpStart.spawnInstance(null, {"object": mesh, "parent": text})
			var offset = new THREE.Vector3().copy(displacement);
			offset.multiply(textMesh.scale);
			textMesh.position.set(-offset.x / 2.0, -offset.y / 2.0, -offset.z / 2.0);
		},
		"clawRetracted": function(vehicle)
		{
			// collect what is gripped, or destroy the claw
			if( vehicle.ownerID === jumpStart.localUser.userID )
			{
				vehicle.syncData.rcdm.clawState = "none";
				vehicle.sync();
			}
		},
		"tickBehavior": function()
		{
			// destroy us if we go out of bounds
			if( !jumpStart.isWorldPosInsideOfEnclosure(this.position) )	// && this.ownerID === jumpStart.localUser.userID )
			{
				jumpStart.removeInstance(this);
				return;
			}

			// recharge the claw
			if( this.userData.rcdm.clawDelay !== 0 )
				this.userData.rcdm.clawDelay -= jumpStart.deltaTime;

			if( this.userData.rcdm.clawDelay <= 0 )
			{
				// claw fully charged
				this.userData.rcdm.clawDelay = 0;
			}

			// perform claw state actions
			if( this.syncData.rcdm.clawState !== this.userData.rcdm.oldClawState )
			{
				this.userData.rcdm.oldClawState = this.syncData.rcdm.clawState;

				if( this.syncData.rcdm.clawState !== "none" && !!!this.userData.rcdm.claw )
					jumpStart.behaviors.rcdm.createClaw(this);

				if( this.syncData.rcdm.clawState === "extending" )
					jumpStart.behaviors.rcdm.extendClaw(this);
				else if( this.syncData.rcdm.clawState === "retracting" )
					jumpStart.behaviors.rcdm.retractClaw(this);
				else if( this.syncData.rcdm.clawState === "retracted" )
					jumpStart.behaviors.rcdm.clawRetracted(this);
				else if( this.syncData.rcdm.clawState === "none" )
				{
					if( this.userData.rcdm.claw )
					{
						this.userData.rcdm.wire.applyBehavior("shrinkRemove", {"speed": 2.0});
						this.userData.rcdm.claw.applyBehavior("shrinkRemove", {"speed": 2.0});
						this.userData.rcdm.clawDelay = 2.0;
					}
				}
			}

			// perform claw gripped actions
			if( this.syncData.rcdm.clawGripped !== this.userData.rcdm.oldClawGripped )
			{
				if( this.userData.rcdm.oldClawGripped !== "" && this.syncData.rcdm.clawGripped !== "" )
					console.log("Warning: There was already an old claw gripped object.");

				var oldGripped = this.userData.rcdm.oldClawGripped;
				this.userData.rcdm.oldClawGripped = this.syncData.rcdm.clawGripped;

				if( this.syncData.rcdm.clawGripped !== "" && (this.ownerID !== jumpStart.localUser.usrID || this.userData.rcdm.clawDelay === 0))
					jumpStart.behaviors.rcdm.graspClaw(this);
				else
				{
					jumpStart.behaviors.rcdm.ungraspClaw(this, oldGripped);
					this.userData.rcdm.clawDelay = 1.0;
				}
			}
		},
		"mergParts": function(userParts, defaultParts)
		{
			var parts = {};

			// copy default part settings from the vehicleType
			var x, defaultPart, part, y;
			for( x in defaultParts )
			{
				part = {};
				defaultPart = defaultParts[x];

				for( y in defaultPart )
				{
					if( typeof defaultPart[y].clone === "function" )
						part[y] = defaultPart[y].clone();
					else
						part[y] = defaultPart[y];
				}

				parts[x] = part;
			}

			// merg in part customizations
			var userPart;
			for( x in userParts )
			{
				if( !!!parts[x] )
					continue;

				part = parts[x];
				userPart = userParts[x];

				for( y in defaultParts[x] )
				{
					if( !!!userPart[y] )	// FIXME: might be an issue of the value is an int that can be zero!!
						continue;

					if( typeof defaultParts[x][y].copy === "function" )
						part[y].copy(userPart[y]);
					else
						part[y] = userPart[y];
				}
			}

			return parts;
		}
	}
});