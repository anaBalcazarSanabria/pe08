// D2LReader function
// Description: Inserts the elements necessary to inject the Readspeaker Web
//              Reader functionality
// preconditions: expects the following values on the query string
//   rsUrl: the readspeaker webreader url
//   custid: the customer id to use for the readspeaker webreader client
//   lang: the language to use
//   target: the name of the id or class to target
//   targetType: indicates if the target is an id or class
const d2lReader = () => {
	// make sure the DOM is ready
	if (!document.body || document.getElementsByTagName('frameset').length > 0) {
		return;
	}

	// If the current frame or a parent frame has the d2lLegacyScorm parameter,
	// then we disable the WebReader since we don't support it in SCORM content.
	if (checkFramesForLegacyScorm()) return;

	const parseQuery = (query) => {
		const params = {};

		if (!query) {
			return params; // return empty object
		}

		const pairs = query.split(/[;&]/);

		for (let i = 0; i < pairs.length; i++) {
			const keyVal = pairs[i].split('=');

			if (!keyVal || keyVal.length != 2) {
				continue;
			}

			const key = decodeURIComponent(keyVal[0]);
			const val = decodeURIComponent(keyVal[1]);

			params[key] = val.replace(/\+/g, ' ');
		}

		return params;
	};

	const htmlEscape = (str) => {
		return new String(str)
			.replace(/&/g, '&amp;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
	};

	const getScriptBySrcName = (allScripts, name) => {
		if (!allScripts) {
			return null;
		}

		let index = 0;
		let script = null;

		name = name.toLowerCase();

		do {
			if (allScripts[index].src.toLowerCase().indexOf(name, 0) != -1) {
				script = scripts[index];
			}

			++index;
		} while ((index < allScripts.length) && !script)

		return script;
	};

	// find our script in the DOM and get the script params
	const scripts = document.getElementsByTagName('script');
	const d2lReadSpeakerScript = getScriptBySrcName(scripts, 'D2LReader');

	if (!d2lReadSpeakerScript) {
		return;
	}

	const queryString = d2lReadSpeakerScript.src.replace(/^[^\?]+\??/, '');
	const params = parseQuery(queryString);
	const target = params['target'];
	const targetType = params['targetType'];
	let elements;

	// try to get elements from target
	if (target) {
		if (targetType === 'id') {
			elements = [document.getElementById(target)];
		} else if (targetType === 'class') {
			elements = Array.from(document.querySelectorAll(`.${target}`));
		}
	}

	// fallback to using the body if no valid target specified
	if (!elements) {
		elements = [document.body];
	}

	const currentUrl = window.location.href.split('?')[0];
	const rsUrl = htmlEscape(params['rsUrl']);
	const title = htmlEscape(params['listenTitle']);
	const text = params['listenText'];
	const custId = params['custId'];
	const rsTargetUrlBase = new URL(rsUrl);
	const lang = params['lang'];
	const mode = params['mode'];

	rsTargetUrlBase.searchParams.append('customerid', custId);
	rsTargetUrlBase.searchParams.append('url', currentUrl);
	rsTargetUrlBase.searchParams.append('lang', lang);

	//If it is a discussion page then add RS only near settings button and set read area for topic/thread view
	if (mode === 'discussions') {
		const rsTargetUrl = new URL(rsTargetUrlBase);
		const readTextId = 'd2l_read_element_0';
		rsTargetUrl.searchParams.append('readid', readTextId);

		const elementToRead = document.getElementById('d2l_two_panel_selector_main');
		const elementToPlaceRSButton1 = Array.from(document.getElementsByClassName('d2l-button-subtle-group'))[0];
		const elementToPlaceRSButton2 = Array.from(document.getElementsByClassName('d2l-header-search'))[0];

		if (elementToRead && elementToPlaceRSButton1) {
			addReadingArea(elementToRead, readTextId);

			const buttonDiv = document.createElement('div');
			addButtonToElement(buttonDiv, 0, title, rsTargetUrl, text);

			buttonDiv.style.display = "inline-block";
			buttonDiv.style.verticalAlign = "middle";
			buttonDiv.style.padding = '0 0.6rem';

			//wrapper button is needed to align center button
			if (elementToPlaceRSButton1.firstChild) {
				elementToPlaceRSButton1.insertBefore(buttonDiv, elementToPlaceRSButton1.firstChild);
			} else {
				elementToPlaceRSButton1.appendChild(buttonDiv);
			}

		}

		if (elementToRead && elementToPlaceRSButton2) {
			addButtonToElement(elementToPlaceRSButton2, 1, title, rsTargetUrl, text);
		}

		return;
	} else if (mode === 'contentviewdiscussions') {
		const pageTitleContainerH1Element = document.getElementsByClassName('d2l-page-title-c')[0]?.getElementsByTagName('h1')[0];
		const popupTitleH2Element = document.getElementsByClassName('d2l-popup-title')[0]?.getElementsByTagName('h2')[0];

		if (pageTitleContainerH1Element) {
			addReadingArea(pageTitleContainerH1Element, 'd2l_read_element_1');
		} else if (popupTitleH2Element) {
			addReadingArea(popupTitleH2Element, 'd2l_read_element_1');
		}
	}

	elements.map((element, i) => {
		const rsTargetUrl = new URL(rsTargetUrlBase);
		const readTextId = `d2l_read_element_${i + 1}`;
		rsTargetUrl.searchParams.append('readid', readTextId);

		addReadingArea(element, readTextId)
		addButtonToElement(element, i + 1, title, rsTargetUrl, text);
	});

	//When side panel is shown in content view a RS button shouldn't overlap view of the panel
	fixCollapsePanelViewWnenRSInjectedContentView(target);
};

const addButtonToElement = (element, buttonNumber, title, rsTargetUrl, text) => {
	const buttonDiv = document.createElement('div');
	buttonDiv.id = `readspeaker_button_${buttonNumber}`;
	buttonDiv.className = 'rs_skip rsbtn rs_preserve';
	buttonDiv.innerHTML =
		`<a class="rsbtn_play"
			accesskey="L"
			role="button"
			title="${title}"
			alt="${title}"
			href="${rsTargetUrl.href}">
			<span class="rsbtn_left rsimg rspart">
				<span class="rsbtn_text">
					<span>${text}</span>
				</span>
			</span>
			<span class="rsbtn_right rsimg rsplay rspart"></span>
		</a>`;

	if (element.firstChild) {
		element.insertBefore(buttonDiv, element.firstChild);
	} else {
		element.appendChild(buttonDiv);
	}
}

const addReadingArea = (element, readTextId) => {
	const wrapDiv = document.createElement('div');
	wrapDiv.id = readTextId;
	wrapDiv.style.display = 'inline';
	wrapDiv.style.isolation = 'unset';

	while (element.firstChild) {
		wrapDiv.appendChild(element.firstChild);
	}

	element.appendChild(wrapDiv);
};

const fixCollapsePanelViewWnenRSInjectedContentView = (target) => {
	if(target === 'ContentView') {
		element = Array.from(document.querySelectorAll('.d2l-page-collapsepane-container'))[0];
		if(element) {
			element.style.zIndex = '2'
		}
	}
}

const checkFramesForLegacyScorm = () => {
	let currWindow = window;
	while (currWindow !== window.top) {
		if (!isWindowCrossOriginRestricted(currWindow) && locationHasLegacyScorm(currWindow.location)) return true;

		currWindow = currWindow.parent;
	}

	return locationHasLegacyScorm(currWindow.location);
};

const locationHasLegacyScorm = (location) => {
	const urlParams = new URLSearchParams(location.search);
	return urlParams.get('d2lLegacyScorm') === '1';
};

/*
	If you try to access properties of a location object that belongs to a window
	that's on a different domain and restricted by cross-origin rules, an error
	is thrown. This a browser security feature that we need to check for before
	attempting to check for legacy scorm in search params in the parent frames.
*/
const isWindowCrossOriginRestricted = (win) => {
	try {
		return !win.location.hostname;
	} catch (error) {
		return true;
	}
};

(() => {
	const myAddEventListener = (eventName, domNode, callback, useCapture) => {
		if (!domNode) {
			return;
		}

		if (domNode.addEventListener) {
			useCapture = useCapture || false;

			if (eventName.length > 2 && eventName.substr(0, 2) == 'on') {
				eventName = eventName.substr(2);
			}

			domNode.addEventListener(eventName, callback, useCapture);
		} else if (domNode.attachEvent) {
			if (eventName.substr(0, 2) != 'on') {
				eventName = 'on' + eventName;
			}

			domNode.attachEvent(eventName, callback);
		}
	};

	if (document.addEventListener) {
		myAddEventListener('DOMContentLoaded', window.document, d2lReader);
	} else {
		const readyCheck = () => {
			dr = document.readyState;

			if (dr == "complete" || dr == "loaded") {
				d2lReader();
			}
		};

		myAddEventListener('onreadystatechange', window.document, readyCheck);
	}
})();
