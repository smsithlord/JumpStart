(function()
{
	var appID = "Unknown";
	var appURL = "http://www.jumpstartsdk.com/";
	var apps = {};

	loadCSSFile().then(function()
	{
		DOMReady().then(function()
		{
			var jumpStartApps = [
				{
					"id": "BuildingBlocks",
					"url": "http://www.jumpstartsdk.com/live/v2/BuildingBlocks.html"
				},
				{
					"id": "LineRacers",
					"url": "http://www.jumpstartsdk.com/live/v2/LineRacers.html"
				},
				{
					"id": "MoleWhack",
					"url": "http://www.jumpstartsdk.com/live/v2/MoleWhack.html"
				},
				{
					"id": "TicTacToe",
					"url": "http://www.jumpstartsdk.com/live/v2/TicTacToe.html"
				}
			];

			var i;
			for( i = 0; i < jumpStartApps.length; i++ )
			{
				apps[jumpStartApps[i].id] = jumpStartApps[i];
				apps[jumpStartApps[i].id].isJumpStart = true;
			}

			var scripts = document.head.getElementsByTagName("script");
			var i, testID, testURL;
			for( i = 0; i < scripts.length; i++ )
			{
				testID = scripts[i].getAttribute("appid");
				if( testID )
					appID = testID;

				testURL = scripts[i].getAttribute("appurl");
				if( testURL )
					appURL = testURL;
			}

			// Get the app list
			var request = new XMLHttpRequest();
			request.onreadystatechange = function() {
			  if (request.readyState == 4 && request.status == 200)
			  {
			  	var response = JSON.parse(request.responseText);
			  	var x;
			  	for( x in response )
			  		apps[x] = response[x];

			  	if( !apps )
			  		apps = {};

			  	var isInList = false;
			  	var x, app;
			  	for( x in apps )
			  	{
			  		app = apps[x];

			  		if( app.id === appID )
			  			isInList = true;
			  	}

			  	if( !isInList )
			  		addApp(appID, appURL).then(function()
			  		{
			  			drawAppMenu();
			  		});
			  	else
			  		drawAppMenu();
			  }
			};

			request.open("GET", "https://jumpstart-2.firebaseio.com/appMenu.json", true);
			request.send(null);
		});
	});

	function drawAppMenu()
	{
		var elem = document.createElement("div");
		elem.style.zIndex = 9999999;
		elem.className = "JS_APPMENU";
		elem.innerHTML = appID + "<img src='http://www.jumpstartsdk.com/live/v2/engine/misc/appMenu.png' class='JS_APP_MENU_LOGO' />";
		elem.addEventListener("mouseover", function(e)
		{
			e.srcElement.src = "http://www.jumpstartsdk.com/live/v2/engine/misc/appMenu_on.png";
		});
		elem.addEventListener("mouseout", function(e)
		{
			e.srcElement.src = "http://www.jumpstartsdk.com/live/v2/engine/misc/appMenu.png";
		});
		elem.addEventListener("click", function(e)
		{
			var elem = document.getElementsByClassName("JS_MORE_APPS")[0];

			if( elem.isHidden )
			{
				elem.style.display = "block";
				elem.isHidden = false;
			}
			else
			{
				elem.style.display = "none";
				elem.isHidden = true;
			}
		});

		document.body.appendChild(elem);

		var moreApps = document.createElement("div");
		moreApps.className = "JS_MORE_APPS";
		moreApps.innerHTML = "MORE APPS";
		moreApps.isHidden = true;

		var moreAppsContainer = document.createElement("div");
		moreAppsContainer.className = "JS_MORE_APPS_CONTAINER";

		var i, app;
		for( i in apps )
		{
			app = document.createElement("div");
			app["app"] = apps[i];
			app.className = "JS_APP";

			if( !!!apps[i].isJumpStart || !apps[i].isJumpStart )
				app.style.color = "#bb0000";

			app.innerHTML = apps[i].id;
			var appURL = apps[i].url;
			app.addEventListener("click", function(e)
			{
				window.location = e.srcElement.app.url;
			});

			moreAppsContainer.appendChild(app);
		}

		moreApps.appendChild(moreAppsContainer);
		document.body.appendChild(moreApps);
	}

	function addApp(id, url)
	{
		console.log("yup");
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
				elem.href = "http://www.jumpstartsdk.com/live/v2/engine/misc/JumpStartStyle.css";
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
})();