jumpStartBehavior({
	"rcdmPlane3":
	{
		"applyBehavior": function(options)
		{
			if( this.ownerID === jumpStart.localUser.userID )
				this.syncData.rcdm.lerpSpeed = 15.0;
			
			this.addEventListener("spawn", jumpStart.behaviors.rcdmPlane3.spawnBehavior);
			this.addEventListener("tick", jumpStart.behaviors.rcdmPlane3.tickBehavior);
			return true;
		},
		"spawnBehavior": function(isInitialSync)
		{
			var vehicleType = jumpStart.behaviors.rcdm.getVehicleType("rcdmPlane3");

			// BODY (special because the parent's bounding sphere is based on its radius)
			var bodyModel = (!!this.syncData.rcdm.custom.parts.body && this.syncData.rcdm.custom.parts.body.modelFile) ? this.syncData.rcdm.custom.parts.body.modelFile : vehicleType.parts.body.modelFile;

			// spawn the body w/ async loading
			var body = jumpStart.spawnInstance(null, {"parent": this});
			body.applyBehavior("asyncModel", {
				"modelFile": bodyModel,
				"callback": function()
				{
					this.parent.boundingSphere = this.boundingSphere;
					this.applyBehavior("dropShadow", {"scale": 0.7, "useParent": true});
				}.bind(body)
			});
			this.userData.rcdm.parts.body = body;

			// ALL OTHER PARTS
			// spawn the parts w/ async loading
			var x, part, modelFile;
			for( x in vehicleType.parts )
			{
				if( x === "body" )
					continue;

				part = jumpStart.spawnInstance(null, {"parent": this});
				part.applyBehavior("asyncModel", {
					"modelFile": this.syncData.rcdm.custom.parts[x].modelFile,
					"callback": function()
					{
						//this.applyBehavior("dropShadow");
					}.bind(part)
				});
				part.position.copy(vehicleType.parts[x].offset);
				part.rotateX(vehicleType.parts[x].rotate.x);
				part.rotateY(vehicleType.parts[x].rotate.y);
				part.rotateZ(vehicleType.parts[x].rotate.z);
				part.userData.vehicle = this;

				this.userData.rcdm.parts[x] = part;
			}

			///////////////////////
			// CUSTOM PART LOGIC //
			///////////////////////

			// none
		},
		"tickBehavior": function()
		{
			var ship = this;
			if( !!jumpStart.gamepad && ship.ownerID === jumpStart.localUser.userID )
			{
				var oldPos = ship.position.clone();
				var oldQuaternion = ship.quaternion.clone();
				var oldRotation = ship.rotation.clone();

				// properties of the vehicle FIXME: Should be bound to the vehicle type!!
				var idleSpeed = new THREE.Vector3(0, 0, 300.0);
				var acceleration = 75.0;
				var yawSpeed = 5.0;
				var pitchSpeed = 6.0;
				var rollSpeed = 6.0;

				// all these should be updated within each mapping
				var fireButton;
				var clawButton;
				var userRotation = new THREE.Vector3();
				var userTranslation = new THREE.Vector3();

				if( jumpStart.gamepad.mapping === "steamvr" )
				{
					fireButton = jumpStart.gamepad.buttons[0];
					var yawAxisValue = jumpStart.gamepad.axes[0];
					if( Math.abs(yawAxisValue) > 0.1 )
						userRotation.y += -yawAxisValue;
						//ship.rotateY(yawSpeed * -yawAxisValue * jumpStart.deltaTime);

					var pitchAxisValue = jumpStart.gamepad.axes[1];
					if( Math.abs(pitchAxisValue) > 0.1 )
						userRotation.x += pitchAxisValue;
						//ship.rotateX(pitchSpeed * pitchAxisValue * jumpStart.deltaTime);

					var otherGamepad = jumpStart.gamepads.find(function(t)
					{
						return ( t.mapping === "steamvr" && t !== jumpStart.gamepad );
					});

					if(otherGamepad)
					{
						clawButton = otherGamepad.buttons[0];

						var rollAxisValue = otherGamepad.axes[0];
						if( Math.abs(rollAxisValue) > 0 )
							userRotation.z += rollAxisValue;
							//ship.rotateZ(rollSpeed * rollAxisValue * jumpStart.deltaTime);

						var movementAxisValue = otherGamepad.axes[1];
						userTranslation.z += movementAxisValue;
						//ship.translateZ((idleSpeed + (acceleration * movementAxisValue)) * jumpStart.deltaTime);
					}
				}
				else
				{
					fireButton = jumpStart.gamepad.buttons[7];
					clawButton = jumpStart.gamepad.buttons[6];

					var movementAxisValue = jumpStart.gamepad.axes[1];
					userTranslation.z += -movementAxisValue;
					//ship.translateZ((idleSpeed + (acceleration * -movementAxisValue)) * jumpStart.deltaTime);

					var rollLeftButton = jumpStart.gamepad.buttons[4];
					if( rollLeftButton.value > 0 )
						userRotation.z += -rollLeftButton.value;
						//ship.rotateZ(10.0 * -rollLeftButton.value * jumpStart.deltaTime);

					var rollRightButton = jumpStart.gamepad.buttons[5];
					if( rollRightButton.value > 0 )
						userRotation.z += rollRightButton.value;
						//ship.rotateZ(10.0 * rollRightButton.value * jumpStart.deltaTime);

					var yawAxisValue = jumpStart.gamepad.axes[2];
					if( Math.abs(yawAxisValue) > 0.1 )
						userRotation.y += -yawAxisValue;
						//ship.rotateY(10.0 * -yawAxisValue * jumpStart.deltaTime);

					var pitchAxisValue = jumpStart.gamepad.axes[3];
					if( Math.abs(pitchAxisValue) > 0.1 )
						userRotation.x += -pitchAxisValue;
						//ship.rotateX(10.0 * -pitchAxisValue * jumpStart.deltaTime);
				}

				ship.rotateX(pitchSpeed * userRotation.x * jumpStart.deltaTime);
				ship.rotateY(yawSpeed * userRotation.y * jumpStart.deltaTime);
				ship.rotateZ(rollSpeed * userRotation.z * jumpStart.deltaTime);
				ship.translateX((idleSpeed.x + (acceleration * userTranslation.x)) * jumpStart.deltaTime);
				ship.translateY((idleSpeed.y + (acceleration * userTranslation.y)) * jumpStart.deltaTime);
				ship.translateZ((idleSpeed.z + (acceleration * userTranslation.z)) * jumpStart.deltaTime);

				var targetPos = ship.position.clone();
				var targetQuaternion = ship.quaternion.clone();

				ship.position.copy(oldPos);
				ship.quaternion.copy(oldQuaternion);

				ship.position.lerp(targetPos, 0.1);
				ship.quaternion.slerp(targetQuaternion, 0.1);

				if( ship.userData.rcdm.clawDelay === 0 && clawButton && clawButton.value > 0.2 )
				{
					if( ship.syncData.rcdm.clawState === "none" || ship.syncData.rcdm.clawState === "retracted" )
					{
						this.syncData.rcdm.clawState = "extending";
						this.sync({"syncData": true});

						this.userData.rcdm.clawDelay = 1.0;
					}
					else if( ship.syncData.rcdm.clawState === "extended" )
					{
						if( !!this.syncData.rcdm.clawGripped )
						{
							// drop it
							console.log("drop it");
							this.userData.rcdm.clawDelay = Infinity;	// delay until sync gets handled
							this.syncData.rcdm.clawGripped = "";
							this.sync({"syncData": true});
						}
						else
						{
							console.log("retract claw!");

							this.userData.rcdm.clawDelay = Infinity;	// delay until sync gets handled
							this.syncData.rcdm.clawState = "retracting";
							this.sync({"syncData": true});
						}
					}
				}
			}
		}
	}
});