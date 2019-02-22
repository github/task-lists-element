/* @flow strict */

type SortStartHandler = (srcList: Element) => mixed
type SortEndHandler = ({
  src: {list: Element, index: number},
  dst: {list: Element, index: number}
}) => mixed

type DragState = {
  didDrop: boolean,
  dragging: Element,
  dropzone: Element,
  sourceList: Element,
  sourceSibling: ?Element,
  sourceIndex: number
}

const sortHandlers = new WeakMap()
let state: ?DragState = null

export function isDragging(): boolean {
  return !!state
}

export function sortable(el: Element, sortStarted: SortStartHandler, sortFinished: SortEndHandler) {
  sortHandlers.set(el, {sortStarted, sortFinished})
  el.addEventListener('dragstart', onDragStart)
  el.addEventListener('dragenter', onDragEnter)
  el.addEventListener('dragend', onDragEnd)
  el.addEventListener('drop', onDrop)
  el.addEventListener('dragover', onDragOver)
}

// Determine if item2 is before item1 in the tree.
function isBefore(item1: Element, item2: Element): boolean {
  if (item1.parentNode === item2.parentNode) {
    let node = item1
    while (node) {
      if (node === item2) return true
      node = node.previousElementSibling
    }
  }
  return false
}

function isSameContainer(item1: Element, item2: Element): boolean {
  return item1.closest('task-lists') === item2.closest('task-lists')
}

function onDragStart(event: DragEvent) {
  // Ignore selected text dragging within list items.
  if (event.currentTarget !== event.target) return

  const target = event.currentTarget
  if (!(target instanceof Element)) return

  const sourceList = target.closest('.contains-task-list')
  if (!sourceList) return

  target.classList.add('is-ghost')

  // Add data to drag operation (required for Firefox).
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', target.textContent.trim())
  }

  if (!target.parentElement) return
  const siblings = Array.from(target.parentElement.children)
  const sourceIndex = siblings.indexOf(target)

  const handlers = sortHandlers.get(target)
  if (handlers) {
    handlers.sortStarted(sourceList)
  }

  state = {
    didDrop: false,
    dragging: target,
    dropzone: target,
    sourceList,
    sourceSibling: siblings[sourceIndex + 1] || null,
    sourceIndex
  }
}

function onDragEnter(event: DragEvent) {
  // Allow dragging task list item, not text, links, or files.
  if (!state) return

  const dropzone = event.currentTarget
  if (!(dropzone instanceof Element)) return

  if (!isSameContainer(state.dragging, dropzone)) {
    event.stopPropagation()
    return
  }

  // Necessary for dragging
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }

  // Make sure we weren't already dragging in this task list item.
  if (state.dropzone === dropzone) return

  // Open an empty space in the list as a drop target.
  state.dragging.classList.add('is-dragging')

  state.dropzone = dropzone

  if (isBefore(state.dragging, dropzone)) {
    dropzone.before(state.dragging)
  } else {
    dropzone.after(state.dragging)
  }
}

function onDrop(event: DragEvent) {
  // Allow dragging task list item, not text, links, or files.
  if (!state) return

  event.preventDefault()
  event.stopPropagation()

  const dropzone = event.currentTarget
  if (!(dropzone instanceof Element)) return

  // Notify dragend listener drag ended in a valid drop target.
  state.didDrop = true

  if (!state.dragging.parentElement) return
  let newIndex = Array.from(state.dragging.parentElement.children).indexOf(state.dragging)

  const currentList = dropzone.closest('.contains-task-list')
  if (!currentList) return

  // Don't notify listener if the list hasn't changed.
  if (state.sourceIndex === newIndex && state.sourceList === currentList) return

  // Increment insertion index when moving item down in its own list.
  if (state.sourceList === currentList && state.sourceIndex < newIndex) {
    newIndex++
  }

  const src = {list: state.sourceList, index: state.sourceIndex}
  const dst = {list: currentList, index: newIndex}
  const handlers = sortHandlers.get(state.dragging)
  if (handlers) {
    handlers.sortFinished({src, dst})
  }
}

function onDragEnd() {
  if (!state) return

  state.dragging.classList.remove('is-dragging')
  state.dragging.classList.remove('is-ghost')

  // If the drag ended in a valid drop target, the drop event listener will
  // have already set this flag to true. If not, it'll still be false, and
  // we'll know the drag was canceled.
  if (!state.didDrop) {
    state.sourceList.insertBefore(state.dragging, state.sourceSibling)
  }

  // Reset for next drag.
  state = null
}

function onDragOver(event: DragEvent) {
  // Allow dragging task list item, not text, links, or files.
  if (!state) return

  const dropzone = event.currentTarget
  if (!(dropzone instanceof Element)) return

  if (!isSameContainer(state.dragging, dropzone)) {
    event.stopPropagation()
    return
  }

  // Necessary for dragging.
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}
