jumpStartBehavior({
	"moleWhackTable":
	{
		"tableCount": 0,	// Needed because Altspace requires each dynamic texture be different
		"applyBehavior": function(options)
		{
			this.syncData.moleWhackTable = {
				"ownerName": jumpStart.localUser.displayName
			};

			this.addEventListener("spawn", jumpStart.behaviors.moleWhackTable.spawnBehavior);
			this.addEventListener("tick", jumpStart.behaviors.moleWhackTable.tickBehavior);
		},
		"tickBehavior": function()
		{
			if( this.userData.moleWhackTable.gameDelay > 0 )
			{
				this.userData.moleWhackTable.gameDelay -= jumpStart.deltaTime;

				if( this.userData.moleWhackTable.gameDelay <= 0 )
					this.userData.moleWhackTable.gameDelay = 0;
			}

			var smasher = this.userData.moleWhackTable.smasher;
			if( !!smasher && smasher.ownerID === jumpStart.localUser.userID )
			{
				var maxTime = 40.5;
				if( this.userData.moleWhackTable.gameTimer < maxTime )
				{
					this.userData.moleWhackTable.gameTimer += jumpStart.deltaTime;

					if( this.userData.moleWhackTable.gameTimer >= maxTime )
						jumpStart.removeInstance(smasher);
					else if( this.userData.moleWhackTable.gameTimer >= 20 && !this.userData.moleWhackTable.moleJumpHandle1 )
						this.userData.moleWhackTable.moleJumpHandle1 = setInterval(jumpStart.behaviors.moleWhackTable.randomMole.bind(this), 500);
					else if( this.userData.moleWhackTable.gameTimer >= 25 && !this.userData.moleWhackTable.moleJumpHandle2 )
						this.userData.moleWhackTable.moleJumpHandle2 = setInterval(jumpStart.behaviors.moleWhackTable.randomMole.bind(this), 200);
				}
			}
		},
		"spawnBehavior": function(isInitialSync)
		{
			jumpStart.enclosureBoundary("east");
			jumpStart.precacheSound("sounds/music");
			jumpStart.precacheSound("sounds/ow");
			jumpStart.precacheSound("sounds/join");
			jumpStart.precacheSound("sounds/hit");
			jumpStart.precacheSound("sounds/swing");

			jumpStart.behaviors.moleWhackTable.tableCount++;
			this.userData.moleWhackTable = {};
			this.userData.moleWhackTable.moles = [];
			this.userData.moleWhackTable.gameDelay = 0;
			this.userData.moleWhackTable.gameTimer = 0;
			this.userData.moleWhackTable.moleJumpHandle0 = null;
			this.userData.moleWhackTable.moleJumpHandle1 = null;
			this.userData.moleWhackTable.moleJumpHandle2 = null;

			var imageURL = "assets/MoleWhack/misc/nameBackground.jpg";

			var table = this;
			var imageElem = new Image();
			imageElem.addEventListener("load", function(e)
			{
				var smasher = table.userData.moleWhackTable.smasher;//jumpStart.scene.getObjectByName("smasher");
				var name = (!!smasher) ? smasher.syncData.ownerName : table.name;
				var nameCard = jumpStart.spawnTextPlane({"backgroundImageElem": this, "width": 52.5, "height": 9, "fontSize": 4, "text": name, "color": "#ffffff"});
				nameCard.position.copy(table.position);
				nameCard.quaternion.copy(table.quaternion);
				nameCard.translateZ(-13.5);
				nameCard.translateY(14.7);
				table.userData.moleWhackTable.nameCard = nameCard;
			});
			imageElem.src = imageURL;
			this.userData.moleWhackTable.imageElem = imageElem;

			var scoreCard = jumpStart.spawnTextPlane({"width": 15.0, "height": 6.5, "fontSize": 5, "text": jumpStart.behaviors.moleWhackTable.tableCount, "color": "#ff0000"});
			scoreCard.position.copy(this.position);
			scoreCard.quaternion.copy(this.quaternion);
			scoreCard.translateZ(-13.5);
			scoreCard.translateY(35.13);
			scoreCard.translateX(14.8);
			this.userData.moleWhackTable.scoreCard = scoreCard;

			var tableTop = jumpStart.spawnCursorPlane({"width": 64.0, "height": 40.0});
			tableTop.position.copy(this.position);
			tableTop.quaternion.copy(this.quaternion);
			tableTop.blocksLOS = true;
			tableTop.translateY(2.0);
			tableTop.translateZ(7.0);
			tableTop.rotateX(Math.PI / 1.77);
			tableTop.position.y -= 1.5;
			tableTop.addEventListener("cursordown", function()
			{
				if( !!table.userData.moleWhackTable.smasher && table.userData.moleWhackTable.smasher.ownerID === jumpStart.localUser.userID )
					jumpStart.behaviors.moleWhackTable.swingMySmasher.call(table);
				else if( !!!table.userData.moleWhackTable.smasher && table.userData.moleWhackTable.gameDelay === 0 )
					jumpStart.behaviors.moleWhackTable.spawnSmasher.call(table);
			});
			this.userData.moleWhackTable.tableTop = tableTop;

			var coinDoor = jumpStart.spawnCursorPlane({"width": 22.0, "height": 16.0});
			coinDoor.position.copy(this.position);
			coinDoor.quaternion.copy(this.quaternion);
			coinDoor.blocksLOS = true;
			coinDoor.translateY(-23.0);
			coinDoor.translateZ(21.0);
			coinDoor.position.y -= 1.5;
			coinDoor.addEventListener("cursordown", function()
			{
				if( !!table.userData.moleWhackTable.smasher && table.userData.moleWhackTable.smasher.ownerID === jumpStart.localUser.userID )
					jumpStart.removeInstance(table.userData.moleWhackTable.smasher);
				else if( !!!table.userData.moleWhackTable.smasher && table.userData.moleWhackTable.gameDelay === 0 )
					jumpStart.behaviors.moleWhackTable.spawnSmasher.call(table);
			});
			this.userData.moleWhackTable.coinDoor = coinDoor;
		},
		"swingMySmasher": function()
		{
			var smasher = this.userData.moleWhackTable.smasher;
			smasher.syncData.swinging = 1;
			smasher.syncData.swingCount += 1;
			smasher.sync();
		},
		"spawnSmasher": function()
		{
			var smasher = jumpStart.spawnInstance("models/smasher");
			smasher.syncData.swingCount = 0;
			smasher.syncData.tableName = this.name;
			smasher.syncData.swinging = 0;
			smasher.syncData.numSwings = 0;
			smasher.syncData.score = 0;
			smasher.syncData.ownerName = jumpStart.localUser.displayName;
			smasher.position.copy(this.position);
			smasher.quaternion.copy(this.quaternion)
			smasher.translateZ(25.0);
			smasher.translateY(10.0);
			smasher.rotateX(Math.PI / 3.4);

			smasher.addEventListener("spawn", jumpStart.behaviors.moleWhackTable.smasherSpawn);
			smasher.addEventListener("remove", jumpStart.behaviors.moleWhackTable.smasherRemove);
			smasher.addEventListener("tick", jumpStart.behaviors.moleWhackTable.smasherTick);
			smasher.applyBehavior("autoRemoval");
			smasher.applyBehavior("lerpSync", {"speed": 50.0});
			smasher.applyBehavior("autoSync");

			this.userData.moleWhackTable.smasher = smasher;
			smasher.sync();

			jumpStart.behaviors.moleWhackTable.spawnAllMoles.call(this);
			jumpStart.behaviors.moleWhackTable.startMoleSequence.call(this);
		},
		"startMoleSequence": function()
		{
			if( this.userData.moleWhackTable.moleJumpHandle0 )
				clearInterval(this.userData.moleWhackTable.moleJumpHandle0);

			if( this.userData.moleWhackTable.moleJumpHandle1 )
				clearInterval(this.userData.moleWhackTable.moleJumpHandle1);

			if( this.userData.moleWhackTable.moleJumpHandle2 )
				clearInterval(this.userData.moleWhackTable.moleJumpHandle2);
		
			this.userData.moleWhackTable.gameTimer = 0;

			this.userData.moleWhackTable.moleJumpHandle0 = setInterval(jumpStart.behaviors.moleWhackTable.randomMole.bind(this), 900);
		},
		"randomMole": function()
		{
			var validMoles = [];
			var i, mole;
			for( i in this.userData.moleWhackTable.moles )
			{
				mole = this.userData.moleWhackTable.moles[i];
				if( mole.userData.direction === 0 && !mole.userData.isPeeking )
					validMoles.push(mole);
			}

			if( validMoles.length > 0 )
			{
				var randomIndex = Math.floor(Math.random() * validMoles.length);

				mole = validMoles[randomIndex];
				mole.userData.direction = 1.0;
			}
		},
		"spawnAllMoles": function()
		{
			var table = this;
			var translation = new THREE.Vector3();

			translation.set(0, 0, -2.3);
			spawnAMole(table, translation);

			translation.set(19.1, 0, -2.3);
			spawnAMole(table, translation);

			translation.set(-19.1, 0, -2.3);
			spawnAMole(table, translation);

			translation.set(-9.7, -3.3, 10.5);
			spawnAMole(table, translation);

			translation.set(9.7, -3.3, 10.5);
			spawnAMole(table, translation);

			function spawnAMole(table, translation)
			{
				var mole = jumpStart.spawnInstance("models/mole");
				mole.syncData.tableName = table.name;
				mole.position.copy(table.position);
				mole.quaternion.copy(table.quaternion);
				mole.translateX(translation.x);
				mole.translateY(translation.y);
				mole.translateZ(translation.z);
				mole.addEventListener("spawn", jumpStart.behaviors.moleWhackTable.moleSpawn);
				mole.addEventListener("tick", jumpStart.behaviors.moleWhackTable.moleTick);
				mole.syncData.originalPosition = mole.position.clone();
				mole.applyBehavior("lerpSync", {"speed": 30.0});
				mole.applyBehavior("autoSync");
				mole.rotateX(0.3);
				mole.syncData.hits = 0;
				mole.sync();
			}
		},
		"moleSpawn": function(isInitialSync)
		{
			var table = jumpStart.scene.getObjectByName(this.syncData.tableName);

			this.userData.oldHits = this.syncData.hits;
			this.userData.isPeeking = false;
			this.userData.hasBeenHit = false;
			this.userData.topDelayMax = 1.2;
			this.userData.topDelay = this.userData.topDelayMax;
			this.userData.maxDeltaY = 7.0;
			this.userData.direction = 0;
			table.userData.moleWhackTable.moles.push(this);
		},
		"moleTick": function()
		{
			if( this.userData.oldHits !== this.syncData.hits )
			{
				var maxParticles = 8;
				var i, particle;
				for( i = 0; i < maxParticles; i++ )
				{
					particle = jumpStart.spawnInstance("models/gold");
					particle.position.copy(this.position);
					particle.quaternion.copy(this.quaternion);

					var scale = Math.random();
					if( scale < 0.5 )
						scale = 0.5;

					particle.scale.multiplyScalar(scale);

					var randoX = 3.0 * Math.random();
					if( Math.random() > 0.5 )
						randoX *= -1.0;

					var randoY = 3.0 * Math.random();
					if( Math.random() > 0.5 )
						randoY *= -1.0;

			//		if( randoY < 0 )
			//			randoY = 0;

					var randoZ = 3.0 * Math.random();
					if( Math.random() > 0.5 )
						randoZ *= -1.0;

					particle.translateX(randoX);

					if( randoY > 0 )
						particle.translateY(randoY);

					particle.translateZ(randoZ);

					var oldQuaternion = this.quaternion.clone();
					this.lookAt(particle.position);
					particle.quaternion.copy(this.quaternion);
					this.quaternion.copy(oldQuaternion);

					particle.userData.shock = 0.2;
					particle.userData.life = 0.1;
					particle.scale.multiplyScalar(4.0);

					particle.addEventListener("tick", function()
					{
						this.userData.shock -= jumpStart.deltaTime;

						if( this.userData.shock <= 0.0 )
						{
							if( this.userData.hasOwnProperty("will") )
								this.userData.will -= 1.0 * jumpStart.deltaTime;

							if( !this.userData.hasOwnProperty("direction") || this.userData.will <= 0)
							{
								var randoPitch = Math.PI * Math.random();
								if( Math.random() > 0.5 )
									randoPitch *= -1.0;

								var randoYaw = Math.PI * Math.random();
								if( Math.random() > 0.5 )
									randoYaw *= -1.0;

								var randoRoll = Math.PI * Math.random();
								if( Math.random() > 0.5 )
									randoRoll *= -1.0;

								this.userData.direction = new THREE.Vector3(randoPitch, randoYaw, randoRoll);
								this.userData.will = 3.0 * Math.random();
							}

							this.userData.life -= jumpStart.deltaTime;
							if( this.userData.life <= 0 )
							{
								this.scale.x -= 6.0 * jumpStart.deltaTime;
								this.scale.y -= 6.0 * jumpStart.deltaTime;
								this.scale.z -= 6.0 * jumpStart.deltaTime;
							}

							this.rotateX(this.userData.direction.x * jumpStart.deltaTime);
							this.rotateY(this.userData.direction.y * jumpStart.deltaTime);
							this.rotateZ(this.userData.direction.z * jumpStart.deltaTime);

							this.translateZ(15.0 * jumpStart.deltaTime);
							this.position.y += 10.0 * jumpStart.deltaTime;

							if( this.scale.x <= 0.1 )
								jumpStart.removeInstance(this);
						}
						else
						{
							this.translateZ(60.0 * jumpStart.deltaTime);
						}
					});

					this.userData.oldHits = this.syncData.hits;
				}
			}

			if( this.ownerID !== jumpStart.localUser.userID )
				return;

			if( this.userData.direction !== 0 )
			{
				var amount = 16.0 * jumpStart.deltaTime * this.userData.direction;
				this.translateY(amount);

				if( this.userData.direction > 0 && this.position.distanceTo(this.syncData.originalPosition) >= this.userData.maxDeltaY )
				{
					// just hit max
					//this.userData.direction = -1.0;
					this.userData.direction = 0;
					this.userData.isPeeking = true;
					this.sync();
				}
				else if( this.userData.direction < 0 && this.position.distanceTo(this.syncData.originalPosition) < 1.0 )
				{
					// just hit min
					this.userData.direction = 0;
					this.userData.hasBeenHit = false;
					this.position.copy(this.syncData.originalPosition);
					this.sync();
				}
			}
			else if( this.userData.isPeeking )
			{
				this.userData.topDelay -= jumpStart.deltaTime;
				if( this.userData.topDelay <= 0 )
				{
					this.userData.topDelay = this.userData.topDelayMax;
					this.userData.direction = -1.0;
					this.userData.isPeeking = false;
				}
			}
		},
		"smasherSpawn": function(isInitialSync)
		{
			this.userData.oldSwingCount = this.syncData.swingCount;

			var table = jumpStart.scene.getObjectByName(this.syncData.tableName);
			if( this.ownerID === jumpStart.localUser.userID && table.userData.moleWhackTable.smasher !== this )
			{
				var smasher = this;
				smasher.userData.delay = 1.0;
				smasher.addEventListener("tick", function()
				{
					this.userData.delay -= jumpStart.deltaTime;

					if( this.userData.delay <= 0 )
					{
						jumpStart.removeInstance(this);
					}
				});

				/*
				var smasher = this;
				setTimeout(function(){ jumpStart.removeInstance(smasher); }, 3000);
				*/
//				var smasher = this;
//				this.addEventListener("tick", function()
//				{
//					jumpStart.removeInstance(smasher);
//				});
				return;
			}

			table.userData.moleWhackTable.smasher = this;

//			if( !!table.userData.moleWhackTable.smasher && table.userData.moleWhackTable.smasher !== this && table.userData.moleWhackTable.smasher.ownerID === jumpStart.localUser.userID )
//			{
//				jumpStart.removeInstance(this);
//				return;
//			}

//			this.userData.table = table;
			this.userData.oldScore = -1;

			if( this.ownerID !== jumpStart.localUser.userID )
				return;

			this.userData.table = table;

			if( !isInitialSync )
				jumpStart.updateTextPlane(table.userData.moleWhackTable.nameCard, {"backgroundImageElem": table.userData.moleWhackTable.imageElem, "width": 52.5, "height": 9, "fontSize": 4, "text": this.syncData.ownerName, "color": "#ffffff"});

			this.syncData.swinging = 0;
			this.userData.swingRot = 0;
			this.userData.maxSwingRot = Math.PI / 3.0;

			var hitPoint = jumpStart.spawnInstance(null, {"parent": this});
			hitPoint.translateZ(-15.0);
			this.userData.hitPoint = hitPoint;

			table.userData.moleWhackTable.smasher = this;
			jumpStart.playSound("sounds/join");
			jumpStart.playSound("sounds/music");
		},
		"smasherRemove": function()
		{
			var table = this.userData.table;
			if( !!!table )
				table = jumpStart.scene.getObjectByName(this.syncData.tableName);

			var nameCard = table.userData.moleWhackTable.nameCard;
			if( nameCard )
				jumpStart.updateTextPlane(nameCard, {"backgroundImageElem": table.userData.moleWhackTable.imageElem, "width": 52.5, "height": 9, "fontSize": 4, "text": "THANKS FOR PLAYING", "color": "#ffffff"});

			var moles = table.userData.moleWhackTable.moles;
			if( moles.length > 0 && (moles[0].ownerID !== this.ownerID || this.ownerID === jumpStart.localUser.userID) )
				jumpStart.behaviors.moleWhackTable.resetTable.call(table);
		},
		"resetTable": function()
		{
			var smasher = this.userData.moleWhackTable.smasher;
			var maxTime = 40.5;
			this.userData.moleWhackTable.gameTimer = maxTime;
			delete this.userData.moleWhackTable["smasher"];
			this.userData.moleWhackTable.gameDelay = 2.0;

			if( this.userData.moleWhackTable.moleJumpHandle0 )
				clearInterval(this.userData.moleWhackTable.moleJumpHandle0);

			if( this.userData.moleWhackTable.moleJumpHandle1 )
				clearInterval(this.userData.moleWhackTable.moleJumpHandle1);

			if( this.userData.moleWhackTable.moleJumpHandle2 )
				clearInterval(this.userData.moleWhackTable.moleJumpHandle2);

			this.userData.moleWhackTable.moleJumpHandle0 = null;
			this.userData.moleWhackTable.moleJumpHandle1 = null;
			this.userData.moleWhackTable.moleJumpHandle2 = null;

			var i;
			for( i in this.userData.moleWhackTable.moles )
				jumpStart.removeInstance(this.userData.moleWhackTable.moles[i]);

			this.userData.moleWhackTable.moles = [];
			this.userData.moleWhackTable.smasher = null;
		},
		"smasherTick": function()
		{
			var table = this.userData.table;
			if( !!!table )
				return;

			if( this.syncData.score !== this.userData.oldScore )
			{
				// update the scoreCard
				jumpStart.updateTextPlane(table.userData.moleWhackTable.scoreCard, {"width": 15.0, "height": 6.5, "fontSize": 5, "text": this.syncData.score, "color": "#ff0000"});

				this.userData.oldScore = this.syncData.score;

				jumpStart.playSound("sounds/ow");
				jumpStart.playSound("sounds/hit");
			}

			if( this.userData.oldSwingCount !== this.syncData.swingCount )
			{
				jumpStart.playSound("sounds/swing");
				this.userData.oldSwingCount = this.syncData.swingCount;
			}

			if( this.ownerID !== jumpStart.localUser.userID || table.userData.moleWhackTable.moles.length === 0 || table.userData.moleWhackTable.moles[0].ownerID !== jumpStart.localUser.userID )
				return;

			var smashSpeed = 4.0;
			var deltaRot = 0;
			var needsSync = false;

			if( this.syncData.swinging === 1 )
				deltaRot += smashSpeed * jumpStart.deltaTime;
			else if( this.syncData.swinging === -1 )
				deltaRot -= smashSpeed * jumpStart.deltaTime;

			if( jumpStart.localUser.cursorHit && jumpStart.localUser.cursorHit.object === table.userData.moleWhackTable.tableTop )
			{
				this.position.copy(table.position);
				this.quaternion.copy(table.quaternion)
				this.translateZ(45.0);
				this.translateY(30.0);

				this.lookAt(jumpStart.localUser.cursorHit.scaledPoint);

				var zAmount = 30.0 + this.position.distanceTo(jumpStart.localUser.cursorHit.scaledPoint) - 46

				this.translateZ(zAmount);
				this.translateY(-5.0);

				this.rotateX(Math.PI / 2.0);
			}

			if( deltaRot + this.userData.swingRot > this.userData.maxSwingRot )
			{
				deltaRot = this.userData.maxSwingRot - this.userData.swingRot;

				this.syncData.swinging = -1;
				needsSync = true;
			}
			else if( deltaRot + this.userData.swingRot < 0 )
			{
				deltaRot = -this.userData.swingRot;

				this.syncData.swinging = 0;
				needsSync = true;
			}

			if( this.syncData.swinging !== 0 )
			{
				this.userData.swingRot += deltaRot;

				if( !jumpStart.localUser.cursorHit )
					this.rotateX(deltaRot);
				else
					this.rotateX(this.userData.swingRot);
			}

			// Test for collisions
			var scaledPoint = new THREE.Vector3().setFromMatrixPosition(this.userData.hitPoint.matrixWorld).multiplyScalar(1 / jumpStart.options.sceneScale).sub(jumpStart.world.position);

			var i, mole;
			for( i in table.userData.moleWhackTable.moles )
			{
				mole = table.userData.moleWhackTable.moles[i];
				if( mole.userData.hasBeenHit )
					continue;

				if( mole.userData.direction === 0 && !mole.userData.isPeeking )
					continue;

				if( mole.position.distanceTo(scaledPoint) < 8.0 )
				{
					mole.userData.direction = -1.0;
					mole.userData.topDelay = mole.userData.topDelayMax;
					mole.userData.hasBeenHit = true;
					mole.syncData.hits += 1;
					mole.sync();

					this.syncData.score += 1;

					needsSync = true;
					break;
				}
			}

			if( needsSync )
				this.sync();
		}
	}
});