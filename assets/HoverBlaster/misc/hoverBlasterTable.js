jumpStartBehavior({
	"hoverBlasterTable":
	{
		"focusedTableRef": null, // locally remember what table has input
		"tables": {},
		"createTable": function(position, quaternion)
		{
			var tableExists = false;
			var x;
			for( x in jumpStart.behaviors.hoverBlasterTable.tables )
			{
				tableExists = true;
				return;
			}

			// the local user who calls createTable will be the one playing
			var table = jumpStart.spawnInstance(null);
			table.position.copy(position);
			table.position.y += 90.0;

			var pos;
			if( jumpStart.isAltspace )
				pos = jumpStart.localUser.skeleton.getJoint("Eye").getWorldPosition();
			else
				pos = jumpStart.camera.getWorldPosition();

			pos.y = table.position.y;

			table.lookAt(pos);
			table.rotateX(Math.PI);
			
			table.applyBehavior("autoRemoval");
			table.applyBehavior("hoverBlasterTable");
			table.syncData.hoverBlasterTable.isActive = true;
			table.sync();

			return table;
		},
		"applyBehavior": function(options)
		{
			if( !!options )
			{
				// we MUST have a unique name
				if( this.name === "" )
					this.name = "hb" + jumpStart.generateId();

				this.syncData.hoverBlasterTable = {
					"ownerID": jumpStart.localUser.userID,
					"ownerName": jumpStart.localUser.displayName,
					"isActive": false,
					"rotSpeed": 0.3,
					"originalQuaternion": this.quaternion.clone(),
					"originalRotation": this.rotation.clone(),
					"timeline": {}
				};

				jumpStart.behaviors.hoverBlasterTable.resetTimeline.call(this, 0, "STAGE 1");
				jumpStart.behaviors.hoverBlasterTable.generateStage.call(this, 0);

				this.addEventListener("spawn", jumpStart.behaviors.hoverBlasterTable.spawnBehavior);
				this.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.tickBehavior);
				this.addEventListener("remove", jumpStart.behaviors.hoverBlasterTable.removeBehavior);
			}

			jumpStart.behaviors.hoverBlasterTable.tables[this.name] = this;
//console.log("Adding table " + this.name);
			jumpStart.precacheSound("sounds/bonus");
			jumpStart.precacheSound("sounds/coin_collect");
			jumpStart.precacheSound("sounds/damage1");
			jumpStart.precacheSound("sounds/damage2");
			jumpStart.precacheSound("sounds/damage3");
			jumpStart.precacheSound("sounds/explosion0");
			jumpStart.precacheSound("sounds/explosion1");
			jumpStart.precacheSound("sounds/laser1");
			jumpStart.precacheSound("sounds/laser2");
			jumpStart.precacheSound("sounds/shatter");
			jumpStart.precacheSound("sounds/bomberin");
			jumpStart.precacheSound("sounds/bomberready");

			this.userData.hoverBlasterTable = {
				"originalCameraPosition": null,
				"originalCameraQuaternion": null,
				"radius": 118.0,
				"initialRot": -1,
				"rocks": [],
				"guns": [],
				"rot": Math.PI - 0.3,
				"plates": [],
				"initialTimeline": this.syncData.hoverBlasterTable.timeline.info.previous,
				"spentTimeline": [],
				"totalPlates": 0,
				"lasers": {},
				"enemyLasers": {},
				"weaponExplosions": {},
				"rocks": [],
				"currentStage": this.syncData.hoverBlasterTable.timeline.info.id,
				"board": null,
				"ship": null
			};

			return true;
		},
		"tableButtonListener": function(e)
		{
			var table = jumpStart.behaviors.hoverBlasterTable.focusedTableRef;

			if( !table || !table.userData.hoverBlasterTable.ship )
				return;

			if( table.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userID )
			{
				if( jumpStart.gamepad.mapping === "steamvr" )
				{
					//var preventButtons = [];

					//if( typeof jumpStart.gamepad.preventDefault === "function" )
					//	jumpStart.gamepad.preventDefault([], preventButtons);

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

					if( table.syncData.hoverBlasterTable.isActive )
					{
						if( e.buttonCode === 0 && e.value > 0.2 && !!ship && ship.userData.fireCooldown === 0 )
						{
							//if( e.value === 1.0 )
							//	g_turbo = 2.0;
							//else
							//	g_turbo = 1.0;

							if( e.value > 0.9 )
							{
								if( !!!ship.userData.bomber && ship.userData.bombCooldown <= 0 )
								{
									var bomber = jumpStart.spawnInstance(null, {"parent": ship.parent});
									bomber.applyBehavior("asyncModel", {"modelFile": "models/bomber"});
									bomber.syncData.tableName = table.name;
									//bomber.scale.set(0.1, 0.1, 0.1);
									////bomber.scale.set(0.7, 0.7, 0.7);
									bomber.position.copy(ship.position);
									bomber.quaternion.copy(ship.quaternion);
									bomber.translateZ(-100.0);
									bomber.translateY(40.0);
									if( bomber.position.y < 160.0 )
										bomber.position.y = 160.0;

									bomber.addEventListener("spawn", jumpStart.behaviors.hoverBlasterTable.bomberSpawn);
									bomber.addEventListener("remove", jumpStart.behaviors.hoverBlasterTable.bomberRemove);
									bomber.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.bomberTick);
									bomber.sync();
								}
							}
							else
							{
								ship.userData.fireCooldown = 0.2;
								jumpStart.behaviors.hoverBlasterTable.fireLaser.call(ship);
							}
						}
					}
					else if( !!ship && ship.userData.pressStartText && ship.userData.pressStartText.scale.x === 1 )
					{
						jumpStart.removeInstance(ship.userData.pressStartText);
						ship.userData.pressStartText = null;

						//jumpStart.removeInstance(ship.userData.wand);
						//ship.userData.wand = null;

						table.syncData.hoverBlasterTable.isActive = true;
						table.sync();
					}
				}
				else
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

					if( table.syncData.hoverBlasterTable.isActive )
					{
						if( e.buttonCode === 7 && e.value > 0.2 && !!ship && ship.userData.fireCooldown === 0 )
						{
							//if( e.value === 1.0 )
							//	g_turbo = 2.0;
							//else
							//	g_turbo = 1.0;

							if( e.value > 0.9 )
							{
								if( !!!ship.userData.bomber && ship.userData.bombCooldown <= 0 )
								{
									ship.userData.bombCooldown = 8.0;
									var bomber = jumpStart.spawnInstance(null, {"parent": ship.parent});
									bomber.syncData.tableName = table.name;
									//bomber.applyBehavior("asyncModel", {"modelFile": "models/bomber"});
									//bomber.scale.set(0.1, 0.1, 0.1);
									//bomber.scale.set(0.7, 0.7, 0.7);
									bomber.position.copy(ship.position);
									bomber.quaternion.copy(ship.quaternion);
									bomber.translateZ(-100.0);
									bomber.translateY(40.0);
									if( bomber.position.y < 160.0 )
										bomber.position.y = 160.0;

									bomber.addEventListener("spawn", jumpStart.behaviors.hoverBlasterTable.bomberSpawn);
									bomber.addEventListener("remove", jumpStart.behaviors.hoverBlasterTable.bomberRemove);
									bomber.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.bomberTick);
									bomber.sync();
								}
							}
							else
							{
								ship.userData.fireCooldown = 0.2;
								jumpStart.behaviors.hoverBlasterTable.fireLaser.call(ship);
							}
						}
					}
					else if( !!ship && ship.userData.pressStartText )
					{
						jumpStart.removeInstance(ship.userData.pressStartText);
						ship.userData.pressStartText = null;

						//jumpStart.removeInstance(ship.userData.wand);
						//ship.userData.wand = null;

						table.syncData.hoverBlasterTable.isActive = true;
						table.sync();
					}
				}
			}
		},
		"gameOverNotify": function()
		{
			var ship = this.userData.hoverBlasterTable.ship;
			
			var explosion = jumpStart.spawnInstance(null, {"parent": ship});
			explosion.applyBehavior("asyncModel", {"modelFile": "models/explosion", "useBubbleIn": false});
			explosion.scale.set(0.3, 0.3, 0.3);
			explosion.scale.multiplyScalar(1 / ship.scale.x);

			explosion = jumpStart.spawnInstance(null, {"parent": ship});
			explosion.applyBehavior("asyncModel", {"modelFile": "models/explosion", "useBubbleIn": false});
			explosion.scale.set(0.2, 0.2, 0.2);
			explosion.translateX(8.0);
			explosion.translateZ(8.0);
			explosion.translateY(4.0);
			explosion.scale.multiplyScalar(1 / ship.scale.x);

			var params = {
				size: 10.0,
				height: 1,
				font: jumpStart.font,// "helvetiker",
				curveSegments: (jumpStart.isGearVR) ? 1 : 2
			};

			var geometry = new THREE.TextGeometry("GAME OVER", params);
			var material = new THREE.MeshBasicMaterial({color:'red'});
			var mesh = new THREE.Mesh(geometry, material);

			geometry.computeBoundingBox();
			var displacement = new THREE.Vector3().copy(geometry.boundingBox.max).sub(geometry.boundingBox.min);

			var text = jumpStart.spawnInstance(null);
			text.userData.table = this;

			text.position.copy(ship.position);
			text.quaternion.copy(this.syncData.hoverBlasterTable.originalQuaternion);
			text.rotateX(Math.PI);
			text.position.y += 10.0;

			var textMesh = jumpStart.spawnInstance(null, {"object": mesh, "parent": text})
			var offset = new THREE.Vector3().copy(displacement);
			offset.multiply(textMesh.scale);
			textMesh.position.set(-offset.x / 2.0, -offset.y / 2.0, -offset.z / 2.0);

			text.userData.life = 2.5;
			text.addEventListener("tick", function()
			{
				this.userData.life -= jumpStart.deltaTime;

				if( this.userData.life <= 0 )
				{
					//jumpStart.removeInstance(this);
					this.removeEventListener("tick", arguments.callee);
					this.applyBehavior("shrinkRemove");

					var params = {
						size: 10.0,
						height: 1,
						font: jumpStart.font,// "helvetiker",
						curveSegments: (jumpStart.isGearVR) ? 1 : 2
					};

					var geometry = new THREE.TextGeometry("SCORE: " + this.userData.table.userData.hoverBlasterTable.ship.syncData.coins, params);
					var material = new THREE.MeshBasicMaterial({color:'yellow'});
					var mesh = new THREE.Mesh(geometry, material);

					geometry.computeBoundingBox();
					var displacement = new THREE.Vector3().copy(geometry.boundingBox.max).sub(geometry.boundingBox.min);

					var text = jumpStart.spawnInstance(null)
					text.userData.table = this.userData.table;
					text.position.copy(ship.position);
					text.quaternion.copy(this.userData.table.syncData.hoverBlasterTable.originalQuaternion);
					text.rotateX(Math.PI);
					text.position.y += 10.0;

					var textMesh = jumpStart.spawnInstance(null, {"object": mesh, "parent": text})
					var offset = new THREE.Vector3().copy(displacement);
					offset.multiply(textMesh.scale);
					textMesh.position.set(-offset.x / 2.0, -offset.y / 2.0, -offset.z / 2.0);

					text.userData.life = 3.5;
					text.addEventListener("tick", function()
					{
						this.userData.life -= jumpStart.deltaTime;

						if( this.userData.life <= 0 )
						{
							//jumpStart.removeInstance(this);
							this.removeEventListener("tick", arguments.callee);
							this.applyBehavior("shrinkRemove");

							var params = {
								size: 10.0,
								height: 1,
								font: jumpStart.font,//"helvetiker",
								curveSegments: (jumpStart.isGearVR) ? 1 : 2
							};

							var geometry = new THREE.TextGeometry("Nice try!", params);
							var material = new THREE.MeshBasicMaterial({color:'white'});
							var mesh = new THREE.Mesh(geometry, material);

							geometry.computeBoundingBox();
							var displacement = new THREE.Vector3().copy(geometry.boundingBox.max).sub(geometry.boundingBox.min);

							var text = jumpStart.spawnInstance(null)
							text.userData.table = this.userData.table;
							text.position.copy(ship.position);
							text.quaternion.copy(this.userData.table.syncData.hoverBlasterTable.originalQuaternion);
							text.rotateX(Math.PI);
							text.position.y += 10.0;

							var textMesh = jumpStart.spawnInstance(null, {"object": mesh, "parent": text})
							var offset = new THREE.Vector3().copy(displacement);
							offset.multiply(textMesh.scale);
							textMesh.position.set(-offset.x / 2.0, -offset.y / 2.0, -offset.z / 2.0);

							text.userData.life = 2.0;
							text.addEventListener("tick", function()
							{
								this.userData.life -= jumpStart.deltaTime;

								if( this.userData.life <= 0 )
								{
									//jumpStart.removeInstance(this);
									this.removeEventListener("tick", arguments.callee);
									this.applyBehavior("shrinkRemove");

									// remove the table
									if( this.userData.table.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userID )
										jumpStart.removeInstance(this.userData.table);

									return;
								}

								this.position.y += 10.0 * jumpStart.deltaTime;

								if( jumpStart.isAltspace )
									this.lookAt(jumpStart.localUser.skeleton.getJoint("Eye"));
							});
							return;
						}

						this.position.y += 10.0 * jumpStart.deltaTime;
					});

					return;
				}

				this.position.y += 10.0 * jumpStart.deltaTime;
			});
		},
		"resetTimeline": function(id, title)
		{
			console.log("Resetting timeline");
			var timeline =
			{
				"info":
				{
					"id": id,
					"title": title,
					"rotSpeed": 0.3,
					"previous": "-1"
				}
			};

			this.syncData.hoverBlasterTable.timeline = timeline;
		},
		"generateStage": function(id)
		{
			// add in idle space for loading time of clients
			var offsetZ = 0.3;
			var safeZ = (offsetZ).toString().replace(".", "o");
			if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
				this.syncData.hoverBlasterTable.timeline[safeZ] = {
					"stageText":
					{
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": 0.1,
						"template": "stageText"
					}
				};

			console.log("Generate stage ID for " + id);
			if( id === 0 )
			{
				this.syncData.hoverBlasterTable.timeline.info.rotSpeed = 0.2;
				//this.syncData.hoverBlasterTable.timeline.info.music = "UBP7xH348cI";
				
				var length = 1.0;
				//var offsetZ = 0;	// disabled the offset because the timeline gets reset anyways
	//			if( !!this.userData.hoverBlasterTable )
	//				offsetZ = this.userData.hoverBlasterTable.rot;
				
				// generate a random stage length units long

				// rocks
				var z, rotZ, entity;
				for( z = 0; z < length; z += 0.1 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "rocks"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// guns
				for( z = 0; z < length; z += 0.3 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "gun"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}					

				entity = {
					"id": jumpStart.generateId(),
					"offsetY": 0.0,
					"offsetX": 0.1,
					"template": "clearText"
				};

				var safeZ = (length + offsetZ + 0.25).toString().replace(".", "o");
				if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
					this.syncData.hoverBlasterTable.timeline[safeZ] = {};

				this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
			}
			else if( id === 1 )
			{
				this.syncData.hoverBlasterTable.timeline.info.rotSpeed = 0.2;
				var length = 2.0;
				//var offsetZ = 0;	// disabled the offset because the timeline gets reset anyways
	//			if( !!this.userData.hoverBlasterTable )
	//				offsetZ = this.userData.hoverBlasterTable.rot;
				
				// generate a random stage length units long

				// rocks
				var z, rotZ, entity;
				for( z = 0; z < length; z += 0.05 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "rocks"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// guns
				for( z = 0; z < length; z += 0.2 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "gun"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// crazies
				for( z = 0; z < length; z += 0.3 )
				{
					rotZ = Math.PI * 0.4 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					var rotY = Math.PI * 0.4 * Math.random();
					rotY *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 10.0,
						"offsetX": rotZ,
						"rotY": rotY,
						"template": "crazy"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				entity = {
					"id": jumpStart.generateId(),
					"offsetY": 0.0,
					"offsetX": 0.1,
					"template": "clearText"
				};

				var safeZ = (length + offsetZ + 0.25).toString().replace(".", "o");
				if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
					this.syncData.hoverBlasterTable.timeline[safeZ] = {};

				this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
			}
			else if( id === 2 )
			{
				this.syncData.hoverBlasterTable.timeline.info.rotSpeed = 0.2;
				var length = 2.0;
				//var offsetZ = 0;	// disabled the offset because the timeline gets reset anyways
	//			if( !!this.userData.hoverBlasterTable )
	//				offsetZ = this.userData.hoverBlasterTable.rot;
				
				// generate a random stage length units long
				// rocks
				var z, rotZ, entity;
				for( z = 0; z < length; z += 0.05 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "rocks"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// guns
				for( z = 0; z < length; z += 0.2 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "gun"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// crazies
				var safeZ;
				for( z = 0; z < length; z += 0.3 )
				{
					rotZ = Math.PI * 0.4 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					var rotY = Math.PI * 0.4 * Math.random();
					rotY *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 10.0,
						"offsetX": rotZ,
						"rotY": rotY,
						"template": "crazy"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;

					//rotZ = Math.PI * 0.4 * Math.random();
					//rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					var rotY = Math.PI * 0.4 * Math.random();
					rotY *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 10.0,
						"offsetX": -rotZ,
						"rotY": rotY,
						"template": "crazy"
					};

					safeZ = (z + 0.1 + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
/*
					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 10.0,
						"offsetX": -rotZ,
						"template": "crazy"
					};

					safeZ = (z + 0.1 + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					*/
				}

				entity = {
					"id": jumpStart.generateId(),
					"offsetY": 0.0,
					"offsetX": 0.1,
					"template": "clearText"
				};

				var safeZ = (length + offsetZ + 0.25).toString().replace(".", "o");
				if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
					this.syncData.hoverBlasterTable.timeline[safeZ] = {};

				this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
			}
			else if( id === 3 )
			{
				this.syncData.hoverBlasterTable.timeline.info.rotSpeed = 0.2;
				var length = 2.0;
				//var offsetZ = 0;	// disabled the offset because the timeline gets reset anyways
	//			if( !!this.userData.hoverBlasterTable )
	//				offsetZ = this.userData.hoverBlasterTable.rot;
				
				// generate a random stage length units long
				// rocks
				var z, rotZ, entity;
				for( z = 0; z < length; z += 0.05 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "rocks"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// guns
				for( z = 0; z < length; z += 0.2 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "gun"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// crazies
				var safeZ;
				for( z = 0; z < length; z += 0.3 )
				{
					rotZ = Math.PI * 0.4 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					var rotY = Math.PI * 0.4 * Math.random();
					rotY *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 10.0,
						"offsetX": rotZ,
						"rotY": rotY,
						"template": "crazy"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;

					//rotZ = Math.PI * 0.4 * Math.random();
					//rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					var rotY = Math.PI * 0.4 * Math.random();
					rotY *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 10.0,
						"offsetX": -rotZ,
						"rotY": rotY,
						"template": "crazy"
					};

					safeZ = (z + 0.1 + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;

					var rotY = Math.PI * 0.4 * Math.random();
					rotY *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 10.0,
						"offsetX": -rotZ,
						"rotY": rotY,
						"template": "crazy"
					};

					safeZ = (z + 0.1 + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
/*
					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 10.0,
						"offsetX": -rotZ,
						"template": "crazy"
					};

					safeZ = (z + 0.1 + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					*/
				}

				entity = {
					"id": jumpStart.generateId(),
					"offsetY": 0.0,
					"offsetX": 0.1,
					"template": "clearText"
				};

				var safeZ = (length + offsetZ + 0.25).toString().replace(".", "o");
				if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
					this.syncData.hoverBlasterTable.timeline[safeZ] = {};

				this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
			}
			else if( id === 4 )
			{
				this.syncData.hoverBlasterTable.timeline.info.rotSpeed = 0.2;
				var length = 2.0;
				//var offsetZ = 0;	// disabled the offset because the timeline gets reset anyways
	//			if( !!this.userData.hoverBlasterTable )
	//				offsetZ = this.userData.hoverBlasterTable.rot;
				
				// generate a random stage length units long
				// rocks
				var z, rotZ, entity;
				for( z = 0; z < length; z += 0.05 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "rocks"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// guns
				for( z = 0; z < length; z += 0.2 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "gun"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// crazies
				var safeZ;
				for( z = 0; z < length; z += 0.3 )
				{
					rotZ = Math.PI * 0.4 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					var rotY = Math.PI * 0.4 * Math.random();
					rotY *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 10.0,
						"offsetX": rotZ,
						"rotY": rotY,
						"template": "crazy"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;

					//rotZ = Math.PI * 0.4 * Math.random();
					//rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					var rotY = Math.PI * 0.4 * Math.random();
					rotY *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 10.0,
						"offsetX": -rotZ,
						"rotY": rotY,
						"template": "crazy"
					};

					safeZ = (z + 0.1 + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;

					var rotY = Math.PI * 0.4 * Math.random();
					rotY *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 10.0,
						"offsetX": -rotZ,
						"rotY": rotY,
						"template": "crazy"
					};

					safeZ = (z + 0.1 + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;

					var rotY = Math.PI * 0.4 * Math.random();
					rotY *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 10.0,
						"offsetX": -rotZ,
						"rotY": rotY,
						"template": "crazy"
					};

					safeZ = (z + 0.1 + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
/*
					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 10.0,
						"offsetX": -rotZ,
						"template": "crazy"
					};

					safeZ = (z + 0.1 + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					*/
				}

				entity = {
					"id": jumpStart.generateId(),
					"offsetY": 0.0,
					"offsetX": 0.1,
					"template": "clearText"
				};

				var safeZ = (length + offsetZ + 0.25).toString().replace(".", "o");
				if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
					this.syncData.hoverBlasterTable.timeline[safeZ] = {};

				this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
			}
			else if( id === "3never" )
			{
				this.syncData.hoverBlasterTable.timeline.info.rotSpeed = 0.3;
				var length = 2.0;
				//var offsetZ = 0;	// disabled the offset because the timeline gets reset anyways
	//			if( !!this.userData.hoverBlasterTable )
	//				offsetZ = this.userData.hoverBlasterTable.rot;
				
				// generate a random stage length units long

				// rocks
				var z, rotZ, entity;
				for( z = 0; z < length; z += 0.07 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "rocks"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// guns
				for( z = 0; z < length; z += 0.1 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "gun"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// crazies
				for( z = 0; z < length; z += 0.2 )
				{
					rotZ = Math.PI * 0.4 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					var rotY = Math.PI * 0.4 * Math.random();
					rotY *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 10.0,
						"offsetX": rotZ,
						"rotY": rotY,
						"template": "crazy"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;

				}

				entity = {
					"id": jumpStart.generateId(),
					"offsetY": 0.0,
					"offsetX": 0.1,
					"template": "clearText"
				};

				var safeZ = (length + offsetZ + 0.25).toString().replace(".", "o");
				if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
					this.syncData.hoverBlasterTable.timeline[safeZ] = {};

				this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
			}
			else if( id === 5 )
			{
				this.syncData.hoverBlasterTable.timeline.info.rotSpeed = 0.4;

				var length = 2.0;
				//var offsetZ = 0;	// disabled the offset because the timeline gets reset anyways
	//			if( !!this.userData.hoverBlasterTable )
	//				offsetZ = this.userData.hoverBlasterTable.rot;

				entity = {
					"id": jumpStart.generateId(),
					"offsetY": 0.0,
					"offsetX": 0.1,
					"template": "bonusText"
				};

				var safeZ = "0o2";
				if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
					this.syncData.hoverBlasterTable.timeline[safeZ] = {};

				this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
				
				// generate a random stage length units long

				// rocks
				var z, rotZ, entity;
				for( z = 0; z < length; z += 0.1 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "rocks"
					};

					safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// coin
				// arc from right to middle
				var spread = Math.PI * 0.2;
				rotZ = -spread;
				//for( z = 0; z < length && rotZ <= -Math.PI * 0.1; z += 0.05 )
				for( z = 0; z < length && rotZ < 0; z += 0.05 )
				{
					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "coin"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;

					rotZ += spread * 0.2;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// coin
				// arc from middle to right
				for( z = z; z < length && rotZ >= -spread; z += 0.05 )
				{
					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "coin"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;

					rotZ -= (Math.PI * 0.2) * 0.2;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				for( z += 0.1; z < length && rotZ > 0; z += 0.05 )
				{
					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "coin"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;

					rotZ += spread * 0.2;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// coin
				// down the middle
				var stripLength = 0;
				for( z += 0.1; z < length && stripLength < 4; z += 0.05 )
				{
					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": 0.0,
						"template": "coin"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					stripLength++;
				}

				// coin
				// arc from left to middle
				for( z += 0.1; z < length && rotZ >= 0; z += 0.05 )
				{
					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "coin"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;

					rotZ -= spread * 0.2;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// coin
				// arc from middle to left
				for( z = z; z < length && rotZ <= spread; z += 0.05 )
				{
					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "coin"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;

					rotZ += spread * 0.2;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// down the middle
				stripLength = 0;
				for( z += 0.1; z < length && stripLength < 4; z += 0.05 )
				{
					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": 0.0,
						"template": "coin"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					stripLength++;
				}

/*
				// coin
				// arc from right to middle
				rotZ = -Math.PI * 0.2;
				for( z = 0; z < length && rotZ <= -Math.PI * 0.1; z += 0.05 )
				{
					entity = {
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "coin"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;

					rotZ += (Math.PI * 0.2) * 0.1;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// coin
				// arc from middle to right
				for( z = z; z < length && rotZ >= -Math.PI * 0.2; z += 0.05 )
				{
					entity = {
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "coin"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;

					rotZ -= (Math.PI * 0.2) * 0.1;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// coin
				// arc from left to middle
				rotZ = Math.PI * 0.2;
				for( z += 0.2; z < length && rotZ >= Math.PI * 0.1; z += 0.05 )
				{
					entity = {
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "coin"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;

					rotZ -= (Math.PI * 0.2) * 0.1;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// coin
				// arc from middle to left
				for( z = z; z < length && rotZ <= Math.PI * 0.2; z += 0.05 )
				{
					entity = {
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "coin"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;

					rotZ += (Math.PI * 0.2) * 0.1;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// coin
				// down the middle
				for( z = z += 0.2; z < length; z += 0.05 )
				{
					entity = {
						"offsetY": 0.0,
						"offsetX": 0.0,
						"template": "coin"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
				}
				*/

				entity = {
					"id": jumpStart.generateId(),
					"offsetY": 0.0,
					"offsetX": 0.1,
					"template": "clearText"
				};

				var safeZ = (length + offsetZ + 0.25).toString().replace(".", "o");
				if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
					this.syncData.hoverBlasterTable.timeline[safeZ] = {};

				this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
			}
			else if( id === 5 )
			{
				var length = 2.0;
				//var offsetZ = 0;	// disabled the offset because the timeline gets reset anyways
	//			if( !!this.userData.hoverBlasterTable )
	//				offsetZ = this.userData.hoverBlasterTable.rot;
				
				// generate a random stage length units long

				// rocks
				var z, rotZ, entity;
				for( z = 0; z < length; z += 0.07 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "rocks"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// guns
				for( z = 0; z < length; z += 0.1 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "gun"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// crazies
				for( z = 0; z < length; z += 0.2 )
				{
					rotZ = Math.PI * 0.4 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					var rotY = Math.PI * 0.4 * Math.random();
					rotY *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 10.0,
						"offsetX": rotZ,
						"rotY": rotY,
						"template": "crazy"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;

				}

				entity = {
					"id": jumpStart.generateId(),
					"offsetY": 0.0,
					"offsetX": 0.1,
					"template": "clearText"
				};

				var safeZ = (length + offsetZ + 0.25).toString().replace(".", "o");
				if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
					this.syncData.hoverBlasterTable.timeline[safeZ] = {};

				this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
			}
			else if( id === 6 )
			{
				var length = 2.0;
				//var offsetZ = 0;	// disabled the offset because the timeline gets reset anyways
	//			if( !!this.userData.hoverBlasterTable )
	//				offsetZ = this.userData.hoverBlasterTable.rot;
				
				// generate a random stage length units long

				// rocks
				var z, rotZ, entity;
				for( z = 0; z < length; z += 0.1 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "rocks"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// guns
				for( z = 0; z < length; z += 0.1 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "gun"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// crazies
				for( z = 0; z < length; z += 0.2 )
				{
					rotZ = Math.PI * 0.4 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					var rotY = Math.PI * 0.4 * Math.random();
					rotY *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 10.0,
						"offsetX": rotZ,
						"rotY": rotY,
						"template": "crazy"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;

				}

				entity = {
					"id": jumpStart.generateId(),
					"offsetY": 0.0,
					"offsetX": 0.1,
					"template": "clearText"
				};

				var safeZ = (length + offsetZ + 0.25).toString().replace(".", "o");
				if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
					this.syncData.hoverBlasterTable.timeline[safeZ] = {};

				this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
			}
			else
			{
				var length = 2.0;
				//var offsetZ = 0;	// disabled the offset because the timeline gets reset anyways
	//			if( !!this.userData.hoverBlasterTable )
	//				offsetZ = this.userData.hoverBlasterTable.rot;
				
				// generate a random stage length units long

				// add random rocks every z=0.05 at random rotZ.
				var z, rotZ, entity;
				for( z = 0; z < length; z += 0.05 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "rocks"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// add random guns every z=0.2 at random rotZ
				for( z = 0; z < length; z += 0.2 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.generateId(),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "gun"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				entity = {
					"id": jumpStart.generateId(),
					"offsetY": 0.0,
					"offsetX": 0.1,
					"template": "clearText"
				};

				var safeZ = (length + offsetZ + 0.25).toString().replace(".", "o");
				if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
					this.syncData.hoverBlasterTable.timeline[safeZ] = {};

				this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.generateId()] = entity;
			}
		},
		"getAmountZ": function()
		{
			// decimal number of revolutions
			return (this.userData.hoverBlasterTable.rot - this.userData.hoverBlasterTable.initialRot) / (Math.PI * 2.0);
		},
		"tickBehavior": function()
		{
			if( !!!this.userData.hoverBlasterTable.ship )
				return;

//			if( !!this.syncData.hoverBlasterTable.timeline.info.previous )
//			{
//				console.log(this.syncData.hoverBlasterTable.timeline.info.previous);
//				console.log(this.syncData.hoverBlasterTable.timeline[this.syncData.hoverBlasterTable.timeline.info.previous]);
//			}

			if( this.userData.hoverBlasterTable.currentStage !== this.syncData.hoverBlasterTable.timeline.info.id )
			{
				console.log("TIMELINE RESET DETECTED!!");
				//this.userData.hoverBlasterTable.rot = Math.PI / 2.0;
				//this.userData.hoverBlasterTable.initialRot = 0;
				//this.rotation.x = 0;
				this.userData.hoverBlasterTable.initialRot = this.userData.hoverBlasterTable.rot;
				this.userData.hoverBlasterTable.spentTimeline = [];
				this.userData.hoverBlasterTable.currentStage = this.syncData.hoverBlasterTable.timeline.info.id;
				//console.log(this.syncData.hoverBlasterTable.timeline);
			}

			//console.log(this.syncData.hoverBlasterTable);

			// only proceed if active
			if( !this.syncData.hoverBlasterTable.isActive )
				return;

			var numSegments = 13;

			// ALWAYS update rotation
			var rotSpeed = (!!this.syncData.hoverBlasterTable.timeline.info) ? this.syncData.hoverBlasterTable.timeline.info.rotSpeed : this.syncData.hoverBlasterTable.rotSpeed;
			var oldRot = this.userData.hoverBlasterTable.rot;
			this.userData.hoverBlasterTable.rot += rotSpeed * jumpStart.deltaTime;

			if( this.userData.hoverBlasterTable.rot > (Math.PI / (numSegments)) * this.userData.hoverBlasterTable.totalPlates )
			{
				var delta = ((Math.PI / numSegments) * this.userData.hoverBlasterTable.totalPlates) + (5.0 * Math.PI / numSegments);
				this.userData.hoverBlasterTable.totalPlates++;

				var plate;
				if( this.userData.hoverBlasterTable.plates.length < 15 )
				{
					plate = jumpStart.spawnInstance(null, {"parent": this});
					plate.applyBehavior("asyncModel", {"modelFile": "models/road", "callback": function(visualObject)
						{
							var plateMaterial = jumpStart.getMaterial(visualObject);
							plateMaterial.transparent = true;
							plateMaterial.opacity = 0.87;
							plateMaterial.needsUpdate = true;
						}, "bubbleInSpeed": 3.0
					});
					plate.userData.table = this;
					plate.userData.rotOffset = this.rotation.x;

					this.userData.hoverBlasterTable.plates.push(plate);
				}
				else
				{
					plate = this.userData.hoverBlasterTable.plates[0];
					this.userData.hoverBlasterTable.plates.shift();
					this.userData.hoverBlasterTable.plates.push(plate);
					this.userData.hoverBlasterTable.plates[0].scale.sub(new THREE.Vector3(jumpStart.deltaTime, jumpStart.deltaTime, jumpStart.deltaTime));
				}

				plate.rotation.x = (Math.PI / 4.0) - delta;
				plate.applyBehavior("bubbleIn", {"speed": 3.0});
			}

			var plate0 = this.userData.hoverBlasterTable.plates[0];
			if( this.userData.hoverBlasterTable.plates.length >= 15 && plate0.scale.x < 1 && plate0.scale.x > 0.0001 )
			{
				plate0.scale.sub(new THREE.Vector3(jumpStart.deltaTime * 3.0, jumpStart.deltaTime * 3.0, jumpStart.deltaTime * 3.0));

				if( plate0.scale.x < 0.0001 )
					plate0.scale.set(0.0001, 0.0001, 0.0001);
			}

			//this.rotation.x = this.userData.hoverBlasterTable.rot;
			this.rotateX(this.userData.hoverBlasterTable.rot - oldRot);

			if( this.userData.hoverBlasterTable.initialRot === -1 )
				this.userData.hoverBlasterTable.initialRot = this.userData.hoverBlasterTable.rot;// + Math.PI;

			// anything that is BEFORE this.syncData.hoverBlasterTable.timeline.info.previous
			// and NOT on this.userData.hoverBlasterTable.spentTimeline

			// loop through the timeline
			var index, frame, previousValue, indexValue, nextValue, initialValue, zAmount;
			for( index in this.syncData.hoverBlasterTable.timeline )
			{
				if( index === "info" )
					continue;

				frame = this.syncData.hoverBlasterTable.timeline[index];
				previousValue = parseFloat(this.syncData.hoverBlasterTable.timeline.info.previous.replace("o", "."));
				indexValue = parseFloat(index.replace("o", "."));
				initialValue = parseFloat(this.userData.hoverBlasterTable.initialTimeline.replace("o", "."));

				if( indexValue > initialValue && this.userData.hoverBlasterTable.spentTimeline.indexOf(index) === -1 )
				{
					// if we are the table owner, sync the change (when needed)
					zAmount = jumpStart.behaviors.hoverBlasterTable.getAmountZ.call(this);
					//console.log(indexValue <= previousValue);
					if( this.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userID && indexValue >= previousValue && indexValue <= zAmount )
					{
						this.syncData.hoverBlasterTable.timeline.info.previous = index;
						this.sync();
						previousValue = indexValue;
					}

					if( indexValue <= previousValue )
					{
						var x, entry;
						for( x in frame )
						{
							entry = frame[x];
//console.log(!!this.userData.hoverBlasterTable.ship.syncData.killed);
							if( !!!this.userData.hoverBlasterTable.ship.syncData.killed || !!!this.userData.hoverBlasterTable.ship.syncData.killed[entry.id] )
							{
								if( entry.template === "rocks" )
									jumpStart.behaviors.hoverBlasterTable.spawnRocks.call(this, entry);//entry.offsetX);
								else if( entry.template === "coin" )
									jumpStart.behaviors.hoverBlasterTable.spawnCoin.call(this, entry);//entry.offsetX);
								else if( entry.template === "stageText" )
									jumpStart.behaviors.hoverBlasterTable.spawnStageText.call(this, entry);
								else if( entry.template === "goText" )
									jumpStart.behaviors.hoverBlasterTable.spawnGoText.call(this, entry);
								else if( entry.template === "clearText" )
									jumpStart.behaviors.hoverBlasterTable.spawnClearText.call(this, entry);
								else if( entry.template === "bonusText" )
									jumpStart.behaviors.hoverBlasterTable.spawnBonusText.call(this, entry);
								else if( entry.template === "gun" )
									jumpStart.behaviors.hoverBlasterTable.spawnGun.call(this, entry);//entry.offsetX);
								else if( entry.template === "crazy" )
									jumpStart.behaviors.hoverBlasterTable.spawnCrazy.call(this, entry);//entry.offsetX, entry.rotY);
							}
						}

						this.userData.hoverBlasterTable.spentTimeline.push(index);
					}					
				}
			}
		},
		"rocksKill": function()
		{
			var table = this.userData.table;

			var debris = jumpStart.spawnInstance(null, {"parent": table});
			debris.applyBehavior("asyncModel", {"modelFile": "models/rocks_broken", "useBubbleIn": false});
			debris.userData.table = table;
			debris.userData.rotOffset = this.userData.rotOffset;
			debris.userData.maxGrowScale = 1.0;
			debris.position.copy(this.position);
			debris.quaternion.copy(this.quaternion);
			debris.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.rotFade);

			jumpStart.playSound("sounds/shatter", 0.2);

			jumpStart.removeInstance(this);
		},
		"rotFade": function()
		{
			var numSegments = 13;
			if( !!this.userData.fading )
			{
				this.scale.multiplyScalar(0.9);

				if( this.scale.x < 0.1 )
					jumpStart.removeInstance(this);

				return;
			}

			var table = this.userData.table;
			var rot = this.userData.rotOffset + table.userData.hoverBlasterTable.rot;
			var max = Math.PI - (Math.PI / numSegments);

			if( max - rot < 0 )
				this.userData.fading = true;
			else if( this.scale.x < 1.0 )
			{
				if( this.scale.x < 0.01 )
					this.scale.set(0.02, 0.02, 0.02);

				this.scale.multiplyScalar(1.1);

				if( this.scale.x > 1.0 )
					this.scale.set(1, 1, 1);
			}
		},
		"hitDetect": function()
		{
			var table = this.userData.table;

			function causeDamage(amount)
			{
				this.userData.health -= amount;

				if( this.userData.health <= 0 )
				{
					ship.syncData.killed[this.userData.entryID] = true;
					ship.sync({"syncData": true});

					this.userData.kill.call(this);
					this.removeEventListener("tick", jumpStart.behaviors.hoverBlasterTable.hitDetect);//arguments.callee);
					return;
				}
			}

			var ship = table.userData.hoverBlasterTable.ship;
			if( !ship )
				return;

			if( table.syncData.hoverBlasterTable.ownerID !== jumpStart.localUser.userID && !!ship.syncData.killed[this.userData.entryID] )
			{
				this.userData.kill.call(this);
				this.removeEventListener("tick", jumpStart.behaviors.hoverBlasterTable.hitDetect);
				return;
			}

			var lasers = table.userData.hoverBlasterTable.lasers;
			var x, laser;
			for( x in lasers )
			{
				laser = lasers[x];
				if( laser.getWorldPosition().distanceTo(this.getWorldPosition()) < this.userData.hitRadius * jumpStart.options.sceneScale )
				{
					jumpStart.behaviors.hoverBlasterTable.spawnExplosion(laser.position, 0.2, this.userData.table);
					jumpStart.removeInstance(laser);

					if( table.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userID )
						causeDamage.call(this, laser.userData.power);
				}
			}

			if( table.syncData.hoverBlasterTable.ownerID !== jumpStart.localUser.userID )
				return;

			var weaponExplosions = table.userData.hoverBlasterTable.weaponExplosions;
			//console.log(weaponExplosions);
			var x, explosion;
			for( x in weaponExplosions )
			{
				explosion = weaponExplosions[x];
				//console.log(explosion.scale.x);
				if( explosion.getWorldPosition().distanceTo(this.getWorldPosition()) < 30.0 * explosion.scale.x * jumpStart.options.sceneScale )
				{
					//jumpStart.behaviors.hoverBlasterTable.spawnExplosion(laser.position, 0.3, table);
					//jumpStart.removeInstance(laser);
					
					//if( table.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userID )
					causeDamage.call(this, explosion.userData.power);
					console.log("cause dammmgg");
				}
			}

			// check for ship collision
			var thisPosition = this.getWorldPosition();
			//var tablePosition = table.getWorldPosition();
			var shipPosition = ship.getWorldPosition();

//			var target = ship;
			var dist = thisPosition.distanceTo(shipPosition);
/*
			var shieldVal = hawk.userData.shields;
			if( shieldVal < 0.5 )
				shieldVal = 0.5;
*/
			if( dist * ship.scale.x < ship.userData.radius * jumpStart.options.sceneScale )//* shieldVal )
			{
				jumpStart.playSound("sounds/damage1", 0.2);
				jumpStart.behaviors.hoverBlasterTable.spawnExplosion(jumpStart.world.worldToLocal(thisPosition), 0.2, this.userData.table);
/*
				if( ship.userData.shields > 0.5 )
				{
					ship.userData.shield.scale.set(1, 1, 1);
					ship.userData.shield.scale.multiplyScalar(ship.userData.shields);
				}
				*/

//					var damage = hawk.userData.health + ;
//					if( hawk.userData.shields > damage)

				//hawk.userData.shields -= this.userData.health * 0.01;

				//SpawnExplosion(laser.position, 0.2);
				var index = 7;
				while( index > 0 )
				{
					var bar = ship.userData.healthBar.userData["bar" + index];
					if( !!bar )
					{
						jumpStart.removeInstance(bar);
						delete ship.userData.healthBar.userData["bar" + index];
						break;
					}

					index--;
				}

				if( index === 0  && table.syncData.hoverBlasterTable.isActive)
				{
					table.syncData.hoverBlasterTable.isActive = false;
					table.sync();

					ship.syncData.dead = true;
					ship.sync({"syncData": true});
				}

				jumpStart.removeInstance(laser);

				causeDamage.call(this, this.userData.health);

//					jumpStart.removeInstance(this);
//					return;

				//g_scene.remove(this);
//						g_galaxy.remove(this);
			}
		},
		"spawnText": function(words)
		{
			var params = {
				size: 12.0,
				height: 1,
				font: jumpStart.font,//"helvetiker",
				curveSegments: (jumpStart.isGearVR) ? 1 : 2
			};

			var geometry = new THREE.TextGeometry(words, params);
			var material = new THREE.MeshBasicMaterial({color:'white'});
			var mesh = new THREE.Mesh(geometry, material);

			geometry.computeBoundingBox();
			var displacement = new THREE.Vector3().copy(geometry.boundingBox.max).sub(geometry.boundingBox.min);

			var text = jumpStart.spawnInstance(null, {"parent": this})
			text.userData.table = this;

			var textMesh = jumpStart.spawnInstance(null, {"object": mesh, "parent": text})
			var offset = new THREE.Vector3().copy(displacement);
			offset.multiply(textMesh.scale);
			textMesh.position.set(-offset.x / 2.0, -offset.y / 2.0, -offset.z / 2.0);

			text.userData.rotOffset = -this.userData.hoverBlasterTable.rot + (Math.PI / 2.0);
			text.rotation.x = text.userData.rotOffset;
			text.rotateX(-Math.PI / 1.5);

			text.translateY(this.userData.hoverBlasterTable.radius + (displacement.y / 2.0) + 30.0);
			text.scale.set(0.0001, 0.0001, 0.0001);
			text.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.rotFade);	
		},
		"spawnStageText": function(entry)
		{
			//console.log("spawn stage text: " + this.syncData.hoverBlasterTable.timeline.info.title);
			jumpStart.behaviors.hoverBlasterTable.spawnText.call(this, this.syncData.hoverBlasterTable.timeline.info.title);

//			document.querySelector("#music").src = "http://www.jumpstartsdk.com/live/view_youtube.php?id=" + this.syncData.hoverBlasterTable.timeline.info.music + "&controls=1&vq=small&rel=1&iv_load_policy=3&autoplay=1&loop=1&vol=3";
		},
		"spawnGoText": function(entry)
		{
			jumpStart.behaviors.hoverBlasterTable.spawnText.call(this, "GO!");
		},
		"spawnBonusText": function(entry)
		{
			jumpStart.behaviors.hoverBlasterTable.spawnText.call(this, "BONUS!");
			jumpStart.playSound("sounds/bonus", 0.5);
		},
		"spawnClearText": function(entry)
		{
		//	jumpStart.behaviors.hoverBlasterTable.spawnText.call(this, "CLEAR!");
			if( this.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userID )
			{
				var idVal;
				var id = this.syncData.hoverBlasterTable.timeline.info.id;
				if( id == parseInt(id) + "" )
				{
					idVal = parseInt(id) + 1;
					jumpStart.behaviors.hoverBlasterTable.resetTimeline.call(this, idVal, "STAGE " + (idVal+1) );
					jumpStart.behaviors.hoverBlasterTable.generateStage.call(this, idVal);
					this.sync();
				}
			}
		},
		"gunSpawn": function()
		{
			var base = jumpStart.spawnInstance(null, {"parent": this});
			base.applyBehavior("asyncModel", {"modelFile": "models/manualgun_base"});

			var tower = jumpStart.spawnInstance(null, {"parent": base});
			tower.applyBehavior("asyncModel", {"modelFile": "models/manualgun_tower"});
			tower.translateY(8.5);

			var barrels = jumpStart.spawnInstance(null, {"parent": tower});
			barrels.applyBehavior("asyncModel", {"modelFile": "models/manualgun_barrels"});
			barrels.translateY(4.0);
			barrels.translateZ(2.0);

			this.userData.base = base;
			this.userData.tower = tower;
			this.userData.barrels = barrels;
		},
		"gunFireLaser": function(offset, parent, explosive)
		{
			parent.userData.fireCooldown = 1.5;

			parent.updateMatrixWorld();
			var laser = jumpStart.spawnInstance(null, {"parent": parent});
			laser.applyBehavior("asyncModel", {"modelFile": "models/enemy_laser", "useBubbleIn": false});
			laser.userData.table = parent.userData.table;
			laser.userData.table.userData.hoverBlasterTable.enemyLasers[laser.uuid] = laser;
			laser.addEventListener("remove", jumpStart.behaviors.hoverBlasterTable.enemyLaserRemove);
			laser.quaternion.copy(parent.quaternion);

			var position = this.getWorldPosition();
			position.multiplyScalar(1 / jumpStart.options.sceneScale);
			THREE.SceneUtils.detach(laser, this, jumpStart.scene);
			laser.position.copy(position);
			laser.translateX(offset.x);
			laser.translateY(offset.y);
			laser.translateZ(offset.z);
			laser.scale.set(0.5, 0.5, 1.0);
			laser.userData.power = 20.0;	// must all be the same power cuz of how healthbar works
			laser.addEventListener("tick", function()
			{
				var table = this.userData.table;
				if( table.parent !== jumpStart.world )
					jumpStart.removeInstance(this);

				// only proceed if active
				if( !table.syncData.hoverBlasterTable.isActive )
					return;

				this.translateZ(70 * jumpStart.deltaTime);

				var table = this.userData.table;
				var ship = table.userData.hoverBlasterTable.ship;
				var laserPosition = this.getWorldPosition();
				var tablePosition = table.getWorldPosition();
				var shipPosition = ship.getWorldPosition();

				//dist * ship.scale.x < ship.userData.radius * jumpStart.options.sceneScale
				//var dist = ;
				if( laserPosition.distanceTo(tablePosition) > table.userData.hoverBlasterTable.radius * jumpStart.scene.scale.x * 2.0 )// * jumpStart.options.sceneScale )
				{
					jumpStart.removeInstance(this);
					return;
				}

				var target = ship;
				var dist = laserPosition.distanceTo(shipPosition);
/*
				var shieldVal = ship.userData.shields;
				if( shieldVal < 0.5 )
					shieldVal = 0.5;
				*/

				//if( dist < ship.userData.radius )// * shieldVal )
				if( dist * ship.scale.x < ship.userData.radius * jumpStart.options.sceneScale )
				{
					jumpStart.playSound("sounds/explosion0", 0.2);
					jumpStart.behaviors.hoverBlasterTable.spawnExplosion(jumpStart.world.worldToLocal(laserPosition), 0.2, table);
/*
					if( ship.userData.shields > 0.5 )
					{
							ship.userData.shield.scale.set(1, 1, 1);
							ship.userData.shield.scale.multiplyScalar(ship.userData.shields);
					}

					ship.userData.shields -= this.userData.power * 0.01;
					*/

					jumpStart.removeInstance(this);

					if( table.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userID )
					{
						var index = 7;
						while( index > 0 )
						{
							var bar = ship.userData.healthBar.userData["bar" + index];
							if( !!bar )
							{
								jumpStart.removeInstance(bar);
								delete ship.userData.healthBar.userData["bar" + index];
								break;
							}

							index--;
						}

						if( index === 0 && table.syncData.hoverBlasterTable.isActive )
						{
							var explosion = jumpStart.spawnInstance(null, {"parent": ship});
							explosion.applyBehavior("asyncModel", {"modelFile": "models/explosion"});
							explosion.scale.set(0.3, 0.3, 0.3);
							explosion.scale.multiplyScalar(1 / ship.scale.x);
							//explosion.position.copy(ship.position);

							explosion = jumpStart.spawnInstance(null, {"parent": ship});
							explosion.applyBehavior("asyncModel", {"modelFile": "models/explosion"});
							explosion.scale.set(0.2, 0.2, 0.2);
							//explosion.scale.multiplyScalar(1 / ship.scale.x);
							//explosion.position.copy(ship.position);
							explosion.translateX(8.0);
							explosion.translateZ(8.0);
							explosion.translateY(4.0);
							explosion.scale.multiplyScalar(1 / ship.scale.x);

							if( table.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userID )
							{
								table.syncData.hoverBlasterTable.isActive = false;
								table.sync();
							}

							ship.syncData.dead = true;
							ship.sync({"syncData": true});

							//jumpStart.behaviors.hoverBlasterTable.gameOverNotify.call(table);
						}
					}

					return;
				}
			});
		},
		"bomberRemove": function()
		{
			var table = this.userData.table;
			if( !table || !table.userData.hoverBlasterTable.ship )
				return;

			if( table.userData.hoverBlasterTable.ship )
				table.userData.hoverBlasterTable.ship.userData.bomber = null;
		},
		"bomberTick": function()
		{
			// SAVE ME: PROBABLY A GOOD WAY TO ADD TO VECTORS OVER DELTA TIME!!!
			//if( this.scale.x < 0.7 && !!!this.behaviors.shrinkRemove )
			//	this.scale.add(new THREE.Vector3(1, 1, 1).multiplyScalar(jumpStart.deltaTime));

			var table = this.userData.table;

			this.translateZ(200.0 * jumpStart.deltaTime);

			this.userData.dropDelay -= jumpStart.deltaTime;
			if( this.userData.dropDelay <= 0 )
			{
				this.userData.dropDelay = 0.2;

				if( this.userData.payload > 0 )
				{
					this.userData.payload--;

					var bomb = jumpStart.spawnInstance(null, {"parent": jumpStart.world});
					bomb.userData.table = table;
					bomb.position.copy(this.position);
					bomb.quaternion.copy(this.quaternion);
					bomb.lookAt(new THREE.Vector3(0, 0, 0));

					var bombVisual = jumpStart.spawnInstance(null, {"parent": bomb});
					bombVisual.applyBehavior("asyncModel", {"modelFile": "models/bomb"});
					//bombVisual.position.copy(this.position);
					//bombVisual.quaternion.copy(this.quaternion);

					//THREE.SceneUtils.attach(bombVisual, jumpStart.scene, bomb);

					bombVisual.rotateX(Math.PI / 2.0);

					bomb.addEventListener("tick", function()
					{
						var table = this.userData.table;

						this.translateZ(80.0 * jumpStart.deltaTime);
						this.rotateZ(6.0 * jumpStart.deltaTime);
						
						if( this.position.length() > 600.0 || this.position.distanceTo(table.position) < 120.0 )
						{
							//jumpStart.behaviors.hoverBlasterTable.spawnExplosion(this.position, 0.7, table);
							var explosion = jumpStart.behaviors.hoverBlasterTable.spawnExplosion(this.position, 0.7, table);
							explosion.userData.power = 200.0;
							//explosion.radus =
							explosion.scale.multiplyScalar(2.0);
							table.userData.hoverBlasterTable.weaponExplosions[explosion.uuid] = explosion;
							//explosion.addEventListener("remove", jumpStart.behaviors.hoverBlasterTable.weaponExplosionRemove);

							var enemyLasers = table.userData.hoverBlasterTable.enemyLasers;
							var x, laser;
							for( x in enemyLasers )
							{
								laser = enemyLasers[x];
								if( laser.getWorldPosition().distanceTo(this.getWorldPosition()) < 40.0 * jumpStart.options.sceneScale )
								{
									//jumpStart.behaviors.hoverBlasterTable.spawnExplosion(laser.position, 0.3, table);
									jumpStart.removeInstance(laser);
									
									//if( table.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userID )
									//	causeDamage.call(this, laser.userData.power);
								}
							}

							jumpStart.removeInstance(this);
						}
					});
				}
			}

			//if( this.position.length() > 600.0 || this.position.distanceTo(table.position) < 115.0 )
			//if( this.ownerID === jumpStart.localUser.userID && (this.position.distanceTo(table.position) < table.userData.hoverBlasterTable.radius || (this.position.distanceTo(table.position) > table.userData.hoverBlasterTable.radius * 2.0 && this.userData.payload === 0)))// * jumpStart.options.sceneScale )
			if( this.position.distanceTo(table.position) < table.userData.hoverBlasterTable.radius || (this.position.distanceTo(table.position) > table.userData.hoverBlasterTable.radius * 2.0 && this.userData.payload === 0))// * jumpStart.options.sceneScale )
			{
				if( !!!this.behaviors.shrinkRemove )
					this.applyBehavior("shrinkRemove");
			//	jumpStart.removeInstance(this);
			}
		},
		"bomberSpawn": function()
		{
			console.log("Spawn bomber for table " + this.syncData.tableName);
			var table = jumpStart.scene.getObjectByName(this.syncData.tableName);
			if( !table )
				return;

			this.applyBehavior("asyncModel", {"modelFile": "models/bomber"});

			var ship = table.userData.hoverBlasterTable.ship;
			if( !!ship )
			{
				ship.userData.bombCooldown = 8.0;
				ship.userData.bomber = this;
			}

			jumpStart.playSound("sounds/bomberin", 0.3);

			this.userData.dropDelay = 0.7;
			this.userData.payload = 4;
			this.userData.table = table;
		},
		"spawnExplosion": function(position, scale, table)
		{
			//var soundFile = ( typeof sound === "undefined" ) ? "legacy/v1/sounds/SpacePilot/explosion0" : sound;

			//JumpStart.playSound(soundFile, 0.5);

			var explosion = jumpStart.spawnInstance(null);
			explosion.applyBehavior("asyncModel", {"modelFile": "models/explosion"});
			explosion.userData.table = table;
			explosion.position.copy(position);

			explosion.userData.scaleSize = 0.001;
			explosion.userData.scaleDirection = 1;
			explosion.userData.maxScale = scale;
			explosion.scale.set(explosion.userData.scaleSize, explosion.userData.scaleSize, explosion.userData.scaleSize);

			explosion.addEventListener("tick", function()
			{
				var table = this.userData.table;

				if( table.parent !== jumpStart.world )
					jumpStart.removeInstance(this);

				// only proceed if active
				if( !table.syncData.hoverBlasterTable.isActive )
					return;

				if( this.userData.scaleDirection === 1 )
				{
					this.userData.scaleSize += 1.0 * jumpStart.deltaTime;
					if( this.userData.scaleSize >= this.userData.maxScale )
						this.userData.scaleDirection = -1;
				}
				else
				{
					this.userData.scaleSize -= 2.0 * jumpStart.deltaTime;

					if( this.userData.scaleSize <= 0.001 )
					{
						jumpStart.removeInstance(this);
						return;
					}
				}

				this.scale.set(this.userData.scaleSize, this.userData.scaleSize, this.userData.scaleSize);
				this.rotateY(5.0 * jumpStart.deltaTime);
				this.rotateX(15.0 * jumpStart.deltaTime);
			});

			return explosion;
		},
		"gunTick": function()
		{
			var table = this.userData.table;
			var ship = table.userData.hoverBlasterTable.ship;

			// only proceed if active
			if( !ship || !table.syncData.hoverBlasterTable.isActive )
				return;

			// tower yaw
			this.userData.tower.parent.updateMatrixWorld();
			THREE.SceneUtils.detach(this.userData.tower, this.userData.base, jumpStart.scene);
			var targetPos = ship.position.clone();
			jumpStart.world.localToWorld(targetPos);
			this.userData.tower.lookAt(targetPos);//.multiplyScalar(jumpStart.options.sceneScale));
			this.userData.tower.updateMatrixWorld();
			THREE.SceneUtils.attach(this.userData.tower, jumpStart.scene, this.userData.base);
			this.userData.tower.rotation.x = 0;
			this.userData.tower.rotation.z = 0;

			// barrels pitch
			this.userData.barrels.parent.updateMatrixWorld();
			THREE.SceneUtils.detach(this.userData.barrels, this.userData.tower, jumpStart.scene);
			var targetPos = ship.position.clone();
			jumpStart.world.localToWorld(targetPos);
			this.userData.barrels.lookAt(targetPos);//.multiplyScalar(jumpStart.options.sceneScale));
			this.userData.barrels.updateMatrixWorld();
			THREE.SceneUtils.attach(this.userData.barrels, jumpStart.scene, this.userData.tower);
			this.userData.barrels.rotation.y = 0;
			this.userData.barrels.rotation.z = 0;

			var pitchMin = -Math.PI / 3.0;
			var pitchMax = Math.PI / 7.0;

			if( this.userData.barrels.rotation.x > pitchMax )
				this.userData.barrels.rotation.x = pitchMax;
			else if( this.userData.barrels.rotation.x < pitchMin )
				this.userData.barrels.rotation.x = pitchMin;

			this.userData.fireCooldown -= jumpStart.deltaTime;

			if( this.userData.fireCooldown <= 0 )
			{
				this.userData.fireCooldown = 0.5;
				//PlayDynamicSound("legacy/v1/sounds/SpacePilot/laser0", 0.05, 2.0);
				jumpStart.behaviors.hoverBlasterTable.gunFireLaser.call(this.userData.barrels, new THREE.Vector3(2.4, 0, 10.0), this, true);
				jumpStart.behaviors.hoverBlasterTable.gunFireLaser.call(this.userData.barrels, new THREE.Vector3(-2.4, 0, 10.0), this, false);

				jumpStart.playSound("sounds/laser2", 0.03);
			}
		},
		"spawnGun": function(entry)//rotZ)
		{
			var rotZ = entry.offsetX;

			var gun = jumpStart.spawnInstance(null, {"parent": this});
			gun.userData.entryID = entry.id;
			gun.userData.table = this;
			gun.userData.hitRadius = 20.0;
			gun.userData.fireCooldown = 0.0;
			gun.addEventListener("spawn", jumpStart.behaviors.hoverBlasterTable.gunSpawn);
			gun.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.gunTick);
			gun.userData.kill = function()
			{
				var table = this.userData.table;
				var debris = jumpStart.spawnInstance(null, {"parent": table});
				debris.applyBehavior("asyncModel", {"modelFile": "models/manualgun_base_broken", "useBubbleIn": false});
				debris.userData.table = table;
				debris.userData.rotOffset = this.userData.rotOffset;
				debris.userData.maxGrowScale = 1.0;
				debris.position.copy(this.position);
				debris.quaternion.copy(this.quaternion);
				debris.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.rotFade);

				//jumpStart.behaviors.hoverBlasterTable.spawnCoin.call(table, this.rotation.z);
///*
				var coin = jumpStart.spawnInstance(null, {"parent": table});
				coin.applyBehavior("asyncModel", {"modelFile": "models/coin"});
				coin.userData.table = this.userData.table;
				coin.userData.hitRadius = 10.0;
				coin.userData.rotOffset = this.userData.rotOffset;
				coin.userData.maxGrowScale = 1.0;
				coin.position.copy(this.position);
				coin.quaternion.copy(this.quaternion);
				coin.translateY(25.0);
				coin.rotateY(Math.PI / 2.0);
				coin.scale.set(0.1, 0.1, 0.1);
				coin.userData.collected = function()
				{
					var table = this.userData.table;
					var ship = this.userData.table.userData.hoverBlasterTable.ship;

					jumpStart.playSound("sounds/coin_collect", 0.8);
					this.removeEventListener("tick", jumpStart.behaviors.hoverBlasterTable.shipHitCollect);
					this.removeEventListener("tick", jumpStart.behaviors.hoverBlasterTable.rotFade);
					this.applyBehavior("shrinkRemove", {"speed": 3.0});

					if( table.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userID )
					{
						var index = 7;
						while( index > 0 )
						{
							var bar = ship.userData.healthBar.userData["bar" + index];
							if( !!bar )
								break;

							index--;
						}

						if( index < 7)
						{
							index++;

							// health bar
							function spawnBar(ship)
							{
								var geometry = (jumpStart.isGearVR) ? new THREE.SphereGeometry( 3, 5, 5 ) : new THREE.SphereGeometry( 3, 8, 8 );
								var material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
								var barObject = new THREE.Mesh( geometry, material );
								var bar = jumpStart.spawnInstance(null, {"object": barObject, "parent": ship});
								return bar;
							}

							var bar = spawnBar(ship);
							bar.position.copy(ship.userData.healthBarPositions[index]);
							ship.userData.healthBar.userData["bar" + index] = bar;

							ship.userData.health += 40.0;
						}
						
						ship.syncData.coins++;
						ship.sync({"syncData": true});
					}
				};
				coin.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.rotFade);
				coin.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.shipHitCollect);
				jumpStart.playSound("sounds/explosion1", 0.1);
				jumpStart.removeInstance(this);
			};

			gun.userData.health = 200.0;
			gun.userData.rotOffset = -this.userData.hoverBlasterTable.rot;
			gun.rotation.x = gun.userData.rotOffset;
			gun.rotateX(-Math.PI / 2.0);
			gun.rotateZ(rotZ);
			gun.translateY(this.userData.hoverBlasterTable.radius);
			gun.scale.set(0.0001, 0.0001, 0.0001);
			gun.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.rotFade);
			gun.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.hitDetect);
			gun.addEventListener("remove", function()
			{
				var table = this.userData.table;
				table.userData.hoverBlasterTable.guns.splice(table.userData.hoverBlasterTable.guns.indexOf(this), 1);
			});
			this.userData.hoverBlasterTable.guns.push(gun);

			// reposition any rocks that are in the way
			jumpStart.behaviors.hoverBlasterTable.repositionRocks.call(this, [gun]);
		},
		"repositionRocks": function(obsticals)
		{
			var i, obstical, j, rock, y, direction;
			for( i = 0; i < obsticals.length; i++ )
			{
				obstical = obsticals[i];
				for( j = 0; j < this.userData.hoverBlasterTable.rocks.length; j++ )
				{
					rock = this.userData.hoverBlasterTable.rocks[j];
					if( rock.position.distanceTo(obstical.position) < 50.0 )
					{
						y = rock.position.distanceTo(new THREE.Vector3());

						direction = (rock.position.x > obstical.position.x) ? -1.0 : 1.0;
						rock.position.set(0, 0, 0);
						rock.rotateZ((Math.PI / 16.0) * direction);
						rock.translateY(y);
					}
				}
			}
		},
		"spawnCoin": function(entry)//rotZ)
		{
			var rotZ = entry.offsetX;

			var coin = jumpStart.spawnInstance(null, {"parent": this});
			coin.applyBehavior("asyncModel", {"modelFile": "models/coin"});
			coin.userData.entryID = entry.id;
			coin.userData.table = this;
			coin.userData.hitRadius = 10.0;
			coin.userData.rotOffset = -this.userData.hoverBlasterTable.rot;
			coin.rotation.x = coin.userData.rotOffset;
			coin.rotateX(-Math.PI / 2.0);
			coin.rotateZ(rotZ);
			coin.translateY(this.userData.hoverBlasterTable.radius + 40.0);
			coin.rotateY(Math.PI / 2.0);
			coin.scale.set(0.0001, 0.0001, 0.0001);
			coin.userData.collected = function()
			{
				var table = this.userData.table;
				var ship = this.userData.table.userData.hoverBlasterTable.ship;

				jumpStart.playSound("sounds/coin_collect", 0.8);
				this.removeEventListener("tick", jumpStart.behaviors.hoverBlasterTable.shipHitCollect);
				this.removeEventListener("tick", jumpStart.behaviors.hoverBlasterTable.rotFade);
				this.applyBehavior("shrinkRemove", {"speed": 3.0});

				if( table.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userID )
				{
					var index = 7;
					while( index > 0 )
					{
						var bar = ship.userData.healthBar.userData["bar" + index];
						if( !!bar )
							break;

						index--;
					}

					if( index < 7)
					{
						index++;

						// health bar
						function spawnBar(ship)
						{
							var geometry = (jumpStart.isGearVR) ? new THREE.SphereGeometry( 3, 5, 5 ) : new THREE.SphereGeometry( 3, 8, 8 );
							var material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
							var barObject = new THREE.Mesh( geometry, material );
							var bar = jumpStart.spawnInstance(null, {"object": barObject, "parent": ship});
							return bar;
						}

						var bar = spawnBar(ship);
						bar.position.copy(ship.userData.healthBarPositions[index]);
						ship.userData.healthBar.userData["bar" + index] = bar;

						ship.userData.health += 40.0;
					}
					
					ship.syncData.coins++;
					ship.sync({"syncData": true});
				}
			};
			coin.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.rotFade);
			coin.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.shipHitCollect);

			// reposition any rocks that are in the way
			jumpStart.behaviors.hoverBlasterTable.repositionRocks.call(this, [coin]);
		},
		"shipHitCollect": function()
		{
			var table = this.userData.table;
			var ship = table.userData.hoverBlasterTable.ship;

			// check for ship collision
			var thisPosition = this.getWorldPosition();
			var shipPosition = ship.getWorldPosition();
			var dist = thisPosition.distanceTo(shipPosition);
			if( dist * ship.scale.x < (ship.userData.radius / 2.0) * jumpStart.options.sceneScale )//* shieldVal )
				this.userData.collected.call(this);
		},
		"spawnRocks": function(entry)//rotZ)
		{
			rotZ = entry.offsetX;
			var rocks = jumpStart.spawnInstance(null, {"parent": this});
			rocks.applyBehavior("asyncModel", {"modelFile": "models/rocks"});
			rocks.userData.entryID = entry.id;
			rocks.userData.table = this;
			rocks.userData.hitRadius = 20.0;
			rocks.userData.rotOffset = -this.userData.hoverBlasterTable.rot;
			rocks.rotation.x = rocks.userData.rotOffset;
			rocks.rotateX(-Math.PI / 2.0);
			rocks.rotateZ(rotZ);
			rocks.translateY(this.userData.hoverBlasterTable.radius);
			rocks.scale.set(0.0001, 0.0001, 0.0001);
			rocks.userData.health = 100.0;
			rocks.userData.kill = jumpStart.behaviors.hoverBlasterTable.rocksKill;
			rocks.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.rotFade);
			rocks.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.hitDetect);
			rocks.addEventListener("remove", function()
			{
				var table = this.userData.table;
				table.userData.hoverBlasterTable.rocks.splice(table.userData.hoverBlasterTable.rocks.indexOf(this), 1);
			});

			// reposition this rock if its too close to a gun
			var i, gun;
			for( i = 0; i < this.userData.hoverBlasterTable.guns.length; i++ )
			{
				gun = this.userData.hoverBlasterTable.guns[i];

				if( rocks.position.distanceTo(gun.position) < 50.0 )
				{
					y = rocks.position.distanceTo(new THREE.Vector3());

					direction = (rocks.position.x > gun.position.x) ? -1.0 : 1.0;
					rocks.position.set(0, 0, 0);
					rocks.rotateZ((Math.PI / 16.0) * direction);
					rocks.translateY(y);
				}
			}

//			this.userData.hoverBlasterTable.guns

			this.userData.hoverBlasterTable.rocks.push(rocks);
		},
		"spawnCrazy": function(entry)//rotZ, rotY)
		{
			var rotZ = entry.offsetX;
			var rotY = entry.rotY;
//console.log(this.syncData.hoverBlasterTable.originalQuaternion);
			var crazy = jumpStart.spawnInstance(null);
			crazy.position.copy(this.position);
			crazy.quaternion.copy(this.syncData.hoverBlasterTable.originalQuaternion);
			//crazy.rotateX(Math.PI);// * 2.0);
			crazy.applyBehavior("asyncModel", {"modelFile": "models/thai"});
			crazy.userData.entryID = entry.id;
			crazy.userData.table = this;
			crazy.userData.hitRadius = 10.0;
			crazy.userData.health = 100.0;
			crazy.userData.dumbTime = 2.8;
			//crazy.translateX(-Math.PI / 2.0);
			//crazy.rotateX(-Math.PI / 1.5);
			crazy.rotateX(-Math.PI);
			crazy.translateY(this.position.y - 20.0);
			crazy.translateZ(-this.userData.hoverBlasterTable.radius);
			crazy.rotateX(Math.PI + (Math.PI / 2.0));
			//crazy.position.z -= this.userData.hoverBlasterTable.radius;
			//crazy.position.y = this.position.y + 20.0;
			//crazy.rotation.x = -Math.PI / 2.0;

			//var rot = Math.PI * 0.4 * Math.random();
			//rot *= (Math.random() > 0.5) ? 1.0 : -1.0;
			crazy.rotateY(rotY);

			crazy.addEventListener("tick", function()
			{
				var table = this.userData.table;
				if( !!!jumpStart.objects[table.uuid] )//table.parent !== jumpStart.world )
					jumpStart.removeInstance(this);

				// only proceed if active
				if( !table.syncData.hoverBlasterTable.isActive )
					return;

				this.translateZ(60.0 * jumpStart.deltaTime);

				// remove if outside of enclosure
				if( !jumpStart.isWorldPosInsideOfEnclosure(this.position) )
				{
					jumpStart.removeInstance(this);
					return;
				}

				// remove if surface impact
				if( table.position.distanceTo(this.position) < table.userData.hoverBlasterTable.radius )
				{
					this.userData.kill.call(this);
					return;		
				}

				this.userData.dumbTime -= jumpStart.deltaTime;
				if( this.userData.dumbTime > 0 )
					return;

				var table = this.userData.table;
				var ship = table.userData.hoverBlasterTable.ship;

				if( this.userData.dumbTime > -4.0 )
				{
					var currentQuaternion = this.quaternion.clone();
					this.lookAt(ship.position);

					var targetQuaternion = this.quaternion.clone();
					currentQuaternion.slerp(targetQuaternion, 0.02);
					this.quaternion.copy(currentQuaternion);
				}
				else
					this.lookAt(ship.position);

				// update the shadow
				displacementRay = this.userData.displacementRay;
				var pos = this.getWorldPosition();
				jumpStart.world.worldToLocal(pos);
				displacementRay.lookAt(pos);
			});

			crazy.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.hitDetect);
			crazy.userData.kill = function()
			{
				jumpStart.playSound("sounds/explosion1", 0.1);
				jumpStart.behaviors.hoverBlasterTable.spawnExplosion(this.position, 0.5, this.userData.table);
				jumpStart.removeInstance(this);
			};

			crazy.addEventListener("remove", function()
			{
				jumpStart.removeInstance(this.userData.displacementRay);
			});

			var displacementRay = jumpStart.spawnInstance(null);//new THREE.Ray(this.position.clone(), new THREE.Vector3(0, 0, 0));
			displacementRay.position.copy(this.position);

			var crazyPos = crazy.getWorldPosition();
			displacementRay.lookAt(crazyPos);

			var geometry = new THREE.SphereGeometry( 10, 5, 8, 0, Math.PI);
			//var material = new THREE.MeshBasicMaterial( {color: 0x000000, transparent: true, opacity: 0.5} );
			var material = new THREE.MeshBasicMaterial( {color: 0x000000} );
			var shadowObject = new THREE.Mesh( geometry, material );
			var shadow = jumpStart.spawnInstance(null, {"object": shadowObject, "parent": displacementRay});
			shadow.scale.z = 0.01;//0.3;
			shadow.position.z = this.userData.hoverBlasterTable.radius - 0.5;
			displacementRay.userData.shadow = shadow;
			crazy.userData.displacementRay = displacementRay;
		},
		"removeBehavior": function()
		{
			delete jumpStart.behaviors.hoverBlasterTable.tables[this.name];

			//this.userData.hoverBlasterTable.playerBoardElem.parentNode.removeChild(table.userData.hoverBlasterTable.playerBoardElem);
			//this.userData.hoverBlasterTable.playerBoardElem = null;

			//jumpStart.removeInstance(this.userData.hoverBlasterTable.board);

			if( this.ownerID === jumpStart.localUser.userId )
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

				jumpStart.behaviors.hoverBlasterTable.focusedTableRef = null;

				if( !jumpStart.isAltspace )
				{
					jumpStart.camera.position.copy(this.userData.hoverBlasterTable.originalCameraPosition);
					jumpStart.camera.quaternion.copy(this.userData.hoverBlasterTable.originalCameraQuaternion);
					this.userData.hoverBlasterTable.originalCameraPosition = null;
					this.userData.hoverBlasterTable.originalCameraQuaternion = null;
					jumpStart.removeEventListener("tick", jumpStart.behaviors.hoverBlasterTable.autoWebCamera);
				}

				jumpStart.removeEventListener("gamepadbutton", jumpStart.behaviors.hoverBlasterTable.tableButtonListener);

				jumpStart.removeInstance(this.userData.hoverBlasterTable.ship);
			}
		},
		"fireLaser": function()
		{
			jumpStart.playSound("sounds/laser1", 0.1);

			var table = this.userData.table;
			var laserOffsets = [{"x": 5, "y": 0, "z": 50}, {"x": -5, "y": 0, "z": 50}];
			var i, laserOffset, laser;
			for( i = 0; i < laserOffsets.length; i++ )
			{
				laser = jumpStart.spawnInstance(null);
				laser.applyBehavior("asyncModel", {"modelFile": "models/player_laser", "useBubbleIn": false});
				laser.userData.table = table;
				laser.userData.power = 20.0;	// must all be the same power cuz of how healthbar works
				laser.position.copy(this.position);
				laser.quaternion.copy(this.quaternion);

				laserOffset = laserOffsets[i];
				laser.translateX(laserOffset.x * this.scale.x);
				laser.translateY(laserOffset.y * this.scale.x);
				laser.translateZ(laserOffset.z * this.scale.x);
				laser.scale.set(0.5, 0.5, 1.0);
				laser.scale.multiplyScalar(this.scale.x);
				laser.userData.age = 1.0;

				table.userData.hoverBlasterTable.lasers[laser.uuid] = laser;
				laser.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.laserTick);
				laser.addEventListener("remove", jumpStart.behaviors.hoverBlasterTable.laserRemove);
			}

			if( table.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userID )
			{
				this.syncData.shotsFired++;
				this.sync({"syncData": true});
			}
		},
		"laserTick": function()
		{
			var table = this.userData.table;

			if( table.parent !== jumpStart.world )
				jumpStart.removeInstance(this);

			// only proceed if active
			if( !table.syncData.hoverBlasterTable.isActive )
				return;

			this.userData.age += jumpStart.deltaTime;
			this.translateZ(30.0 * jumpStart.deltaTime * this.userData.age);

			// remove if outside of enclosure
			if( !jumpStart.isWorldPosInsideOfEnclosure(this.position) || this.position.distanceTo(table.position) > table.userData.hoverBlasterTable.radius * 3.0 )//new THREE.Vector3()
			{
				jumpStart.removeInstance(this);
				return;
			}

			// remove if surface impact
			if( table.position.distanceTo(this.position) < table.userData.hoverBlasterTable.radius )
			{
				//if( enemy.ownerID === jumpStart.localUser.userID )
				//	enemy.userData.onDamage.call(enemy, this.userData.power);

				jumpStart.removeInstance(this);
				return;
			}
		},
		"weaponExplosionRemove": function()
		{
			var table = this.userData.table;
			delete table.userData.hoverBlasterTable.weaponExplosions[this.uuid];
		},
		"enemyLaserRemove": function()
		{
			var table = this.userData.table;
			delete table.userData.hoverBlasterTable.enemyLasers[this.uuid];
		},
		"laserRemove": function()
		{
			var table = this.userData.table;
			delete table.userData.hoverBlasterTable.lasers[this.uuid];
		},
		"shipTick": function()
		{
			var table = this.userData.table;
			if( !!!table )
				return;

			if( this.userData.oldDead !== this.syncData.dead )
			{
				this.userData.oldDead = this.syncData.dead;
				jumpStart.behaviors.hoverBlasterTable.gameOverNotify.call(table);
			}

			if( this.userData.oldCoins !== this.syncData.coins )
			{
				this.userData.oldCoins = this.syncData.coins;
				
				var params = {
					size: 12.0,
					height: 1,
					font: jumpStart.font,//"helvetiker",
					curveSegments: (jumpStart.isGearVR) ? 1 : 2
				};

				var geometry = new THREE.TextGeometry(ship.syncData.coins, params);
				var material = new THREE.MeshBasicMaterial({color:'yellow'});
				var mesh = new THREE.Mesh(geometry, material);

				geometry.computeBoundingBox();
				var displacement = new THREE.Vector3().copy(geometry.boundingBox.max).sub(geometry.boundingBox.min);

				var text = jumpStart.spawnInstance(null)
				text.userData.table = table;
				text.position.copy(ship.position);
				text.quaternion.copy(table.syncData.hoverBlasterTable.originalQuaternion);
				text.rotateX(Math.PI);
				text.position.y += 10.0;
//					text.lookAt(jumpStart.localUser.skeleton.getJoint("Eye"));

				var textMesh = jumpStart.spawnInstance(null, {"object": mesh, "parent": text})
				var offset = new THREE.Vector3().copy(displacement);
				offset.multiply(textMesh.scale);
				textMesh.position.set(-offset.x / 2.0, -offset.y / 2.0, -offset.z / 2.0);

				text.userData.life = 1.5;
				text.addEventListener("tick", function()
				{
					this.userData.life -= jumpStart.deltaTime;

					if( this.userData.life <= 0 )
					{
						//jumpStart.removeInstance(this);
						this.removeEventListener("tick", arguments.callee);
						this.applyBehavior("shrinkRemove");
						return;
					}

					this.position.y += 10.0 * jumpStart.deltaTime;
				});
			}

			if( this.userData.hasOwnProperty("bombCooldown") )
			{
				var oldCooldown = this.userData.bombCooldown;
				this.userData.bombCooldown -= jumpStart.deltaTime;

				if( oldCooldown > 0 && this.userData.bombCooldown <= 0 )
					jumpStart.playSound("sounds/bomberready", 0.3);
			}
			//console.log("tick of ship");
			//var table = this.userData.table;
			//console.log(jumpStart.activeGamepadIndex);
			//console.log(table);
//				if( !!table )
//					console.log(table.syncData);

			//if( !!table && !!table.syncData )
			//{
				//var gpads = (!!navigator.getGamepads) ? navigator.getGamepads() : navigator.webkitGetGamepads();

				//console.log(table.syncData.hoverBlasterTable.isActive);
				//console.log(gpads[0] + " vs " + jumpStart.gamepad);
		//	}

			//console.log("end");
			//return;
//				if( jumpStart.activeGamepadIndex > -1 && !!table && !!table.syncData )
//					console.log(table.syncData.hoverBlasterTable.isActive);

			var table = this.userData.table;
			if( !!!table || !table.syncData.hoverBlasterTable.isActive )
				return;

			if( table.ownerID === jumpStart.localUser.userID )
			{
				if( this.userData.fireCooldown > 0 )
					this.userData.fireCooldown -= jumpStart.deltaTime;

				if( this.userData.fireCooldown < 0 )
					this.userData.fireCooldown = 0;

				var position, quaternion;
				if( jumpStart.activeGamepadIndex > -1 )
				{
					if( jumpStart.gamepad.mapping === "steamvr" )
					{
						var pos = jumpStart.gamepad.position;
						var rot = jumpStart.gamepad.rotation;

						var targetPosition = new THREE.Vector3(jumpStart.gamepad.position.x, jumpStart.gamepad.position.y, jumpStart.gamepad.position.z);
						jumpStart.world.worldToLocal(targetPosition);
//console.log(jumpStart.scene.scale.x);
						var max = table.userData.hoverBlasterTable.radius * 2.0;//-jumpStart.worldOffset.y;
						if( targetPosition.length() > max )
						{
							var posY = targetPosition.y;
							targetPosition.normalize().multiplyScalar(max);
							targetPosition.y = posY;
						}

						max = table.userData.hoverBlasterTable.radius * 2.0;
						if( targetPosition.length() > max )
						{
							var posY = targetPosition.y;
							targetPosition.normalize().multiplyScalar(max);
							targetPosition.y = posY;
						}
						
						var min = table.userData.hoverBlasterTable.radius * 1.1;
						if( targetPosition.distanceTo(table.position) < min )
						{
							targetPosition = targetPosition.sub(table.position).normalize().multiplyScalar(min);
							targetPosition.add(table.position);
						}
						var currentPosition = this.position.clone();
						currentPosition.lerp(targetPosition, 0.1);

						//currentPosition.multiplyScalar(jumpStart.scene.scale.x);
						this.position.copy(currentPosition);

						var targetQuaternion = new THREE.Quaternion(jumpStart.gamepad.rotation.x, jumpStart.gamepad.rotation.y, jumpStart.gamepad.rotation.z, jumpStart.gamepad.rotation.w);
						var currentQuaternion = this.quaternion.clone();
						this.quaternion.copy(targetQuaternion);
						this.rotateX(Math.PI / 4.0);
						//this.translateY(1.1);
						this.translateY(0.6);
						//this.translateZ(1.3);
						this.translateZ(0.6);
						targetQuaternion = this.quaternion.clone();

						currentQuaternion.slerp(targetQuaternion, 0.9);
						this.quaternion.copy(currentQuaternion);
					}
					else
					{
						var pitchAxisValue = jumpStart.gamepad.axes[0];
						var yawAxisValue = jumpStart.gamepad.axes[1];

						// position
						var currentPosition = this.position.clone();

						var positionRay = this.userData.positionRay;
						var oldRotation = positionRay.rotation.clone();
						positionRay.rotateY(pitchAxisValue * jumpStart.deltaTime);

						//console.log(positionRay.rotation.y);
						//var max = table.syncData.hoverBlasterTable.originalRotation.y + 0.3;
						//var min = table.syncData.hoverBlasterTable.originalRotation.y - 0.3
						//if( positionRay.rotation.y < min )
						//	positionRay.rotation.y = min;//oldRotation.y;
						//else if( positionRay.rotation.y > max )
						//	positionRay.rotation.y = max;

						//var max = 0.7;
						//if( Math.abs(table.syncData.hoverBlasterTable.originalRotation.y - positionRay.rotation.y) > max )
						//	positionRay.rotation.copy(oldRotation);


						oldRotation = positionRay.rotation.clone();
						positionRay.rotateX(yawAxisValue * jumpStart.deltaTime);

						//max = -1.2;
						//var min = -0.2;
						//if( positionRay.rotation.x > min )
						//	positionRay.rotation.x = min;//oldRotation.y;
						//else if( positionRay.rotation.x < max )
						//	positionRay.rotation.x = max;

//console.log(Math.abs(table.syncData.hoverBlasterTable.originalRotation.x - positionRay.rotation.x));
//						var originalRot = table.syncData.hoverBlasterTable.originalRotation.x - ((table.syncData.hoverBlasterTable.originalRotation.x / Math.PI) * Math.PI);
//console.log(originalRot + " vs " + positionRay.rotation.x);

						//if( Math.abs(table.syncData.hoverBlasterTable.originalRotation.x - positionRay.rotation.x) > max )
						//	positionRay.rotation.copy(oldRotation);

						var shadowPos = positionRay.userData.shadow.getWorldPosition();
						var originPos = positionRay.getWorldPosition();

						// rotation
						var currentQuaternion = this.quaternion.clone();

						//var quaternion = positionRay.userData.shadow.getWorldQuaternion();
						//var quaternion = positionRay.userData.shadow.quaternion.clone();
						//var quaternion = positionRay.getWorldQuaternion();
						//var quaternion = table.syncData.hoverBlasterTable.originalQuaternion.clone();
						//this.quaternion.copy(quaternion);
						//this.rotateZ(Math.PI);
						//this.rotation.z = 0;
						//this.rotateY(Math.PI);
						//this.rotateX(-Math.PI / 3.0);
						this.lookAt(table.position);
						this.rotateX(-Math.PI / 2.8);
						var quaternion = this.quaternion.clone();

						var axisValueA = jumpStart.gamepad.axes[2];
						var axisValusB = jumpStart.gamepad.axes[3];
						this.rotateY(-axisValueA);
						this.rotateX(axisValusB);

						quaternion.copy(this.quaternion);
						currentQuaternion.slerp(quaternion, 0.1);
						this.quaternion.copy(currentQuaternion);

						var axisValueC = jumpStart.gamepad.buttons[6];
						var heightOffset = 20.0 + (20.0 * axisValueC.value);

						var pos = shadowPos.sub(originPos).normalize();
						pos.multiplyScalar(table.userData.hoverBlasterTable.radius + heightOffset);
						pos.add(table.position);

						currentPosition.lerp(pos, 0.1);
						this.position.copy(currentPosition);
					}
				}
				else
				{
					if( false && jumpStart.localUser.cursorHit )
					{
						var oldPos = this.position.clone();
						var oldQuaternion = this.quaternion.clone();

						var pos = jumpStart.world.worldToLocal(jumpStart.localUser.cursorHit.point);
						if( pos.x > 70.0 )
							pos.x = 70.0;
						else if( pos.x < -70.0 )
							pos.x = -70.0;

						if( pos.y > 180.0 )
							pos.y = 180.0;
						else if( pos.y < 90.0 )
							pos.y = 90.0;

						var oldRayQuaternion = this.userData.positionRay.quaternion.clone();
						this.userData.positionRay.lookAt(pos);
						var targetRayQuaternion = this.userData.positionRay.quaternion.clone();
						this.userData.positionRay.quaternion.copy(oldRayQuaternion);
						this.userData.positionRay.quaternion.slerp(targetRayQuaternion, 0.02);

						this.position.copy(this.userData.positionRay.position);
						this.quaternion.copy(this.userData.positionRay.quaternion);

						if( this.userData.shiftDown )
							this.translateZ(180.0);
						else
							this.translateZ(140.0);

						this.rotateX(Math.PI / 2.0);
						this.rotateY(Math.PI);
						this.rotateX(Math.PI / 6.5);
					}
				}
			}
			else
			{
				if( this.userData.oldShotsFired !== this.syncData.shotsFired )
				{
					this.userData.oldShotsFired = this.syncData.shotsFired;
					jumpStart.behaviors.hoverBlasterTable.fireLaser.call(this);
				}
			}

			// update the shadow
			displacementRay = this.userData.displacementRay;
			var pos = this.getWorldPosition();
			jumpStart.world.worldToLocal(pos);
			displacementRay.lookAt(pos);
		},
		"shipSpawn": function(isInitialSync) 
		{
			console.log("SHIP SPANW");
			//if( this.ownerID !== jumpStart.localUser.userID)
				//return;

			if( isInitialSync && this.ownerID === jumpStart.localUser.userID )
			{
				setTimeout(function(){ jumpStart.removeInstance(this); }.bind(this), 1000);
				return;
			}

			var table = jumpStart.scene.getObjectByName(this.syncData.tableName);
			if( !!!table )
				return;
			
			// local apply
			this.applyBehavior("asyncModel", {"modelFile": "models/hawk"});
			//this.syncData.vehicleModel = "models/hawk"

			table.userData.hoverBlasterTable.ship = this;
			this.userData.table = table;
			this.userData.oldShotsFired = this.syncData.shotsFired;
			//jumpStart.removeInstance(table.userData.hoverBlasterTable.dome);
			//table.userData.hoverBlasterTable.dome = null;
//			if( table.syncData.hoverBlasterTable !== jumpStart.localUser.userID )
//			{
//				this.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.shipTick);
//			}

			this.userData.oldDead = this.syncData.dead;
			this.userData.oldCoins = this.syncData.coins;

			ship = this;
			ship.userData.bombCooldown = 8.0;
			//ship.userData.table = this;
			ship.userData.radius = 10.0;
			ship.userData.shields = 1.0;
			ship.userData.health = 100.0;
			ship.userData.fireCooldown = 0;
			ship.scale.multiplyScalar(0.4);	// FIXME: native scale the ship OBJ
			//ship.translateY(180.0);
			//ship.rotateY(Math.PI);
			//ship.translateZ(-100.0);
			//ship.rotateX(Math.PI / -12.0);

			// health bar
			function spawnBar(ship)
			{
				var geometry = (jumpStart.isGearVR) ? new THREE.SphereGeometry( 3, 5, 5 ) : new THREE.SphereGeometry( 3, 8, 8 );
				var material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
				var barObject = new THREE.Mesh( geometry, material );
				var bar = jumpStart.spawnInstance(null, {"object": barObject, "parent": ship});
				return bar;
			}

			var healthBar = jumpStart.spawnInstance(null, {"parent": ship});
			var bar = spawnBar(ship);

			if( true || ship.modelFile == "models/hawk" )
			{
				ship.userData.healthBarPositions = [
				null,
				new THREE.Vector3(0, 0, -25.8),
				new THREE.Vector3(0, 7.5, -23.8),
				new THREE.Vector3(0, 11.0, -18.0),
				new THREE.Vector3(0, 7.7, -10.3),
				new THREE.Vector3(0, 5.5, -3.0),
				new THREE.Vector3(0, 5.5, 5.0),
				new THREE.Vector3(0, 5.5, 12.0)
				];
			}
			else
			{
				ship.userData.healthBarPositions = [
				null,
				new THREE.Vector3(-30, -10, -23),
				new THREE.Vector3(-20, -10, -33),
				new THREE.Vector3(-10, -10, -37),
				new THREE.Vector3(0, -10, -40),
				new THREE.Vector3(10, -10, -37),
				new THREE.Vector3(20, -10, -33),
				new THREE.Vector3(30, -10, -23)
				];
			}

			bar.position.copy(ship.userData.healthBarPositions[1]);
			healthBar.userData.bar1 = bar;

			bar = spawnBar(ship);
			bar.position.copy(ship.userData.healthBarPositions[2]);
			healthBar.userData.bar2 = bar;

			bar = spawnBar(ship);
			bar.position.copy(ship.userData.healthBarPositions[3]);
			healthBar.userData.bar3 = bar;			

			bar = spawnBar(ship);
			bar.position.copy(ship.userData.healthBarPositions[4]);
			healthBar.userData.bar4 = bar;

			bar = spawnBar(ship);
			bar.position.copy(ship.userData.healthBarPositions[5]);
			healthBar.userData.bar5 = bar;

			bar = spawnBar(ship);
			bar.position.copy(ship.userData.healthBarPositions[6]);
			healthBar.userData.bar6 = bar;

			bar = spawnBar(ship);
			bar.position.copy(ship.userData.healthBarPositions[7]);
			healthBar.userData.bar7 = bar;			

			ship.userData.healthBar = healthBar;

			//var worldPos = this.position.clone();
			//jumpStart.world.localToWorld(worldPos);

			var positionRay = jumpStart.spawnInstance(null);//new THREE.Ray(this.position.clone(), new THREE.Vector3(0, 0, 0));
			//ship.userData.positionRay = positionRay;
			//var debugVisual = jumpStart.spawnInstance(null, {"parent": positionRay});
			//debugVisual.scale.z = 200.0;
			//debugVisual.applyBehavior("asyncModel", {"modelFile": "engine/models/pixel"});
			positionRay.position.copy(table.position);
			positionRay.quaternion.copy(table.quaternion);

			var pos;
			if( jumpStart.isAltspace )
				pos = jumpStart.localUser.skeleton.getJoint("Eye").getWorldPosition();
			else
				pos = jumpStart.camera.getWorldPosition();

			pos.y = positionRay.position.y + table.userData.hoverBlasterTable.radius;

			positionRay.lookAt(pos);
			//positionRay.rotateX(Math.PI);

//displacementRay.rotateX(Math.PI * -0.1);
			var shipPos = ship.getWorldPosition();
			//positionRay.lookAt(shipPos);

//displacementRay.rotateX(Math.PI * -0.1);
/*
			var geometry = new THREE.SphereGeometry( 10, 5, 8, 0, Math.PI);
			var material = new THREE.MeshBasicMaterial( {color: 0x000000, transparent: true, opacity: 0.5} );
			var shadowObject = new THREE.Mesh( geometry, material );
			*/

			var shadow = jumpStart.spawnInstance(null, {"parent": positionRay});
			/*
			shadow.addEventListener("tick", function()
			{
				var pos;
				if( jumpStart.isAltspace )
					pos = jumpStart.localUser.skeleton.getJoint("Eye").getWorldPosition();
				else
					pos = jumpStart.camera.getWorldPosition();

				//pos.y = this.position.y;

				this.lookAt(pos);
				//this.rotateX(Math.PI);
			});
			*/
			//shadow.quaternion.copy(table.quaternion);
			//shadow.rotateX(-Math.PI);
			//var pos = table.position.clone();
			//pos.y = shadow.position.y;
			//shadow.lookAt(pos);


			shadow.position.z = table.userData.hoverBlasterTable.radius;
			positionRay.userData.shadow = shadow;

			ship.userData.positionRay = positionRay;

			// FIXME: Why aren't the positionray and displacementray one and the same?
			var displacementRay = jumpStart.spawnInstance(null);//new THREE.Ray(this.position.clone(), new THREE.Vector3(0, 0, 0));
			displacementRay.position.copy(table.position);
			displacementRay.quaternion.copy(table.quaternion);

			ship.addEventListener("remove", function()
			{
				jumpStart.removeInstance(this.userData.positionRay);
				jumpStart.removeInstance(this.userData.displacementRay);
			});

			var crazyPos = ship.getWorldPosition();
			displacementRay.lookAt(crazyPos);

			var geometry = new THREE.SphereGeometry( 10, 5, 8, 0, Math.PI);
			//var material = new THREE.MeshBasicMaterial( {color: 0x000000, transparent: true, opacity: 0.5} );
			var material = new THREE.MeshBasicMaterial( {color: 0x000000} );
			var shadowObject = new THREE.Mesh( geometry, material );
			var shadow = jumpStart.spawnInstance(null, {"object": shadowObject, "parent": displacementRay});
			shadow.scale.z = 0.01;//0.3;
			shadow.position.z = table.userData.hoverBlasterTable.radius - 0.5;
			displacementRay.userData.shadow = shadow;
			ship.userData.displacementRay = displacementRay;

			var sight = jumpStart.spawnInstance(null, {"parent": ship});
			sight.applyBehavior("asyncModel", {"modelFile": "models/player_laser"});
			sight.scale.set(0.1, 0.1, 10.0);
			sight.translateZ(200.0);
			ship.userData.sight = sight;
			//table.userData.hoverBlasterTable.ship = ship;
/*
			var wand = jumpStart.spawnInstance("models/vivewand", {"parent": ship});
			wand.rotateX(Math.PI / -4.0);
			wand.translateZ(-40.0);
			wand.translateY(-8.0);
			wand.userData.direction = 1.0;
			wand.userData.maxScaleDelta = 0.3;
			wand.addEventListener("tick", function()
			{
				var delta = 1.0 * jumpStart.deltaTime * this.userData.direction;
				this.scale.add(new THREE.Vector3(delta, delta, delta));
				if( this.scale.x > 1.0 + this.userData.maxScaleDelta || this.scale.x < 1.0 - this.userData.maxScaleDelta )
				{
					var val = 1.0 + this.userData.maxScaleDelta * this.userData.direction;
					this.scale.set(val, val, val);
					this.userData.direction *= -1.0;
				}
				if( jumpStart.activeGamepadIndex > -1 )
				{
					if( jumpStart.gamepad.mapping === "steamvr" )
					{
						var pos = jumpStart.gamepad.position;
						var rot = jumpStart.gamepad.rotation;
						//var gamepadMatrix = new THREE.Matrix4().set(pos.x, pos.y, pos.z, 0, rot.x, rot.y, rot.z, 0, 1, 1, 1, 0, 0, 0, 0, 0);
						//this.matrix.copy(gamepadMatrix);
						var position = new THREE.Vector3(jumpStart.gamepad.position.x, jumpStart.gamepad.position.y, jumpStart.gamepad.position.z);

						jumpStart.world.worldToLocal(position);

						var wandPos = this.getWorldPosition();
						jumpStart.world.worldToLocal(wandPos);

						if( position.distanceTo(wandPos) < 10.0 )
							ship.userData.pressStartText.scale.set(1, 1, 1);
						else
							ship.userData.pressStartText.scale.set(0.0001, 0.0001, 0.0001);
					}
					//else
						//console.log("Select Ship");
				}
			});
			ship.userData.wand = wand;

			// create the "PULL TRIGGER" 3D text object
			var params = {
				size: 12.0,
				height: 1,
				font: "helvetiker",
				curveSegments: 1
			};
			var geometry = new THREE.TextGeometry("PULL TRIGGER", params);
			var material = new THREE.MeshBasicMaterial({color:'white'});
			var mesh = new THREE.Mesh(geometry, material);
			geometry.computeBoundingBox();
			var displacement = new THREE.Vector3().copy(geometry.boundingBox.max).sub(geometry.boundingBox.min);
			var pressStartText = jumpStart.spawnInstance(null, {"object": mesh, "parent": ship})
			var offset = new THREE.Vector3().copy(displacement);
			offset.multiply(pressStartText.scale);
			pressStartText.position.set(offset.x / 2.0, -offset.y / 2.0, -offset.z / 2.0);
			pressStartText.rotateY(Math.PI);
			pressStartText.translateY(25.0);
			pressStartText.scale.set(0.0001, 0.0001, 0.0001);
			ship.userData.pressStartText = pressStartText;
*/

			if( this.modelFile === "models/chopper" )
			{
				var blades = jumpStart.spawnInstance(null, {"parent": ship});
				blades.applyBehavior("asyncModel", {"modelFile": "models/chopper_blades"});
				blades.position.y = 8.81;
				blades.position.z = 2.888;
				blades.addEventListener("tick", function()
				{
					this.rotateY(-5.0 * jumpStart.deltaTime);
				});

				var bladesBack = jumpStart.spawnInstance(null, {"parent": ship});
				bladesBack.applyBehavior("asyncModel", {"modelFile": "models/chopper_blades_back"});
				bladesBack.position.z = -27.848;
				bladesBack.position.y = 3.982;
				bladesBack.addEventListener("tick", function()
				{
					this.rotateX(-8.0 * jumpStart.deltaTime);
				});
			}
			else if( this.modelFile === "models/chopper2" )
			{
				var blades = jumpStart.spawnInstance(null, {"parent": ship});
				blades.applyBehavior("asyncModel", {"modelFile": "models/chopper2_blades"});
				blades.position.y = 12.696;
				blades.position.z = -5.285;
				blades.addEventListener("tick", function()
				{
					this.rotateY(-10.0 * jumpStart.deltaTime);
				});

				var bladesBack = jumpStart.spawnInstance(null, {"parent": ship});
				blades.applyBehavior("asyncModel", {"modelFile": "models/chopper2_blades_back"});
				bladesBack.position.z = -32.696;
				bladesBack.position.y = 6.939;
				bladesBack.position.x = 1.217;
				bladesBack.addEventListener("tick", function()
				{
					this.rotateX(-8.0 * jumpStart.deltaTime);
				});
			}
		},
		"spawnBehavior": function(isInitialSync)
		{
			if( this.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userID )
			{
				var ship = jumpStart.spawnInstance(null);
				ship.position.copy(this.position);
				ship.quaternion.copy(this.quaternion);
				//ship.rotation.x = 0;
				//ship.translateZ(-400.0);
				//ship.translateY(-this.userData.hoverBlasterTable.radius);

				ship.syncData.dead = false;
				ship.syncData.tableName = this.name;
				ship.syncData.killed = {"none": true};
				ship.syncData.shotsFired = 0;
				ship.syncData.coins = 0;
				ship.addEventListener("spawn", jumpStart.behaviors.hoverBlasterTable.shipSpawn);
				ship.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.shipTick);
				ship.applyBehavior("autoSync");
				ship.applyBehavior("lerpSync", {"speed": 30.0});
				ship.sync();

				// FIXME: Spawn msgs should be called locally automatically by JumpStart!
				jumpStart.behaviors.hoverBlasterTable.shipSpawn.call(ship);


				// capture gamepad input
				//var table = this;
				jumpStart.behaviors.hoverBlasterTable.focusedTableRef = this;
				jumpStart.addEventListener("gamepadbutton", jumpStart.behaviors.hoverBlasterTable.tableButtonListener);

				// auto camera
				if( !jumpStart.isAltspace )
				{
					this.userData.hoverBlasterTable.originalCameraPosition = (jumpStart.isAltspace) ? null : jumpStart.camera.position.clone();
					this.userData.hoverBlasterTable.originalCameraQuaternion = (jumpStart.isAltspace) ? null : jumpStart.camera.quaternion.clone();
					jumpStart.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.autoWebCamera);
				}
			}
		},
		"autoWebCamera": function()
		{
			var oldPos = jumpStart.camera.position.clone();
			var oldQuaternion = jumpStart.camera.quaternion.clone();

			var table = jumpStart.behaviors.hoverBlasterTable.focusedTableRef;
			if( !!!table )
				return;

			var ship = table.userData.hoverBlasterTable.ship;
			if( !!!ship )
				return;

			jumpStart.camera.position.copy(ship.getWorldPosition());
			jumpStart.camera.quaternion.copy(ship.getWorldQuaternion());
			jumpStart.camera.rotateY(Math.PI);
			jumpStart.camera.translateZ(160.0);
			jumpStart.camera.translateY(140.0);
			jumpStart.camera.rotateX(-0.5);

			var targetPos = jumpStart.camera.position.clone();
			var targetQuaternion = jumpStart.camera.quaternion.clone();

			jumpStart.camera.position.copy(oldPos);
			jumpStart.camera.quaternion.copy(oldQuaternion);

			jumpStart.camera.position.lerp(targetPos, 0.05);
			jumpStart.camera.quaternion.slerp(targetQuaternion, 0.05);
		}
	}
});