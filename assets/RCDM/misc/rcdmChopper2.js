jumpStartBehavior({
	"rcdmChopper2":
	{
		"applyBehavior": function(options)
		{
			this.addEventListener("spawn", jumpStart.behaviors.rcdmChopper2.spawnBehavior);
			this.addEventListener("tick", jumpStart.behaviors.rcdmChopper2.tickBehavior);
			return true;
		},
		"spawnBehavior": function(isInitialSync)
		{
			var vehicleType = jumpStart.behaviors.rcdm.getVehicleType("rcdmChopper2");

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
					"callback": function(visualObject)
					{
						var vehicle = this.userData.vehicle;
						if( !!vehicle.syncData.rcdm.custom.parts[this.userData.partName].colorCode )
							this.setColor(new THREE.Color(vehicle.syncData.rcdm.custom.parts[this.userData.partName].colorCode));
					}.bind(part)
				});
				part.position.copy(vehicleType.parts[x].offset);
				part.rotateX(vehicleType.parts[x].rotate.x);
				part.rotateY(vehicleType.parts[x].rotate.y);
				part.rotateZ(vehicleType.parts[x].rotate.z);
				part.userData.partName = x;
				part.userData.vehicle = this;
				
				this.userData.rcdm.parts[x] = part;
			}

			///////////////////////
			// CUSTOM PART LOGIC //
			///////////////////////

			// blades
			this.userData.rcdm.parts.blades.addEventListener("tick", function()
			{
				var vehicle = this.userData.vehicle;
				var vehicleType = jumpStart.behaviors.rcdm.getVehicleType("rcdmChopper2");
				var rotSpeed = (!!vehicle.syncData.rcdm.custom.parts.blades && vehicle.syncData.rcdm.custom.parts.blades.rotSpeed) ? vehicle.syncData.rcdm.custom.parts.blades.rotSpeed : vehicleType.parts.blades.rotSpeed;

				this.rotateY(rotSpeed * jumpStart.deltaTime);
			});

			// backBlades
			this.userData.rcdm.parts.backBlades.addEventListener("tick", function()
			{
				var vehicle = this.userData.vehicle;
				var vehicleType = jumpStart.behaviors.rcdm.getVehicleType("rcdmChopper2");
				var rotSpeed = (!!vehicle.syncData.rcdm.custom.parts.backBlades && vehicle.syncData.rcdm.custom.parts.backBlades.rotSpeed) ? vehicle.syncData.rcdm.custom.parts.backBlades.rotSpeed : vehicleType.parts.backBlades.rotSpeed;

				this.rotateX(rotSpeed * jumpStart.deltaTime);
			});
		},
		"tickBehavior": function()
		{
			var ship = this;
			if( !!jumpStart.gamepad && ship.ownerID === jumpStart.localUser.userID )
			{
				var oldPos = ship.position.clone();
				var oldQuaternion = ship.quaternion.clone();
				var oldRotation = ship.rotation.clone();

				var fireButton;
				var clawButton;
				if( jumpStart.gamepad.mapping === "steamvr" || jumpStart.gamepad.mapping === "touch" )
				{
					var yawAxisValue = jumpStart.gamepad.axes[0];
					if( Math.abs(yawAxisValue) > 0.1 )
						ship.rotateY(10.0 * -yawAxisValue * jumpStart.deltaTime);

					var pitchAxisValue = jumpStart.gamepad.axes[1];
					if( Math.abs(pitchAxisValue) > 0.1 )
						ship.rotateX(10.0 * pitchAxisValue * jumpStart.deltaTime);

					var otherGamepad = jumpStart.gamepads.find(function(t)
					{
						return ( t.mapping === jumpStart.gamepad.mapping && t !== jumpStart.gamepad );
					});

					if(otherGamepad)
					{
						clawButton = otherGamepad.buttons[0];

						var rollAxisValue = otherGamepad.axes[0];
						if( Math.abs(rollAxisValue) > 0 )
							ship.rotateZ(10.0 * rollAxisValue * jumpStart.deltaTime);

						var movementAxisValue = otherGamepad.axes[1];
						ship.translateZ((300.0 + (100.0 * movementAxisValue)) * jumpStart.deltaTime);
					}

					fireButton = jumpStart.gamepad.buttons[0];
				}
				else
				{
					var movementAxisValue = jumpStart.gamepad.axes[1];
					ship.translateZ((300.0 + (100.0 * -movementAxisValue)) * jumpStart.deltaTime);

					var rollLeftButton = jumpStart.gamepad.buttons[4];
					if( rollLeftButton.value > 0 )
						ship.rotateZ(10.0 * -rollLeftButton.value * jumpStart.deltaTime);

					var rollRightButton = jumpStart.gamepad.buttons[5];
					if( rollRightButton.value > 0 )
						ship.rotateZ(10.0 * rollRightButton.value * jumpStart.deltaTime);

					var yawAxisValue = jumpStart.gamepad.axes[2];
					if( Math.abs(yawAxisValue) > 0.1 )
						ship.rotateY(10.0 * -yawAxisValue * jumpStart.deltaTime);

					var pitchAxisValue = jumpStart.gamepad.axes[3];
					if( Math.abs(pitchAxisValue) > 0.1 )
						ship.rotateX(10.0 * -pitchAxisValue * jumpStart.deltaTime);

					fireButton = jumpStart.gamepad.buttons[7];
					clawButton = jumpStart.gamepad.buttons[6];
				}

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