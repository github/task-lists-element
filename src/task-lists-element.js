/* @flow strict */

import {isDragging, sortable} from './sortable'

const observers = new WeakMap()

export default class TaskListsElement extends HTMLElement {
  constructor() {
    super()

    this.addEventListener('change', event => {
      const checkbox = event.target
      if (!(checkbox instanceof HTMLInputElement)) return
      if (!checkbox.classList.contains('task-list-item-checkbox')) return

      this.dispatchEvent(
        new CustomEvent('task-lists-check', {
          bubbles: true,
          detail: {
            position: position(checkbox),
            checked: checkbox.checked
          }
        })
      )
    })

    observers.set(this, new MutationObserver(syncState.bind(null, this)))
  }

  connectedCallback() {
    const observer = observers.get(this)
    if (observer) {
      observer.observe(this, {childList: true, subtree: true})
    }
    syncState(this)
  }

  disconnectedCallback() {
    const observer = observers.get(this)
    if (observer) {
      observer.disconnect()
    }
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled')
  }

  set disabled(value: boolean) {
    if (value) {
      this.setAttribute('disabled', '')
    } else {
      this.removeAttribute('disabled')
    }
  }

  get sortable(): boolean {
    return this.hasAttribute('sortable')
  }

  set sortable(value: boolean) {
    if (value) {
      this.setAttribute('sortable', '')
    } else {
      this.removeAttribute('sortable')
    }
  }

  static get observedAttributes(): Array<string> {
    return ['disabled']
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return

    switch (name) {
      case 'disabled':
        syncDisabled(this)
        break
    }
  }
}

const handleTemplate = document.createElement('template')
handleTemplate.innerHTML = `
  <span class="handle">
    <svg class="drag-handle" aria-hidden="true" width="16" height="15" version="1.1" viewBox="0 0 16 15">
      <path d="M12,4V5H4V4h8ZM4,8h8V7H4V8Zm0,3h8V10H4v1Z"></path>
    </svg>
  </span>`

const initialized = new WeakMap()

// Only top-level lists are draggable, and nested lists drag with their parent item.
function initItem(el: HTMLElement) {
  if (initialized.get(el)) return
  initialized.set(el, true)

  const taskList = el.closest('task-lists')
  if (!(taskList instanceof TaskListsElement)) return

  // Single item task lists are not draggable.
  if (taskList.querySelectorAll('.task-list-item').length <= 1) return

  const fragment = handleTemplate.content.cloneNode(true)
  const handle = fragment.querySelector('.handle')
  el.prepend(fragment)

  if (!handle) throw new Error('handle not found')
  handle.addEventListener('mouseenter', onHandleMouseOver)
  handle.addEventListener('mouseleave', onHandleMouseOut)

  sortable(el, onSortStart, onSorted)

  // Drag operations don't remove :hover styles, so manage drag handle hover state.
  el.addEventListener('mouseenter', onListItemMouseOver)
  el.addEventListener('mouseleave', onListItemMouseOut)
}

function onListItemMouseOver(event: MouseEvent) {
  const item = event.currentTarget
  if (!(item instanceof Element)) return

  const list = item.closest('task-lists')
  if (!(list instanceof TaskListsElement)) return

  if (list.sortable && !list.disabled) {
    item.classList.add('hovered')
  }
}

function onListItemMouseOut(event: MouseEvent) {
  const item = event.currentTarget
  if (!(item instanceof Element)) return
  item.classList.remove('hovered')
}

// Returns the list item position as a (list index, item index) tuple.
function position(checkbox: HTMLInputElement): [number, number] {
  const list = taskList(checkbox)
  if (!list) throw new Error('.contains-task-list not found')
  const index = Array.from(list.children).indexOf(checkbox.closest('.task-list-item'))
  return [listIndex(list), index]
}

// Finds the list item's parent task list.
function taskList(el: Element): ?Element {
  const parent = el.parentElement
  return parent ? parent.closest('.contains-task-list') : null
}

// Is the task list this element belongs to a root list?
function isRootTaskList(el: Element): boolean {
  return taskList(el) === rootTaskList(el)
}

// Finds the highest task list in this element's ancestor chain.
function rootTaskList(node: Element): ?Element {
  const list = taskList(node)
  return list ? rootTaskList(list) || list : null
}

function syncState(list: TaskListsElement) {
  const items = list.querySelectorAll('.contains-task-list > .task-list-item')
  for (const el of items) {
    if (isRootTaskList(el)) {
      initItem(el)
    }
  }
  syncDisabled(list)
}

function syncDisabled(list: TaskListsElement) {
  for (const el of list.querySelectorAll('.task-list-item')) {
    el.classList.toggle('enabled', !list.disabled)
  }
  for (const el of list.querySelectorAll('.task-list-item-checkbox')) {
    if (el instanceof HTMLInputElement) {
      el.disabled = list.disabled
    }
  }
}

// Given a top-level task list, return its index location in the container. All
// lists in the container, not just task lists, are indexed to match the
// server-side Markdown parser's indexing.
function listIndex(list: Element): number {
  const container = list.closest('task-lists')
  if (!container) throw new Error('parent not found')
  return Array.from(container.querySelectorAll('ol, ul')).indexOf(list)
}

const originalLists = new WeakMap()

function onSortStart(srcList: Element) {
  const container = srcList.closest('task-lists')
  if (!container) throw new Error('parent not found')
  originalLists.set(container, Array.from(container.querySelectorAll('ol, ul')))
}

function onSorted({src, dst}) {
  const container = src.list.closest('task-lists')
  if (!container) return

  const lists = originalLists.get(container)
  if (!lists) return
  originalLists.delete(container)

  container.dispatchEvent(
    new CustomEvent('task-lists-move', {
      bubbles: true,
      detail: {
        src: [lists.indexOf(src.list), src.index],
        dst: [lists.indexOf(dst.list), dst.index]
      }
    })
  )
}

// Enable list item drag when handle is hovered.
function onHandleMouseOver(event: MouseEvent) {
  const target = event.currentTarget
  if (!(target instanceof Element)) return

  const item = target.closest('.task-list-item')
  if (!item) return

  const list = item.closest('task-lists')
  if (!(list instanceof TaskListsElement)) return

  if (list.sortable && !list.disabled) {
    item.setAttribute('draggable', 'true')
  }
}

// Disable list item drag so text selection works.
function onHandleMouseOut(event: MouseEvent) {
  if (isDragging()) return

  const target = event.currentTarget
  if (!(target instanceof Element)) return

  const item = target.closest('.task-list-item')
  if (!item) return

  item.setAttribute('draggable', 'false')
}
