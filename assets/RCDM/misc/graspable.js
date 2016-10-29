jumpStartBehavior({
	"graspable":
	{
		"objects": {},
		"applyBehavior": function(options)
		{
			if( !!!this.syncData.graspable )
			{
				this.syncData.graspable = {
					"radius": (!!options.radius) ? options.radius : 25.0,
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
			delete this.syncData["graspable"];
			delete this.userData["graspable"];
			this.removeBehavior("spawn", jumpStart.behaviors.graspable.spawnBehavior);
			this.removeBehavior("remove", jumpStart.behaviors.graspable.removeBehavior);
			//this.removeBehavior("tick", jumpStart.behaviors.graspable.tickBehavior);
		},
		"prepGraspable": function()
		{
			this.userData.graspable = {};
			jumpStart.behaviors.graspable.objects[this.syncData.graspable.id] = this;
		},
		"spawnBehavior": function(isInitialSync)
		{
			if( !!!this.userData.graspable )
				jumpStart.behaviors.graspable.prepGraspable.call(this);
		},
		/*"tickBehavior": function()
		{
			if( !!!this.userData.graspable )
				jumpStart.behaviors.graspable.prepGraspable.call(this);
		},*/
		"removeBehavior": function()
		{
			delete jumpStart.behaviors.graspable.objects[this.syncData.graspable.id];
		}
	}
});