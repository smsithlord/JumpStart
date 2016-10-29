jumpStartBehavior({
	"collidable":
	{
		"objects": {},
		"checkForCollision": function(vehicle)
		{
			var x, victim, victimRadius, vehicleRadius, minDist;
			for( x in jumpStart.behaviors.collidable.objects )
			{
				victim = jumpStart.behaviors.collidable.objects[x];

				// check if vehicle's radius is within victim's radius

				// FIXME: probably need to figure in object scale when comparing hit radi.
				vehicleRadius = (!!vehicle.boundingSphere) ? vehicle.boundingSphere.radius : 10.0;
				victimRadius = victim.syncData.collidable.radius;
				if( victimRadius === 0 )
					victimRadius = (!!victim.boundingSphere) ? victim.boundingSphere.radius : 10.0;

				minDist = vehicleRadius + victimRadius;

				if( victim.getWorldPosition().distanceTo(victim.getWorldPosition()) < minDist )
				{
					console.log("RADIUS HIT DETECTED!!!!!");
					victim.userData.rcdm.collision.call(vehicle, victim, minDist);
				}
			}
		}
		"applyBehavior": function(options)
		{
			if( !!!this.syncData.collidable )
			{
				this.syncData.collidable = {
					"radius": (!!options.radius) ? options.radius : 0,
					"id": jumpStart.generateId(),
					"gripperID": ""
				};

				this.addEventListener("spawn", jumpStart.behaviors.graspable.spawnBehavior);
				this.addEventListener("remove", jumpStart.behaviors.graspable.removeBehavior);
				//this.addEventListener("tick", jumpStart.behaviors.graspable.tickBehavior);
			}
			return true;
		},
		"unapplyBehavior": function()
		{
			delete this.syncData["collidable"];
			//delete this.userData["collidable"];
			this.removeBehavior("spawn", jumpStart.behaviors.collidable.spawnBehavior);
			this.removeBehavior("remove", jumpStart.behaviors.collidable.removeBehavior);
			//this.removeBehavior("tick", jumpStart.behaviors.graspable.tickBehavior);
		},
		"spawnBehavior": function(isInitialSync)
		{
			jumpStart.behaviors.collidable.objects[this.syncData.collidable.id] = this;
		},
		"removeBehavior": function()
		{
			delete jumpStart.behaviors.collidable.objects[this.syncData.collidable.id];
		}
	}
});