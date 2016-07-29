jumpStartBehavior({
	"hoverBlasterTable":
	{
		"tableCount": 0,	// Needed because Altspace requires each dynamic texture be different
		"tableRef": null, // FIXME: "cheating".  this will make this un-instancable, but the gamepad callback needs to know our table.
		"generateEntityId": function()
		{
			if( !!!this.userData.hoverBlasterTable )
				this.userData.hoverBlasterTable = {};

			if( !!!this.userData.hoverBlasterTable.lastPushTime )
				this.userData.hoverBlasterTable.lastPushTime = 0;

			if( !!!this.userData.hoverBlasterTable.lastRandChars )
				this.userData.hoverBlasterTable.lastRandChars = [];
			
			var PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';

			var now = new Date().getTime();
			var duplicateTime = (now === this.userData.hoverBlasterTable.lastPushTime);
			this.userData.hoverBlasterTable.lastPushTime = now;

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
					this.userData.hoverBlasterTable.lastRandChars[i] = Math.floor(Math.random() * 64);
				}
			} else {
				// If the timestamp hasn't changed since last push, use the same random number, except incremented by 1.
				for (i = 11; i >= 0 && this.userData.hoverBlasterTable.lastRandChars[i] === 63; i--) {
					this.userData.hoverBlasterTable.lastRandChars[i] = 0;
				}
				this.userData.hoverBlasterTable.lastRandChars[i]++;
			}
			for (i = 0; i < 12; i++) {
				id += PUSH_CHARS.charAt(this.userData.hoverBlasterTable.lastRandChars[i]);
			}
			if(id.length != 20) throw new Error('Length should be 20.');
			return id;
		},
		"tableButtonListener": function(e)
		{
			var table = jumpStart.behaviors.hoverBlasterTable.tableRef;

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

							ship.userData.fireCooldown = 0.2;
							jumpStart.behaviors.hoverBlasterTable.fireLaser.call(ship);
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

							ship.userData.fireCooldown = 0.2;
							jumpStart.behaviors.hoverBlasterTable.fireLaser.call(ship);
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
			var params = {
				size: 10.0,
				height: 1,
				font: "helvetiker",
				curveSegments: 1
			};

			var geometry = new THREE.TextGeometry("GAME OVER", params);
			var material = new THREE.MeshBasicMaterial({color:'red'});
			var mesh = new THREE.Mesh(geometry, material);

			geometry.computeBoundingBox();
			var displacement = new THREE.Vector3().copy(geometry.boundingBox.max).sub(geometry.boundingBox.min);

			var text = jumpStart.spawnInstance(null)
			text.userData.table = this;

			var ship = this.userData.hoverBlasterTable.ship;
			var worldPos = ship.getWorldPosition();
			jumpStart.world.worldToLocal(worldPos);
			text.position.copy(worldPos);
			text.position.y += 10.0;
//					text.lookAt(jumpStart.localUser.skeleton.getJoint("Eye"));

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
						font: "helvetiker",
						curveSegments: 1
					};

					var geometry = new THREE.TextGeometry("SCORE: " + this.userData.table.userData.hoverBlasterTable.ship.syncData.coins, params);
					var material = new THREE.MeshBasicMaterial({color:'yellow'});
					var mesh = new THREE.Mesh(geometry, material);

					geometry.computeBoundingBox();
					var displacement = new THREE.Vector3().copy(geometry.boundingBox.max).sub(geometry.boundingBox.min);

					var text = jumpStart.spawnInstance(null)
					text.userData.table = this.userData.table;
					var worldPos = ship.getWorldPosition();
					jumpStart.world.worldToLocal(worldPos);
					text.position.copy(worldPos);
					text.position.y += 10.0;
		//					text.lookAt(jumpStart.localUser.skeleton.getJoint("Eye"));

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
								font: "helvetiker",
								curveSegments: 1
							};

							var geometry = new THREE.TextGeometry("Nice try!", params);
							var material = new THREE.MeshBasicMaterial({color:'white'});
							var mesh = new THREE.Mesh(geometry, material);

							geometry.computeBoundingBox();
							var displacement = new THREE.Vector3().copy(geometry.boundingBox.max).sub(geometry.boundingBox.min);

							var text = jumpStart.spawnInstance(null)
							text.userData.table = this.userData.table;
							var worldPos = ship.getWorldPosition();
							jumpStart.world.worldToLocal(worldPos);
							text.position.copy(worldPos);
							text.position.y += 10.0;
				//					text.lookAt(jumpStart.localUser.skeleton.getJoint("Eye"));

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

									if( this.userData.table.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userID )
									{
										// remove the table and everything else we can think of
										jumpStart.removeInstance(this.userData.table);
									}

									//if( this.userData.table.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userId )
										//spawnHoverBlasterPlaceholder(new THREE.Vector3(), new THREE.Quaternion());
										//spawnHoverBlasterTable(new THREE.Vector3(), new THREE.Quaternion());
									//spawnHoverBlasterTable(new THREE.Vector3(), new THREE.Quaternion());
									return;
								}

								this.position.y += 10.0 * jumpStart.deltaTime;

								if( jumpStart.isAltspace )
									this.lookAt(jumpStart.localUser.skeleton.getJoint("Eye"));
							});
							return;
						}

						this.position.y += 10.0 * jumpStart.deltaTime;
						if( jumpStart.isAltspace )
							this.lookAt(jumpStart.localUser.skeleton.getJoint("Eye"));
					});

					return;
				}

				this.position.y += 10.0 * jumpStart.deltaTime;
				if( jumpStart.isAltspace )
					this.lookAt(jumpStart.localUser.skeleton.getJoint("Eye"));
			});
		},
		"applyBehavior": function(options)
		{
			this.syncData.hoverBlasterTable = {
				"ownerID": jumpStart.localUser.userID,
				"ownerName": jumpStart.localUser.displayName,
				"isActive": false,
				"rotSpeed": 0.3,/*
				"grandParentTest":
				{
					"parentTest":
					{
						"childTest": 21
					}
				},*/
				"timeline": {}
			};

			jumpStart.behaviors.hoverBlasterTable.resetTimeline.call(this, 0, "STAGE 1");
			jumpStart.behaviors.hoverBlasterTable.generateStage.call(this, 0);

			this.addEventListener("spawn", jumpStart.behaviors.hoverBlasterTable.spawnBehavior);
			this.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.tickBehavior);
			this.addEventListener("remove", jumpStart.behaviors.hoverBlasterTable.removeBehavior);

			return true;
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
				},
				"0":
				{
					"stageText":
					{
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": 0.1,
						"template": "stageText"
					}
				}/*,
				"0o2":
				{
					"goText":
					{
						"offsetY": 0.0,
						"offsetX": 0.1,
						"template": "goText"
					}
				}*/
			};

			this.syncData.hoverBlasterTable.timeline = timeline;
		},
		"generateStage": function(id)
		{
			console.log("Generate stage ID for " + id);
			if( id === 0 )
			{
				//this.syncData.hoverBlasterTable.timeline.info.music = "UBP7xH348cI";
				
				var length = 1.0;
				var offsetZ = 0;	// disabled the offset because the timeline gets reset anyways
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
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "rocks"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// guns
				for( z = 0; z < length; z += 0.3 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "gun"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}					

				entity = {
					"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
					"offsetY": 0.0,
					"offsetX": 0.1,
					"template": "clearText"
				};

				var safeZ = (length + offsetZ + 0.25).toString().replace(".", "o");
				if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
					this.syncData.hoverBlasterTable.timeline[safeZ] = {};

				this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
			}
			else if( id === 1 )
			{
				var length = 2.0;
				var offsetZ = 0;	// disabled the offset because the timeline gets reset anyways
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
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "rocks"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// guns
				for( z = 0; z < length; z += 0.2 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "gun"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
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
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 10.0,
						"offsetX": rotZ,
						"rotY": rotY,
						"template": "crazy"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				entity = {
					"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
					"offsetY": 0.0,
					"offsetX": 0.1,
					"template": "clearText"
				};

				var safeZ = (length + offsetZ + 0.25).toString().replace(".", "o");
				if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
					this.syncData.hoverBlasterTable.timeline[safeZ] = {};

				this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
			}
			else if( id === 2 )
			{
				var length = 2.0;
				var offsetZ = 0;	// disabled the offset because the timeline gets reset anyways
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
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "rocks"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// guns
				for( z = 0; z < length; z += 0.2 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "gun"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
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
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 10.0,
						"offsetX": rotZ,
						"rotY": rotY,
						"template": "crazy"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;

					//rotZ = Math.PI * 0.4 * Math.random();
					//rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					var rotY = Math.PI * 0.4 * Math.random();
					rotY *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 10.0,
						"offsetX": -rotZ,
						"rotY": rotY,
						"template": "crazy"
					};

					safeZ = (z + 0.1 + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
/*
					entity = {
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 10.0,
						"offsetX": -rotZ,
						"template": "crazy"
					};

					safeZ = (z + 0.1 + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
					*/
				}

				entity = {
					"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
					"offsetY": 0.0,
					"offsetX": 0.1,
					"template": "clearText"
				};

				var safeZ = (length + offsetZ + 0.25).toString().replace(".", "o");
				if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
					this.syncData.hoverBlasterTable.timeline[safeZ] = {};

				this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
			}
			else if( id === 3 )
			{
				var length = 2.0;
				var offsetZ = 0;	// disabled the offset because the timeline gets reset anyways
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
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "rocks"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// guns
				for( z = 0; z < length; z += 0.1 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "gun"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
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
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 10.0,
						"offsetX": rotZ,
						"rotY": rotY,
						"template": "crazy"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;

				}

				entity = {
					"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
					"offsetY": 0.0,
					"offsetX": 0.1,
					"template": "clearText"
				};

				var safeZ = (length + offsetZ + 0.25).toString().replace(".", "o");
				if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
					this.syncData.hoverBlasterTable.timeline[safeZ] = {};

				this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
			}
			else if( id === 4 )
			{
				this.syncData.hoverBlasterTable.timeline.info.rotSpeed = 0.6;

				var length = 2.0;
				var offsetZ = 0;	// disabled the offset because the timeline gets reset anyways
	//			if( !!this.userData.hoverBlasterTable )
	//				offsetZ = this.userData.hoverBlasterTable.rot;

				entity = {
					"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
					"offsetY": 0.0,
					"offsetX": 0.1,
					"template": "bonusText"
				};

				var safeZ = "0o2";
				if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
					this.syncData.hoverBlasterTable.timeline[safeZ] = {};

				this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
				
				// generate a random stage length units long

				// rocks
				var z, rotZ, entity;
				for( z = 0; z < length; z += 0.1 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "rocks"
					};

					safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
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
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "coin"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;

					rotZ += spread * 0.2;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// coin
				// arc from middle to right
				for( z = z; z < length && rotZ >= -spread; z += 0.05 )
				{
					entity = {
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "coin"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;

					rotZ -= (Math.PI * 0.2) * 0.2;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				for( z += 0.1; z < length && rotZ > 0; z += 0.05 )
				{
					entity = {
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "coin"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;

					rotZ += spread * 0.2;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// coin
				// down the middle
				var stripLength = 0;
				for( z += 0.1; z < length && stripLength < 4; z += 0.05 )
				{
					entity = {
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": 0.0,
						"template": "coin"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
					stripLength++;
				}

				// coin
				// arc from left to middle
				for( z += 0.1; z < length && rotZ >= 0; z += 0.05 )
				{
					entity = {
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "coin"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;

					rotZ -= spread * 0.2;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// coin
				// arc from middle to left
				for( z = z; z < length && rotZ <= spread; z += 0.05 )
				{
					entity = {
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "coin"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;

					rotZ += spread * 0.2;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// down the middle
				stripLength = 0;
				for( z += 0.1; z < length && stripLength < 4; z += 0.05 )
				{
					entity = {
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": 0.0,
						"template": "coin"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
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

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;

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

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;

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

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;

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

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;

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

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
				}
				*/

				entity = {
					"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
					"offsetY": 0.0,
					"offsetX": 0.1,
					"template": "clearText"
				};

				var safeZ = (length + offsetZ + 0.25).toString().replace(".", "o");
				if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
					this.syncData.hoverBlasterTable.timeline[safeZ] = {};

				this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
			}
			else if( id === 5 )
			{
				var length = 2.0;
				var offsetZ = 0;	// disabled the offset because the timeline gets reset anyways
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
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "rocks"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// guns
				for( z = 0; z < length; z += 0.1 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "gun"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
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
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 10.0,
						"offsetX": rotZ,
						"rotY": rotY,
						"template": "crazy"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;

				}

				entity = {
					"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
					"offsetY": 0.0,
					"offsetX": 0.1,
					"template": "clearText"
				};

				var safeZ = (length + offsetZ + 0.25).toString().replace(".", "o");
				if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
					this.syncData.hoverBlasterTable.timeline[safeZ] = {};

				this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
			}
			else if( id === 6 )
			{
				var length = 2.0;
				var offsetZ = 0;	// disabled the offset because the timeline gets reset anyways
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
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "rocks"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// guns
				for( z = 0; z < length; z += 0.1 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "gun"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
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
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 10.0,
						"offsetX": rotZ,
						"rotY": rotY,
						"template": "crazy"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;

				}

				entity = {
					"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
					"offsetY": 0.0,
					"offsetX": 0.1,
					"template": "clearText"
				};

				var safeZ = (length + offsetZ + 0.25).toString().replace(".", "o");
				if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
					this.syncData.hoverBlasterTable.timeline[safeZ] = {};

				this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
			}
			else
			{
				var length = 2.0;
				var offsetZ = 0;	// disabled the offset because the timeline gets reset anyways
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
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "rocks"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				// add random guns every z=0.2 at random rotZ
				for( z = 0; z < length; z += 0.2 )
				{
					rotZ = Math.PI * 0.2 * Math.random();
					rotZ *= (Math.random() > 0.5) ? 1.0 : -1.0;

					entity = {
						"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
						"offsetY": 0.0,
						"offsetX": rotZ,
						"template": "gun"
					};

					var safeZ = (z + offsetZ).toString().replace(".", "o");
					if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
						this.syncData.hoverBlasterTable.timeline[safeZ] = {};

					this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
					//jumpStart.behaviors.hoverBlasterTable.spawnRocks(rotZ);
				}

				entity = {
					"id": jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this),
					"offsetY": 0.0,
					"offsetX": 0.1,
					"template": "clearText"
				};

				var safeZ = (length + offsetZ + 0.25).toString().replace(".", "o");
				if( !!!this.syncData.hoverBlasterTable.timeline[safeZ] )
					this.syncData.hoverBlasterTable.timeline[safeZ] = {};

				this.syncData.hoverBlasterTable.timeline[safeZ][jumpStart.behaviors.hoverBlasterTable.generateEntityId.call(this)] = entity;
			}
		},
		"getAmountZ": function()
		{
			// decimal number of revolutions
			return (this.userData.hoverBlasterTable.rot - this.userData.hoverBlasterTable.initialRot) / (Math.PI * 2.0);
		},
		"tickBehavior": function()
		{
			if( this.userData.hoverBlasterTable.currentStage !== this.syncData.hoverBlasterTable.timeline.info.id )
			{
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
			this.userData.hoverBlasterTable.rot += rotSpeed * jumpStart.deltaTime;
			if( this.userData.hoverBlasterTable.rot > (Math.PI / numSegments) * this.userData.hoverBlasterTable.totalPlates )
			{
				var delta = ((Math.PI / numSegments) * this.userData.hoverBlasterTable.totalPlates) + (5.0 * Math.PI / numSegments);
				this.userData.hoverBlasterTable.totalPlates++;

				var plate;
				if( this.userData.hoverBlasterTable.plates.length < 15 )
				{
					plate = jumpStart.spawnInstance("models/road", {"parent": this});
					this.userData.hoverBlasterTable.plates.push(plate);
				}
				else
				{
					plate = this.userData.hoverBlasterTable.plates[0];
					this.userData.hoverBlasterTable.plates.shift();
					this.userData.hoverBlasterTable.plates.push(plate);
				}

				plate.rotation.x = (Math.PI / 4.0) - delta;
			}

			this.rotation.x = this.userData.hoverBlasterTable.rot;
			//this.updateMatrix();

			// only proceed if active
		//	if( !this.syncData.hoverBlasterTable.isActive )
			//	return;

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

							if( !!this.userData.hoverBlasterTable.ship.syncData.killed && !!!this.userData.hoverBlasterTable.ship.syncData.killed[entry.id] )
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

			var debris = jumpStart.spawnInstance("models/rocks_broken", {"parent": table});
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

			if( max - rot < 0.3 )
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
					var explosion = jumpStart.spawnInstance("models/explosion", {"parent": ship});
					explosion.scale.set(0.3, 0.3, 0.3);
					explosion.scale.multiplyScalar(1 / ship.scale.x);
					//explosion.position.copy(ship.position);

					explosion = jumpStart.spawnInstance("models/explosion", {"parent": ship});
					explosion.scale.set(0.2, 0.2, 0.2);
					//explosion.position.copy(ship.position);
					explosion.translateX(8.0);
					explosion.translateZ(8.0);
					explosion.translateY(4.0);
					explosion.scale.multiplyScalar(1 / ship.scale.x);

					//if( table.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userID )
				//	{
						table.syncData.hoverBlasterTable.isActive = false;
						table.sync();

					ship.syncData.dead = true;
					ship.sync({"syncData": true});
				//	}

//					jumpStart.behaviors.hoverBlasterTable.gameOverNotify.call(table);
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
				font: "helvetiker",
				curveSegments: 1
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
			var base = jumpStart.spawnInstance("models/manualgun_base", {"parent": this});
			var tower = jumpStart.spawnInstance("models/manualgun_tower", {"parent": base});
			tower.translateY(8.5);

			var barrels = jumpStart.spawnInstance("models/manualgun_barrels", {"parent": tower});
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
			var laser = jumpStart.spawnInstance("models/enemy_laser", {"parent": parent});
			laser.userData.table = parent.userData.table;
			laser.quaternion.copy(parent.quaternion);
			var position = this.getWorldPosition();
			position.multiplyScalar(1 / jumpStart.options.sceneScale);
			THREE.SceneUtils.detach(laser, this, jumpStart.scene);
			laser.position.copy(position);
			laser.translateX(offset.x);
			laser.translateY(offset.y);
			laser.translateZ(offset.z);
			laser.scale.set(0.2, 0.2, 1.0);
			laser.userData.power = 10.0;
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
							var explosion = jumpStart.spawnInstance("models/explosion", {"parent": ship});
							explosion.scale.set(0.3, 0.3, 0.3);
							explosion.scale.multiplyScalar(1 / ship.scale.x);
							//explosion.position.copy(ship.position);

							explosion = jumpStart.spawnInstance("models/explosion", {"parent": ship});
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
		"spawnExplosion": function(position, scale, table)
		{
			//var soundFile = ( typeof sound === "undefined" ) ? "legacy/v1/sounds/SpacePilot/explosion0" : sound;

			//JumpStart.playSound(soundFile, 0.5);

			var explosion = jumpStart.spawnInstance("models/explosion");
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

			//return explosion;
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
				var debris = jumpStart.spawnInstance("models/manualgun_base_broken", {"parent": table});
				debris.userData.table = table;
				debris.userData.rotOffset = this.userData.rotOffset;
				debris.userData.maxGrowScale = 1.0;
				debris.position.copy(this.position);
				debris.quaternion.copy(this.quaternion);
				debris.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.rotFade);

				//jumpStart.behaviors.hoverBlasterTable.spawnCoin.call(table, this.rotation.z);
///*
				var coin = jumpStart.spawnInstance("models/coin", {"parent": table});
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
					//jumpStart.removeInstance(this);
					this.removeEventListener("tick", jumpStart.behaviors.hoverBlasterTable.shipHitCollect);
					this.removeEventListener("tick", jumpStart.behaviors.hoverBlasterTable.rotFade);
					this.applyBehavior("shrinkRemove", {"speed": 3.0});

					var params = {
						size: 12.0,
						height: 1,
						font: "helvetiker",
						curveSegments: 1
					};

					if( table.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userID )
					{
						ship.syncData.coins++;
						ship.sync({"syncData": true});
					}

					var geometry = new THREE.TextGeometry(ship.syncData.coins, params);
					var material = new THREE.MeshBasicMaterial({color:'yellow'});
					var mesh = new THREE.Mesh(geometry, material);

					geometry.computeBoundingBox();
					var displacement = new THREE.Vector3().copy(geometry.boundingBox.max).sub(geometry.boundingBox.min);

					var text = jumpStart.spawnInstance(null)
					text.userData.table = table;
					var worldPos = this.getWorldPosition();
					jumpStart.world.worldToLocal(worldPos);
					text.position.copy(worldPos);
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
						if( jumpStart.isAltspace )
							this.lookAt(jumpStart.localUser.skeleton.getJoint("Eye"));
					});

					//if( table.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userID )
					//	ship.syncData.coins++;
					//text.position.set(0, 20.0, 0);

				//	text.userData.rotOffset = -this.userData.hoverBlasterTable.rot + (Math.PI / 2.0);
				//	text.rotation.x = text.userData.rotOffset;
				//	text.rotateX(-Math.PI / 1.5);

				//	text.translateY(this.userData.hoverBlasterTable.radius + (displacement.y / 2.0) + 30.0);
				//	text.scale.set(0.0001, 0.0001, 0.0001);
					//text.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.rotFade);
				};
				coin.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.rotFade);
				coin.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.shipHitCollect);
				//coin.addEventListener("tick", coinTick);
				//coin.addEventListener("spawn", coinSpawn);
				//coin.addEventListener("remove", coinRemove);							
				//coin.sync();
//*/

				//var explosion = SpawnExplosion(this.position, 1.0);
				//explosion.quaternion.copy(this.quaternion);
				//explosion.translateY(20.0);

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
			var coin = jumpStart.spawnInstance("models/coin", {"parent": this});
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
			//coin.userData.health = 100.0;
			coin.userData.collected = function()
			{
				var table = this.userData.table;
				var ship = this.userData.table.userData.hoverBlasterTable.ship;

				jumpStart.playSound("sounds/coin_collect", 0.8);
				//jumpStart.removeInstance(this);
				this.removeEventListener("tick", jumpStart.behaviors.hoverBlasterTable.shipHitCollect);
				this.removeEventListener("tick", jumpStart.behaviors.hoverBlasterTable.rotFade);
				this.applyBehavior("shrinkRemove", {"speed": 3.0});

				//ship.syncData.coins++;

				var params = {
					size: 12.0,
					height: 1,
					font: "helvetiker",
					curveSegments: 1
				};

				if( table.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userID )
				{
					ship.syncData.coins++;
					ship.sync({"syncData": true});
				}

				var geometry = new THREE.TextGeometry(ship.syncData.coins, params);
				var material = new THREE.MeshBasicMaterial({color:'yellow'});
				var mesh = new THREE.Mesh(geometry, material);

				geometry.computeBoundingBox();
				var displacement = new THREE.Vector3().copy(geometry.boundingBox.max).sub(geometry.boundingBox.min);

				var text = jumpStart.spawnInstance(null)
				text.userData.table = table;
				var worldPos = this.getWorldPosition();
				jumpStart.world.worldToLocal(worldPos);
				text.position.copy(worldPos);
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
					if( jumpStart.isAltspace )
						this.lookAt(jumpStart.localUser.skeleton.getJoint("Eye"));
				});
			};
			coin.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.rotFade);
			coin.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.shipHitCollect);
			//coin.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.hitDetect);
			/*
			coin.addEventListener("remove", function()
			{
				var table = this.userData.table;
				table.userData.hoverBlasterTable.rocks.splice(table.userData.hoverBlasterTable.rocks.indexOf(this), 1);
			});
			*/
			
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
			var rocks = jumpStart.spawnInstance("models/rocks", {"parent": this});
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

			var crazy = jumpStart.spawnInstance("models/thai");
			crazy.userData.entryID = entry.id;
			crazy.userData.table = this;
			crazy.userData.hitRadius = 10.0;
			crazy.userData.health = 100.0;
			crazy.userData.dumbTime = 2.0;
			crazy.position.z -= this.userData.hoverBlasterTable.radius;
			crazy.position.y = this.position.y + 20.0;
			crazy.rotation.x = -Math.PI / 2.0;

			//var rot = Math.PI * 0.4 * Math.random();
			//rot *= (Math.random() > 0.5) ? 1.0 : -1.0;
			crazy.rotateY(rotY);

			crazy.addEventListener("tick", function()
			{
				var table = this.userData.table;
				if( table.parent !== jumpStart.world )
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
			var material = new THREE.MeshBasicMaterial( {color: 0x000000, transparent: true, opacity: 0.5} );
			var shadowObject = new THREE.Mesh( geometry, material );
			var shadow = jumpStart.spawnInstance(null, {"object": shadowObject, "parent": displacementRay});
			shadow.scale.z = 0.3;
			shadow.position.z = this.userData.hoverBlasterTable.radius;
			displacementRay.userData.shadow = shadow;
			crazy.userData.displacementRay = displacementRay;
		},
		"removeBehavior": function()
		{
			jumpStart.removeInstance(this.userData.hoverBlasterTable.board);

			jumpStart.behaviors.hoverBlasterTable.tableRef = null;

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

				jumpStart.addEventListener("gamepadbutton", jumpStart.behaviors.hoverBlasterTable.tableButtonListener);
				jumpStart.removeInstance(this.userData.hoverBlasterTable.ship);

				//console.log(jumpStart.elapsedTime);//jumpStart.isInitialized && jumpStart.isReady && jumpStart.isRunning);
				if( !jumpStart.elapsedTime )
				{
					setTimeout(function()
					{
						spawnHoverBlasterPlaceholder(new THREE.Vector3(), new THREE.Quaternion());
					}.bind(this), 1000);
				}
				else
					spawnHoverBlasterPlaceholder(new THREE.Vector3(), new THREE.Quaternion());
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
				laser = jumpStart.spawnInstance("models/player_laser");
				laser.userData.table = table;
				laser.userData.power = 20.0;
				laser.position.copy(this.position);
				laser.quaternion.copy(this.quaternion);

				laserOffset = laserOffsets[i];
				laser.translateX(laserOffset.x * this.scale.x);
				laser.translateY(laserOffset.y * this.scale.x);
				laser.translateZ(laserOffset.z * this.scale.x);
				laser.scale.set(0.2, 0.2, 1.0);
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
						// rotation
						// better
						//this.rotation.y += jumpStart.gamepad.axes[2] * jumpStart.deltaTime;
						//this.rotation.x += jumpStart.gamepad.axes[3] * jumpStart.deltaTime;

						// worse
						//this.rotateY(-jumpStart.gamepad.axes[2] * jumpStart.deltaTime);
						//this.rotateX(-jumpStart.gamepad.axes[3] * jumpStart.deltaTime);

						// position
						var currentPosition = this.position.clone();

						var positionRay = this.userData.positionRay;
						var oldRotation = positionRay.rotation.clone();
						positionRay.rotateY(jumpStart.gamepad.axes[0] * jumpStart.deltaTime);

						var max = 0.7;
						if( positionRay.rotation.y > max )
						{
							positionRay.rotation.copy(oldRotation);
							positionRay.rotation.y = max;
						}
						else if( positionRay.rotation.y < -max )
						{
							positionRay.rotation.copy(oldRotation);
							positionRay.rotation.y = -max;
						}

						//positionRay.updateMatrix();
						//else
						//{
							oldRotation = positionRay.rotation.clone();
							positionRay.rotateX(jumpStart.gamepad.axes[1] * jumpStart.deltaTime);

							//console.log(positionRay.rotation.x);
							max = 0.2;
							var min = Math.PI / 2.0;
							if( positionRay.rotation.x > -max )
							{
								positionRay.rotation.copy(oldRotation);
								positionRay.rotation.x = -max;
							}
							else if( positionRay.rotation.x < -min )
							{
								positionRay.rotation.copy(oldRotation);
								positionRay.rotation.x = -min;
							}
						//}
//console.log(positionRay.rotation.y);
						
//console.log(positionRay.rotation.y);
						//positionRay.userData.shadow.updateMatrixWorld();

						var shadowPos = positionRay.userData.shadow.getWorldPosition();
						var originPos = positionRay.getWorldPosition();

						// rotation
						var currentQuaternion = this.quaternion.clone();

						var quaternion = positionRay.userData.shadow.getWorldQuaternion();
						this.quaternion.copy(quaternion);
						this.rotation.z = 0;
						this.rotateY(Math.PI);
						this.rotateX(-Math.PI / 3.0);

						this.rotateY(-jumpStart.gamepad.axes[2]);
						this.rotateX(jumpStart.gamepad.axes[3]);
/*
						if( this.rotation.x > -0.2 )
							this.rotation.x = -0.2;
						else if( this.rotation.x < -Math.PI / 2.0 )
							this.rotation.x = -Math.PI / 2.0;
//console.log(positionRay.rotation.y);
						if( this.rotation.y > 0.84 )
							this.rotation.y = 0.84;
						else if( this.rotation.y < -0.84 )
							this.rotation.y = -0.84;
*/
						quaternion.copy(this.quaternion);
						currentQuaternion.slerp(quaternion, 0.1);
						this.quaternion.copy(currentQuaternion);

						var heightOffset = 20.0 + (20.0 * jumpStart.gamepad.buttons[6].value);

						var pos = shadowPos.sub(originPos).normalize();
						pos.multiplyScalar(table.userData.hoverBlasterTable.radius + heightOffset);
						pos.add(table.position);
/*
						var needsLook = false;
						var yVal = table.position.y;
						console.log(pos.y + " vs " + yVal);
						if( pos.y < yVal )
						{
							pos.y = yVal;
							needsLook = true;
						}
*/
						currentPosition.lerp(pos, 0.1);
						this.position.copy(currentPosition);

						//if( needsLook )
						//{
							//var lookPos = currentPosition.clone();
							//jumpStart.world.localToWorld(lookPos);
						//	positionRay.lookAt(this.getWorldPosition());
					//	}
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
			if( isInitialSync && this.ownerID === jumpStart.localUser.userID )
			{
				setTimeout(function(){ jumpStart.removeInstance(this); }.bind(this), 1000);
				return;
			}

			var table = jumpStart.scene.getObjectByName(this.syncData.tableName);
			table.userData.hoverBlasterTable.ship = this;
			this.userData.table = table;
			this.userData.oldShotsFired = this.syncData.shotsFired;
//			if( table.syncData.hoverBlasterTable !== jumpStart.localUser.userID )
//			{
//				this.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.shipTick);
//			}

			this.userData.oldDead = this.syncData.dead;

			ship = this;
			//ship.userData.table = this;
				ship.userData.radius = 10.0;
				ship.userData.shields = 1.0;
				ship.userData.health = 100.0;
				ship.userData.fireCooldown = 0;
				ship.scale.multiplyScalar(0.4);	// FIXME: native scale the ship OBJ
				ship.translateY(180.0);
				ship.rotateY(Math.PI);
				ship.translateZ(-100.0);
				ship.rotateX(Math.PI / -12.0);

				// health bar
				function spawnBar(ship)
				{
					var geometry = new THREE.SphereGeometry( 3, 5, 5 );
					var material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
					var barObject = new THREE.Mesh( geometry, material );
					var bar = jumpStart.spawnInstance(null, {"object": barObject, "parent": ship});
					return bar;
				}

				var healthBar = jumpStart.spawnInstance(null, {"parent": ship});
				var bar = spawnBar(ship);
				bar.position.set(0, 0, -25.8);
				healthBar.userData.bar1 = bar;

				bar = spawnBar(ship);
				bar.position.set(0, 7.5, -23.8);
				healthBar.userData.bar2 = bar;

				bar = spawnBar(ship);
				bar.position.set(0, 11.0, -18.0);
				healthBar.userData.bar3 = bar;			

				bar = spawnBar(ship);
				bar.position.set(0, 7.7, -10.3);
				healthBar.userData.bar4 = bar;

				bar = spawnBar(ship);
				bar.position.set(0, 5.5, -3.0);
				healthBar.userData.bar5 = bar;

				bar = spawnBar(ship);
				bar.position.set(0, 5.5, 5.0);
				healthBar.userData.bar6 = bar;

				bar = spawnBar(ship);
				bar.position.set(0, 5.5, 12.0);
				healthBar.userData.bar7 = bar;			

				ship.userData.healthBar = healthBar;

				//var worldPos = this.position.clone();
				//jumpStart.world.localToWorld(worldPos);

				var positionRay = jumpStart.spawnInstance(null);//new THREE.Ray(this.position.clone(), new THREE.Vector3(0, 0, 0));
				positionRay.position.copy(table.position);

	//displacementRay.rotateX(Math.PI * -0.1);
				var shipPos = ship.getWorldPosition();
				positionRay.lookAt(shipPos);

	//displacementRay.rotateX(Math.PI * -0.1);
	/*
				var geometry = new THREE.SphereGeometry( 10, 5, 8, 0, Math.PI);
				var material = new THREE.MeshBasicMaterial( {color: 0x000000, transparent: true, opacity: 0.5} );
				var shadowObject = new THREE.Mesh( geometry, material );
				*/

				var shadow = jumpStart.spawnInstance(null, {"parent": positionRay});
				shadow.position.z = table.userData.hoverBlasterTable.radius;
				positionRay.userData.shadow = shadow;
				
				ship.userData.positionRay = positionRay;

				ship.addEventListener("remove", function()
				{
					jumpStart.removeInstance(this.userData.displacementRay);
				});

				var displacementRay = jumpStart.spawnInstance(null);//new THREE.Ray(this.position.clone(), new THREE.Vector3(0, 0, 0));
				displacementRay.position.copy(table.position);

				var crazyPos = ship.getWorldPosition();
				displacementRay.lookAt(crazyPos);

				var geometry = new THREE.SphereGeometry( 10, 5, 8, 0, Math.PI);
				var material = new THREE.MeshBasicMaterial( {color: 0x000000, transparent: true, opacity: 0.5} );
				var shadowObject = new THREE.Mesh( geometry, material );
				var shadow = jumpStart.spawnInstance(null, {"object": shadowObject, "parent": displacementRay});
				shadow.scale.z = 0.3;
				shadow.position.z = table.userData.hoverBlasterTable.radius;
				displacementRay.userData.shadow = shadow;
				ship.userData.displacementRay = displacementRay;

				var sight = jumpStart.spawnInstance("models/player_laser", {"parent": ship});
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
		},
		"spawnBehavior": function(isInitialSync)
		{
			if( !!!this.userData.hoverBlasterTable )
				this.userData.hoverBlasterTable = {};

			this.userData.hoverBlasterTable.radius = 118.0;
			this.userData.hoverBlasterTable.initialRot = -1;
			this.userData.hoverBlasterTable.rocks = [];
			this.userData.hoverBlasterTable.guns = [];
			this.userData.hoverBlasterTable.rot = Math.PI;
			this.userData.hoverBlasterTable.plates = [];
			this.userData.hoverBlasterTable.initialTimeline = this.syncData.hoverBlasterTable.timeline.info.previous;
			this.userData.hoverBlasterTable.spentTimeline = [];
			this.userData.hoverBlasterTable.totalPlates = 0;
			this.userData.hoverBlasterTable.lasers = {};
			this.userData.hoverBlasterTable.rocks = [];
			this.userData.hoverBlasterTable.currentStage = this.syncData.hoverBlasterTable.timeline.info.id;
			this.userData.hoverBlasterTable.board = null;
			this.userData.hoverBlasterTable.ship = null;

			var board = jumpStart.spawnInstance("models/board");
			board.position.copy(this.position);
			//board.quaternion.copy(this.quaternion);
			board.rotateY(Math.PI);	// so the well-lit side faces the player
			this.userData.hoverBlasterTable.board = board;

			var dome = jumpStart.spawnInstance("models/dome", {"parent": board});
			dome.scale.multiplyScalar(0.95);
			dome.userData.board = board;

			if( this.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userID )
			{
				var ship = jumpStart.spawnInstance("models/hawk");
				ship.syncData.dead = false;
				ship.syncData.tableName = this.name;
				ship.syncData.killed = {};
				ship.syncData.shotsFired = 0;
				ship.syncData.coins = 0;
				ship.addEventListener("spawn", jumpStart.behaviors.hoverBlasterTable.shipSpawn);
				ship.addEventListener("tick", jumpStart.behaviors.hoverBlasterTable.shipTick);
				ship.applyBehavior("autoSync");
				ship.applyBehavior("lerpSync");
				ship.sync();

				// FIXME: Spawn msgs should be called locally automatically by JumpStart!
				jumpStart.behaviors.hoverBlasterTable.shipSpawn.call(ship);


				// capture gamepad input
				//var table = this;
				jumpStart.behaviors.hoverBlasterTable.tableRef = this;
				jumpStart.addEventListener("gamepadbutton", jumpStart.behaviors.hoverBlasterTable.tableButtonListener);
				//*/
			}
		
		/*
			if( this.syncData.hoverBlasterTable.ownerID === jumpStart.localUser.userID )
			{
				ship.applyBehavior("autoSync");
				ship.applyBehavior("lerpSync");
				ship.sync();
			}
		*/

		}
	}
});