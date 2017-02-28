jumpStartBehavior({
	"rcdmStartButton":
	{
		"applyBehavior": function(options)
		{
			if( !!!this.syncData.rcdmStartButton )
			{
				this.syncData.rcdmStartButton = {
					"playerId": "",//jumpStart.localUser.userID,
					"playerName": "OPEN",//jumpStart.localUser.displayName,
					"isActive": false,
					"custom": {
						"vehicleTypeName": (!!options.custom && !!options.custom.vehicleTypeName) ? options.custom.vehicleTypeName : "rcdmChopper",
						"parts": (!!options.custom && !!options.custom.parts) ? options.custom.parts : {},
						"claw": (!!options.custom && !!options.custom.claw) ? options.custom.claw : {}
					}
				};

				this.addEventListener("spawn", jumpStart.behaviors.rcdmStartButton.spawnBehavior);
			}

			this.userData.rcdmStartButton = {
				"menu": null
			};

			return true;
		},
		"spawnBehavior": function(isInitialSync)
		{
			//if( !!!this.userData.rcdmStartButton )
			//	this.userData.rcdmStartButton = {};

			var buttonFrame = jumpStart.spawnInstance("models/buttonFrame", {"parent": this});
			buttonFrame.applyBehavior("bubbleIn", {"maxScale": 0.6});

			// the actual button
			var button = jumpStart.spawnInstance("models/button", {"parent": buttonFrame});
			button.userData.doubleClickTimer = 0.0;
			button.blocksLOS = true;
			jumpStart.makeCollide(button);
			/*
			button.addEventListener("cursorenter", function()
			{
				var parentObject = this.parent.parent;
				console.log("it is: " + parentObject.syncData.rcdmStartButton.playerId);
				
				//if( parentObject.ownerID !== jumpStart.localUser.userID || parentObject.syncData.isActive )
				if( parentObject.syncData.rcdmStartButton.playerId !== "" && parentObject.syncData.rcdmStartButton.playerId !== jumpStart.localUser.userID )
					this.setColor(new THREE.Color("rgb(50%, 50%, 50%)"));
				else
					this.setColor(new THREE.Color("#5599ff"));
			});

			button.addEventListener("cursorexit", function()
			{
				this.setColor(new THREE.Color("rgb(100%, 100%, 100%)"));
				//jumpStart.behaviors.rcdm.showVehicleSelection(this.parent.parent.syncData.rcdmStartButton.vehicleTypes);
			});

			button.addEventListener("cursordown", function()
			{
				var parentObject = this.parent.parent;
				//if( parentObject.ownerID !== jumpStart.localUser.userID )
				if( parentObject.syncData.rcdmStartButton.playerId !== "" && parentObject.syncData.rcdmStartButton.playerId !== jumpStart.localUser.userID )
					return;

				// dbl click behavior
				if( this.userData.doubleClickTimer === 0 )
				{
					this.userData.doubleClickTimer = 0.3;

					this.addEventListener("tick", function()
					{
						if( this.userData.doubleClickTimer === 0 )
						{
							this.removeEventListener("tick", arguments.callee);
							return;
						}

						this.userData.doubleClickTimer -= jumpStart.deltaTime;
						if( this.userData.doubleClickTimer <= 0 )
						{
							this.userData.doubleClickTimer = 0;

							var doubleClickRequiredObject = jumpStart.scene.getObjectByName("doubleClickRequired");

							if( !!!doubleClickRequiredObject )
							{
								var parentObject = this.parent.parent;
								var imageFile = "assets/RCDM/misc/doubleclickrequired.png";
								var x, imageMaterial, imageGeometry, imagePlane;
								var imageMaterial = new THREE.MeshBasicMaterial({map: THREE.ImageUtils.loadTexture(imageFile), transparent: true, opacity: 1.0});
								var imageGeometry = new THREE.PlaneGeometry(100, 32, 1 , 1);
								var imagePlane = new THREE.Mesh(imageGeometry, imageMaterial);
								var imageObject = jumpStart.spawnInstance(null, {"object": imagePlane});
								imageObject.name = "doubleClickRequired";
								imageObject.position.copy(parentObject.position);
								imageObject.position.y += 50.0;
								imageObject.userData.lifeLeft = 2.0;
								imageObject.userData.parentObject = parentObject;
								imageObject.applyBehavior("bubbleIn", {"speed": 6.0});

								function getEyePos()
								{
									var pos;
									if( jumpStart.isAltspace )
										pos = jumpStart.localUser.skeleton.getJoint("Eye").getWorldPosition();
									else
										pos = jumpStart.camera.position.clone();
									
									jumpStart.world.worldToLocal(pos);
									return pos;
									//victim.lookAt(pos);
								}
								imageObject.lookAt(getEyePos());
								imageObject.translateZ(1.0);

								imageObject.addEventListener("tick", function()
								{
									var parentObject = this.userData.parentObject;
									this.position.copy(parentObject.position);
									this.position.y += 50.0;

									if( this.userData.lifeLeft > 0 )
									{
										this.userData.lifeLeft -= jumpStart.deltaTime;

										if( this.userData.lifeLeft <= 0 )
										{
											this.applyBehavior("shrinkRemove");
											//this.removeEventListener("tick", arguments.callee);
										}
									}

									var oldQuaternion = this.quaternion.clone();
									this.lookAt(getEyePos());
									var targetQuaternion = this.quaternion.clone();
									this.quaternion.copy(oldQuaternion);
									this.quaternion.slerp(targetQuaternion, 0.05);
									this.translateZ(1.0);
								});
							}

							this.removeEventListener("tick", arguments.callee);
							return;
						}
					});
					return;
				}

				this.userData.doubleClickTimer = 0;

				var doubleClickRequiredObject = jumpStart.scene.getObjectByName("doubleClickRequired");
				if( !!doubleClickRequiredObject )
				{
					if( !!!doubleClickRequiredObject.behaviors.shrinkRemove )
					{
						doubleClickRequiredObject.applyBehavior("shrinkRemove");
						doubleClickRequiredObject.userData.lifeLeft = 0;
					}
				}

				var gamepadRequiredObject = jumpStart.scene.getObjectByName("gamepadRequired");
				if( !!!jumpStart.gamepad )
				{
					if( !!!gamepadRequiredObject )
					{
						var imageFile = "assets/RCDM/misc/gamepadrequired.png";
						var x, imageMaterial, imageGeometry, imagePlane;
						var imageMaterial = new THREE.MeshBasicMaterial({map: THREE.ImageUtils.loadTexture(imageFile), transparent: true, opacity: 1.0});
						var imageGeometry = new THREE.PlaneGeometry(100, 32, 1 , 1);
						var imagePlane = new THREE.Mesh(imageGeometry, imageMaterial);
						var imageObject = jumpStart.spawnInstance(null, {"object": imagePlane});
						imageObject.name = "gamepadRequired";
						imageObject.position.copy(parentObject.position);
						imageObject.position.y += 50.0;
						imageObject.userData.lifeLeft = 3.0;
						imageObject.userData.parentObject = parentObject;
						imageObject.applyBehavior("bubbleIn", {"speed": 4.0});

						function getEyePos()
						{
							var pos;
							if( jumpStart.isAltspace )
								pos = jumpStart.localUser.skeleton.getJoint("Eye").getWorldPosition();
							else
								pos = jumpStart.camera.position.clone();
							
							jumpStart.world.worldToLocal(pos);
							return pos;
							//victim.lookAt(pos);
						}
						imageObject.lookAt(getEyePos());
						imageObject.translateZ(2.0);

						imageObject.addEventListener("tick", function()
						{
							var parentObject = this.userData.parentObject;
							this.position.copy(parentObject.position);
							this.position.y += 50.0;

							if( this.userData.lifeLeft > 0 )
							{
								this.userData.lifeLeft -= jumpStart.deltaTime;

								if( this.userData.lifeLeft <= 0 )
								{
									this.applyBehavior("shrinkRemove");
									//this.removeEventListener("tick", arguments.callee);
								}
							}

							var oldQuaternion = this.quaternion.clone();
							this.lookAt(getEyePos());
							var targetQuaternion = this.quaternion.clone();
							this.quaternion.copy(oldQuaternion);
							this.quaternion.slerp(targetQuaternion, 0.05);
							this.translateZ(2.0);
						});
					}

					return;
				}
				else if( !!gamepadRequiredObject )
				{
					if( !!!gamepadRequiredObject.behaviors.shrinkRemove )
					{
						gamepadRequiredObject.applyBehavior("shrinkRemove");
						gamepadRequiredObject.userData.lifeLeft = 0;
					}
				}

				//parentObject.applyBehavior("shrinkRemove");
				////parentObject.sync({"syncData": true, "vitalData": true});
*/
				/*
				// spawn the vehicle
				var vehicle = jumpStart.spawnInstance(null);
				vehicle.applyBehavior("rcdm", {"custom": parentObject.syncData.rcdmStartButton.custom});//{"parts": parentObject.syncData.rcdmStartButton.custom.parts});
				vehicle.applyBehavior("autoRemoval");
				vehicle.addEventListener("remove", function()
				{
					if( this.ownerID === jumpStart.localUser.userID )
						createButton();
				});
				vehicle.position.copy(parentObject.position);
				vehicle.position.y += 150.0;
				vehicle.lookAt(new THREE.Vector3(0, vehicle.position.y, 0));
				vehicle.sync();
				*/
/*
				jumpStart.behaviors.rcdmStartButton.spawnMenu.call(this);
			});
*/
		},
		"spawnMenu": function(callback)
		{
			var parentObject;
			if( !!this.syncData && this.syncData.rcdmStartButton )
				parentObject = this;
			else
				parentObject = this.parent.parent;

			if( parentObject.syncData.rcdmStartButton.isActive )
				return;

			if( parentObject.userData.rcdmStartButton.menu )
			{
				parentObject.userData.rcdmStartButton.menu.applyBehavior("shrinkRemove", {"speed": 6.0});
				parentObject.userData.rcdmStartButton.menu = null;
				return;
			}

			// HELPER: spawn an icon
			function spawnIcon(menuParent, vehicleTypeName)
			{
				var lookTarget = new THREE.Vector3(0, 200.0, 800.0);

				var iconFile = "assets/RCDM/misc/thumbs/" + vehicleTypeName + "Icon.png";
				var x, icon, iconMaterial, iconGeometry, iconPlane;
				var iconMaterial = new THREE.MeshBasicMaterial({map: THREE.ImageUtils.loadTexture(iconFile), transparent: true, opacity: 0.95});
				//iconMaterial = new THREE.MeshBasicMaterial({map: THREE.ImageUtils.loadTexture(iconFile)});

				var iconGeometry = new THREE.PlaneGeometry(32, 32, 1 , 1);
				var iconPlane = new THREE.Mesh(iconGeometry, iconMaterial);
				var iconObject = jumpStart.spawnInstance(null, {"object": iconPlane, "parent": menuParent});
				iconObject.blocksLOS = true;
				jumpStart.makeCollide(iconObject);
				iconObject.userData.targetScale = new THREE.Vector3(1, 1, 1);
				iconObject.userData.menuParent = menuParent;
				iconObject.userData.vehicleTypeName = vehicleTypeName;
				iconObject.applyBehavior("bubbleIn", {"speed": 4.0});

				iconObject.addEventListener("cursorenter", function()
				{
					if( !!this.behaviors.bubbleIn )
						this.unapplyBehavior("bubbleIn");

					this.userData.targetScale.set(1.2, 1.2, 1.2);
				});

				iconObject.addEventListener("cursorexit", function()
				{
					if( !!this.behaviors.bubbleIn )
						this.unapplyBehavior("bubbleIn");

					this.userData.targetScale.set(1.0, 1.0, 1.0);
				});

				iconObject.addEventListener("tick", function()
				{
					this.scale.lerp(this.userData.targetScale, 0.1);
				});

				iconObject.addEventListener("cursordown", function()
				{
					var parentButton = this.userData.menuParent.userData.parentButton;
					if( parentButton.syncData.rcdmStartButton.isActive )
						return;

					parentButton.syncData.rcdmStartButton.isActive = true;
					parentButton.applyBehavior("shrinkRemove", {"speed": 4.0});
					parentObject.userData.rcdmStartButton.menu = null;
					this.userData.menuParent.applyBehavior("shrinkRemove", {"speed": 6.0});

					if( !!!this.userData.menuParent.userData.choosenCallback || this.userData.menuParent.userData.choosenCallback.call(parentButton.userData.parentObject, this.userData.vehicleTypeName, jumpStart.localUser.userID, jumpStart.localUser.displayName) )
					{
						// spawn the vehicle
						var vehicle = jumpStart.spawnInstance(null);
						vehicle.applyBehavior("rcdm", {"custom": {"vehicleTypeName": this.userData.vehicleTypeName}});
						vehicle.applyBehavior("autoRemoval");
						vehicle.addEventListener("remove", function()
						{
							if( this.ownerID === jumpStart.localUser.userID )
								createButton();
						});
						vehicle.position.copy(parentButton.position);
						vehicle.position.y += 150.0;
						vehicle.lookAt(new THREE.Vector3(0, vehicle.position.y, 0));
						vehicle.sync();
					}
					
					jumpStart.removeInstance(parentObject);
				});

				return iconObject;
			}

			// create the vehicle select menu
			var menu = jumpStart.spawnInstance(null);
			menu.userData.choosenCallback = callback;
			menu.userData.parentButton = parentObject;
			menu.position.copy(parentObject.position);
			menu.quaternion.copy(parentObject.quaternion);

			var pos;
			if( jumpStart.isAltspace )
				pos = jumpStart.localUser.skeleton.getJoint("Eye").getWorldPosition();
			else
				pos = jumpStart.camera.position.clone();
			
			jumpStart.world.worldToLocal(pos);
			//pos.y = menu.position.y;
			pos.y = menu.position.y + ((pos.y - menu.position.y) * 0.2);
			menu.lookAt(pos);
			menu.rotateX(-Math.PI/2.0);

			menu.addEventListener("tick", function()
			{
				var oldQuaternion = this.quaternion.clone();

				var pos;
				if( jumpStart.isAltspace )
					pos = jumpStart.localUser.skeleton.getJoint("Eye").getWorldPosition();
				else
					pos = jumpStart.camera.position.clone();

				jumpStart.world.worldToLocal(pos);
				//pos.y = this.position.y;
				pos.y = this.position.y + ((pos.y - this.position.y) * 0.2);
				this.lookAt(pos);

				var targetQuaternion = this.quaternion.clone();
				this.quaternion.copy(oldQuaternion);
				this.quaternion.slerp(targetQuaternion, 0.01);
			});

			var baseHeight = 35.0;
			var rowHeight = 40.0;
			var colWidth = 40.0;

			var maxCols = 3;
			var row = 0;
			var col = 0;

			var vehicleTypes = jumpStart.behaviors.rcdm.vehicleTypes;
			var vehicleType, iconObject;
			for( x in vehicleTypes )
			{
				//console.log(baseHeight + (row * rowHeight));
				vehicleType = vehicleTypes[x];
				iconObject = spawnIcon(menu, vehicleType.id);
				menu.rotateX(Math.PI / 2.0);

				iconObject.position.x += ((maxCols / 2.0) * -colWidth) + (colWidth / 2.0) + (col * colWidth);
				iconObject.position.y = baseHeight + (row * rowHeight);

				col++;
				if( col >= maxCols )
				{
					col = 0;
					row++;
				}
				//return;
			}

			parentObject.userData.rcdmStartButton.menu = menu;
		}
	}
});