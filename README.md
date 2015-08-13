##### *Current Version: 0.1.0*

#### Purpose
Make it easy for new developers to create good apps.

#### Description
The AltspaceSDK is deceptively simple to get started, but difficult to build meaningful apps with.  The JumpStart SDK Crutch creates a working environment for the app developer to use that is well suited to build apps that run both inside of AltspaceVR, or in 2D web-mode, with or without multiuser networking.

I found myself developing the **same** systems for every app that I built, so I created this framework to save myself and everybody else a whole lot of time.

Note that JumpStart only relies on **FirebaseSync.js** and **AltOBJMTLLoader.js** from the AltspaceSDK at this time.

#### Features
- Automatic THREE.js & AltspaceSDK initialization
- Automatic 2D web-mode compatibility (w/ spoofed enclosure & user objects)
- Mesh-accurate 3D cursor raycasting
- **Complete** 3D cursor tracking within enclosure
- Crosshair object to capture **all** cursordown events within enclosure (OPTIONAL)
- Easy-to-spawn *CursorPlane* objects to catch 3D cursor ray casting
- Model caching & batch model loading
- Intuitive game-like event listener structure
- Adds listeners for important object events: tick, spawn
- Renderer-synchronized event listener callbacks 
- Networked event listener function names
- Callback for when the first user initializes the environment
- Simplified FirebaseSync.js integration
- Data listeners fired when value of a property changes (Firebase + spoofed local)
- Exposes important THREE.js & AltspaceSDK objects through globals
- Debug mode that lets you test alterations to callbacks WITHIN the app
- Easily switch between the legacy object loader or the current loader (which doesn't
work on 2 of my computers.)

#### Technical
- Extends the window object
- Extends only the THREE.js objects that utilizes it

#### Limitations
- Allows *N* listeners for each event, but only the first listener's function **name** is networked
- Only 1 data listener can be attached per object property
- Data listeners can only be attached to properties that exist in both [Object object].userData.syncData AND [Object object].JumpStart simultaneously (which is all default JumpStart properties)
- Networked JumpStart object properties share namespace with networked user properties on the same object

#### Usage
- **SEE:** *minimal.html*, *minimalNetworked.html*, and *index.html* for usage examples.
- (OPTIONAL) Configure JumpStart with a call to JumpStart.setOptions([Object object])
- (OPTIONAL) Define an onPrecache global function that gets called prior to scene creation. If defined, JumpStart.doneCaching() MUST be called when caching is complete.
- (OPTIONAL) Define an onCursorDown global function that gets called when ever ANY object is clicked down.
- (OPTIONAL) Define an onCursorUp global function that gets called when ever ANY object is clicked up.
- (OPTIONAL) Define an onTick global function that gets called every render tick.
- Define an onReady global function that gets called when your app is ready to run.
- Spawn new objects using JumpStart.spawnInstance([String object])
<<<<<<< HEAD
- Call JumpStart.run() at the end of your onReady function to begin the simulation.

#### Known Bugs
- The first user to enter a room in networked web-mode is asked to enter their name twice
=======
>>>>>>> origin/master
