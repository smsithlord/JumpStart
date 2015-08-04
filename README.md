# Introduction
Get a jump-start on making your AltspaceVR hologram app.
Get your 3D model into Altspace & 2D browsers at the same time and start manipulating it with just a few lines of code.

There are usage instructions in the source code.  This handles all of the legwork of setting stuff up and lets you get straight to prototyping your hologram AltspaceVR app.

It currently handles scene setup, model pre-caching, scene-wide animation, and per-object animation.

Since it works directly on scene objects themselves, the code you generate using it is very forward-compatible.

It also exposes all important scene-related objects as global variables, so you are not restricting yourself by using it.

# Instructions (EASY MODE)
1. Clone the repo, then use index.html as the starting point of your project.

# Instructions (REGULAR MODE)
1. Include JumpStart.js in the BODY of your page.
2. Define a function called OnJumpStartReady that will automatically be called when your app is ready to start using the 3D scene.
3. (OPTIONAL) Define a function called OnTick that will automatically be called immediately preceding the 3D scene being rendered every frame.
4. Pre-cache your models with the LoadModels function.  You can pass it one at a time, or multiple models at once.  All of the following calls are valid:
  * LoadModels("models/MyApp/MyModel.obj").then(...);
  * LoadModels("models/MyApp/MyModel01.obj", "models/MyApp/MyModel01.obj").then(...);
  * LoadModels(["models/MyApp/MyModel01.obj", "models/MyApp/MyModel01.obj"]).then(...);
5. Loading models is ALWAYS asynchronous.  Your callback function (shown as ... in the examples) will be called as soon as that batch of models is finished loading.
6. After your model is cached, you can spawn an instance of it with:
  * var myInstance = SpawnInstance("models/MyApp/MyModel.obj");
7. If you want to perform logic on your new instance every tick, you can register an onTick function for the object itself using the following syntax:
  ```
myInstance.onTick["anyUniqueName"] = function()
{
  // do work on this instance, but don't forget g_DeltaTime!!
};
```
8. JumpStart will add many global variables for you to utilize:
  * g_Clock
    - The render clock.
  * g_DeltaTime
    - The amount of time that has passed since the last render tick.
  * g_Loader
    - The object loader.
  * g_Scene
    - The scene.
  * g_Renderer
    - The renderer.
  * g_Camera (null if inside of Altspace)
    - The camera for web mode.
  * g_Enclosure* (spoofed if NOT inside of Altspace)
    - The enclosure information.  Spoofed enclosures use window height as depth value.
  * g_RayCaster*
    - Used to cast rays.
  * g_FloorPlane*
    - An invisible plane used to capture 3D cursor position along the floor.
  * g_CursorEvents*
		- The Altspace cursor event object.
  * g_CursorPoint*
		- 3D cursor position.
  * g_CursorOrigin*
		- The player's face.
  * g_CursorObject*
		- A scene object to capture clicks.
  * g_WorldOffset
		- Used so things spawn on the floor, not the center of the enclosure.
  * g_WorldScale (read-only after initialized)
		- Used to ajust the scale of your app within the enclosure space.

(*) The globals with asterisks are not yet fully supported by this version of
    "JumpStart" yet, so you should look at JumpStart.js and modify it as needed.
