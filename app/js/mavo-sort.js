/* global Bliss, Mavo */

(function($, $$) {

var SORT_ATTR = "mv-sort";
var INC_LIST = ["+"];
var DEC_LIST = ["-"];
var INC_DEFAULT = false;

/**
 * Gets a unique array representing the given sorting criteria.
 * @param {Array | string} properties - properties of the items in the
 * collection whose values we will use to compare for sorting
 * @param {boolean} keepOrder - whether or not to have symbol dictating order in
 * front of property names
 * @returns {Array} array of strings with sorting properties
 */
var getFormattedProperties = function(properties, keepOrder) {
	if (properties === null || properties === undefined) {
		return [];
	}
	if (keepOrder === undefined) {
		keepOrder = true;
	}
	if (typeof properties === "string") {
		properties = properties.trim();
		properties = properties.split(/\s*,\s*|\s+/).filter(val => val.length > 0);
	}

	for (var i = 0; i < properties.length; i += 1) {
		var property = properties[i];
		if (typeof property === "string") {
			if (keepOrder) {
				if (INC_LIST.indexOf(property[0]) === -1 &&
						DEC_LIST.indexOf(property[0])	=== -1) {
					if (INC_DEFAULT) {
						properties[i] = INC_LIST[0] + property;
					} else {
						properties[i] = DEC_LIST[0] + property;
					}
				}
			} else if (INC_LIST.indexOf(property[0]) > -1 ||
			           DEC_LIST.indexOf(property[0])	> -1) {
				properties[i] = property.substring(1);
			}
		}
	}

	return properties;
}

/**
 * Gets a unique string representing the given sorting criteria.
 * @param {Array | string} properties - properties of the items in the
 * collection whose values we will use to compare for sorting
 * @returns {string} string representing sorting criteria
 */
var formatSortCriteria = function(properties) {
	properties = getFormattedProperties(properties, true);

	return properties.join();
}

Mavo.attributes.push(SORT_ATTR);

Mavo.Plugins.register("sort", {
	hooks: {
		"init-end": function(root) {
			if (root.element) {
				var observer = new Mavo.Observer(root.element, SORT_ATTR, records => {
					for (let record of records) {
						var element = record.target;
						var properties = element.getAttribute(SORT_ATTR);
						if (properties != null) {
							var collection = Mavo.Collection.get(element);
							var sortCriteria = formatSortCriteria(collection.sortedBy);
							properties = formatSortCriteria(properties);
							if (sortCriteria !== properties) {
								collection.sortDOM(properties);
							}
						}
					}
				}, {subtree: true});
			}


		},
		"node-render-end": function(env) {
			if (env.context.nodeType == "Collection") {
				var collection = env.context;
				var properties = collection.element.getAttribute(SORT_ATTR);
				collection.sortDOM(properties);
			}
		},
		"render-end": function(env) {
			var root = env.context.root;

			root.element.addEventListener("mv-change", function(e) {
				if (e.node.mode == "read" &&
				    e.node.closestCollection !== null) {
					var collection = e.node.closestCollection;
					var properties = collection.element.getAttribute(SORT_ATTR);
					if (properties !== null) {
						var noOrdProps = getFormattedProperties(properties, false);
						if (noOrdProps.indexOf(e.node.property) > -1) {
							collection.sortDOM(properties);
						}
					}
				}
			});

			root.element.addEventListener("mv-done", function(e) {
				var node = e.node;
				if (node.nodeType === "Collection") {
					var properties = node.element.getAttribute(SORT_ATTR);
					node.sortDOM(properties);
				}
			});
		}
	}
});

/**
 * Sorts an array of primitives or objects. If sorting objects, properties is
 * used to find the values to determine the sorting order
 * @param {Array} array - the array we want to sort
 * @param {...string} [properties] - variable number of properties to use to get
 * values from objects in array to determine sorting order. The first property
 * specified is preferred, and only moves on the next properties in the event of
 * a tie. If none provided, will treat items in array as primitives and attempt
 * to sort in increasing order
 */
Mavo.Functions.sort = function(array, ...properties) {
	var arrayCopy = array.slice();

	if (array.length === 0) {
		return arrayCopy;
	}

	var stableCopy = arrayCopy.map((el, index) => [el, index]);

	stableCopy.sort(function(prevData, nextData) {
		var prev = prevData[0];
		var next = nextData[0];
		if (prev === undefined) {
			return 1;
		}
		if (next === undefined) {
			return -1;
		}
		if (prev === null) {
			return 1;
		}
		if (next === null) {
			return -1;
		}

		var prevNode = null;
		var nextNode = null;

		// If the elements in the array are Mavo nodes, sort by their data
		if (prev instanceof Mavo.Node) {
			prevNode = prev;
			prev = prev.getData({live: true});
		}
		if (next instanceof Mavo.Node) {
			nextNode = next;
			next = next.getData({live: true});
		}

		// If it's an array of different types, we can't sort properly
		if (typeof prev !== typeof next) {
			return prevData[1]-nextData[1];
		}

		// If there's no properties, attempt to sort primitives in increasing
		// order by default
		if (properties.length === 0) {
			if (prev < next) {
				return -1;
			} else if (prev > next) {
				return 1;
			} else {
				return prevData[1]-nextData[1];
			}
		}

		// Sort objects by first property that doesn't result in a tie
		var isTie = false
		for (let property of properties) {
			isTie = false;
			var inc;
			var new_prev = prev, new_next = next;
			var propFound = false;
			if (typeof property === "number") {
				inc = property >= 0;
			} else if (typeof property === "string") {
				property = property.trim();
				if (property.length === 0) {
					continue;
				}

				if (INC_LIST.indexOf(property[0]) > -1) {
					inc = true;
					property = property.substring(1);
				} else if (DEC_LIST.indexOf(property[0]) > -1) {
					inc = false;
					property = property.substring(1);
				}
			} else if (property instanceof Array) {
				if (property.length !== array.length) {
					throw new Error(`Attempting to sort array of length ` +
							`${array.length} with array property of length ` +
							`${property.length}, arrays must be the same length`);
				}

				inc = INC_DEFAULT;
				new_prev = property[prevData[1]];
				new_next = property[nextData[1]];
			} else {
				continue;
			}

			if (typeof property === "string" && property.length > 0) {
				if (prevNode !== null && nextNode !== null) {
					var new_prev_node = prevNode.find(property);
					var new_next_node = nextNode.find(property);
					if (new_prev_node !== undefined && new_next_node !== undefined) {
						propFound = true;
						new_prev = new_prev_node.getData({live: true});
						new_next = new_next_node.getData({live: true});
					}
				}

				if (!propFound) {
					var nestedList = property.split(".");

					new_prev = $.value(prev, ...nestedList);
					new_next = $.value(next, ...nestedList);
				}

				if (new_prev === undefined || new_next === undefined) {
					continue;
				}
				if (inc === undefined) {
					inc = INC_DEFAULT;
				}
			}

			if (inc === undefined) {
				continue;
			}

			if ((new_prev < new_next && inc)||
			    (new_prev > new_next && !inc)) {
				return -1;
			} else if ((new_prev > new_next && inc) ||
			           (new_prev < new_next && !inc)) {
				return 1;
			} else {
				isTie = true;
			}
			// If neither checks work, we have a tie, attempt again with
			// next property
		}

		// If we ended on a tie, stable sort the data
		if (isTie) {
			return prevData[1]-nextData[1];
		}

		// Otherwise try and sort the values as-is
		if (prev < next) {
			return -1;
		} else if (prev > next) {
			return 1;
		} else {
			return prevData[1]-nextData[1];
		}
	});

	for (let i = 0; i < arrayCopy.length; i+=1) {
		arrayCopy[i] = stableCopy[i][0];
	}

	return arrayCopy;
}

/**
 * If the element associated with this collection has an mv-sort attribute,
 * sorts the elements in the DOM corresponding to a collection based on the
 * properties given in mv-sort.
 * @param {Array | string} properties - properties of the nodes in the collection
 * whose values we will use to compare for sorting
 */
Mavo.Collection.prototype.sortDOM = function(properties) {
	if (properties !== null) {
		if (typeof properties === "string") {
			properties = properties.trim();
			properties = properties.split(/\s*,\s*|\s+/).filter(val => val.length > 0);
		}

		var mavoNodes = this.children;
		if (properties.length > 0) {
			mavoNodes = Mavo.Functions.sort(mavoNodes, ...properties);
		}
		var fragment = document.createDocumentFragment();
		for (let child of mavoNodes) {
			fragment.appendChild(child.element);
		}
		if (this.bottomUp) {
			$.after(fragment, this.marker);
		} else {
			$.before(fragment, this.marker);
		}

		this.sortedBy = formatSortCriteria(properties);
	}
}

})(Bliss, Bliss.$);
