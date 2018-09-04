var sortHandlers = new WeakMap();
var state = null;

function isDragging() {
  return !!state;
}

function sortable(el, fn) {
  sortHandlers.set(el, fn);
  el.addEventListener('dragstart', onDragStart);
  el.addEventListener('dragenter', onDragEnter);
  el.addEventListener('dragend', onDragEnd);
  el.addEventListener('drop', onDrop);
  el.addEventListener('dragover', onDragOver);
}

// Determine if item2 is before item1 in the tree.
function isBefore(item1, item2) {
  if (item1.parentNode === item2.parentNode) {
    var node = item1;
    while (node) {
      if (node === item2) return true;
      node = node.previousElementSibling;
    }
  }
  return false;
}

function isSameContainer(item1, item2) {
  return item1.closest('task-lists') === item2.closest('task-lists');
}

function onDragStart(event) {
  // Ignore selected text dragging within list items.
  if (event.currentTarget !== event.target) return;

  var target = event.currentTarget;
  if (!(target instanceof Element)) return;

  var sourceList = target.closest('.contains-task-list');
  if (!sourceList) return;

  target.classList.add('is-ghost');

  // Add data to drag operation (required for Firefox).
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', target.textContent.trim());
  }

  if (!target.parentElement) return;
  var siblings = Array.from(target.parentElement.children);
  var sourceIndex = siblings.indexOf(target);

  state = {
    didDrop: false,
    dragging: target,
    dropzone: target,
    sourceList: sourceList,
    sourceSibling: siblings[sourceIndex + 1] || null,
    sourceIndex: sourceIndex
  };
}

function onDragEnter(event) {
  // Allow dragging task list item, not text, links, or files.
  if (!state) return;

  var dropzone = event.currentTarget;
  if (!(dropzone instanceof Element)) return;

  if (!isSameContainer(state.dragging, dropzone)) {
    event.stopPropagation();
    return;
  }

  // Necessary for dragging
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }

  // Make sure we weren't already dragging in this task list item.
  if (state.dropzone === dropzone) return;

  // Open an empty space in the list as a drop target.
  state.dragging.classList.add('is-dragging');

  state.dropzone = dropzone;

  if (isBefore(state.dragging, dropzone)) {
    dropzone.before(state.dragging);
  } else {
    dropzone.after(state.dragging);
  }
}

function onDrop(event) {
  // Allow dragging task list item, not text, links, or files.
  if (!state) return;

  var dropzone = event.currentTarget;
  if (!(dropzone instanceof Element)) return;

  // Notify dragend listener drag ended in a valid drop target.
  state.didDrop = true;

  if (!state.dragging.parentElement) return;
  var newIndex = Array.from(state.dragging.parentElement.children).indexOf(state.dragging);

  var currentList = dropzone.closest('.contains-task-list');
  if (!currentList) return;

  // Don't notify listener if the list hasn't changed.
  if (state.sourceIndex === newIndex && state.sourceList === currentList) return;

  // Increment insertion index when moving item down in its own list.
  if (state.sourceList === currentList && state.sourceIndex < newIndex) {
    newIndex++;
  }

  var src = { list: state.sourceList, index: state.sourceIndex };
  var dst = { list: currentList, index: newIndex };
  var fn = sortHandlers.get(state.dragging);
  if (fn) fn({ src: src, dst: dst });
}

function onDragEnd() {
  if (!state) return;

  state.dragging.classList.remove('is-dragging');
  state.dragging.classList.remove('is-ghost');

  // If the drag ended in a valid drop target, the drop event listener will
  // have already set this flag to true. If not, it'll still be false, and
  // we'll know the drag was canceled.
  if (!state.didDrop) {
    state.sourceList.insertBefore(state.dragging, state.sourceSibling);
  }

  // Reset for next drag.
  state = null;
}

function onDragOver(event) {
  // Allow dragging task list item, not text, links, or files.
  if (!state) return;

  var dropzone = event.currentTarget;
  if (!(dropzone instanceof Element)) return;

  if (!isSameContainer(state.dragging, dropzone)) {
    event.stopPropagation();
    return;
  }

  // Necessary for dragging.
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};

var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

function _CustomElement() {
  return Reflect.construct(HTMLElement, [], this.__proto__.constructor);
}
Object.setPrototypeOf(_CustomElement.prototype, HTMLElement.prototype);
Object.setPrototypeOf(_CustomElement, HTMLElement);

var observers = new WeakMap();

var TaskListsElement = function (_CustomElement2) {
  inherits(TaskListsElement, _CustomElement2);

  function TaskListsElement() {
    classCallCheck(this, TaskListsElement);

    var _this = possibleConstructorReturn(this, (TaskListsElement.__proto__ || Object.getPrototypeOf(TaskListsElement)).call(this));

    _this.addEventListener('change', function (event) {
      var checkbox = event.target;
      if (!(checkbox instanceof HTMLInputElement)) return;
      if (!checkbox.classList.contains('task-list-item-checkbox')) return;

      _this.dispatchEvent(new CustomEvent('task-lists:check', {
        bubbles: true,
        detail: {
          position: position(checkbox),
          checked: checkbox.checked
        }
      }));
    });

    observers.set(_this, new MutationObserver(syncState.bind(null, _this)));
    return _this;
  }

  createClass(TaskListsElement, [{
    key: 'connectedCallback',
    value: function connectedCallback() {
      var observer = observers.get(this);
      if (observer) {
        observer.observe(this, { childList: true, subtree: true });
      }
      syncState(this);
    }
  }, {
    key: 'disconnectedCallback',
    value: function disconnectedCallback() {
      var observer = observers.get(this);
      if (observer) {
        observer.disconnect();
      }
    }
  }, {
    key: 'attributeChangedCallback',
    value: function attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;

      switch (name) {
        case 'disabled':
          syncDisabled(this);
          break;
      }
    }
  }, {
    key: 'disabled',
    get: function get$$1() {
      return this.hasAttribute('disabled');
    },
    set: function set$$1(value) {
      if (value) {
        this.setAttribute('disabled', '');
      } else {
        this.removeAttribute('disabled');
      }
    }
  }, {
    key: 'sortable',
    get: function get$$1() {
      return this.hasAttribute('sortable');
    },
    set: function set$$1(value) {
      if (value) {
        this.setAttribute('sortable', '');
      } else {
        this.removeAttribute('sortable');
      }
    }
  }], [{
    key: 'observedAttributes',
    get: function get$$1() {
      return ['disabled'];
    }
  }]);
  return TaskListsElement;
}(_CustomElement);


var handleTemplate = document.createElement('template');
handleTemplate.innerHTML = '\n  <span class="handle">\n    <svg class="drag-handle" aria-hidden="true" width="16" height="15" version="1.1" viewBox="0 0 16 15">\n      <path d="M12,4V5H4V4h8ZM4,8h8V7H4V8Zm0,3h8V10H4v1Z"></path>\n    </svg>\n  </span>';

var initialized = new WeakMap();

// Only top-level lists are draggable, and nested lists drag with their parent item.
function initItem(el) {
  if (initialized.get(el)) return;
  initialized.set(el, true);

  var taskList = el.closest('task-lists');
  if (!(taskList instanceof TaskListsElement)) return;

  // Single item task lists are not draggable.
  if (taskList.querySelectorAll('.task-list-item').length <= 1) return;

  var fragment = handleTemplate.content.cloneNode(true);
  var handle = fragment.querySelector('.handle');
  el.prepend(fragment);

  if (!handle) throw new Error('handle not found');
  handle.addEventListener('mouseenter', onHandleMouseOver);
  handle.addEventListener('mouseleave', onHandleMouseOut);

  sortable(el, onSorted);

  // Drag operations don't remove :hover styles, so manage drag handle hover state.
  el.addEventListener('mouseenter', onListItemMouseOver);
  el.addEventListener('mouseleave', onListItemMouseOut);
}

function onListItemMouseOver(event) {
  var item = event.currentTarget;
  if (!(item instanceof Element)) return;

  var list = item.closest('task-lists');
  if (!(list instanceof TaskListsElement)) return;

  if (list.sortable && !list.disabled) {
    item.classList.add('hovered');
  }
}

function onListItemMouseOut(event) {
  var item = event.currentTarget;
  if (!(item instanceof Element)) return;
  item.classList.remove('hovered');
}

// Returns the list item position as a (list index, item index) tuple.
// Listen on top-level task lists because item indexing includes nested task lists.
function position(el) {
  var list = rootTaskList(el);
  if (!list) throw new Error('.contains-task-list not found');
  var flattened = Array.from(list.querySelectorAll('li'));
  var index = flattened.indexOf(el.closest('.task-list-item'));
  return [listIndex(list), index];
}

// Finds the list item's parent task list.
function taskList(el) {
  var parent = el.parentElement;
  return parent ? parent.closest('.contains-task-list') : null;
}

// Is the task list this element belongs to a root list?
function isRootTaskList(el) {
  return taskList(el) === rootTaskList(el);
}

// Finds the highest task list in this element's ancestor chain.
function rootTaskList(node) {
  var list = taskList(node);
  return list ? rootTaskList(list) || list : null;
}

function syncState(list) {
  var items = list.querySelectorAll('.contains-task-list > .task-list-item');
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = items[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var el = _step.value;

      if (isRootTaskList(el)) {
        initItem(el);
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  syncDisabled(list);
}

function syncDisabled(list) {
  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = list.querySelectorAll('.task-list-item')[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var el = _step2.value;

      el.classList.toggle('enabled', !list.disabled);
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2.return) {
        _iterator2.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }

  var _iteratorNormalCompletion3 = true;
  var _didIteratorError3 = false;
  var _iteratorError3 = undefined;

  try {
    for (var _iterator3 = list.querySelectorAll('.task-list-item-checkbox')[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var _el = _step3.value;

      if (_el instanceof HTMLInputElement) {
        _el.disabled = list.disabled;
      }
    }
  } catch (err) {
    _didIteratorError3 = true;
    _iteratorError3 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion3 && _iterator3.return) {
        _iterator3.return();
      }
    } finally {
      if (_didIteratorError3) {
        throw _iteratorError3;
      }
    }
  }
}

// Given a top-level task list, return its index location in the container. All
// lists in the container, not just task lists, are indexed to match the
// server-side Markdown parser's indexing.
function listIndex(list) {
  var container = list.closest('task-lists');
  if (!container) throw new Error('parent not found');
  var top = Array.from(container.querySelectorAll('ol, ul'));
  return top.indexOf(list);
}

function onSorted(_ref) {
  var src = _ref.src,
      dst = _ref.dst;

  var container = src.list.closest('task-lists');
  if (!container) return;

  container.dispatchEvent(new CustomEvent('task-lists:move', {
    bubbles: true,
    detail: {
      src: [listIndex(src.list), src.index],
      dst: [listIndex(dst.list), dst.index]
    }
  }));
}

// Enable list item drag when handle is hovered.
function onHandleMouseOver(event) {
  var target = event.currentTarget;
  if (!(target instanceof Element)) return;

  var item = target.closest('.task-list-item');
  if (!item) return;

  var list = item.closest('task-lists');
  if (!(list instanceof TaskListsElement)) return;

  if (list.sortable && !list.disabled) {
    item.setAttribute('draggable', 'true');
  }
}

// Disable list item drag so text selection works.
function onHandleMouseOut(event) {
  if (isDragging()) return;

  var target = event.currentTarget;
  if (!(target instanceof Element)) return;

  var item = target.closest('.task-list-item');
  if (!item) return;

  item.setAttribute('draggable', 'false');
}

if (!window.customElements.get('task-lists')) {
  window.TaskListsElement = TaskListsElement;
  window.customElements.define('task-lists', TaskListsElement);
}

export default TaskListsElement;
