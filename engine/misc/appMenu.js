function JumpStartAppMenu(appID, appURL, scene)
{
	if( (!window.hasOwnProperty("altspace") || !window.altspace.inClient) && !window.hasOwnProperty("loadJumpStart") )
	{
		console.warn("You must be in Altspace for the menu to be injected into your scene.");
		return;
	}

	if( !!!scene || !scene )
		return;

	this.appID = (!!appID) ? appID : "Unknown";
	this.appURL = (!!appURL) ? appURL : "http://www.jumpstartsdk.com/";
	this.scene = scene;
	this.sceneScale = 1.0;
	this.enclosure = null;
	this.backgroundImageElem = null;
	this.arrowImageElem = null;
	this.moreAppsImageElem = null;
	this.apps = {};
	this.itemHeight = 0.0;
	this.upArrow = null;
	this.downArrow = null;
	this.nameCard = null;
	this.items = [];

	loadCSSFile().then(function()
	{
		DOMReady().then(function()
		{
			this.arrowImageElem = new Image();
			this.arrowImageElem.addEventListener("load", function()
			{
				this.moreAppsImageElem = new Image();
				this.moreAppsImageElem.addEventListener("load", function()
				{
					this.backgroundImageElem = new Image();
					this.backgroundImageElem.addEventListener("load", function()
					{
						var jumpStartApps = [
							{
								"id": "BuildingBlocks",
								"url": "http://www.jumpstartsdk.com/live/BuildingBlocks.html"
							},
							{
								"id": "LineRacers",
								"url": "http://www.jumpstartsdk.com/live/LineRacers.html"
							},
							{
								"id": "ShootingGallery",
								"url": "http://www.jumpstartsdk.com/live/ShootingGallery.html"
							},
							{
								"id": "MoleWhack",
								"url": "http://www.jumpstartsdk.com/live/MoleWhack.html"
							},
							{
								"id": "Soundboard",
								"url": "http://www.jumpstartsdk.com/live/Soundboard.html"
							},
							{
								"id": "Stuntman",
								"url": "http://www.jumpstartsdk.com/live/Stuntman.html"
							},
							{
								"id": "SpacePilotV2",
								"url": "http://www.jumpstartsdk.com/live/SpacePilot_v2.html"
							}
						];

						var i;
						for( i = 0; i < jumpStartApps.length; i++ )
						{
							this.apps[jumpStartApps[i].id] = jumpStartApps[i];
							this.apps[jumpStartApps[i].id].isJumpStart = true;
						}

						// Get the app list
						var request = new XMLHttpRequest();
						request.onreadystatechange = function()
						{
							if (request.readyState == 4 && request.status == 200)
							{
								var response = JSON.parse(request.responseText);
								var x;
								for( x in response )
									this.apps[x] = response[x];

								var isInList = false;
								var x, app;
								for( x in this.apps )
								{
									app = this.apps[x];

									if( app.id === this.appID )
									isInList = true;
								}

								if( !isInList && this.appID !== "Unknown" )
									addApp(this.appID, this.appURL).then(function()
									{
										drawAppMenu.call(this);
									}.bind(this));
								else
									drawAppMenu.call(this);
							}
						}.bind(this);
						
						request.open("GET", "https://jumpstart-2.firebaseio.com/appMenu.json", true);
						request.send(null);
					}.bind(this));
					this.backgroundImageElem.src = "data:image/jpeg;base64,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%3D%3D";
				}.bind(this));
				this.moreAppsImageElem.src = "data:image/jpeg;base64,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";
			}.bind(this));
			this.arrowImageElem.src = "data:image/jpeg;base64,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";
		}.bind(this));
	}.bind(this));

	function drawAppMenu()
	{
		// First we need to get everything we need to position us in this enclosure
		// Either get the enclosure or spoof it then call onGetEnclosure
		if( !window.hasOwnProperty("altspace") || !window.altspace.inClient )
		{
			// Spoof the enclosure for web mode
			var commonVal = Math.round(1024);
			var pixelsPerMeter = 100.0;

			this.sceneScale *= pixelsPerMeter / 100.0;

			var enclosure = {
				"innerWidth": commonVal,
				"innerHeight": commonVal,
				"innerDepth": commonVal,
				"scaledWidth": Math.round(commonVal * (1 / this.sceneScale)),
				"scaledHeight": Math.round(commonVal * (1 / this.sceneScale)),
				"scaledDepth": Math.round(commonVal * (1 / this.sceneScale)),
				"pixelsPerMeter": pixelsPerMeter
			};

			onGetEnclosure.call(this, enclosure);
		}
		else
		{
			// Async
			altspace.getEnclosure().then(function(enclosure)
			{
				//this.sceneScale *= enclosure.pixelsPerMeter / 100.0;
				this.sceneScale = this.scene.scale.x;

				enclosure.adjustedWidth = Math.round(enclosure.innerWidth * this.sceneScale);
				enclosure.adjustedHeight = Math.round(enclosure.innerHeight * this.sceneScale);
				enclosure.adjustedDepth = Math.round(enclosure.innerDepth * this.sceneScale);

				enclosure.scaledWidth = enclosure.innerWidth / this.sceneScale;
				enclosure.scaledHeight = enclosure.innerWidth / this.sceneScale;
				enclosure.scaledDepth = enclosure.innerWidth / this.sceneScale;

				onGetEnclosure.call(this, enclosure);
			}.bind(this));
		}

		function onGetEnclosure(enclosure)
		{
			this.enclosure = enclosure;

			this.itemWidth = 300.0 / this.sceneScale;
			this.itemHeight = 60.0 / this.sceneScale;
			createNameCard.call(this);
		}

		function createNameCard()
		{
			var moreAppsButton = spawnMoreAppsButton.call(this);

			var nameCard = spawnItem.call(this, {"id": this.appID, "url": this.appURL}, true);
			nameCard.position.x = (this.enclosure.scaledWidth / 2.0) - (this.itemWidth / 2.0) - (this.itemHeight);
			nameCard.position.y = (this.enclosure.scaledHeight / 2.0) - (this.itemHeight / 2.0);
			this.nameCard = nameCard;

			function spawnMoreAppsButton()
			{
				var options = {
					"width": this.itemHeight,
					"height": this.itemHeight,
					"text": "",
					"fontSize": 12,// * this.enclosure.scaledWidth / 1024.0,
					"color": "rgba(0,0,0,1.0)",
					"background": "rgba(0,0,0,1.0)",
					"backgroundImageElem": this.moreAppsImageElem
				};

				var scale = 2.0;

				var scoreCanvas = document.createElement('canvas');
				scoreCanvas.width = options.width * scale;
				scoreCanvas.height = options.height * scale;

				var scoreContext = scoreCanvas.getContext('2d');
				scoreContext.drawImage(options.backgroundImageElem, 0, 0, scoreCanvas.width, scoreCanvas.height);
				scoreContext.textAlign = "center";
				scoreContext.textBaseline = "middle";
				scoreContext.font = "Bold " + options.fontSize * scale + "px Arial";
				scoreContext.fillStyle = options.color;
			   	scoreContext.fillText(options.text, scoreCanvas.width / 2.0, scoreCanvas.height / 2.0);

				var scoreTexture = new THREE.Texture(scoreCanvas); 
				scoreTexture.needsUpdate = true;

				var material = new THREE.MeshBasicMaterial({map: scoreTexture, visible: true});
				var geometry = new THREE.BoxGeometry(options.width, options.height, 0);

				var plane = new THREE.Mesh(geometry, material);
				/*
				plane.addEventListener("cursorup", function()
				{
					createContainer.call(this);
				}.bind(this));
				*/

				plane.position.x = (this.enclosure.scaledWidth / 2.0) - (this.itemHeight / 2.0);
				plane.position.y = (this.enclosure.scaledHeight / 2.0) - (this.itemHeight / 2.0);

				this.scene.add(plane);

				return plane;
			}
		}

		function createContainer()
		{
			if( !!this.container )
			{
				if( this.container.userData.visible )
					this.container.scale.set(0.0001, 0.0001, 0.0001);
				else
					this.container.scale.set(1, 1, 1);

				this.container.userData.visible = !this.container.userData.visible;
				return;
			}

			this.container = new THREE.Group();
			this.container.userData.visible = true;
			this.scene.add(this.container);

			var upArrow = spawnArrow.call(this, "up");
			this.upArrow = upArrow;
			/*
			upArrow.addEventListener("cursordown", function(e)
			{
				var max = 5;
				var i, item;

				// Get the last visible item
				var firstIndex = 0;
				for( i = this.items.length-1; i >= 0; i-- )
				{
					item = this.items[i];
					if( item.scale.x == 1 )
						firstIndex = i;

					item.scale.set(0.0001, 0.0001, 0.0001);
				}

				if( true )// firstIndex !== 0 )
				{
					if( firstIndex - max < 0 )
						firstIndex -= (firstIndex - max);

					var count = 0;
					for( i = firstIndex - max; i >= 0 && i < firstIndex; i++, count++ )
					{
						item = this.items[i];
						item.scale.set(1, 1, 1);
						item.position.y = (count + 1) * -this.itemHeight;
					}
				}
			}.bind(this));
			*/

			var downArrow = spawnArrow.call(this, "down");
			this.downArrow = downArrow;
			/*
			downArrow.addEventListener("cursordown", function(e)
			{
				var max = 5;
				var i, item;

				// Get the last visible item
				var lastIndex = this.items.length-1;
				for( i = 0; i < this.items.length; i++ )
				{
					item = this.items[i];
					if( item.scale.x == 1 )
						lastIndex = i;

					item.scale.set(0.0001, 0.0001, 0.0001);
				}

				if( true )//lastIndex !== this.items.length-1 )
				{
					if( lastIndex + max > this.items.length-1 )
						lastIndex -= (lastIndex + max) - (this.items.length-1);

					for( i = lastIndex; i < this.items.length && i < lastIndex + max; i++ )
					{
						item = this.items[i];
						item.scale.set(1, 1, 1);
						item.position.y = ((i - lastIndex) + 1) * -this.itemHeight;
					}
				}
			}.bind(this));
			*/

			var x;
			for( x in this.apps )
				spawnItem.call(this, this.apps[x]);

			var max = 5;
			var i, item;
			for( i = 0; i < this.items.length; i++ )
			{
				item = this.items[i];
				if( i < max )
				{
					item.scale.set(1, 1, 1);
					item.position.y = (i+1) * -this.itemHeight;
				}
				else
					item.scale.set(0.0001, 0.0001, 0.0001);
			}

			// Adjust the Y position of everything else
			var upArrow = this.upArrow;
			upArrow.position.y = 0;

			var downArrow = this.downArrow;
			downArrow.position.y = (max+1) * -this.itemHeight;

			this.container.position.copy(this.nameCard.position);
			this.container.position.y -= this.itemHeight;

			// Spawn the UP ARROW
			function spawnArrow(direciton)
			{
				var options = {
					"width": this.itemWidth,
					"height": this.itemHeight,
					"text": "ShootingGallery",
					"fontSize": 5,
					"color": "rgba(255,255,255,1.0)",
					"background": "rgba(0,0,0,1.0)",
					"backgroundImageElem": this.arrowImageElem
				};

				var scale = 2.0;

				var scoreCanvas = document.createElement('canvas');
				scoreCanvas.width = options.width * scale;
				scoreCanvas.height = options.height * scale;

				var scoreContext = scoreCanvas.getContext('2d');
				scoreContext.drawImage(options.backgroundImageElem, 0, 0, scoreCanvas.width, scoreCanvas.height);
				/*
				scoreContext.textAlign = "center";
				scoreContext.textBaseline = "middle";
				scoreContext.font = "Bold " + options.fontSize * scale + "px Arial";
				scoreContext.fillStyle = options.color;
			   	scoreContext.fillText(options.text, scoreCanvas.width / 2.0, scoreCanvas.height / 2.0);
			   	*/

				var scoreTexture = new THREE.Texture(scoreCanvas); 
				scoreTexture.needsUpdate = true;

				var material = new THREE.MeshBasicMaterial({map: scoreTexture, visible: true});

				//var geometry = //new THREE.BoxGeometry(options.width, options.height, 0);
				var geometry = new THREE.Geometry();
				/*
				geometry.vertices.push(new THREE.Vector3(0, 2, 0).multiplyScalar(scale));
    			geometry.vertices.push(new THREE.Vector3(-2, 0, 0).multiplyScalar(scale));
   				geometry.vertices.push(new THREE.Vector3(2, 0, 0).multiplyScalar(scale));
   				*/
   				geometry.vertices.push(new THREE.Vector3(0, options.height, 0));
    			geometry.vertices.push(new THREE.Vector3(-options.width / 2.0, -options.height * 1.5, 0));
   				geometry.vertices.push(new THREE.Vector3(options.width / 2.0, -options.height * 1.5, 0));
				geometry.faces.push(new THREE.Face3(0, 1, 2));
				geometry.computeFaceNormals();

				geometry.faceVertexUvs[ 0 ].push([
					new THREE.Vector2(0.5, 1),
					new THREE.Vector2(0, 0),
					new THREE.Vector2(1, 0)
				]);

				geometry.uvsNeedUpdate = true;

				var plane = new THREE.Mesh(geometry, material);
				plane.scale.y *= 0.3;

				if( direciton === "down" )
					plane.rotateZ(Math.PI);

				this.container.add(plane);

				return plane;
			}
		}

		function spawnItem(app, shallow)
		{
			var options = {
				"width": this.itemWidth,
				"height": this.itemHeight,
				"text": app.id,
				"fontSize": 25 / this.sceneScale,// * this.enclosure.scaledWidth / 1024.0,
				"color": ((!!!shallow || !shallow) && (!!!app.isJumpStart || !app.isJumpStart)) ? "rgba(100,100,100,1.0)" : "rgba(0,0,0,1.0)",
				"background": "rgba(0,0,0,1.0)",
				"backgroundImageElem": this.backgroundImageElem
			};

			var scale = 2.0;

			var scoreCanvas = document.createElement('canvas');
			scoreCanvas.width = options.width * scale;
			scoreCanvas.height = options.height * scale;

			var scoreContext = scoreCanvas.getContext('2d');
			scoreContext.drawImage(options.backgroundImageElem, 0, 0, scoreCanvas.width, scoreCanvas.height);
			scoreContext.textAlign = "center";
			scoreContext.textBaseline = "middle";
			scoreContext.font = "Bold " + options.fontSize * scale + "px Arial";
			scoreContext.fillStyle = options.color;
		   	scoreContext.fillText(options.text, scoreCanvas.width / 2.0, scoreCanvas.height / 2.0);

			var scoreTexture = new THREE.Texture(scoreCanvas); 
			scoreTexture.needsUpdate = true;

			var material = new THREE.MeshBasicMaterial({map: scoreTexture, visible: true});
			var geometry = new THREE.BoxGeometry(options.width, options.height, 0);

			var plane = new THREE.Mesh(geometry, material);

			if( !!!shallow || !shallow )
			{
				/*
				plane.addEventListener("cursorup", function()
				{
					window.location = app.url;
				}.bind(this));
				*/

				this.items.push(plane);

				plane.scale.set(0.0001, 0.0001, 0.0001);
				this.container.add(plane);
			}
			else
			{
				/*
				plane.addEventListener("cursorup", function()
				{
					createContainer.call(this);
				}.bind(this));
				*/

				this.scene.add(plane);
			}

			return plane;
		}
	}

	function addApp(id, url)
	{
		return {
			"then": function(callback)
			{
				var request = new XMLHttpRequest();
				request.onreadystatechange = function()
				{
					if( request.readyState == 4 && request.status == 200 )
					{
						var key = JSON.parse(request.responseText).name;
						apps[key] = {"id": id, "url": url};
						callback();
					}
				};

				request.open("POST", "https://jumpstart-2.firebaseio.com/appMenu.json", true);
				request.send(JSON.stringify({"id": id, "url": url}));
			}
		};
	}

	function loadCSSFile()
	{
		// Async
		return {
			"then": function(callback)
			{
				// Async
				var elem = document.createElement("link");
				elem.rel = "stylesheet";
				elem.type = "text/css";
				elem.href = "http://www.jumpstartsdk.com/live/engine/misc/JumpStartStyle.css";
				elem.addEventListener("load", function() { callback(); });
				document.getElementsByTagName("head")[0].appendChild(elem);
			}
		};
	}

	function DOMReady()
	{
		// Async
		return {
			"then": function(callback)
			{
				if( document.readyState === "interactive" || document.readyState === "complete" )
					callback();
				else
				{
					function readyWatch(DOMEvent)
					{
						callback();
					}

					document.addEventListener("DOMContentLoaded", readyWatch, true);
				}
			}
		};
	}
}