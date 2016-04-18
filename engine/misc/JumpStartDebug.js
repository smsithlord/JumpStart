function JumpStartDebug()
{
	this.slates = {};
}

JumpStartDebug.prototype.updateSlate = function(slateName, data)
{
	var slate = this.slates[slateName] || this.createSlate(slateName);
	slate.update.call(slate, data);
};

JumpStartDebug.prototype.createSlate = function(slateName, data)
{
	var slate = {
		"name": slateName,
		"elem": null,
		"update": null
	};

	switch(slateName)
	{
		case "log":
			slate.update = function(inData)
			{
				var elem = this.elem.getElementsByClassName("JS_SLATE_LOGTEXT")[0];
				elem.value += inData + "\n";
				elem.scrollTop = elem.scrollHeight;
			};

			var container = document.createElement("div");
			container.className = "JS_SLATE_LOGTEXT_CONTAINER";
			container.style.width = (window.JumpStart.enclosure.adjustedWidth / 1.5) + "px";

			var title = document.createElement("div");
			title.className = "JS_SLATE_HEADER";
			title.innerText = "Console Log";

			var textarea = document.createElement("textarea");
			textarea.className = "JS_SLATE_LOGTEXT";
			/*textarea.disabled = true;*/
			textarea.readonly = true;

			container.appendChild(title);
			container.appendChild(textarea);

			slate.elem = container;
//			slate.update.call(slate, data);
			document.body.appendChild(container);
			break;
	}

	this.slates[slateName] = slate;

	return slate;
};